import { Server as SocketIOServer, Socket } from "socket.io";
import { storage } from "./storage";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  profileId?: number;
  lastActivity?: number;
}

// Connection pool and optimization settings
const CONNECTION_LIMITS = {
  maxConnections: 1000,
  connectionTimeout: 30000, // 30 seconds
  pingTimeout: 60000, // 1 minute
  pingInterval: 25000, // 25 seconds
};

// Cache for frequently accessed data
const userCache = new Map();
const conversationCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting for events
const rateLimiters = new Map();
const RATE_LIMITS = {
  send_message: { max: 10, window: 60000 }, // 10 messages per minute
  typing_start: { max: 20, window: 60000 }, // 20 typing events per minute
  typing_stop: { max: 20, window: 60000 },
};

export function setupOptimizedWebSocketHandlers(io: SocketIOServer) {
  // Configure Socket.IO for performance
  io.engine.generateId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  // Set connection limits and timeouts
  io.engine.opts.pingTimeout = CONNECTION_LIMITS.pingTimeout;
  io.engine.opts.pingInterval = CONNECTION_LIMITS.pingInterval;

  // Middleware for rate limiting
  const rateLimit = (eventName: keyof typeof RATE_LIMITS, socket: AuthenticatedSocket) => {
    const limit = RATE_LIMITS[eventName];
    if (!limit) return true;

    const key = `${socket.id}:${eventName}`;
    const now = Date.now();
    
    if (!rateLimiters.has(key)) {
      rateLimiters.set(key, { count: 1, windowStart: now });
      return true;
    }

    const limiter = rateLimiters.get(key);
    if (now - limiter.windowStart > limit.window) {
      limiter.count = 1;
      limiter.windowStart = now;
      return true;
    }

    if (limiter.count >= limit.max) {
      return false;
    }

    limiter.count++;
    return true;
  };

  // Optimized authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const userId = socket.handshake.auth.userId;
      const profileId = socket.handshake.auth.profileId;
      
      if (!userId) {
        return next(new Error("Authentication error"));
      }

      // Check cache first
      const cacheKey = `user:${userId}`;
      let user = userCache.get(cacheKey);
      
      if (!user || Date.now() - user.timestamp > CACHE_TTL) {
        user = await storage.getUser(parseInt(userId));
        if (!user) {
          return next(new Error("User not found"));
        }
        userCache.set(cacheKey, { data: user, timestamp: Date.now() });
      } else {
        user = user.data;
      }

      socket.userId = parseInt(userId);
      socket.profileId = profileId ? parseInt(profileId) : undefined;
      socket.lastActivity = Date.now();
      
      next();
    } catch (error) {
      console.error("WebSocket authentication error:", error);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`Optimized WebSocket connected: ${socket.id}`);

    // Join rooms efficiently
    const rooms = [];
    if (socket.userId) rooms.push(`user:${socket.userId}`);
    if (socket.profileId) rooms.push(`profile:${socket.profileId}`);
    
    socket.join(rooms);

    // Batch database operations for conversation joining
    const joinedConversations = new Set();

    socket.on("join_conversation", (conversationId: number) => {
      if (joinedConversations.has(conversationId)) return;
      
      socket.join(`conversation:${conversationId}`);
      joinedConversations.add(conversationId);
      
      // Update last activity
      socket.lastActivity = Date.now();
    });

    socket.on("leave_conversation", (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);
      joinedConversations.delete(conversationId);
    });

    // Optimized message sending with batching and caching
    socket.on("send_message", async (data) => {
      try {
        if (!rateLimit("send_message", socket)) {
          socket.emit("error", "Rate limit exceeded");
          return;
        }

        const { conversationId, content, messageType, replyToId } = data;
        
        if (!socket.profileId) {
          socket.emit("error", "No active profile");
          return;
        }

        // Validate conversation exists and user has access
        const conversationKey = `conversation:${conversationId}`;
        let conversation = conversationCache.get(conversationKey);
        
        if (!conversation || Date.now() - conversation.timestamp > CACHE_TTL) {
          const conversations = await storage.getConversations(socket.profileId);
          conversation = conversations.find(c => c.id === conversationId);
          
          if (!conversation) {
            socket.emit("error", "Conversation not found");
            return;
          }
          
          conversationCache.set(conversationKey, { 
            data: conversation, 
            timestamp: Date.now() 
          });
        } else {
          conversation = conversation.data;
        }

        // Save message to database
        const message = await storage.sendMessage({
          conversationId,
          senderId: socket.profileId,
          content,
          messageType: messageType || 'text',
          replyToId,
        });

        // Emit to conversation room (more efficient than individual emits)
        io.to(`conversation:${conversationId}`).emit("new_message", message);
        
        // Batch notification sending
        const otherParticipants = conversation.participants?.filter(
          (p: any) => p.id !== socket.profileId
        ) || [];
        
        if (otherParticipants.length > 0) {
          const notification = {
            conversationId,
            message: content.substring(0, 100), // Truncate for performance
            senderId: socket.profileId,
            senderName: conversation.participants?.find(p => p.id === socket.profileId)?.name
          };

          // Emit to all participants efficiently
          for (const participant of otherParticipants) {
            io.to(`profile:${participant.id}`).emit("message_notification", notification);
          }
        }

        socket.lastActivity = Date.now();
      } catch (error) {
        console.error("WebSocket message error:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    // Debounced typing indicators
    let typingTimeout: NodeJS.Timeout | null = null;
    
    socket.on("typing_start", (conversationId: number) => {
      if (!rateLimit("typing_start", socket)) return;
      
      socket.to(`conversation:${conversationId}`).emit("user_typing", {
        profileId: socket.profileId,
        conversationId
      });
      
      // Auto-stop typing after 3 seconds
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.to(`conversation:${conversationId}`).emit("user_stopped_typing", {
          profileId: socket.profileId,
          conversationId
        });
      }, 3000);
    });

    socket.on("typing_stop", (conversationId: number) => {
      if (!rateLimit("typing_stop", socket)) return;
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
        typingTimeout = null;
      }
      
      socket.to(`conversation:${conversationId}`).emit("user_stopped_typing", {
        profileId: socket.profileId,
        conversationId
      });
    });

    // Batched status updates
    let statusUpdateTimeout: NodeJS.Timeout | null = null;
    
    socket.on("update_status", (status: "online" | "away" | "offline") => {
      if (socket.profileId) {
        // Debounce status updates
        if (statusUpdateTimeout) clearTimeout(statusUpdateTimeout);
        statusUpdateTimeout = setTimeout(() => {
          socket.to(`profile:${socket.profileId}`).emit("status_update", {
            profileId: socket.profileId,
            status
          });
        }, 1000);
      }
    });

    // Heartbeat for connection health
    const heartbeatInterval = setInterval(() => {
      if (Date.now() - (socket.lastActivity || 0) > CONNECTION_LIMITS.connectionTimeout) {
        console.log(`Disconnecting inactive socket: ${socket.id}`);
        socket.disconnect();
      }
    }, 30000);

    // Enhanced disconnect handling
    socket.on("disconnect", () => {
      console.log(`Optimized WebSocket disconnected: ${socket.id}`);
      
      // Clean up resources
      if (typingTimeout) clearTimeout(typingTimeout);
      if (statusUpdateTimeout) clearTimeout(statusUpdateTimeout);
      clearInterval(heartbeatInterval);
      
      // Remove from rate limiters
      for (const [key] of rateLimiters.entries()) {
        if (key.startsWith(socket.id)) {
          rateLimiters.delete(key);
        }
      }
      
      // Send offline status
      if (socket.profileId) {
        socket.to(`profile:${socket.profileId}`).emit("status_update", {
          profileId: socket.profileId,
          status: "offline"
        });
      }
    });
  });

  // Periodic cache cleanup
  setInterval(() => {
    const now = Date.now();
    
    // Clean user cache
    userCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL) {
        userCache.delete(key);
      }
    });
    
    // Clean conversation cache
    conversationCache.forEach((value, key) => {
      if (now - value.timestamp > CACHE_TTL) {
        conversationCache.delete(key);
      }
    });
    
    // Clean rate limiters
    const maxWindow = Math.max(...Object.values(RATE_LIMITS).map(r => r.window));
    rateLimiters.forEach((value, key) => {
      if (now - value.windowStart > maxWindow) {
        rateLimiters.delete(key);
      }
    });
  }, 5 * 60 * 1000); // Every 5 minutes

  global.io = io;
}

// Optimized helper functions with caching
export function emitNotificationOptimized(userId: number, notification: any) {
  if (global.io) {
    // Add timestamp for client-side deduplication
    const enrichedNotification = {
      ...notification,
      timestamp: Date.now(),
      id: notification.id || Math.random().toString(36).substring(7)
    };
    
    global.io.to(`user:${userId}`).emit("notification", enrichedNotification);
  }
}

export function emitFriendRequestOptimized(userId: number, friendRequest: any) {
  if (global.io) {
    const enrichedRequest = {
      ...friendRequest,
      timestamp: Date.now(),
      id: friendRequest.id || Math.random().toString(36).substring(7)
    };
    
    global.io.to(`user:${userId}`).emit("friend_request", enrichedRequest);
  }
}

export function emitPostUpdateOptimized(profileId: number, post: any) {
  if (global.io) {
    const enrichedPost = {
      ...post,
      timestamp: Date.now()
    };
    
    global.io.to(`profile:${profileId}`).emit("post_update", enrichedPost);
  }
}

// Export cache utilities for external use
export const websocketCache = {
  getUserCache: () => userCache,
  getConversationCache: () => conversationCache,
  clearCache: () => {
    userCache.clear();
    conversationCache.clear();
  }
};