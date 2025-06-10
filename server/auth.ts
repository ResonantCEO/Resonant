import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import type { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      password: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }
  }
}
const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        // Normalize email to lowercase for case-insensitive lookup
        const normalizedEmail = email.toLowerCase();
        const user = await storage.getUserByEmail(normalizedEmail);
        
        if (!user) {
          return done(null, false);
        }
        
        const passwordValid = await comparePasswords(password, user.password);
        
        if (!passwordValid) {
          return done(null, false);
        }
        
        return done(null, user);
      } catch (error) {
        console.error("Login error:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      // Normalize email to lowercase for consistency
      const normalizedEmail = email.toLowerCase();

      const existingEmail = await storage.getUserByEmail(normalizedEmail);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const user = await storage.createUser({
        email: normalizedEmail,
        password: await hashPassword(password),
        firstName,
        lastName,
      });

      req.login(user, async (err) => {
        if (err) return next(err);
        
        // Automatically create and set audience profile as active on registration
        try {
          console.log("REGISTRATION: Setting audience profile as active for user", user.id);
          const userName = firstName && lastName 
            ? `${firstName} ${lastName}`
            : firstName || lastName || "My Profile";
          
          const audienceProfile = await storage.createProfile({
            userId: user.id,
            type: 'audience',
            name: userName,
            bio: '',
            isActive: true
          });
          console.log("REGISTRATION: Created new audience profile:", audienceProfile.id);
        } catch (error) {
          console.error("Error creating audience profile during registration:", error);
          // Don't fail registration if profile creation fails
        }
        
        res.status(201).json({ id: user.id, email: user.email });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Login failed" });
      }
      if (!user) {
        return res.status(400).json({ message: "Invalid email or password" });
      }
      req.login(user, async (err) => {
        if (err) {
          console.error("Session error:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }
        
        // Fetch complete user data including first and last names
        const completeUser = await storage.getUser(user.id);
        if (!completeUser) {
          return res.status(500).json({ message: "Failed to fetch user data" });
        }
        
        // Automatically create and set audience profile as active on login
        try {
          console.log("LOGIN: Setting audience profile as active for user", user.id);
          const userProfiles = await storage.getProfilesByUserId(user.id);
          console.log("LOGIN: User profiles found:", userProfiles.map(p => ({ id: p.id, type: p.type, name: p.name })));
          
          let audienceProfile = userProfiles.find(p => p.type === 'audience' && !p.deletedAt);
          console.log("LOGIN: Audience profile found:", audienceProfile ? { id: audienceProfile.id, name: audienceProfile.name } : "None");
          
          if (!audienceProfile) {
            // Create audience profile if it doesn't exist
            console.log("LOGIN: Creating audience profile for user", user.id);
            const userName = completeUser.firstName && completeUser.lastName 
              ? `${completeUser.firstName} ${completeUser.lastName}`
              : completeUser.firstName || completeUser.lastName || "My Profile";
            
            audienceProfile = await storage.createProfile({
              userId: user.id,
              type: 'audience',
              name: userName,
              bio: '',
              isActive: true
            });
            console.log("LOGIN: Created new audience profile:", audienceProfile.id);
          } else {
            console.log("LOGIN: Setting existing audience profile as active:", audienceProfile.id);
            await storage.setActiveProfile(user.id, audienceProfile.id);
          }
          console.log("LOGIN: Successfully set audience profile as active");
        } catch (error) {
          console.error("Error setting audience profile as active:", error);
          // Don't fail login if profile activation fails
        }
        
        res.status(200).json({ 
          id: completeUser.id, 
          email: completeUser.email,
          firstName: completeUser.firstName,
          lastName: completeUser.lastName,
          profileImageUrl: completeUser.profileImageUrl
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Fetch fresh user data from database to ensure we have all fields
    const user = await storage.getUser(req.user!.id);
    if (!user) return res.sendStatus(401);
    
    // Disable caching to ensure fresh data is always returned
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // Send the complete user object (excluding password)
    const { password, ...userResponse } = user;
    res.json(userResponse);
  });
}