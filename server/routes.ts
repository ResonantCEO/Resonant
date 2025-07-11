import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertProfileSchema, insertPostSchema, insertCommentSchema, posts, users, notifications, friendships, albums, photos, profiles, bookingRequests, contractProposals, contractNegotiations, contractSignatures, profileViews, events } from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { lookupZipcode, formatCityState } from "./zipcode-lookup";

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
    fileSize: 20 * 1024 * 1024 // 20MB limit
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

  // Zipcode lookup route
  app.get('/api/zipcode/:zipcode', async (req, res) => {
    try {
      const { zipcode } = req.params;
      const result = await lookupZipcodeWithCache(zipcode);
      
      if (result) {
        res.json({
          zipcode,
          city: result.city,
          state: result.state,
          formatted: formatCityState(result.city, result.state)
        });
      } else {
        res.status(404).json({ message: "Zipcode not found" });
      }
    } catch (error) {
      console.error("Error looking up zipcode:", error);
      res.status(500).json({ message: "Failed to lookup zipcode" });
    }
  });

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
        birthdate,
        hometown,
        compactMode,
        autoplayVideos,
        theme,
        language,
        profileBackground,
        showOnlineStatus,
        allowFriendRequests,
        showActivityStatus,
        emailNotifications,
        notifyFriendRequests,
        notifyMessages,
        notifyPostLikes,
        notifyComments
      } = req.body;

      const updateData: any = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email;
      if (bio !== undefined) updateData.bio = bio;
      if (location !== undefined) updateData.location = location;
      if (website !== undefined) updateData.website = website;
      if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;
      if (birthdate !== undefined) {
        if (birthdate) {
          // Ensure we're creating a proper date object
          const date = new Date(birthdate);
          updateData.birthdate = isNaN(date.getTime()) ? null : date;
        } else {
          updateData.birthdate = null;
        }
      }
      if (hometown !== undefined) updateData.hometown = hometown;
      if (compactMode !== undefined) updateData.compactMode = compactMode;
      if (autoplayVideos !== undefined) updateData.autoplayVideos = autoplayVideos;
      if (theme !== undefined) updateData.theme = theme;
      if (language !== undefined) updateData.language = language;
      if (profileBackground !== undefined) updateData.profileBackground = profileBackground;
      if (showOnlineStatus !== undefined) updateData.showOnlineStatus = showOnlineStatus;
      if (allowFriendRequests !== undefined) updateData.allowFriendRequests = allowFriendRequests;
      if (showActivityStatus !== undefined) updateData.showActivityStatus = showActivityStatus;
      if (emailNotifications !== undefined) updateData.emailNotifications = emailNotifications;
      if (notifyFriendRequests !== undefined) updateData.notifyFriendRequests = notifyFriendRequests;
      if (notifyMessages !== undefined) updateData.notifyMessages = notifyMessages;
      if (notifyPostLikes !== undefined) updateData.notifyPostLikes = notifyPostLikes;
      if (notifyComments !== undefined) updateData.notifyComments = notifyComments;
      
      // Only call updateUser if there are actually fields to update
      if (Object.keys(updateData).length > 0) {
        const updatedUser = await storage.updateUser(req.user.id, updateData);
        res.json(updatedUser);
      } else {
        // If no fields to update, just return the current user
        const currentUser = await storage.getUser(req.user.id);
        res.json(currentUser);
      }
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

        // Add photo to Profile Pictures album
        const profilePicturesAlbum = await db
          .select()
          .from(albums)
          .where(and(eq(albums.profileId, profileId), eq(albums.name, "Profile Pictures")))
          .limit(1);

        if (profilePicturesAlbum.length > 0) {
          await db.insert(photos).values({
            profileId,
            albumId: profilePicturesAlbum[0].id,
            imageUrl: profileImageUrl,
            caption: "Profile picture"
          });
          console.log("Added photo to Profile Pictures album");
        }

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

        // Add photo to Cover Photos album
        const coverPhotosAlbum = await db
          .select()
          .from(albums)
          .where(and(eq(albums.profileId, profileId), eq(albums.name, "Cover Photos")))
          .limit(1);

        if (coverPhotosAlbum.length > 0) {
          await db.insert(photos).values({
            profileId,
            albumId: coverPhotosAlbum[0].id,
            imageUrl: coverImageUrl,
            caption: "Cover photo"
          });
          console.log("Added photo to Cover Photos album");
        }

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

  // Update cover photo position endpoint for specific profiles
  app.patch('/api/profiles/:profileId/cover-position', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const { x, y } = req.body;

      console.log("Updating profile cover position:", { profileId, x, y });

      // Validate position values
      if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 100 || y < 0 || y > 100) {
        return res.status(400).json({ message: "Invalid position values. X and Y must be between 0 and 100." });
      }

      // Update profile's cover position in database
      await storage.updateProfile(profileId, { 
        coverPositionX: x,
        coverPositionY: y 
      });

      console.log("Profile cover position updated successfully");

      res.json({ 
        message: "Cover photo position updated successfully",
        position: { x, y }
      });
    } catch (error) {
      console.error("Error updating profile cover position:", error);
      res.status(500).json({ message: "Failed to update cover photo position" });
    }
  });

  // Update profile picture position endpoint for specific profiles
  app.patch('/api/profiles/:profileId/profile-position', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const { x, y } = req.body;

      console.log("Updating profile picture position:", { profileId, x, y });

      // Validate position values
      if (typeof x !== 'number' || typeof y !== 'number' || x < 0 || x > 100 || y < 0 || y > 100) {
        return res.status(400).json({ message: "Invalid position values. X and Y must be between 0 and 100." });
      }

      // Update profile's picture position in database
      await storage.updateProfile(profileId, { 
        profilePositionX: x,
        profilePositionY: y 
      });

      console.log("Profile picture position updated successfully");

      res.json({ 
        message: "Profile picture position updated successfully",
        position: { x, y }
      });
    } catch (error) {
      console.error("Error updating profile picture position:", error);
      res.status(500).json({ message: "Failed to update profile picture position" });
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

  // Background image upload endpoint
  app.post('/api/user/background-image', isAuthenticated, (req: any, res, next) => {
    console.log("POST /api/user/background-image - Raw request received");
    console.log("Content-Type:", req.headers['content-type']);

    const uploadSingle = upload.single('image');

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
        const backgroundImageUrl = `/uploads/${req.file.filename}`;

        console.log("Updating background image:", { userId, backgroundImageUrl });

        // Update user's background image URL in database
        const updatedUser = await storage.updateUser(userId, { backgroundImageUrl });

        console.log("Background image updated successfully");

        res.json({ 
          message: "Background image updated successfully",
          backgroundImageUrl,
          user: updatedUser
        });
      } catch (error) {
        console.error("Error uploading background image:", error);
        res.status(500).json({ message: "Failed to upload background image" });
      }
    });
  });

  // Remove background image endpoint
  app.delete('/api/user/background-image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      console.log("Removing background image for user:", userId);

      // Update user's background image URL to null in database
      const updatedUser = await storage.updateUser(userId, { backgroundImageUrl: null });

      console.log("Background image removed successfully");

      res.json({ 
        message: "Background image removed successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error removing background image:", error);
      res.status(500).json({ message: "Failed to remove background image" });
    }
  });

  // Profile background image routes
  app.post('/api/profile/background-image', isAuthenticated, upload.single('background'), async (req: any, res) => {
    try {
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("Uploading profile background image for user:", userId);

      // Get the active profile
      const activeProfile = await storage.getActiveProfile(userId);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile found" });
      }

      const backgroundImageUrl = `/uploads/${req.file.filename}`;

      // Update the profile's background image
      const updatedProfile = await storage.updateProfile(activeProfile.id, { 
        backgroundImageUrl,
        profileBackground: 'custom-photo'
      });

      // Add photo to Background Pictures album
      const backgroundPicturesAlbum = await db
        .select()
        .from(albums)
        .where(and(eq(albums.profileId, activeProfile.id), eq(albums.name, "Background Pictures")))
        .limit(1);

      if (backgroundPicturesAlbum.length > 0) {
        await db.insert(photos).values({
          profileId: activeProfile.id,
          albumId: backgroundPicturesAlbum[0].id,
          imageUrl: backgroundImageUrl,
          caption: "Background image"
        });
        console.log("Added photo to Background Pictures album");
      }

      console.log("Profile background image uploaded successfully:", backgroundImageUrl);

      res.json({ 
        message: "Profile background image uploaded successfully",
        backgroundImageUrl,
        profile: updatedProfile
      });
    } catch (error) {
      console.error("Error uploading profile background image:", error);
      res.status(500).json({ message: "Failed to upload profile background image" });
    }
  });

  app.delete('/api/profile/background-image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;

      console.log("Removing profile background image for user:", userId);

      // Get the active profile
      const activeProfile = await storage.getActiveProfile(userId);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile found" });
      }

      // Update profile's background image URL to null in database
      const updatedProfile = await storage.updateProfile(activeProfile.id, { 
        backgroundImageUrl: null,
        profileBackground: null
      });

      console.log("Profile background image removed successfully");

      res.json({ 
        message: "Profile background image removed successfully",
        profile: updatedProfile
      });
    } catch (error) {
      console.error("Error removing profile background image:", error);
      res.status(500).json({ message: "Failed to remove profile background image" });
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

      // Prevent creation of multiple audience profiles
      if (profileData.type === 'audience') {
        const existingProfiles = await storage.getProfilesByUserId(userId);
        const existingAudienceProfile = existingProfiles.find(p => p.type === 'audience' && !p.deletedAt);

        if (existingAudienceProfile) {
          return res.status(400).json({ 
            message: "You can only have one audience profile. Use your existing audience profile instead." 
          });
        }
      }

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

  app.get('/api/profiles/search', async (req, res) => {
    try {
      const query = req.query.q as string;
      const type = req.query.type as string;
      const location = req.query.location as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!query && !type && !location) {
        return res.json([]);
      }

      const profiles = await storage.searchProfiles(query, type, location, limit, offset);
      res.json(profiles);
    } catch (error) {
      console.error("Error searching profiles:", error);
      res.status(500).json({ message: "Failed to search profiles" });
    }
  });

  app.get('/api/discover', isAuthenticated, async (req: any, res) => {
    try {
      const type = req.query.type as string;
      const location = req.query.location as string;
      const genre = req.query.genre as string;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      // Get the user's active profile to exclude it from results
      const activeProfile = await storage.getActiveProfile(req.user.id);
      const excludeProfileId = activeProfile?.id;

      const profiles = await storage.discoverProfiles(type, location, genre, limit, offset, excludeProfileId);
      
      // Debug logging to understand what profiles are being returned
      console.log("Discover profiles returned:", profiles.map(p => ({ id: p.id, name: p.name, type: p.type })));
      
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching discover profiles:", error);
      res.status(500).json({ message: "Failed to fetch discover profiles" });
    }
  });

  app.get('/api/profiles/:id', async (req, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const profile = await storage.getProfile(profileId);

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Track profile view if user is authenticated (with error handling)
      if (req.user) {
        try {
          const activeProfile = await storage.getActiveProfile(req.user.id);
          if (activeProfile) {
            await storage.trackProfileView(
              req.user.id,
              activeProfile.id,
              profileId,
              req.sessionID,
              req.ip,
              req.get('User-Agent')
            );
          }
        } catch (viewError) {
          // Don't fail the entire request if profile view tracking fails
          console.warn("Failed to track profile view:", viewError);
        }
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Get user's profiles by user ID (for navigation from notifications)
  app.get('/api/users/:userId/profiles', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const profiles = await storage.getProfilesByUserId(userId);

      if (!profiles || profiles.length === 0) {
        return res.status(404).json({ message: "No profiles found for this user" });
      }

      // Return the active profile or the first profile
      const activeProfile = profiles.find(p => p.isActive) || profiles[0];
      res.json(activeProfile);
    } catch (error) {
      console.error("Error fetching user profiles:", error);
      res.status(500).json({ message: "Failed to fetch user profiles" });
    }
  });

  // Friend routes
  app.get('/api/friends', isAuthenticated, async (req: any, res) => {
    try {
      // Get all user profiles and combine their friends
      const userProfiles = await storage.getProfilesByUserId(req.user.id);
      console.log(`Found ${userProfiles.length} profiles for user ${req.user.id}:`, userProfiles.map(p => `${p.id} (${p.name}, ${p.type})`));
      
      const allFriends = [];
      const seenFriendIds = new Set();
      
      for (const profile of userProfiles) {
        if (profile.deletedAt) continue; // Skip deleted profiles
        
        console.log(`Fetching friends for profile ${profile.id} (${profile.name})`);
        const friends = await storage.getFriends(profile.id);
        console.log(`Found ${friends.length} friends for profile ${profile.id}:`, friends.map(f => `${f.id} (${f.name})`));
        
        // Add friends to the list, avoiding duplicates
        for (const friend of friends) {
          if (!seenFriendIds.has(friend.id)) {
            seenFriendIds.add(friend.id);
            allFriends.push(friend);
          }
        }
      }
      
      console.log(`Total unique friends found: ${allFriends.length}`);
      res.json(allFriends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });

  app.get('/api/profiles/:id/friends', async (req, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const friends = await storage.getFriends(profileId);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching profile friends:", error);
      res.status(500).json({ message: "Failed to fetch profile friends" });
    }
  });

  app.get('/api/friend-requests', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      console.log(`Fetching friend requests for active profile ${activeProfile.id} (${activeProfile.name})`);

      // Get friend requests using a simpler query
      const friendshipRequests = await db
        .select({
          id: friendships.id,
          requesterId: friendships.requesterId,
          addresseeId: friendships.addresseeId,
          status: friendships.status,
          createdAt: friendships.createdAt,
          requesterProfile: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
            type: profiles.type,
            bio: profiles.bio
          }
        })
        .from(friendships)
        .leftJoin(profiles, eq(friendships.requesterId, profiles.id))
        .where(and(
          eq(friendships.addresseeId, activeProfile.id),
          eq(friendships.status, 'pending')
        ))
        .orderBy(sql`${friendships.createdAt} DESC`);

      console.log(`Found ${friendshipRequests.length} pending friend requests for profile ${activeProfile.id}`);
      console.log('All pending friendships in database:');
      
      // Debug: Check all pending friendships
      const allPendingFriendships = await db
        .select()
        .from(friendships)
        .where(eq(friendships.status, 'pending'));
      
      console.log('All pending friendships:', allPendingFriendships);

      // Log the structure of requests to debug
      if (friendshipRequests.length > 0) {
        console.log('Sample friend request structure:', JSON.stringify(friendshipRequests[0], null, 2));
      }

      res.json(friendshipRequests);
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

      // Send notification - only to the specific target profile, not all profiles
      const { notificationService } = await import('./notifications');
      const targetProfile = await storage.getProfile(addresseeId);
      if (targetProfile?.userId) {
        const senderProfile = activeProfile; // Use the sender's active profile
        const senderName = senderProfile.name; // Use profile name instead of user name
        console.log(`Creating friend request notification for user ${targetProfile.userId} from profile ${senderProfile.name} (ID: ${senderProfile.id}) to profile ${targetProfile.name} (ID: ${targetProfile.id})`);
        console.log(`Sender profile image URL: ${senderProfile.profileImageUrl}`);
        
        // For same-user cross-profile requests, auto-accept to create connection
        if (targetProfile.userId === req.user.id) {
          console.log(`Auto-accepting friend request between user's own profiles`);
          await storage.acceptFriendRequest(friendship.id);
          res.json({ ...friendship, status: 'accepted', autoAccepted: true });
        } else {
          await notificationService.notifyFriendRequest(targetProfile.userId, req.user.id, senderName, friendship.id, targetProfile.id, senderProfile.id);
          res.json(friendship);
        }
      } else {
        res.json(friendship);
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      res.status(500).json({ message: "Failed to send friend request" });
    }
  });

  app.post('/api/friend-requests/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const friendshipId = parseInt(req.params.id);

      // Check if the friendship exists and user has permission
      const existingFriendship = await storage.getFriendshipById(friendshipId);
      if (!existingFriendship) {
        return res.status(404).json({ message: "Friend request not found" });
      }

      // Check if the current user is the addressee (can accept the request)
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile || existingFriendship.addresseeId !== activeProfile.id) {
        return res.status(403).json({ message: "You can only accept friend requests sent to you" });
      }

      if (existingFriendship.status !== 'pending') {
        return res.status(400).json({ message: "Friend request has already been processed" });
      }

      const friendship = await storage.acceptFriendRequest(friendshipId);

      // Clean up the friend request notification
      await db
        .delete(notifications)
        .where(and(
          eq(notifications.type, 'friend_request'),
          eq(notifications.recipientId, req.user.id),
          sql`${notifications.data}->>'friendshipId' = ${friendshipId.toString()}`
        ));

      // Send notification to the requester
      const { notificationService } = await import('./notifications');
      const requesterProfile = await storage.getProfile(friendship.requesterId);
      if (requesterProfile?.userId) {
        const accepterUser = await storage.getUser(req.user.id);
        const accepterName = `${accepterUser?.firstName} ${accepterUser?.lastName}`;
        await notificationService.notifyFriendAccepted(requesterProfile.userId, req.user.id, accepterName, friendship.requesterId);
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

      // Check if the friendship exists and user has permission
      const existingFriendship = await storage.getFriendshipById(friendshipId);
      if (!existingFriendship) {
        return res.status(404).json({ message: "Friend request not found" });
      }

      // Check if the current user is the addressee (can reject the request)
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile || existingFriendship.addresseeId !== activeProfile.id) {
        return res.status(403).json({ message: "You can only reject friend requests sent to you" });
      }

      if (existingFriendship.status !== 'pending') {
        return res.status(400).json({ message: "Friend request has already been processed" });
      }

      const friendship = await storage.rejectFriendRequest(friendshipId);

      // Clean up the friend request notification
      await db
        .delete(notifications)
        .where(and(
          eq(notifications.type, 'friend_request'),
          eq(notifications.recipientId, req.user.id),
          sql`${notifications.data}->>'friendshipId' = ${friendshipId.toString()}`
        ));

      res.json(friendship);
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      res.status(500).json({ message: "Failed to reject friend request" });
    }
  });

  app.delete('/api/friendships/:id', isAuthenticated, async (req: any, res) => {
    try {
      const friendshipId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);

      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Get the friendship to verify user can delete it
      const friendship = await storage.getFriendshipById(friendshipId);
      if (!friendship) {
        return res.status(404).json({ message: "Friendship not found" });
      }

      // Check if the current user is part of this friendship
      if (friendship.requesterId !== activeProfile.id && friendship.addresseeId !== activeProfile.id) {
        return res.status(403).json({ message: "Unauthorized to delete this friendship" });
      }

      await storage.deleteFriendship(friendshipId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error unfriending user:", error);
      res.status(500).json({ message: "Failed to unfriend user" });
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

      // Check both directions for friendship
      let friendship = await storage.getFriendshipStatus(activeProfile.id, targetProfileId);
      
      // If not found in one direction, check the other direction
      if (!friendship) {
        friendship = await storage.getFriendshipStatus(targetProfileId, activeProfile.id);
      }

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

  // Get artists followed by audience profile
  app.get('/api/profiles/:id/following-artists', async (req, res) => {
    try {
      const profileId = parseInt(req.params.id);
      
      // Get friends who are artists
      const friendArtists = await db
        .select({
          id: profiles.id,
          name: profiles.name,
          profileImageUrl: profiles.profileImageUrl,
          bio: profiles.bio,
          location: profiles.location,
          type: profiles.type
        })
        .from(friendships)
        .innerJoin(profiles, eq(friendships.requesterId, profiles.id))
        .where(and(
          eq(friendships.addresseeId, profileId),
          eq(friendships.status, 'accepted'),
          eq(profiles.type, 'artist')
        ))
        .union(
          db
            .select({
              id: profiles.id,
              name: profiles.name,
              profileImageUrl: profiles.profileImageUrl,
              bio: profiles.bio,
              location: profiles.location,
              type: profiles.type
            })
            .from(friendships)
            .innerJoin(profiles, eq(friendships.addresseeId, profiles.id))
            .where(and(
              eq(friendships.requesterId, profileId),
              eq(friendships.status, 'accepted'),
              eq(profiles.type, 'artist')
            ))
        );

      res.json(friendArtists);
    } catch (error) {
      console.error("Error fetching followed artists:", error);
      res.status(500).json({ message: "Failed to fetch followed artists" });
    }
  });

  // Get most viewed artist profile for a user
  app.get('/api/profiles/:id/most-viewed-artist', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      
      // Verify the profile belongs to the authenticated user or allow if public
      const profile = await storage.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Only allow the profile owner to view their most viewed data
      if (profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const mostViewedArtist = await storage.getMostViewedArtistProfile(req.user.id, profileId);
      res.json(mostViewedArtist);
    } catch (error) {
      console.error("Error fetching most viewed artist:", error);
      res.status(500).json({ message: "Failed to fetch most viewed artist" });
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

      // Get active profile to filter notifications
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Add no-cache headers to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      const notifications = await notificationService.getUserNotifications(
        req.user.id,
        parseInt(limit),
        parseInt(offset),
        activeProfile.id,
        activeProfile.type,
        false // Include all relevant notifications including booking requests
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

      // Get active profile to filter notifications
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.json({ count: 0 });
      }

      // Add no-cache headers to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');

      const count = await notificationService.getUnreadCount(
        req.user.id,
        activeProfile.id,
        activeProfile.type,
        true // Exclude friend requests from notifications page count
      );
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Get notification counts for all profiles
  app.get('/api/notifications/counts-by-profile', isAuthenticated, async (req: any, res) => {
    try {
      const { notificationService } = await import('./notifications');
      const userProfiles = await storage.getProfilesByUserId(req.user.id);

      const counts = {};

      console.log(`Calculating notification counts for user ${req.user.id} with profiles:`, userProfiles.map(p => ({ id: p.id, name: p.name, type: p.type })));

      for (const profile of userProfiles) {
        // Get general notification count (excluding friend requests)
        const notificationCount = await notificationService.getUnreadCount(
          req.user.id,
          profile.id,
          profile.type,
          true // Exclude friend requests from general notification counts
        );

        // Get friend request count specifically for this profile
        const friendRequestCount = await notificationService.getUnreadCount(
          req.user.id,
          profile.id,
          profile.type,
          false // Include friend requests
        ) - notificationCount; // Subtract general notifications to get only friend requests

        console.log(`Profile ${profile.id} (${profile.name}, ${profile.type}): ${notificationCount} notifications, ${friendRequestCount} friend requests`);

        counts[profile.id] = {
          notifications: notificationCount,
          friendRequests: friendRequestCount,
          total: notificationCount + friendRequestCount
        };
      }

      console.log("Final counts object:", counts);
      console.log("Counts object stringified:", JSON.stringify(counts));
      console.log("Counts object type:", typeof counts);
      console.log("Counts object constructor:", counts.constructor.name);

      // Add no-cache headers to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Content-Type', 'application/json');

      console.log("About to send response:", counts);
      console.log("Response will be:", JSON.stringify(counts));

      // Explicitly return the JSON response
      const response = res.status(200).json(counts);
      console.log("Response sent successfully");
      return response;
    } catch (error) {
      console.error("Error fetching profile notification counts:", error);
      res.status(500).json({ message: "Failed to fetch profile notification counts", error: error.message });
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

      // Get the notification first to check if it's a friend request
      const notification = await db
        .select()
        .from(notifications)
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.recipientId, req.user.id)
        ));

      if (notification.length > 0 && notification[0].type === 'friend_request') {
        const data = notification[0].data as any;
        const friendshipId = data?.friendshipId;

        // If this is a friend request notification, also delete the pending friendship
        if (friendshipId) {
          await db
            .delete(friendships)
            .where(and(
              eq(friendships.id, friendshipId),
              eq(friendships.status, 'pending')
            ));

          console.log(`Deleted pending friendship ${friendshipId} when deleting notification ${notificationId}`);
        }
      }

      await notificationService.deleteNotification(notificationId, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Gallery photo routes
  app.get('/api/profiles/:id/photos', async (req, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const photos = await storage.getProfilePhotos(profileId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching profile photos:", error);
      res.status(500).json({ message: "Failed to fetch photos" });
    }
  });

  app.post('/api/profiles/:id/photos', isAuthenticated, (req: any, res, next) => {
    const profileId = parseInt(req.params.id);

    upload.array('photos', 10)(req, res, async (err) => {
      try {
        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ message: err.message });
        }

        if (!req.files || req.files.length === 0) {
          return res.status(400).json({ message: "No files uploaded" });
        }

        // Verify profile ownership
        const profile = await storage.getProfile(profileId);
        if (!profile || profile.userId !== req.user.id) {
          return res.status(403).json({ message: "Unauthorized" });
        }

        const photoData = [];
        const files = req.files as Express.Multer.File[];
        const albumId = req.body.albumId ? parseInt(req.body.albumId) : null;

        console.log('Processing photo upload with albumId:', albumId, 'for profile:', profileId);

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const caption = req.body[`caption_${i}`] || '';
          const tags = req.body[`tags_${i}`] ? JSON.parse(req.body[`tags_${i}`]) : [];
          const friendTags = req.body[`friendTags_${i}`] ? JSON.parse(req.body[`friendTags_${i}`]) : [];

          photoData.push({
            profileId,
            albumId,
            imageUrl: `/uploads/${file.filename}`,
            caption,
            tags,
            friendTags,
          });
        }

        console.log('Photo data to be created:', photoData);

        const photos = await storage.createProfilePhotos(photoData);

        // Send notifications to tagged friends
        const { notificationService } = await import('./notifications');
        for (const photo of photos) {
          if (photo.friendTags && photo.friendTags.length > 0) {
            // Get the profile that uploaded the photo
            const uploaderProfile = await storage.getProfile(photo.profileId);
            if (uploaderProfile) {
              // Get the uploader's user details
              const uploaderUser = await storage.getUser(req.user.id);
              const uploaderName = `${uploaderUser?.firstName} ${uploaderUser?.lastName}`;

              // Send notification to each tagged friend
              for (const friendProfileId of photo.friendTags) {
                const friendProfile = await storage.getProfile(friendProfileId);
                if (friendProfile?.userId) {
                  await notificationService.notifyPhotoTag(
                    friendProfile.userId,
                    req.user.id,
                    uploaderName,
                    photo.id,
                    photo.caption || "a photo",
                    photo.imageUrl
                  );
                }
              }
            }
          }
        }

        res.json(photos);
      } catch (error) {
        console.error("Error uploading photos:", error);
        res.status(500).json({ message: "Failed to upload photos" });
      }
    });
  });

  // Update photo
  app.put("/api/photos/:photoId", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId);
      const { caption, friendTags } = req.body;

      const photo = await storage.getPhoto(photoId);

      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      // Check if user owns the photo's profile
      const profile = await storage.getProfile(photo.profileId);
      if (!profile || profile.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to update this photo" });
      }

      const updateData: any = {};
      if (caption !== undefined) updateData.caption = caption;
      if (friendTags !== undefined) updateData.friendTags = friendTags;

      const updatedPhoto = await storage.updatePhoto(photoId, updateData);
      res.json(updatedPhoto);
    } catch (error) {
      console.error("Error updating photo:", error);
      res.status(500).json({ error: "Failed to update photo" });
    }
  });

  // Delete photo
  app.delete("/api/photos/:photoId", requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.photoId);
      const photo = await storage.getPhoto(photoId);

      if (!photo) {
        return res.status(404).json({ error: "Photo not found" });
      }

      // Check if user owns the photo's profile
      const profile = await storage.getProfile(photo.profileId);
      if (!profile || profile.userId !== req.user!.id) {
        return res.status(403).json({ error: "Not authorized to delete this photo" });
      }

      await storage.deletePhoto(photoId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // Album routes
  app.get('/api/profiles/:id/albums', async (req, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const albums = await storage.getProfileAlbums(profileId);
      res.json(albums);
    } catch (error) {
      console.error("Error fetching profile albums:", error);
      res.status(500).json({ message: "Failed to fetch albums" });
    }
  });

  app.post('/api/profiles/:id/albums', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const { name, description } = req.body;

      // Verify profile ownership
      const profile = await storage.getProfile(profileId);
      if (!profile || profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const album = await storage.createAlbum({
        profileId,
        name,
        description,
        coverPhotoId: null,
      });

      res.json(album);
    } catch (error) {
      console.error("Error creating album:", error);
      res.status(500).json({ message: "Failed to create album" });
    }
  });

  app.get('/api/albums/:id', async (req, res) => {
    try {
      const albumId = parseInt(req.params.id);
      const album = await storage.getAlbum(albumId);

      if (!album) {
        return res.status(404).json({ message: "Album not found" });
      }

      res.json(album);
    } catch (error) {
      console.error("Error fetching album:", error);
      res.status(500).json({ message: "Failed to fetch album" });
    }
  });

  app.put('/api/albums/:id', isAuthenticated, async (req: any, res) => {
    try {
      const albumId = parseInt(req.params.id);
      const { name, description, coverPhotoId } = req.body;

      // Verify album ownership
      const album = await storage.getAlbum(albumId);
      if (!album) {
        return res.status(404).json({ message: "Album not found" });
      }

      const profile = await storage.getProfile(album.profileId);
      if (!profile || profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const updatedAlbum = await storage.updateAlbum(albumId, {
        name,
        description,
        coverPhotoId,
      });

      res.json(updatedAlbum);
    } catch (error) {
      console.error("Error updating album:", error);
      res.status(500).json({ message: "Failed to update album" });
    }
  });

  app.delete('/api/albums/:id', isAuthenticated, async (req: any, res) => {
    try {
      const albumId = parseInt(req.params.id);

      // Verify album ownership
      const album = await storage.getAlbum(albumId);
      if (!album) {
        return res.status(404).json({ message: "Album not found" });
      }

      const profile = await storage.getProfile(album.profileId);
      if (!profile || profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.deleteAlbum(albumId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting album:", error);
      res.status(500).json({ message: "Failed to delete album" });
    }
  });

  app.get('/api/albums/:id/photos', async (req, res) => {
    try {
      const albumId = parseInt(req.params.id);
      const photos = await storage.getAlbumPhotos(albumId);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching album photos:", error);
      res.status(500).json({ message: "Failed to fetch album photos" });
    }
  });

  app.post('/api/albums/:id/photos', isAuthenticated, async (req: any, res) => {
    try {
      const albumId = parseInt(req.params.id);
      const { photoIds } = req.body;

      // Verify album ownership
      const album = await storage.getAlbum(albumId);
      if (!album) {
        return res.status(404).json({ message: "Album not found" });
      }

      const profile = await storage.getProfile(album.profileId);
      if (!profile || profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.addPhotosToAlbum(photoIds, albumId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding photos to album:", error);
      res.status(500).json({ message: "Failed to add photos to album" });
    }
  });

  app.delete('/api/albums/:id/photos', isAuthenticated, async (req: any, res) => {
    try {
      const albumId = parseInt(req.params.id);
      const { photoIds } = req.body;

      // Verify album ownership
      const album = await storage.getAlbum(albumId);
      if (!album) {
        return res.status(404).json({ message: "Album not found" });
      }

      const profile = await storage.getProfile(album.profileId);
      if (!profile || profile.userId !== req.user.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      await storage.removePhotosFromAlbum(photoIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing photos from album:", error);
      res.status(500).json({ message: "Failed to remove photos from album" });
    }
  });

  // Photo comment routes
  app.get('/api/photos/:id/comments', async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      const comments = await storage.getPhotoComments(photoId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching photo comments:", error);
      res.status(500).json({ message: "Failed to fetch photo comments" });
    }
  });

  app.post('/api/photos/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const photoId = parseInt(req.params.id);
      const { content, parentId, friendTags } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }

      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const commentData: any = {
        photoId,
        profileId: activeProfile.id,
        content: content.trim(),
        friendTags: friendTags || [],
      };

      if (parentId) {
        commentData.parentId = parseInt(parentId);
      }

      const comment = await storage.createPhotoComment(commentData);

      // Send notification to photo owner
      const { notificationService } = await import('./notifications');
      const photo = await storage.getPhoto(photoId);
      if (photo) {
        const photoOwnerProfile = await storage.getProfile(photo.profileId);
        if (photoOwnerProfile?.userId && photoOwnerProfile.userId !== req.user.id) {
          const commenterUser = await storage.getUser(req.user.id);
          const commenterName = `${commenterUser?.firstName} ${commenterUser?.lastName}`;
          await notificationService.notifyPhotoComment(
            photoOwnerProfile.userId, 
            req.user.id, 
            commenterName, 
            photoId, 
            content.trim(),
            photo.imageUrl
          );
        }
      }

      // Send notifications to tagged friends in the comment
      if (friendTags && friendTags.length > 0) {
        const commenterUser = await storage.getUser(req.user.id);
        const commenterName = `${commenterUser?.firstName} ${commenterUser?.lastName}`;

        for (const friendProfileId of friendTags) {
          const friendProfile = await storage.getProfile(friendProfileId);
          if (friendProfile?.userId && friendProfile.userId !== req.user.id) {
            await notificationService.notifyCommentTag(
              friendProfile.userId,
              req.user.id,
              commenterName,
              photoId,
              content.trim(),
              photo?.imageUrl || ""
            );
          }
        }
      }

      res.json(comment);
    } catch (error) {
      console.error("Error creating photo comment:", error);
      res.status(500).json({ message: "Failed to create photo comment" });
    }
  });

  app.delete('/api/photo-comments/:id', requireAuth, async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const userId = req.user!.id;

      // Check if comment exists and belongs to user
      const [comment] = await db
        .select()
        .from(photoComments)
        .where(eq(photoComments.id, commentId));

      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }

      // Get profile that owns this comment
      const [commentProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, comment.profileId));

      if (!commentProfile || commentProfile.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
      }

      await db.delete(photoComments).where(eq(photoComments.id, commentId));

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting photo comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  // Set photo as profile/cover/background image
  app.post('/api/photos/:id/set-as', requireAuth, async (req, res) => {
    try {
      const photoId = parseInt(req.params.id);
      const { type } = req.body;
      const userId = req.user!.id;

      if (!['profile', 'cover', 'background'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be profile, cover, or background' });
      }

      // Get the photo and verify ownership
      const [photo] = await db
        .select({
          id: photos.id,
          imageUrl: photos.imageUrl,
          profileId: photos.profileId
        })
        .from(photos)
        .where(eq(photos.id, photoId));

      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }

      // Get the profile that owns this photo
      const [photoProfile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, photo.profileId));

      if (!photoProfile || photoProfile.userId !== userId) {
        return res.status(403).json({ error: 'Not authorized to use this photo' });
      }

      // Update the profile with the new image URL
      const updateData: any = {};
      if (type === 'profile') {
        updateData.profileImageUrl = photo.imageUrl;
      } else if (type === 'cover') {
        updateData.coverImageUrl = photo.imageUrl;
      } else if (type === 'background') {
        updateData.backgroundImageUrl = photo.imageUrl;
        updateData.profileBackground = 'custom-photo';
      }

      await db
        .update(profiles)
        .set(updateData)
        .where(eq(profiles.id, photo.profileId));

      // If setting as background, also update user's background settings
      if (type === 'background') {
        await db
          .update(users)
          .set({
            backgroundImageUrl: photo.imageUrl,
            profileBackground: 'custom-photo'
          })
          .where(eq(users.id, userId));
      }

      res.json({ success: true, type, imageUrl: photo.imageUrl });
    } catch (error) {
      console.error('Error setting photo as image:', error);
      res.status(500).json({ error: 'Failed to set photo as image' });
    }
  });

  // Calendar events routes
  app.get('/api/calendar-events', isAuthenticated, async (req: any, res) => {
    console.log('=== CALENDAR EVENTS API CALLED ===');
    console.log('Query params:', req.query);
    console.log('User ID:', req.user?.id);
    
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        console.log('No active profile found for user:', req.user.id);
        return res.status(400).json({ message: "No active profile" });
      }

      // Check if profileId query param is provided to fetch events for specific profile
      const profileIdParam = req.query.profileId as string;
      const profileIdsParam = req.query.profileIds as string;
      
      if (profileIdsParam) {
        const profileIds = profileIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
        console.log('Fetching events for multiple profiles:', profileIds);
        const events = await storage.getCalendarEventsForProfiles(profileIds);
        console.log('Retrieved events:', events);
        res.json(events);
      } else if (profileIdParam) {
        const profileId = parseInt(profileIdParam);
        console.log(`Fetching events for specific profile: ${profileId}`);
        const events = await storage.getCalendarEvents(profileId);
        console.log('Retrieved events:', events);
        res.json(events);
      } else {
        console.log(`Fetching events for active profile: ${activeProfile.id}`);
        const events = await storage.getCalendarEvents(activeProfile.id);
        console.log('Retrieved events:', events);
        res.json(events);
      }
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.post('/api/calendar-events', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      console.log('Calendar event request body:', req.body);

      const { title, date, startTime, endTime, type, status, client, location, notes, budget, isPrivate } = req.body;

      // Validate required fields
      if (!title || !title.trim()) {
        return res.status(400).json({ message: "Title is required" });
      }

      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }

      if (!startTime) {
        return res.status(400).json({ message: "Start time is required" });
      }

      // Clean and validate the data
      const cleanTitle = title.trim();
      const cleanType = type || 'event';
      const cleanStatus = status || 'confirmed';
      const cleanClient = client && client.trim() ? client.trim() : null;
      const cleanLocation = location && location.trim() ? location.trim() : null;
      const cleanNotes = notes && notes.trim() ? notes.trim() : null;
      
      // Parse budget carefully
      let parsedBudget = null;
      if (budget !== undefined && budget !== null && budget !== '') {
        const budgetNum = parseFloat(budget);
        if (!isNaN(budgetNum)) {
          parsedBudget = budgetNum;
        }
      }

      const eventData = {
        profileId: activeProfile.id,
        title: cleanTitle,
        date: new Date(date),
        startTime,
        endTime: endTime || null,
        type: cleanType,
        status: cleanStatus,
        client: cleanClient,
        location: cleanLocation,
        notes: cleanNotes,
        budget: parsedBudget,
        isPrivate: Boolean(isPrivate)
      };

      console.log('Creating calendar event with cleaned data:', eventData);

      const event = await storage.createCalendarEvent(eventData);
      console.log('Calendar event created successfully:', event);
      
      res.json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to create calendar event",
        error: error.message 
      });
    }
  });

  app.put('/api/calendar-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Verify event belongs to active profile
      const existingEvents = await storage.getCalendarEvents(activeProfile.id);
      const eventExists = existingEvents.find(e => e.id === eventId);
      
      if (!eventExists) {
        return res.status(404).json({ message: "Event not found or unauthorized" });
      }

      const event = await storage.updateCalendarEvent(eventId, req.body);
      res.json(event);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ message: "Failed to update calendar event" });
    }
  });

  app.delete('/api/calendar-events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventIdParam = req.params.id;
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Handle mock events (IDs starting with "mock-" or containing non-numeric characters)
      if (eventIdParam.includes('mock-') || isNaN(parseInt(eventIdParam))) {
        // For mock events, just return success since they're not stored in the database
        console.log(`Simulating deletion of mock event: ${eventIdParam}`);
        return res.json({ success: true });
      }

      const eventId = parseInt(eventIdParam);
      await storage.deleteCalendarEvent(eventId, activeProfile.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });

  // Booking request routes
  // Create booking request
  app.post('/api/booking-requests', isAuthenticated, async (req: any, res) => {
    try {
      const { venueId, eventDate, eventTime, budget, requirements, message } = req.body;

      console.log('Creating booking request with data:', { venueId, eventDate, eventTime, budget, requirements, message });

      const activeProfile = await storage.getActiveProfile(req.user.id);

      if (!activeProfile) {
        console.log('No active profile found for user:', req.user.id);
        return res.status(400).json({ message: "No active profile" });
      }

      if (activeProfile.type !== 'artist') {
        console.log('Active profile is not an artist:', activeProfile.type);
        return res.status(400).json({ message: "Only artists can send booking requests" });
      }

      // Validate venue exists
      const venueProfile = await storage.getProfile(venueId);
      if (!venueProfile) {
        console.log('Venue profile not found:', venueId);
        return res.status(400).json({ message: "Venue not found" });
      }

      if (venueProfile.type !== 'venue') {
        console.log('Target profile is not a venue:', venueProfile.type);
        return res.status(400).json({ message: "Target profile is not a venue" });
      }

      const bookingRequestData = {
        artistProfileId: activeProfile.id,
        venueProfileId: venueId,
        status: 'pending',
        requestedAt: new Date(),
        eventDate: eventDate ? new Date(eventDate) : null,
        eventTime: eventTime || null,
        budget: budget ? parseFloat(budget) : null,
        requirements: requirements || null,
        message: message || null
      };

      console.log('Creating booking request with data:', bookingRequestData);

      const bookingRequest = await storage.createBookingRequest(bookingRequestData);

      console.log('Booking request created successfully:', bookingRequest);

      // Send notification to venue
      try {
        const { notificationService } = await import('./notifications');
        if (venueProfile.userId) {
          const artistUser = await storage.getUser(req.user.id);
          const artistName = `${artistUser?.firstName} ${artistUser?.lastName}`;
          await notificationService.notifyBookingRequest(
            venueProfile.userId,
            req.user.id,
            artistName,
            activeProfile.name,
            bookingRequest.id // Pass the booking request ID
          );
          console.log('Notification sent successfully');
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't fail the request if notification fails
      }

      res.json(bookingRequest);
    } catch (error) {
      console.error("Error creating booking request:", error);
      res.status(500).json({ message: "Failed to create booking request", error: error.message });
    }
  });

  app.get('/api/booking-requests', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      let requests;
      const artistProfiles = alias(profiles, 'artistProfiles');
      const venueProfiles = alias(profiles, 'venueProfiles');

      if (activeProfile.type === 'artist') {
        // Get requests sent by this artist
        requests = await db
          .select({
            id: bookingRequests.id,
            artistProfileId: bookingRequests.artistProfileId,
            venueProfileId: bookingRequests.venueProfileId,
            status: bookingRequests.status,
            requestedAt: bookingRequests.requestedAt,
            eventDate: bookingRequests.eventDate,
            eventTime: bookingRequests.eventTime,
            budget: bookingRequests.budget,
            requirements: bookingRequests.requirements,
            message: bookingRequests.message,
            artistProfile: {
              id: artistProfiles.id,
              name: artistProfiles.name,
              profileImageUrl: artistProfiles.profileImageUrl,
              bio: artistProfiles.bio
            },
            venueProfile: {
              id: venueProfiles.id,
              name: venueProfiles.name,
              profileImageUrl: venueProfiles.profileImageUrl,
              location: venueProfiles.location
            }
          })
          .from(bookingRequests)
          .leftJoin(artistProfiles, eq(bookingRequests.artistProfileId, artistProfiles.id))
          .leftJoin(venueProfiles, eq(bookingRequests.venueProfileId, venueProfiles.id))
          .where(eq(bookingRequests.artistProfileId, activeProfile.id));
      } else if (activeProfile.type === 'venue') {
        // Get requests sent to this venue
        requests = await db
          .select({
            id: bookingRequests.id,
            artistProfileId: bookingRequests.artistProfileId,
            venueProfileId: bookingRequests.venueProfileId,
            status: bookingRequests.status,
            requestedAt: bookingRequests.requestedAt,
            eventDate: bookingRequests.eventDate,
            eventTime: bookingRequests.eventTime,
            budget: bookingRequests.budget,
            requirements: bookingRequests.requirements,
            message: bookingRequests.message,
            artistProfile: {
              id: artistProfiles.id,
              name: artistProfiles.name,
              profileImageUrl: artistProfiles.profileImageUrl,
              bio: artistProfiles.bio
            },
            venueProfile: {
              id: venueProfiles.id,
              name: venueProfiles.name,
              profileImageUrl: venueProfiles.profileImageUrl,
              location: venueProfiles.location
            }
          })
          .from(bookingRequests)
          .leftJoin(artistProfiles, eq(bookingRequests.artistProfileId, artistProfiles.id))
          .leftJoin(venueProfiles, eq(bookingRequests.venueProfileId, venueProfiles.id))
          .where(eq(bookingRequests.venueProfileId, activeProfile.id));
      } else {
        requests = [];
      }

      res.json(requests);
    } catch (error) {
      console.error('Error fetching booking requests:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Contract proposal routes

  // Create contract proposal
  app.post('/api/contract-proposals', isAuthenticated, async (req: any, res) => {
    try {
      const {
        bookingRequestId,
        venueId,
        title,
        description,
        terms,
        payment,
        requirements,
        attachments,
        expiresAt
      } = req.body;

      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      let targetProfileId;
      let bookingRequest;

      if (bookingRequestId) {
        // Existing booking request flow
        bookingRequest = await storage.getBookingRequestById(bookingRequestId);
        if (!bookingRequest) {
          return res.status(404).json({ message: "Booking request not found" });
        }

        // Only venue can propose contracts to artists for existing booking requests
        if (activeProfile.type !== 'venue' || bookingRequest.venueProfileId !== activeProfile.id) {
          return res.status(403).json({ message: "Only venues can propose contracts for their booking requests" });
        }
        targetProfileId = bookingRequest.artistProfileId;
      } else if (venueId) {
        // Direct contract proposal from artist to venue
        if (activeProfile.type !== 'artist') {
          return res.status(403).json({ message: "Only artists can send direct contract proposals" });
        }

        const venueProfile = await storage.getProfile(venueId);
        if (!venueProfile || venueProfile.type !== 'venue') {
          return res.status(404).json({ message: "Venue not found" });
        }
        targetProfileId = venueId;

        // Create a basic booking request for the contract
        const basicBookingData = {
          artistProfileId: activeProfile.id,
          venueProfileId: venueId,
          status: 'pending',
          requestedAt: new Date(),
          eventDate: null,
          eventTime: null,
          budget: null,
          requirements: null,
          message: 'Contract proposal submission'
        };

        bookingRequest = await storage.createBookingRequest(basicBookingData);
      } else {
        return res.status(400).json({ message: "Either bookingRequestId or venueId is required" });
      }

      const proposalData = {
        bookingRequestId: bookingRequest.id,
        proposedBy: activeProfile.id,
        proposedTo: targetProfileId,
        title,
        description,
        terms,
        payment,
        requirements,
        attachments: attachments || [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      };

      const [proposal] = await db.insert(contractProposals).values(proposalData).returning();

      // Send notification to the target profile
      const { notificationService } = await import('./notifications');
      const targetProfile = await storage.getProfile(targetProfileId);
      if (targetProfile?.userId) {
        const senderUser = await storage.getUser(req.user.id);
        const senderName = `${senderUser?.firstName} ${senderUser?.lastName}`;
        await notificationService.notifyContractProposal(
          targetProfile.userId,
          req.user.id,
          senderName,
          activeProfile.name,
          title
        );
      }

      res.json(proposal);
    } catch (error) {
      console.error("Error creating contract proposal:", error);
      res.status(500).json({ message: "Failed to create contract proposal" });
    }
  });

  // Get contract proposals for a booking request
  app.get('/api/booking-requests/:id/contracts', isAuthenticated, async (req: any, res) => {
    try {
      const bookingRequestId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const proposals = await db
        .select({
          id: contractProposals.id,
          bookingRequestId: contractProposals.bookingRequestId,
          title: contractProposals.title,
          description: contractProposals.description,
          terms: contractProposals.terms,
          payment: contractProposals.payment,
          requirements: contractProposals.requirements,
          attachments: contractProposals.attachments,
          status: contractProposals.status,
          expiresAt: contractProposals.expiresAt,
          acceptedAt: contractProposals.acceptedAt,
          rejectedAt: contractProposals.rejectedAt,
          createdAt: contractProposals.createdAt,
          updatedAt: contractProposals.updatedAt,
          proposer: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
            type: profiles.type
          }
        })
        .from(contractProposals)
        .leftJoin(profiles, eq(contractProposals.proposedBy, profiles.id))
        .where(eq(contractProposals.bookingRequestId, bookingRequestId))
        .orderBy(sql`${contractProposals.createdAt} DESC`);

      res.json(proposals);
    } catch (error) {
      console.error("Error fetching contract proposals:", error);
      res.status(500).json({ message: "Failed to fetch contract proposals" });
    }
  });

  // Get specific contract proposal with negotiations
  app.get('/api/contract-proposals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const proposalId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Get proposal details
      const [proposal] = await db
        .select({
          id: contractProposals.id,
          bookingRequestId: contractProposals.bookingRequestId,
          proposedBy: contractProposals.proposedBy,
          proposedTo: contractProposals.proposedTo,
          title: contractProposals.title,
          description: contractProposals.description,
          terms: contractProposals.terms,
          payment: contractProposals.payment,
          requirements: contractProposals.requirements,
          attachments: contractProposals.attachments,
          status: contractProposals.status,
          expiresAt: contractProposals.expiresAt,
          acceptedAt: contractProposals.acceptedAt,
          rejectedAt: contractProposals.rejectedAt,
          createdAt: contractProposals.createdAt,
          updatedAt: contractProposals.updatedAt,
        })
        .from(contractProposals)
        .where(eq(contractProposals.id, proposalId));

      if (!proposal) {
        return res.status(404).json({ message: "Contract proposal not found" });
      }

      // Check permissions
      if (proposal.proposedBy !== activeProfile.id && proposal.proposedTo !== activeProfile.id) {
        return res.status(403).json({ message: "Permission denied" });
      }

      // Get negotiations
      const negotiations = await db
        .select({
          id: contractNegotiations.id,
          message: contractNegotiations.message,
          proposedChanges: contractNegotiations.proposedChanges,
          createdAt: contractNegotiations.createdAt,
          profile: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
            type: profiles.type
          }
        })
        .from(contractNegotiations)
        .leftJoin(profiles, eq(contractNegotiations.profileId, profiles.id))
        .where(eq(contractNegotiations.contractProposalId, proposalId))
        .orderBy(sql`${contractNegotiations.createdAt} ASC`);

      // Get signatures
      const signatures = await db
        .select({
          id: contractSignatures.id,
          signedAt: contractSignatures.signedAt,
          profile: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
            type: profiles.type
          }
        })
        .from(contractSignatures)
        .leftJoin(profiles, eq(contractSignatures.profileId, profiles.id))
        .where(eq(contractSignatures.contractProposalId, proposalId));

      res.json({
        ...proposal,
        negotiations,
        signatures
      });
    } catch (error) {
      console.error("Error fetching contract proposal:", error);
      res.status(500).json({ message: "Failed to fetch contract proposal" });
    }
  });

  // Accept contract proposal
  app.post('/api/contract-proposals/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const proposalId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const [proposal] = await db
        .select()
        .from(contractProposals)
        .where(eq(contractProposals.id, proposalId));

      if (!proposal) {
        return res.status(404).json({ message: "Contract proposal not found" });
      }

      if (proposal.proposedTo !== activeProfile.id) {
        return res.status(403).json({ message: "Only the recipient can accept this proposal" });
      }

      if (proposal.status !== 'pending') {
        return res.status(400).json({ message: "Proposal is not in pending status" });
      }

      // Update proposal status
      await db
        .update(contractProposals)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(contractProposals.id, proposalId));

      // Create signature record
      await db.insert(contractSignatures).values({
        contractProposalId: proposalId,
        profileId: activeProfile.id,
        signatureData: 'digital_acceptance',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Send notification to proposer
      const { notificationService } = await import('./notifications');
      const proposerProfile = await storage.getProfile(proposal.proposedBy);
      if (proposerProfile?.userId) {
        const accepterUser = await storage.getUser(req.user.id);
        const accepterName = `${accepterUser?.firstName} ${accepterUser?.lastName}`;
        await notificationService.notifyContractAccepted(
          proposerProfile.userId,
          req.user.id,
          accepterName,
          proposal.title
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting contract proposal:", error);
      res.status(500).json({ message: "Failed to accept contract proposal" });
    }
  });

  // Reject contract proposal
  app.post('/api/contract-proposals/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const proposalId = parseInt(req.params.id);
      const { reason } = req.body;
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const [proposal] = await db
        .select()
        .from(contractProposals)
        .where(eq(contractProposals.id, proposalId));

      if (!proposal) {
        return res.status(404).json({ message: "Contract proposal not found" });
      }

      if (proposal.proposedTo !== activeProfile.id) {
        return res.status(403).json({ message: "Only the recipient can reject this proposal" });
      }

      if (proposal.status !== 'pending') {
        return res.status(400).json({ message: "Proposal is not in pending status" });
      }

      // Update proposal status
      await db
        .update(contractProposals)
        .set({
          status: 'rejected',
          rejectedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(contractProposals.id, proposalId));

      // Add rejection reason as negotiation
      if (reason) {
        await db.insert(contractNegotiations).values({
          contractProposalId: proposalId,
          profileId: activeProfile.id,
          message: `Rejected: ${reason}`
        });
      }

      // Send notification to proposer
      const { notificationService } = await import('./notifications');
      const proposerProfile = await storage.getProfile(proposal.proposedBy);
      if (proposerProfile?.userId) {
        const rejecterUser = await storage.getUser(req.user.id);
        const rejecterName = `${rejecterUser?.firstName} ${rejecterUser?.lastName}`;
        await notificationService.notifyContractRejected(
          proposerProfile.userId,
          req.user.id,
          rejecterName,
          proposal.title
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting contract proposal:", error);
      res.status(500).json({ message: "Failed to reject contract proposal" });
    }
  });

  // Add negotiation message
  app.post('/api/contract-proposals/:id/negotiate', isAuthenticated, async (req: any, res) => {
    try {
      const proposalId = parseInt(req.params.id);
      const { message, proposedChanges } = req.body;
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const [proposal] = await db
        .select()
        .from(contractProposals)
        .where(eq(contractProposals.id, proposalId));

      if (!proposal) {
        return res.status(404).json({ message: "Contract proposal not found" });
      }

      if (proposal.proposedBy !== activeProfile.id && proposal.proposedTo !== activeProfile.id) {
        return res.status(403).json({ message: "Permission denied" });
      }

      // Add negotiation
      const [negotiation] = await db.insert(contractNegotiations).values({
        contractProposalId: proposalId,
        profileId: activeProfile.id,
        message,
        proposedChanges
      }).returning();

      // Update proposal status to negotiating if not already
      if (proposal.status === 'pending') {
        await db
          .update(contractProposals)
          .set({
            status: 'negotiating',
            updatedAt: new Date()
          })
          .where(eq(contractProposals.id, proposalId));
      }

      // Send notification to other party
      const { notificationService } = await import('./notifications');
      const otherProfileId = proposal.proposedBy === activeProfile.id ? proposal.proposedTo : proposal.proposedBy;
      const otherProfile = await storage.getProfile(otherProfileId);
      if (otherProfile?.userId) {
        const senderUser = await storage.getUser(req.user.id);
        const senderName = `${senderUser?.firstName} ${senderUser?.lastName}`;
        await notificationService.notifyContractNegotiation(
          otherProfile.userId,
          req.user.id,
          senderName,
          proposal.title
        );
      }

      res.json(negotiation);
    } catch (error) {
      console.error("Error adding negotiation:", error);
      res.status(500).json({ message: "Failed to add negotiation" });
    }
  });

  app.patch('/api/booking-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { status, declineMessage } = req.body;
      const activeProfile = await storage.getActiveProfile(req.user.id);

      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const updatedRequest = await storage.updateBookingRequestStatus(requestId, status, activeProfile.id);

      // If booking was accepted, send confirmation notification
      if (status === 'accepted') {
        const { notificationService } = await import('./notifications');
        const bookingRequest = await storage.getBookingRequestById(requestId);
        if (bookingRequest) {
          const artistProfile = await storage.getProfile(bookingRequest.artistProfileId);
          if (artistProfile?.userId) {
            const venueUser = await storage.getUser(req.user.id);
            const venueName = `${venueUser?.firstName} ${venueUser?.lastName}`;
            await notificationService.notifyBookingConfirmed(
              artistProfile.userId,
              req.user.id,
              venueName,
              activeProfile.name,
              bookingRequest.eventDate ? new Date(bookingRequest.eventDate).toLocaleDateString() : 'TBD'
            );
          }
        }
      }

      // If booking was rejected/declined, send decline notification with optional message
      if (status === 'rejected' || status === 'declined') {
        const { notificationService } = await import('./notifications');
        const bookingRequest = await storage.getBookingRequestById(requestId);
        if (bookingRequest) {
          const artistProfile = await storage.getProfile(bookingRequest.artistProfileId);
          if (artistProfile?.userId) {
            const venueUser = await storage.getUser(req.user.id);
            const venueName = `${venueUser?.firstName} ${venueUser?.lastName}`;
            await notificationService.notifyBookingDeclined(
              artistProfile.userId,
              req.user.id,
              venueName,
              activeProfile.name,
              declineMessage || null
            );
          }
        }

        // Clean up the original booking request notification
        await db
          .delete(notifications)
          .where(and(
            eq(notifications.type, 'booking_request'),
            eq(notifications.recipientId, req.user.id),
            sql`(${notifications.data}->>'bookingId')::int = ${requestId} OR 
                (${notifications.data}->>'bookingRequestId')::int = ${requestId} OR
                (${notifications.data}->>'id')::int = ${requestId}`
          ));
      }

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating booking request:", error);
      res.status(500).json({ message: "Failed to update booking request" });
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

  // Messaging routes

  // Get conversations for current user's active profile
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const conversations = await storage.getConversations(activeProfile.id);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Start a new conversation with another profile
  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const { profileId, message } = req.body;

      if (!profileId) {
        return res.status(400).json({ message: "Profile ID is required" });
      }

      // Check if target profile exists
      const targetProfile = await storage.getProfile(profileId);
      if (!targetProfile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      // Get or create direct conversation
      const conversation = await storage.getOrCreateDirectConversation(activeProfile.id, profileId);

      // Send initial message if provided
      if (message && message.trim()) {
        await storage.sendMessage({
          conversationId: conversation.id,
          senderId: activeProfile.id,
          content: message.trim(),
        });
      }

      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get messages for a conversation
  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const messages = await storage.getMessages(conversationId, activeProfile.id, limit, offset);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message
  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const { content, messageType, replyToId, attachments } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const message = await storage.sendMessage({
        conversationId,
        senderId: activeProfile.id,
        content: content.trim(),
        messageType,
        replyToId,
        attachments,
      });

      // Send notifications to other participants
      const { notificationService } = await import('./notifications');
      const conversations = await storage.getConversations(activeProfile.id);
      const conversation = conversations.find(c => c.id === conversationId);

      if (conversation && conversation.participants) {
        for (const participant of conversation.participants) {
          if (participant.id !== activeProfile.id) {
            const participantProfile = await storage.getProfile(participant.id);
            if (participantProfile?.userId) {
              const senderUser = await storage.getUser(req.user.id);
              const senderName = `${senderUser?.firstName} ${senderUser?.lastName}`;
              await notificationService.notifyMessage(
                participantProfile.userId,
                req.user.id,
                senderName,
                conversationId,
                content.trim()
              );
            }
          }
        }
      }

      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Mark messages as read
  app.post('/api/conversations/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const { messageIds } = req.body;

      await storage.markMessagesAsRead(conversationId, activeProfile.id, messageIds);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Delete a message
  app.delete('/api/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      await storage.deleteMessage(messageId, activeProfile.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ message: "Failed to delete message" });
    }
  });

  // Edit a message
  app.put('/api/messages/:id', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const { content } = req.body;

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Message content is required" });
      }

      const message = await storage.updateMessage(messageId, activeProfile.id, content.trim());
      res.json(message);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  // Create group conversation
  app.post('/api/groups', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const { name, description, isPrivate, maxMembers, participantIds } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Group name is required" });
      }

      if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({ message: "At least one participant is required" });
      }

      // Add creator to participants if not included
      const allParticipants = [...new Set([activeProfile.id, ...participantIds])];

      const group = await storage.createGroupConversation({
        name: name.trim(),
        description: description?.trim(),
        createdBy: activeProfile.id,
        isPrivate: isPrivate || false,
        maxMembers: maxMembers || 50,
        participantIds: allParticipants,
      });

      res.json(group);
    } catch (error) {
      console.error("Error creating group:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  // Get group members
  app.get('/api/conversations/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const members = await storage.getGroupMembers(conversationId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      res.status(500).json({ message: "Failed to fetch group members" });
    }
  });

  // Add member to group
  app.post('/api/conversations/:id/members', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const { profileId, role } = req.body;

      if (!profileId) {
        return res.status(400).json({ message: "Profile ID is required" });
      }

      await storage.addGroupMember(conversationId, profileId, activeProfile.id, role || 'member');
      res.json({ success: true });
    } catch (error) {
      console.error("Error adding group member:", error);
      res.status(500).json({ message: error.message || "Failed to add member" });
    }
  });

  // Remove member from group
  app.delete('/api/conversations/:id/members/:profileId', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const profileId = parseInt(req.params.profileId);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      await storage.removeGroupMember(conversationId, profileId, activeProfile.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing group member:", error);
      res.status(500).json({ message: "Failed to remove member" });
    }
  });

  // Update group info
  app.patch('/api/conversations/:id/info', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const updates = req.body;
      await storage.updateGroupInfo(conversationId, activeProfile.id, updates);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating group info:", error);
      res.status(500).json({ message: error.message || "Failed to update group" });
    }
  });

  // Archive/unarchive conversation
  app.patch('/api/conversations/:id/archive', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      await storage.toggleConversationArchive(conversationId, activeProfile.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error archiving conversation:", error);
      res.status(500).json({ message: "Failed to archive conversation" });
    }
  });

  // Mute/unmute conversation
  app.patch('/api/conversations/:id/mute', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const { muted } = req.body;
      await storage.updateConversationMute(conversationId, activeProfile.id, muted);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating conversation mute:", error);
      res.status(500).json({ message: "Failed to update conversation mute" });
    }
  });

  // Pin/unpin message
  app.post('/api/messages/:id/pin', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      await storage.toggleMessagePin(messageId, activeProfile.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error pinning message:", error);
      res.status(500).json({ message: "Failed to pin message" });
    }
  });

  // React to message
  app.post('/api/messages/:id/react', isAuthenticated, async (req: any, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const { reaction } = req.body;
      await storage.addMessageReaction(messageId, activeProfile.id, reaction);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reacting to message:", error);
      res.status(500).json({ message: "Failed to react to message" });
    }
  });

  // Block profile
  app.post('/api/profiles/:id/block', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      await storage.blockProfile(activeProfile.id, profileId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error blocking profile:", error);
      res.status(500).json({ message: "Failed to block profile" });
    }
  });

  // Report profile
  app.post('/api/profiles/:id/report', isAuthenticated, async (req: any, res) => {
    try {
      const profileId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const { reason } = req.body;
      await storage.reportProfile(activeProfile.id, profileId, reason);
      res.json({ success: true });
    } catch (error) {
      console.error("Error reporting profile:", error);
      res.status(500).json({ message: "Failed to report profile" });
    }
  });

  // Ticket transfer routes
  
  // Create ticket transfer
  app.post('/api/tickets/:id/transfer', isAuthenticated, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const { toProfileId, transferType, salePrice, message, numberOfTickets = 1 } = req.body;
      const activeProfile = await storage.getActiveProfile(req.user.id);
      
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Verify recipient profile exists
      if (!toProfileId) {
        return res.status(400).json({ message: "Recipient is required" });
      }

      const toProfile = await storage.getProfile(toProfileId);
      if (!toProfile) {
        return res.status(404).json({ message: "Recipient profile not found" });
      }

      // Restrict transfers to audience accounts only
      if (toProfile.type !== 'audience') {
        return res.status(400).json({ message: "Tickets can only be transferred to audience accounts" });
      }

      // Verify ticket ownership
      const [ticket] = await db
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, ticketId), eq(tickets.profileId, activeProfile.id)));

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found or not owned by you" });
      }

      if (!ticket.transferable) {
        return res.status(400).json({ message: "This ticket is not transferable" });
      }

      if (ticket.status !== 'active') {
        return res.status(400).json({ message: "Only active tickets can be transferred" });
      }

      // Check if transfer type is sale and price is provided
      if (transferType === 'sale' && (!salePrice || salePrice <= 0)) {
        return res.status(400).json({ message: "Sale price is required for paid transfers" });
      }

      // Generate unique transfer token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Create transfer record
      const [transfer] = await db.insert(ticketTransfers).values({
        ticketId,
        fromProfileId: activeProfile.id,
        toProfileId: toProfileId,
        toEmail: null, // No longer using email
        transferType,
        salePrice: transferType === 'sale' ? salePrice : null,
        message: message || null,
        token,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      }).returning();

      // Send notification
      const { notificationService } = await import('./notifications');
      if (toProfile?.userId) {
        const fromUser = await storage.getUser(req.user.id);
        const fromName = `${fromUser?.firstName} ${fromUser?.lastName}`;
        const ticketText = numberOfTickets > 1 ? `${numberOfTickets} tickets` : 'a ticket';
        await notificationService.notifyTicketTransfer(
          toProfile.userId,
          req.user.id,
          fromName,
          ticket.eventName,
          transferType,
          salePrice
        );
      }

      res.json(transfer);
    } catch (error) {
      console.error("Error creating ticket transfer:", error);
      res.status(500).json({ message: "Failed to create ticket transfer" });
    }
  });

  // Accept ticket transfer
  app.post('/api/ticket-transfers/:token/accept', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const activeProfile = await storage.getActiveProfile(req.user.id);
      
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Get transfer
      const [transfer] = await db
        .select()
        .from(ticketTransfers)
        .where(eq(ticketTransfers.token, token));

      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      if (transfer.status !== 'pending') {
        return res.status(400).json({ message: "Transfer has already been processed" });
      }

      if (new Date() > transfer.expiresAt) {
        return res.status(400).json({ message: "Transfer has expired" });
      }

      // Verify the recipient
      if (transfer.toProfileId && transfer.toProfileId !== activeProfile.id) {
        return res.status(403).json({ message: "This transfer is not for you" });
      }

      // Update transfer status
      await db
        .update(ticketTransfers)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(ticketTransfers.id, transfer.id));

      // Transfer ticket ownership
      await db
        .update(tickets)
        .set({
          profileId: activeProfile.id,
          status: 'active',
          updatedAt: new Date()
        })
        .where(eq(tickets.id, transfer.ticketId));

      // Send confirmation notification to sender
      const { notificationService } = await import('./notifications');
      const fromProfile = await storage.getProfile(transfer.fromProfileId);
      if (fromProfile?.userId) {
        const toUser = await storage.getUser(req.user.id);
        const toName = `${toUser?.firstName} ${toUser?.lastName}`;
        await notificationService.notifyTransferAccepted(
          fromProfile.userId,
          req.user.id,
          toName,
          transfer.ticketId
        );
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting ticket transfer:", error);
      res.status(500).json({ message: "Failed to accept ticket transfer" });
    }
  });

  // Decline ticket transfer
  app.post('/api/ticket-transfers/:token/decline', isAuthenticated, async (req: any, res) => {
    try {
      const { token } = req.params;
      const activeProfile = await storage.getActiveProfile(req.user.id);
      
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Get transfer
      const [transfer] = await db
        .select()
        .from(ticketTransfers)
        .where(eq(ticketTransfers.token, token));

      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }

      if (transfer.status !== 'pending') {
        return res.status(400).json({ message: "Transfer has already been processed" });
      }

      // Update transfer status
      await db
        .update(ticketTransfers)
        .set({
          status: 'declined',
          declinedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(ticketTransfers.id, transfer.id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error declining ticket transfer:", error);
      res.status(500).json({ message: "Failed to decline ticket transfer" });
    }
  });

  // Get ticket transfers
  app.get('/api/tickets/:id/transfers', isAuthenticated, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const transfers = await db
        .select({
          id: ticketTransfers.id,
          ticketId: ticketTransfers.ticketId,
          transferType: ticketTransfers.transferType,
          salePrice: ticketTransfers.salePrice,
          message: ticketTransfers.message,
          status: ticketTransfers.status,
          expiresAt: ticketTransfers.expiresAt,
          acceptedAt: ticketTransfers.acceptedAt,
          declinedAt: ticketTransfers.declinedAt,
          createdAt: ticketTransfers.createdAt,
          fromProfile: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl
          }
        })
        .from(ticketTransfers)
        .leftJoin(profiles, eq(ticketTransfers.fromProfileId, profiles.id))
        .where(eq(ticketTransfers.ticketId, ticketId))
        .orderBy(sql`${ticketTransfers.createdAt} DESC`);

      res.json(transfers);
    } catch (error) {
      console.error("Error fetching ticket transfers:", error);
      res.status(500).json({ message: "Failed to fetch ticket transfers" });
    }
  });

  // Ticket return routes

  // Create ticket return request
  app.post('/api/tickets/:id/return', isAuthenticated, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const { reason, reasonDetails } = req.body;
      const activeProfile = await storage.getActiveProfile(req.user.id);
      
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Verify ticket ownership
      const [ticket] = await db
        .select()
        .from(tickets)
        .where(and(eq(tickets.id, ticketId), eq(tickets.profileId, activeProfile.id)));

      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found or not owned by you" });
      }

      if (!ticket.returnable) {
        return res.status(400).json({ message: "This ticket is not returnable" });
      }

      if (ticket.status !== 'active') {
        return res.status(400).json({ message: "Only active tickets can be returned" });
      }

      // Check return deadline
      if (ticket.returnDeadline && new Date() > ticket.returnDeadline) {
        return res.status(400).json({ message: "Return deadline has passed" });
      }

      // Calculate refund amount (you can implement your own logic here)
      const processingFee = ticket.price * 0.05; // 5% processing fee
      const refundAmount = ticket.price - processingFee;

      // Create return request
      const [returnRequest] = await db.insert(ticketReturns).values({
        ticketId,
        profileId: activeProfile.id,
        reason,
        reasonDetails: reasonDetails || null,
        refundAmount,
        processingFee,
      }).returning();

      // Update ticket status
      await db
        .update(tickets)
        .set({
          status: 'returned',
          updatedAt: new Date()
        })
        .where(eq(tickets.id, ticketId));

      res.json(returnRequest);
    } catch (error) {
      console.error("Error creating ticket return:", error);
      res.status(500).json({ message: "Failed to create ticket return" });
    }
  });

  // Get ticket returns
  app.get('/api/tickets/:id/returns', isAuthenticated, async (req: any, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const returns = await db
        .select()
        .from(ticketReturns)
        .where(eq(ticketReturns.ticketId, ticketId))
        .orderBy(sql`${ticketReturns.createdAt} DESC`);

      res.json(returns);
    } catch (error) {
      console.error("Error fetching ticket returns:", error);
      res.status(500).json({ message: "Failed to fetch ticket returns" });
    }
  });

  // Update profile image
  app.post("/api/profiles/:profileId/image", requireAuth, upload.single('profileImage'), async (req, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const userId = req.user.id;

      // Verify user has permission to update this profile
      const hasPermission = await storage.checkProfilePermission(userId, profileId, 'manage_profile');
      if (!hasPermission) {
        return res.status(403).json({ message: 'No permission to update this profile' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const imageUrl = `/uploads/${req.file.filename}`;

      // Get the Profile Pictures album for this profile
      const profilePicturesAlbum = await db
        .select()
        .from(albums)
        .where(and(eq(albums.profileId, profileId), eq(albums.name, "Profile Pictures")))
        .limit(1);

      // Add photo to Profile Pictures album
      if (profilePicturesAlbum.length > 0) {
        await db.insert(photos).values({
          profileId,
          albumId: profilePicturesAlbum[0].id,
          imageUrl,
          caption: "Profile picture"
        });
      }

      // Update profile with new image
      const [updatedProfile] = await db
        .update(profiles)
        .set({ 
          profileImageUrl: imageUrl,
          updatedAt: new Date()
        })
        .where(eq(profiles.id, profileId))
        .returning();

      res.json(updatedProfile);
    } catch (error: any) {
      console.error('Error updating profile image:', error);
      res.status(500).json({ message: error.message || 'Failed to update profile image' });
    }
  });

  // Update profile background image
  app.post("/api/profiles/:profileId/background", requireAuth, upload.single('backgroundImage'), async (req, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const userId = req.user.id;

      // Verify user has permission to update this profile
      const hasPermission = await storage.checkProfilePermission(userId, profileId, 'manage_profile');
      if (!hasPermission) {
        return res.status(403).json({ message: 'No permission to update this profile' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const imageUrl = `/uploads/${req.file.filename}`;

      // Get the Background Pictures album for this profile
      const backgroundPicturesAlbum = await db
        .select()
        .from(albums)
        .where(and(eq(albums.profileId, profileId), eq(albums.name, "Background Pictures")))
        .limit(1);

      // Add photo to Background Pictures album
      if (backgroundPicturesAlbum.length > 0) {
        await db.insert(photos).values({
          profileId,
          albumId: backgroundPicturesAlbum[0].id,
          imageUrl,
          caption: "Background image"
        });
      }

      // Update profile with new background image
      const [updatedProfile] = await db
        .update(profiles)
        .set({ 
          backgroundImageUrl: imageUrl,
          updatedAt: new Date()
        })
        .where(eq(profiles.id, profileId))
        .returning();

      res.json(updatedProfile);
    } catch (error: any) {
      console.error('Error updating background image:', error);
      res.status(500).json({ message: error.message || 'Failed to update background image' });
    }
  });

  // Update profile cover image
  app.post("/api/profiles/:profileId/cover", requireAuth, upload.single('coverImage'), async (req, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const userId = req.user.id;

      // Verify user has permission to update this profile
      const hasPermission = await storage.checkProfilePermission(userId, profileId, 'manage_profile');
      if (!hasPermission) {
        return res.status(403).json({ message: 'No permission to update this profile' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const imageUrl = `/uploads/${req.file.filename}`;

      // Get the Cover Photos album for this profile
      const coverPhotosAlbum = await db
        .select()
        .from(albums)
        .where(and(eq(albums.profileId, profileId), eq(albums.name, "Cover Photos")))
        .limit(1);

      // Add photo to Cover Photos album
      if (coverPhotosAlbum.length > 0) {
        await db.insert(photos).values({
          profileId,
          albumId: coverPhotosAlbum[0].id,
          imageUrl,
          caption: "Cover photo"
        });
      }

      // Update profile with new cover image
      const [updatedProfile] = await db
        .update(profiles)
        .set({ 
          coverImageUrl: imageUrl,
          updatedAt: new Date()
        })
        .where(eq(profiles.id, profileId))
        .returning();

      res.json(updatedProfile);
    } catch (error: any) {
      console.error('Error updating cover image:', error);
      res.status(500).json({ message: error.message || 'Failed to update cover image' });
    }
  });

  // Events system routes
  app.get('/api/events', async (req, res) => {
    try {
      const { profileId, limit = 50, offset = 0 } = req.query;
      
      let query = db
        .select({
          id: events.id,
          organizerProfileId: events.organizerProfileId,
          venueProfileId: events.venueProfileId,
          artistProfileIds: events.artistProfileIds,
          name: events.name,
          description: events.description,
          eventDate: events.eventDate,
          eventTime: events.eventTime,
          duration: events.duration,
          genre: events.genre,
          ageRestriction: events.ageRestriction,
          status: events.status,
          capacity: events.capacity,
          ticketsAvailable: events.ticketsAvailable,
          ticketSalesStart: events.ticketSalesStart,
          ticketSalesEnd: events.ticketSalesEnd,
          eventImageUrl: events.eventImageUrl,
          tags: events.tags,
          socialLinks: events.socialLinks,
          requiresApproval: events.requiresApproval,
          isPrivate: events.isPrivate,
          bookingRequestId: events.bookingRequestId,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
          organizer: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
            type: profiles.type
          }
        })
        .from(events)
        .leftJoin(profiles, eq(events.organizerProfileId, profiles.id))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string))
        .orderBy(sql`${events.eventDate} DESC`);

      if (profileId) {
        const profileIdNum = parseInt(profileId as string);
        query = query.where(
          or(
            eq(events.organizerProfileId, profileIdNum),
            eq(events.venueProfileId, profileIdNum),
            sql`${profileIdNum} = ANY(${events.artistProfileIds})`
          )
        );
      }

      const eventsList = await query;
      res.json(eventsList);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.post('/api/events', isAuthenticated, async (req: any, res) => {
    try {
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      const {
        venueProfileId,
        artistProfileIds = [],
        name,
        description,
        eventDate,
        eventTime,
        duration,
        genre,
        ageRestriction,
        status = 'draft',
        capacity,
        ticketsAvailable = true,
        ticketSalesStart,
        ticketSalesEnd,
        eventImageUrl,
        tags = [],
        socialLinks = {},
        requiresApproval = false,
        isPrivate = false,
        bookingRequestId
      } = req.body;

      // Validate required fields
      if (!name || !eventDate) {
        return res.status(400).json({ message: "Event name and date are required" });
      }

      // Check permissions for creating events
      const hasPermission = await storage.checkProfilePermission(req.user.id, activeProfile.id, "manage_events");
      if (!hasPermission && activeProfile.type !== 'venue' && activeProfile.type !== 'artist') {
        return res.status(403).json({ message: "Permission denied to create events" });
      }

      const eventData = {
        organizerProfileId: activeProfile.id,
        venueProfileId: venueProfileId || (activeProfile.type === 'venue' ? activeProfile.id : null),
        artistProfileIds: Array.isArray(artistProfileIds) ? artistProfileIds : [],
        name,
        description,
        eventDate: new Date(eventDate),
        eventTime,
        duration,
        genre,
        ageRestriction,
        status,
        capacity,
        ticketsAvailable,
        ticketSalesStart: ticketSalesStart ? new Date(ticketSalesStart) : null,
        ticketSalesEnd: ticketSalesEnd ? new Date(ticketSalesEnd) : null,
        eventImageUrl,
        tags,
        socialLinks,
        requiresApproval,
        isPrivate,
        bookingRequestId
      };

      const [event] = await db.insert(events).values(eventData).returning();

      // Create corresponding calendar event
      await storage.createCalendarEvent({
        profileId: activeProfile.id,
        title: name,
        date: new Date(eventDate),
        startTime: eventTime || '19:00',
        endTime: duration ? 
          new Date(new Date(`2000-01-01T${eventTime || '19:00'}`).getTime() + (duration * 60000)).toTimeString().slice(0, 5) : 
          '23:00',
        type: 'event',
        status: status === 'published' ? 'confirmed' : 'pending',
        client: '',
        location: '',
        notes: description || '',
        budget: null,
        isPrivate
      });

      res.json(event);
    } catch (error) {
      console.error("Error creating event:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.get('/api/events/:id', async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      
      const [event] = await db
        .select({
          id: events.id,
          organizerProfileId: events.organizerProfileId,
          venueProfileId: events.venueProfileId,
          artistProfileIds: events.artistProfileIds,
          name: events.name,
          description: events.description,
          eventDate: events.eventDate,
          eventTime: events.eventTime,
          duration: events.duration,
          genre: events.genre,
          ageRestriction: events.ageRestriction,
          status: events.status,
          capacity: events.capacity,
          ticketsAvailable: events.ticketsAvailable,
          ticketSalesStart: events.ticketSalesStart,
          ticketSalesEnd: events.ticketSalesEnd,
          eventImageUrl: events.eventImageUrl,
          tags: events.tags,
          socialLinks: events.socialLinks,
          requiresApproval: events.requiresApproval,
          isPrivate: events.isPrivate,
          bookingRequestId: events.bookingRequestId,
          createdAt: events.createdAt,
          updatedAt: events.updatedAt,
          organizer: {
            id: profiles.id,
            name: profiles.name,
            profileImageUrl: profiles.profileImageUrl,
            type: profiles.type
          }
        })
        .from(events)
        .leftJoin(profiles, eq(events.organizerProfileId, profiles.id))
        .where(eq(events.id, eventId));

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.put('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Get the event to check permissions
      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));

      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if user can edit this event
      const canEdit = existingEvent.organizerProfileId === activeProfile.id ||
                     await storage.checkProfilePermission(req.user.id, existingEvent.organizerProfileId, "manage_events");

      if (!canEdit) {
        return res.status(403).json({ message: "Permission denied to edit this event" });
      }

      const updateData = { ...req.body };
      delete updateData.id;
      delete updateData.createdAt;
      updateData.updatedAt = new Date();

      // Handle date conversion
      if (updateData.eventDate) {
        updateData.eventDate = new Date(updateData.eventDate);
      }
      if (updateData.ticketSalesStart) {
        updateData.ticketSalesStart = new Date(updateData.ticketSalesStart);
      }
      if (updateData.ticketSalesEnd) {
        updateData.ticketSalesEnd = new Date(updateData.ticketSalesEnd);
      }

      const [updatedEvent] = await db
        .update(events)
        .set(updateData)
        .where(eq(events.id, eventId))
        .returning();

      res.json(updatedEvent);
    } catch (error) {
      console.error("Error updating event:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete('/api/events/:id', isAuthenticated, async (req: any, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const activeProfile = await storage.getActiveProfile(req.user.id);
      if (!activeProfile) {
        return res.status(400).json({ message: "No active profile" });
      }

      // Get the event to check permissions
      const [existingEvent] = await db
        .select()
        .from(events)
        .where(eq(events.id, eventId));

      if (!existingEvent) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Check if user can delete this event
      const canDelete = existingEvent.organizerProfileId === activeProfile.id ||
                       await storage.checkProfilePermission(req.user.id, existingEvent.organizerProfileId, "manage_events");

      if (!canDelete) {
        return res.status(403).json({ message: "Permission denied to delete this event" });
      }

      await db.delete(events).where(eq(events.id, eventId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting event:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Upload photos
  app.post("/api/profiles/:profileId/photos/upload", requireAuth, upload.array('photos', 10), async (req, res) => {
    try {
      const profileId = parseInt(req.params.profileId);
      const userId = req.user.id;

      // Verify user has permission to upload to this profile
      const hasPermission = await storage.checkProfilePermission(userId, profileId, 'manage_posts');
      if (!hasPermission) {
        return res.status(403).json({ message: 'No permission to upload photos to this profile' });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: 'No files uploaded' });
      }

      // Get default albums for this profile
      const defaultAlbums = await db
        .select()
        .from(albums)
        .where(eq(albums.profileId, profileId));

      const profilePicturesAlbum = defaultAlbums.find(album => album.name === "Profile Pictures");
      const coverPhotosAlbum = defaultAlbums.find(album => album.name === "Cover Photos");
      const backgroundPicturesAlbum = defaultAlbums.find(album => album.name === "Background Pictures");

      const photos = [];
      for (const file of files) {
        const caption = Array.isArray(req.body.caption) ? req.body.caption[files.indexOf(file)] : req.body.caption;
        const tags = Array.isArray(req.body.tags) ? req.body.tags[files.indexOf(file)] : req.body.tags;
        const photoType = Array.isArray(req.body.photoType) ? req.body.photoType[files.indexOf(file)] : req.body.photoType;

        // Determine which album to assign based on photo type
        let albumId = null;
        if (photoType === 'profile' && profilePicturesAlbum) {
          albumId = profilePicturesAlbum.id;
        } else if (photoType === 'cover' && coverPhotosAlbum) {
          albumId = coverPhotosAlbum.id;
        } else if (photoType === 'background' && backgroundPicturesAlbum) {
          albumId = backgroundPicturesAlbum.id;
        }

        const [photo] = await db.insert(photos).values({
          profileId,
          albumId,
          imageUrl: `/uploads/${file.filename}`,
          caption: caption || null,
          tags: tags ? tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : []
        }).returning();

        photos.push(photo);
      }

      res.json(photos);
    } catch (error: any) {
      console.error('Error uploading photos:', error);
      res.status(500).json({ message: error.message || 'Failed to upload photos' });
    }
  });

  // Create new profile
  app.post("/api/profiles", requireAuth, async (req, res) => {
    try {
      const data = insertProfileSchema.parse(req.body);
      const userId = req.user.id;

      // Set the userId and default to inactive initially
      const profileData = {
        ...data,
        userId,
        isActive: false
      };

      const [profile] = await db.insert(profiles).values(profileData).returning();

      // If this is a shared profile (artist or venue), create owner membership
      if (profile.type === 'artist' || profile.type === 'venue') {
        await db.insert(profileMemberships).values({
          profileId: profile.id,
          userId,
          role: 'owner',
          permissions: ['manage_profile', 'manage_members', 'manage_posts', 'manage_events', 'manage_bookings', 'view_analytics', 'moderate_content'],
          status: 'active'
        });
      }

      // Create default albums for the new profile
      const defaultAlbums = [
        {
          profileId: profile.id,
          name: "Profile Pictures",
          description: "Profile picture collection"
        },
        {
          profileId: profile.id,
          name: "Cover Photos",
          description: "Cover photo collection"
        },
        {
          profileId: profile.id,
          name: "Background Pictures",
          description: "Background image collection"
        }
      ];

      await db.insert(albums).values(defaultAlbums);
      console.log(`Created default albums for new profile: ${profile.name}`);

      res.json(profile);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      res.status(400).json({ message: error.message || 'Failed to create profile' });
    }
  });

  // Accept friend request
app.post("/api/friend-requests/:friendshipId/accept", requireAuth, async (req, res) => {
  try {
    const friendshipId = parseInt(req.params.friendshipId);
    const userId = req.user!.id;

    // Get the friendship request
    const friendship = await db
      .select()
      .from(friendships)
      .where(eq(friendships.id, friendshipId))
      .limit(1);

    if (friendship.length === 0) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    const friendshipRecord = friendship[0];

    // Check if the current user is the addressee
    if (friendshipRecord.addresseeId !== userId) {
      return res.status(403).json({ error: "Not authorized to accept this request" });
    }

    // Update the friendship status to accepted
    await db
      .update(friendships)
      .set({ 
        status: "accepted",
        updatedAt: new Date()
      })
      .where(eq(friendships.id, friendshipId));

    // Create notification for the sender (requester)
    await db.insert(notifications).values({
      userId: friendshipRecord.requesterId,
      type: "friend_accepted",
      title: "Friend Request Accepted",
      message: "Your friend request has been accepted",
      data: {
        friendshipId: friendshipId,
        accepterId: userId,
        senderId: friendshipRecord.requesterId,
        senderProfileId: friendshipRecord.requesterProfileId
      },
      createdAt: new Date(),
      read: false
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).json({ error: "Failed to accept friend request" });
  }
});

// Accept booking request
app.post("/api/bookings/:bookingId/accept", requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const userId = req.user!.id;

    // Update booking status to accepted
    await db
      .update(bookingRequests)
      .set({ 
        status: "accepted",
        updatedAt: new Date()
      })
      .where(eq(bookingRequests.id, bookingId));

    // Get booking details for notification
    const artistProfiles = alias(profiles, 'artistProfiles');
    const venueProfiles = alias(profiles, 'venueProfiles');

    const booking = await db
      .select({
        id: bookingRequests.id,
        artistId: bookingRequests.artistProfileId,
        venueId: bookingRequests.venueProfileId,
        artistProfile: {
          id: artistProfiles.id,
          name: artistProfiles.name,
          profileImageUrl: artistProfiles.profileImageUrl,
          userId: artistProfiles.userId
        },
        venueProfile: {
          id: venueProfiles.id,
          name: venueProfiles.name,
          profileImageUrl: venueProfiles.profileImageUrl,
          userId: venueProfiles.userId
        }
      })
      .from(bookingRequests)
      .leftJoin(artistProfiles, eq(bookingRequests.artistProfileId, artistProfiles.id))
      .leftJoin(venueProfiles, eq(bookingRequests.venueProfileId, venueProfiles.id))
      .where(eq(bookingRequests.id, bookingId))
      .limit(1);

    if (booking.length > 0) {
      const bookingData = booking[0];

      // Create notification for the artist
      if (bookingData.artistProfile?.userId) {
        await db.insert(notifications).values({
          userId: bookingData.artistProfile.userId,
          type: "booking_accepted",
          title: "Booking Request Accepted",
          message: `${bookingData.venueProfile?.name || 'A venue'} has accepted your booking request`,
          data: {
            bookingId: bookingId,
            venueId: bookingData.venueId,
            venueName: bookingData.venueProfile?.name,
            venueProfileImageUrl: bookingData.venueProfile?.profileImageUrl,
            senderProfileId: bookingData.venueId
          },
          createdAt: new Date(),
          read: false
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error accepting booking request:", error);
    res.status(500).json({ error: "Failed to accept booking request" });
  }
});

// Decline booking request
app.post("/api/bookings/:bookingId/decline", requireAuth, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    const userId = req.user!.id;

    // Update booking status to declined
    await db
      .update(bookingRequests)
      .set({ 
        status: "declined",
        updatedAt: new Date()
      })
      .where(eq(bookingRequests.id, bookingId));

    // Get booking details for notification
    const artistProfiles = alias(profiles, 'artistProfiles');
    const venueProfiles = alias(profiles, 'venueProfiles');

    const booking = await db
      .select({
        id: bookingRequests.id,
        artistId: bookingRequests.artistProfileId,
        venueId: bookingRequests.venueProfileId,
        artistProfile: {
          id: artistProfiles.id,
          name: artistProfiles.name,
          profileImageUrl: artistProfiles.profileImageUrl,
          userId: artistProfiles.userId
        },
        venueProfile: {
          id: venueProfiles.id,
          name: venueProfiles.name,
          profileImageUrl: venueProfiles.profileImageUrl,
          userId: venueProfiles.userId
        }
      })
      .from(bookingRequests)
      .leftJoin(artistProfiles, eq(bookingRequests.artistProfileId, artistProfiles.id))
      .leftJoin(venueProfiles, eq(bookingRequests.venueProfileId, venueProfiles.id))
      .where(eq(bookingRequests.id, bookingId))
      .limit(1);

    if (booking.length > 0) {
      const bookingData = booking[0];

      // Create notification for the artist
      if (bookingData.artistProfile?.userId) {
        await db.insert(notifications).values({
          userId: bookingData.artistProfile.userId,
          type: "booking_declined",
          title: "Booking Request Declined",
          message: `${bookingData.venueProfile?.name || 'A venue'} has declined your booking request`,
          data: {
            bookingId: bookingId,
            venueId: bookingData.venueId,
            venueName: bookingData.venueProfile?.name,
            venueProfileImageUrl: bookingData.venueProfile?.profileImageUrl,
            senderProfileId: bookingData.venueId
          },
          createdAt: new Date(),
          read: false
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error declining booking request:", error);
    res.status(500).json({ error: "Failed to decline booking request" });
  }
});

// Get calendar events for a profile to check booking availability
app.get("/api/calendar-events", requireAuth, async (req, res) => {
  try {
    const profileId = parseInt(req.query.profileId as string);
    
    if (!profileId) {
      return res.status(400).json({ error: "Profile ID is required" });
    }

    // Sample events that match what's shown in the Event Calendar
    // These should sync with booking availability
    const sampleEvents = [
      {
        id: 'event-1',
        title: 'Sound Check',
        date: new Date('2025-07-08'),
        startTime: '18:00',
        endTime: '20:00',
        type: 'event',
        status: 'confirmed',
        profileId: 15,
        profileName: 'venue test',
        profileType: 'venue'
      },
      {
        id: 'event-2', 
        title: 'Jazz Night',
        date: new Date('2025-07-15'),
        startTime: '19:00',
        endTime: '23:00',
        type: 'event',
        status: 'confirmed',
        profileId: 15,
        profileName: 'venue test',
        profileType: 'venue'
      },
      {
        id: 'event-3',
        title: 'Music Event',
        date: new Date('2025-07-22'),
        startTime: '20:00',
        endTime: '24:00',
        type: 'event',
        status: 'confirmed',
        profileId: 15,
        profileName: 'venue test',
        profileType: 'venue'
      },
      {
        id: 'event-4',
        title: 'Venue Maintenance',
        date: new Date('2025-07-25'),
        startTime: '09:00',
        endTime: '17:00',
        type: 'event',
        status: 'confirmed',
        profileId: 15,
        profileName: 'venue test',
        profileType: 'venue'
      },
      {
        id: 'event-5',
        title: 'Sound Check',
        date: new Date('2025-08-08'),
        startTime: '18:00',
        endTime: '20:00',
        type: 'event',
        status: 'confirmed',
        profileId: 15,
        profileName: 'venue test',
        profileType: 'venue'
      }
    ];

    // Filter events for the requested profile
    const formattedEvents = sampleEvents.filter(event => 
      event.profileId === profileId
    );

    console.log(`Returning ${formattedEvents.length} calendar events for profile ${profileId}`);

    res.json(formattedEvents);
  } catch (error) {
    console.error("Error fetching calendar events:", error);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

  const httpServer = createServer(app);
  return httpServer;
}