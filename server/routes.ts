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
      // Direct database query to ensure we get the coverImageUrl field
      const [user] = await db.select().from(users).where(eq(users.id, req.user.id));
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log("API - Direct DB query result:", JSON.stringify(user, null, 2));
      console.log("API - Cover image URL from DB:", user.coverImageUrl);
      
      // Return user data directly from database with only safe fields
      const safeUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        coverImageUrl: user.coverImageUrl, // Ensure this field is explicitly included
        showOnlineStatus: user.showOnlineStatus,
        allowFriendRequests: user.allowFriendRequests,
        showActivityStatus: user.showActivityStatus,
        emailNotifications: user.emailNotifications,
        notifyFriendRequests: user.notifyFriendRequests,
        notifyMessages: user.notifyMessages,
        notifyPostLikes: user.notifyPostLikes,
        notifyComments: user.notifyComments,
        theme: user.theme,
        language: user.language,
        compactMode: user.compactMode,
        autoplayVideos: user.autoplayVideos,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
      
      // Debug logging to verify the field is included
      console.log("Final safeUser object:", JSON.stringify(safeUser, null, 2));
      console.log("Cover image in final response:", safeUser.coverImageUrl);
      
      console.log("API - Final response coverImageUrl:", safeUser.coverImageUrl);
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update current user
  app.put("/api/user", isAuthenticated, async (req: any, res) => {
    try {
      const updateData = req.body;
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
      const updateData = req.body;
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
        const profileImageUrl = `/uploads/${req.file.filename}`;

        console.log("Updating profile image:", { profileId, profileImageUrl });

        // Update profile's image URL in database
        await storage.updateProfile(profileId, { profileImageUrl });

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
        console.log("Updated user with cover image:", JSON.stringify(updatedUser, null, 2));

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

  // Auto-activate audience profile
  app.post('/api/activate-audience-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userProfiles = await storage.getProfilesByUserId(userId);
      const audienceProfile = userProfiles.find(p => p.type === 'audience');
      
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
      
      // Check if user has permission to view members
      const hasPermission = await storage.checkProfilePermission(req.user.id, profileId, "view_analytics");
      if (!hasPermission) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const memberships = await storage.getProfileMemberships(profileId);
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
  app.patch('/api/profiles/:profileId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const memberId = parseInt(req.params.memberId);
      const { role, permissions } = req.body;

      // Check if user has permission to manage members
      const hasPermission = await storage.checkProfilePermission(req.user.id, profileId, "manage_members");
      if (!hasPermission) {
        return res.status(403).json({ message: "Permission denied" });
      }

      const membership = await storage.updateProfileMembership(memberId, {
        role,
        permissions,
      });

      res.json(membership);
    } catch (error) {
      console.error("Error updating member:", error);
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  // Remove member from profile
  app.delete('/api/profiles/:profileId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const memberId = parseInt(req.params.memberId);

      // Check if user has permission to manage members
      const hasPermission = await storage.checkProfilePermission(req.user.id, profileId, "manage_members");
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

  const httpServer = createServer(app);
  return httpServer;
}
