import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertProfileSchema, insertPostSchema, insertCommentSchema, posts, users } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Auth middleware function
export function isAuthenticated(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_multer = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('Setting destination to:', uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'profile-' + uniqueSuffix + path.extname(file.originalname);
    console.log('Generated filename:', filename);
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage_multer,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter - mimetype:', file.mimetype);
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

export function registerRoutes(app: Express): Server {
  // Auth middleware
  setupAuth(app);

  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));

  // Auth routes
  app.get('/api/user', isAuthenticated, async (req: any, res) => {
    try {
      // Use storage.getUser to ensure all fields are included
      const user = await storage.getUser(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("API - User query result:", JSON.stringify(user, null, 2));
      console.log("API - Cover image URL from DB:", user.coverImageUrl);

      // Send the complete user object (excluding password)
      const { password, ...userResponse } = user;

      console.log("API - Final response BEFORE sending:", JSON.stringify(userResponse, null, 2));
      console.log("API - Response coverImageUrl field exists:", 'coverImageUrl' in userResponse);
      console.log("API - Response coverImageUrl value:", userResponse.coverImageUrl);

      res.setHeader('Content-Type', 'application/json');
      const responseJson = JSON.stringify(userResponse);
      console.log("API - Stringified response:", responseJson);
      console.log("API - Stringified response includes coverImageUrl:", responseJson.includes('coverImageUrl'));

      res.status(200).send(responseJson);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update current user
  app.put("/api/user", isAuthenticated, async (req: any, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        bio,
        location,
        website,
        coverImageUrl,
        compactMode,
        autoplayVideos,
        theme,
        language,
        profileBackground
      } = req.body;

      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (bio !== undefined) updateData.bio = bio;
      if (location !== undefined) updateData.location = location;
      if (website !== undefined) updateData.website = website;
      if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;
      if (compactMode !== undefined) updateData.compactMode = compactMode;
      if (autoplayVideos !== undefined) updateData.autoplayVideos = autoplayVideos;
      if (theme !== undefined) updateData.theme = theme;
      if (language !== undefined) updateData.language = language;
      if (profileBackground !== undefined) updateData.profileBackground = profileBackground;
      const updatedUser = await storage.updateUser(req.user.id, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Update user preferences
  app.put("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const {
        compactMode,
        autoplayVideos,
        theme,
        language
      } = req.body;

      const updateData: any = {};
      if (compactMode !== undefined) updateData.compactMode = compactMode;
      if (autoplayVideos !== undefined) updateData.autoplayVideos = autoplayVideos;
      if (theme !== undefined) updateData.theme = theme;
      if (language !== undefined) updateData.language = language;
      const updatedUser = await storage.updateUser(req.user.id, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Profile picture upload endpoint
  app.post('/api/user/profile-image', isAuthenticated, (req: any, res, next) => {
    console.log("POST /api/user/profile-image - Raw request received");
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Body keys:", Object.keys(req.body || {}));

    upload.single('profileImage')(req, res, async (err) => {
      try {
        console.log("Multer callback executed");
        console.log("Error:", err);
        console.log("File:", req.file ? { 
          filename: req.file.filename, 
          size: req.file.size, 
          mimetype: req.file.mimetype,
          path: req.file.path 
        } : null);

        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
          console.log("No file received by multer");
          return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.user.id;
        const profileImageUrl = `/uploads/${req.file.filename}`;

        console.log("Updating user profile image:", { userId, profileImageUrl });

        // Update user's profile image URL in database
        await storage.updateUser(userId, { profileImageUrl });

        console.log("Profile image updated successfully");

        res.json({ 
          message: "Profile picture updated successfully",
          profileImageUrl 
        });
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        res.status(500).json({ message: "Failed to upload profile picture" });
      }
    });
  });

  // Profile picture upload endpoint for specific profiles
  app.post('/api/profiles/:profileId/profile-image', isAuthenticated, (req: any, res, next) => {
    console.log("POST /api/profiles/:profileId/profile-image - Raw request received");
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Profile ID:", req.params.profileId);

    upload.single('profileImage')(req, res, async (err) => {
      try {
        console.log("Multer callback executed");
        console.log("Error:", err);
        console.log("File:", req.file ? { 
          filename: req.file.filename, 
          size: req.file.size, 
          mimetype: req.file.mimetype,
          path: req.file.path 
        } : null);

        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
          console.log("No file received by multer");
          return res.status(400).json({ message: "No file uploaded" });
        }

        const profileId = parseInt(req.params.profileId);
        const userId = req.user.id;
        const profileImageUrl = `/uploads/${req.file.filename}`;

        console.log("Updating profile image:", { profileId, profileImageUrl });

        // Update profile's image URL in database
        await storage.updateProfile(profileId, { profileImageUrl });

        // Also update the user's profile image URL so posts show the current image
        await storage.updateUser(userId, { profileImageUrl });

        console.log("Profile image updated successfully");

        res.json({ 
          message: "Profile picture updated successfully",
          profileImageUrl 
        });
      } catch (error) {
        console.error("Error uploading profile picture:", error);
        res.status(500).json({ message: "Failed to upload profile picture" });
      }
    });
  });

  // Cover photo upload endpoint for specific profiles
  app.post('/api/profiles/:profileId/cover-image', isAuthenticated, (req: any, res, next) => {
    console.log("POST /api/profiles/:profileId/cover-image - Raw request received");
    console.log("Content-Type:", req.headers['content-type']);
    console.log("Profile ID:", req.params.profileId);

    upload.single('coverImage')(req, res, async (err) => {
      try {
        console.log("Multer callback executed");
        console.log("Error:", err);
        console.log("File:", req.file ? { 
          filename: req.file.filename, 
          size: req.file.size, 
          mimetype: req.file.mimetype,
          path: req.file.path 
        } : null);

        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
          console.log("No file received by multer");
          return res.status(400).json({ message: "No file uploaded" });
        }

        const profileId = parseInt(req.params.profileId);
        const coverImageUrl = `/uploads/${req.file.filename}`;

        console.log("Updating profile cover image:", { profileId, coverImageUrl });

        // Update profile's cover image URL in database
        await storage.updateProfile(profileId, { coverImageUrl });

        console.log("Profile cover image updated successfully");

        res.json({ 
          message: "Cover photo updated successfully",
          coverImageUrl 
        });
      } catch (error) {
        console.error("Error uploading profile cover photo:", error);
        res.status(500).json({ message: "Failed to upload cover photo" });
      }
    });
  });

  // Remove cover photo endpoint for specific profiles
  app.delete('/api/profiles/:profileId/cover-image', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.profileId);

      console.log("Removing profile cover image:", { profileId });

      // Update profile's cover image URL to null in database
      await storage.updateProfile(profileId, { coverImageUrl: null });

      console.log("Profile cover image removed successfully");

      res.json({ 
        message: "Cover photo removed successfully"
      });
    } catch (error) {
      console.error("Error removing profile cover photo:", error);
      res.status(500).json({ message: "Failed to remove cover photo" });
    }
  });

  // Remove user cover photo endpoint
  app.delete('/api/user/cover-image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      console.log("Removing user cover image:", { userId });

      // Update user's cover image URL to null in database
      await storage.updateUser(userId, { coverImageUrl: null });

      console.log("User cover image removed successfully");

      res.json({ 
        message: "Cover photo removed successfully"
      });
    } catch (error) {
      console.error("Error removing user cover photo:", error);
      res.status(500).json({ message: "Failed to remove cover photo" });
    }
  });

  // Cover photo upload endpoint
  app.post('/api/user/cover-image', isAuthenticated, (req: any, res, next) => {
    console.log("POST /api/user/cover-image - Raw request received");
    console.log("Content-Type:", req.headers['content-type']);

    const uploadSingle = upload.single('coverImage');

    uploadSingle(req, res, async (err: any) => {
      try {
        console.log("Multer processed:", {
          error: err,
          file: req.file ? {
            filename: req.file.filename,
            size: req.file.size,
            mimetype: req.file.mimetype,
            path: req.file.path 
          } : null
        });

        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ message: err.message });
        }

        if (!req.file) {
          console.log("No file received by multer");
          return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.user.id;
        const coverImageUrl = `/uploads/${req.file.filename}`;

        console.log("Updating user cover image:", { userId, coverImageUrl });

        // Update user's cover image URL in database
        const updatedUser = await storage.updateUser(userId, { coverImageUrl });

        console.log("Cover image updated successfully");

        res.json({ 
          message: "Cover photo updated successfully",
          coverImageUrl,
          user: updatedUser
        });
      } catch (error) {
        console.error("Error uploading cover photo:", error);
        res.status(500).json({ message: "Failed to upload cover photo" });
      }
    });
  });

  // Remove cover photo endpoint
  app.delete('/api/user/cover-image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      console.log("Removing cover photo for user:", userId);

      // Update user's cover image URL to null in database
      const updatedUser = await storage.updateUser(userId, { coverImageUrl: null });

      console.log("Cover photo removed successfully");

      res.json({ 
        message: "Cover photo removed successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error removing cover photo:", error);
      res.status(500).json({ message: "Failed to remove cover photo" });
    }
  });

  // Profile routes
  app.get('/api/profiles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profiles = await storage.getProfilesByUserId(userId);
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.get('/api/profiles/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getActiveProfile(userId);
      res.json(profile);
    } catch (error) {
      console.error("Error fetching active profile:", error);
      res.status(500).json({ message: "Failed to fetch active profile" });
    }
  });

  app.post('/api/profiles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profileData = insertProfileSchema.parse({
        ...req.body,
        userId,
      });

      const profile = await storage.createProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid profile data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create profile" });
      }
    }
  });

  app.put('/api/profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user.id;

      // Verify ownership
      const existingProfile = await storage.getProfile(profileId);
      if (!existingProfile || existingProfile.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updates = req.body;
      const profile = await storage.updateProfile(profileId, updates);
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post('/api/profiles/:id/activate', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user.id;

      // Verify ownership
      const profile = await storage.getProfile(profileId);
      if (!profile || profile.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.setActiveProfile(userId, profileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error activating profile:", error);
      res.status(500).json({ message: "Failed to activate profile" });
    }
  });

  app.delete('/api/profiles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user.id;
      const { reason } = req.body;

      // Verify ownership
      const profile = await storage.getProfile(profileId);
      if (!profile || profile.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Don't allow deletion of audience profiles
      if (profile.type === 'audience') {
        return res.status(400).json({ message: "Cannot delete audience profile" });
      }

      // Check if this is the active profile and switch to audience if so
      const activeProfile = await storage.getActiveProfile(userId);
      if (activeProfile?.id === profileId) {
        const userProfiles = await storage.getProfilesByUserId(userId);
        const audienceProfile = userProfiles.find(p => p.type === 'audience' && !p.deletedAt);
        if (audienceProfile) {
          await storage.setActiveProfile(userId, audienceProfile.id);
        }
      }

      await storage.deleteProfile(profileId, userId, reason);
      res.json({ 
        success: true, 
        message: "Profile deleted successfully. It will be permanently removed in 30 days unless restored." 
      });
    } catch (error) {
      console.error("Error deleting profile:", error);
      res.status(500).json({ message: "Failed to delete profile" });
    }
  });

  // Auto-activate audience profile
  app.post('/api/activate-audience-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userProfiles = await storage.getProfilesByUserId(userId);
      const audienceProfile = userProfiles.find(p => p.type === 'audience' && !p.deletedAt);

      if (audienceProfile) {
        await storage.setActiveProfile(userId, audienceProfile.id);
        res.json({ success: true, profileId: audienceProfile.id });
      } else {
        res.status(404).json({ message: "No audience profile found" });
      }
    } catch (error) {
      console.error("Error activating audience profile:", error);
      res.status(500).json({ message: "Failed to activate audience profile" });
    }
  });

  // Get deleted profiles
  app.get('/api/profiles/deleted', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const deletedProfiles = await storage.getDeletedProfiles(userId);
      res.json(deletedProfiles);
    } catch (error) {
      console.error("Error fetching deleted profiles:", error);
      res.status(500).json({ message: "Failed to fetch deleted profiles" });
    }
  });

  // Restore profile
  app.post('/api/profiles/:id/restore', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const userId = req.user.id;

      // Verify ownership
      const profile = await storage.getProfile(profileId);
      if (!profile || profile.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const restoredProfile = await storage.restoreProfile(profileId, userId);
      res.json({ 
        success: true, 
        profile: restoredProfile,
        message: "Profile restored successfully" 
      });
    } catch (error) {
      console.error("Error restoring profile:", error);
      res.status(500).json({ message: error.message || "Failed to restore profile" });
    }
  });

  // Admin route for cleanup (you may want to add admin authentication)
  app.post('/api/admin/cleanup-expired-profiles', isAuthenticated, async (req: any, res) => {
    try {
      // Add admin check here if needed
      const deletedCount = await storage.cleanupExpiredProfiles();
      res.json({ 
        success: true, 
        deletedCount,
        message: `${deletedCount} expired profiles permanently deleted` 
      });
    } catch (error) {
      console.error("Error during profile cleanup:", error);
      res.status(500).json({ message: "Failed to cleanup expired profiles" });
    }
  });

  app.get('/api/profiles/search', isAuthenticated, async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }

      const profiles = await storage.searchProfiles(query);
      res.json(profiles);
    } catch (error) {
      console.error("Error searching profiles:", error);
      res.status(500).json({ message: "Failed to search profiles" });
    }
  });

  app.get('/api/profiles/:id', async (req, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const profile = await storage.getProfile(profileId);

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Friend routes
  app.get('/api/friends', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const friends = await storage.getFriends(activeProfile.id);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });

  app.get('/api/friend-requests', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const requests = await storage.getFriendRequests(activeProfile.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      res.status(500).json({ message: "Failed to fetch friend requests" });
    }
  });

  app.post('/api/friend-requests', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const { addresseeId } = req.body;

      // Check if friendship already exists
      const existingFriendship = await storage.getFriendshipStatus(activeProfile.id, addresseeId);
      if (existingFriendship) {
        return res.status(400).json({ message: "Friendship already exists" });
      }

      const friendship = await storage.sendFriendRequest(activeProfile.id, addresseeId);

      // Send notification
      const { notificationService } = await import('./notifications');
      const targetProfile = await storage.getProfile(addresseeId);
      if (targetProfile?.userId) {
        const senderUser = await storage.getUser(req.user.id);
        const senderName = `${senderUser?.firstName} ${senderUser?.lastName}`;
        await notificationService.notifyFriendRequest(targetProfile.userId, req.user.id, senderName);
      }

      res.json(friendship);
    } catch (error) {
      console.error("Error sending friend request:", error);
      res.status(500).json({ message: "Failed to send friend request" });
    }
  });

  app.post('/api/friend-requests/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const friendshipId = parseInt(req.params.id);
      const friendship = await storage.acceptFriendRequest(friendshipId);

      // Send notification to the requester
      const { notificationService } = await import('./notifications');
      const requesterProfile = await storage.getProfile(friendship.requesterId);
      if (requesterProfile?.userId) {
        const accepterUser = await storage.getUser(req.user.id);
        const accepterName = `${accepterUser?.firstName} ${accepterUser?.lastName}`;
        await notificationService.notifyFriendAccepted(requesterProfile.userId, req.user.id, accepterName);
      }

      res.json(friendship);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      res.status(500).json({ message: "Failed to accept friend request" });
    }
  });

  app.post('/api/friend-requests/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const friendshipId = parseInt(req.params.id);
      const friendship = await storage.rejectFriendRequest(friendshipId);
      res.json(friendship);
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      res.status(500).json({ message: "Failed to reject friend request" });
    }
  });

  // Post routes
  app.get('/api/posts', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const posts = await storage.getFeedPosts(activeProfile.id);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.get('/api/profiles/:id/posts', async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      let viewerProfileId: number | undefined;

      // Get viewer's active profile if authenticated
      if (req.user) {
        const viewerProfile = await storage.getActiveProfile(req.user.id);
        viewerProfileId = viewerProfile?.id;
      }

      const posts = await storage.getPosts(profileId, viewerProfileId);
      res.json(posts);
    } catch (error) {
      console.error("Error fetching profile posts:", error);
      res.status(500).json({ message: "Failed to fetch profile posts" });
    }
  });

  app.post('/api/posts', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const postData = insertPostSchema.parse({
        ...req.body,
        profileId: activeProfile.id,
      });

      const post = await storage.createPost(postData);
      res.json(post);
    } catch (error) {
      console.error("Error creating post:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid post data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create post" });
      }
    }
  });

  app.post('/api/posts/:id/like', isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const isLiked = await storage.isPostLikedByProfile(postId, activeProfile.id);
      if (isLiked) {
        await storage.unlikePost(postId, activeProfile.id);
        res.json({ liked: false });
      } else {
        await storage.likePost(postId, activeProfile.id);

        // Send notification for new like
        const { notificationService } = await import('./notifications');
        const post = await db.select().from(posts).where(eq(posts.id, postId));
        if (post[0]) {
          const postOwnerProfile = await storage.getProfile(post[0].profileId);
          if (postOwnerProfile?.userId && postOwnerProfile.userId !== req.user.id) {
            const likerUser = await storage.getUser(req.user.id);
            const likerName = `${likerUser?.firstName} ${likerUser?.lastName}`;
            await notificationService.notifyPostLike(postOwnerProfile.userId, req.user.id, likerName, postId);
          }
        }

        res.json({ liked: true });
      }
    } catch (error) {
      console.error("Error toggling post like:", error);
      res.status(500).json({ message: "Failed to toggle post like" });
    }
  });

  app.delete('/api/posts/:id', isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Direct database check for post ownership
      const result = await db.select().from(posts).where(eq(posts.id, postId));
      const post = result[0];

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.profileId !== activeProfile.id) {
        return res.status(403).json({ message: "Unauthorized to delete this post" });
      }

      console.log(`About to call storage.deletePost(${postId})`);
      await storage.deletePost(postId);
      console.log(`Storage.deletePost completed for postId: ${postId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ message: "Failed to delete post" });
    }
  });

  // Friendship status endpoint
  app.get('/api/friendship-status/:profileId', isAuthenticated, async (req: any, res) => {
    try {
      const targetProfileId = parseInt(req.params.profileId);
      const activeProfile = await storage.getActiveProfile(req.user.id);

      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const friendship = await storage.getFriendshipStatus(activeProfile.id, targetProfileId);
      res.json(friendship || null);
    } catch (error) {
      console.error("Error fetching friendship status:", error);
      res.status(500).json({ message: "Failed to fetch friendship status" });
    }
  });

  // Comment routes
  app.get('/api/posts/:id/comments', async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const comments = await storage.getComments(postId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  app.post('/api/posts/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const postId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const commentData = insertCommentSchema.parse({
        ...req.body,
        postId,
        profileId: activeProfile.id,
      });

      const comment = await storage.createComment(commentData);

      // Send notification for new comment
      const { notificationService } = await import('./notifications');
      const post = await db.select().from(posts).where(eq(posts.id, postId));
      if (post[0]) {
        const postOwnerProfile = await storage.getProfile(post[0].profileId);
        if (postOwnerProfile?.userId && postOwnerProfile.userId !== req.user.id) {
          const commenterUser = await storage.getUser(req.user.id);
          const commenterName = `${commenterUser?.firstName} ${commenterUser?.lastName}`;
          await notificationService.notifyPostComment(postOwnerProfile.userId, req.user.id, commenterName, postId);
        }
      }

      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid comment data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create comment" });
      }
    }
  });

  // Shared Profile Management Routes

  // Get profile memberships
  app.get('/api/profiles/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      console.log(`Fetching members for profile ${profileId} by user ${req.user.id}`);

      // Check if user has permission to view members OR is the profile owner
      const profile = await storage.getProfile(profileId);
      console.log("Profile:", profile);

      const hasPermission = await storage.checkProfilePermission(req.user.id, profileId, "manage_members");
      const isOwner = profile?.userId === req.user.id;

      console.log("Permission check:", { hasPermission, isOwner, profileUserId: profile?.userId, requestUserId: req.user.id });

      // Allow access if user is the profile owner or has explicit permission
      if (!hasPermission && !isOwner) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const memberships = await storage.getProfileMemberships(profileId);
      console.log("Memberships found:", JSON.stringify(memberships, null, 2));
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching profile members:", error);
      res.status(500).json({ message: "Failed to fetch profile members" });
    }
  });

  // Get user's profile memberships
  app.get('/api/user/memberships', isAuthenticated, async (req: any, res) => {
    try {
      const memberships = await storage.getUserMemberships(req.user.id);
      res.json(memberships);
    } catch (error) {
      console.error("Error fetching user memberships:", error);
      res.status(500).json({ message: "Failed to fetch user memberships" });
    }
  });

  app.use(express.json());
  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };

  // Invite user to profile
  app.post('/api/profiles/:id/invite', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const { invitedEmail, role = "member", permissions = [] } = req.body;

      // Check if user has permission to manage members
      const hasPermission = await storage.checkProfilePermission(req.user.id, profileId, "manage_members");
      if (!hasPermission) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const invitation = await storage.createProfileInvitation({
        profileId,
        invitedEmail,
        invitedBy: req.user.id,
        role,
        permissions,
      });

      // Send notification if the invited user exists
      const { notificationService } = await import('./notifications');
      const inviterUser = await storage.getUser(req.user.id);
      const profile = await storage.getProfile(profileId);
      const inviterName = `${inviterUser?.firstName} ${inviterUser?.lastName}`;

      if (profile) {
        await notificationService.notifyProfileInvite(
          invitedEmail, 
          req.user.id, 
          inviterName, 
          profile.name
        );
      }

      res.json(invitation);
    } catch (error) {
      console.error("Error creating profile invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Accept profile invitation
  app.post('/api/invitations/:token/accept', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;

      const membership = await storage.acceptProfileInvitation(token, req.user.id);
      res.json(membership);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(400).json({ message: error.message || "Failed to accept invitation" });
    }
  });

  // Decline profile invitation
  app.post('/api/invitations/:token/decline', async (req, res) => {
    try {
      const { token } = req.params;

      await storage.declineProfileInvitation(token);
      res.json({ message: "Invitation declined" });
    } catch (error) {
      console.error("Error declining invitation:", error);
      res.status(500).json({ message: "Failed to decline invitation" });
    }
  });

  // Update member role/permissions
  app.patch('/api/profile-memberships/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      const { role, permissions } = req.body;

      // Get the membership to check profile access
      const membership = await storage.getUserProfileRole(req.user.id, memberId);
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }

      // Check if user has permission to manage members
      const hasPermission = await storage.checkProfilePermission(req.user.id, membership.profileId, "manage_members");
      if (!hasPermission) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const updatedMembership = await storage.updateProfileMembership(memberId, {
        role,
        permissions,
      });

      res.json(updatedMembership);
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  // Remove member from profile
  app.delete('/api/profile-memberships/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const memberId = parseInt(req.params.memberId);

      // Get the membership to check profile access
      const memberships = await storage.getProfileMemberships(memberId);
      if (memberships.length === 0) {
        return res.status(404).json({ message: "Membership not found" });
      }

      const membership = memberships[0].membership;

      // Check if user has permission to manage members
      const hasPermission = await storage.checkProfilePermission(req.user.id, membership.profileId, "manage_members");
      if (!hasPermission) {
        return res.status(403).json({ message: "Permission denied" });
      }

      await storage.removeProfileMembership(memberId);
      res.json({ message: "Member removed successfully" });
    } catch (error) {
      console.error("Error removing member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // Get profile invitations
  app.get('/api/profiles/:id/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);

      // Check if user has permission to manage members
      const hasPermission = await storage.checkProfilePermission(req.user.id, profileId, "manage_members");
      if (!hasPermission) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const invitations = await storage.getProfileInvitations(profileId);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  // Delete profile invitation
  app.delete('/api/profile-invitations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const invitationId = parseInt(req.params.id);

      // Get the invitation to check permissions
      const invitation = await storage.getInvitationById(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Check if user has permission to manage members for this profile
      const hasPermission = await storage.checkProfilePermission(req.user.id, invitation.profileId, "manage_members");
      if (!hasPermission) {
        return res.status(403).json({ message: "Permission denied" });
      }

      await storage.deleteProfileInvitation(invitationId);
      res.json({ message: "Invitation deleted successfully" });
    } catch (error) {
      console.error("Error deleting invitation:", error);
      res.status(500).json({ message: "Failed to delete invitation" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const { notificationService } = await import('./notifications');

      const notifications = await notificationService.getUserNotifications(
        req.user.id,
        parseInt(limit),
        parseInt(offset)
      );

      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const { notificationService } = await import('./notifications');
      const count = await notificationService.getUnreadCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.post('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const { notificationService } = await import('./notifications');

      await notificationService.markAsRead(notificationId, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.post('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const { notificationService } = await import('./notifications');
      await notificationService.markAllAsRead(req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const { notificationService } = await import('./notifications');

      await notificationService.deleteNotification(notificationId, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.get('/api/notification-settings', isAuthenticated, async (req: any, res) => {
    try {
      const { notificationService } = await import('./notifications');
      const settings = await notificationService.getUserNotificationSettings(req.user.id);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching notification settings:", error);
      res.status(500).json({ message: "Failed to fetch notification settings" });
    }
  });

  app.put('/api/notification-settings/:type', isAuthenticated, async (req: any, res) => {
    try {
      const { type } = req.params;
      const settings = req.body;
      const { notificationService } = await import('./notifications');

      await notificationService.updateNotificationSettings(req.user.id, type, settings);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notification settings:", error);
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}