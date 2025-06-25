
import { Server as SocketIOServer, Socket } from "socket.io";
import { storage } from "./storage";

interface AuthenticatedSocket extends Socket {
  userId?: number;
  profileId?: number;
}

export function setupWebSocketHandlers(io: SocketIOServer) {
  // Authentication middleware for WebSocket connections
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;
      
      if (!userId) {
        return next(new Error("Authentication error"));
      }

      // Verify user exists
      const user = await storage.getUser(parseInt(userId));
      if (!user) {
        return next(new Error("User not found"));
      }

      // Get active profile
      const activeProfile = await storage.getActiveProfile(parseInt(userId));
      
      socket.userId = parseInt(userId);
      socket.profileId = activeProfile?.id;
      
      console.log(`WebSocket authenticated: User ${userId}, Profile ${activeProfile?.id}`);
      next();
    } catch (error) {
      console.error("WebSocket authentication error:", error);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`WebSocket connected: ${socket.id}, User: ${socket.userId}`);

    // Join user-specific room for notifications
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      console.log(`User ${socket.userId} joined notification room`);
    }

    // Join profile-specific room
    if (socket.profileId) {
      socket.join(`profile:${socket.profileId}`);
      console.log(`Profile ${socket.profileId} joined room`);
    }

    // Handle real-time messaging
    socket.on("join_conversation", (conversationId: number) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    socket.on("leave_conversation", (conversationId: number) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    socket.on("send_message", async (data) => {
      try {
        const { conversationId, content, messageType, replyToId } = data;
        
        if (!socket.profileId) {
          socket.emit("error", "No active profile");
          return;
        }

        // Save message to database
        const message = await storage.sendMessage({
          conversationId,
          senderId: socket.profileId,
          content,
          messageType,
          replyToId,
        });

        // Emit to all users in the conversation
        io.to(`conversation:${conversationId}`).emit("new_message", message);
        
        // Send notifications to other participants
        const conversations = await storage.getConversations(socket.profileId);
        const conversation = conversations.find(c => c.id === conversationId);
        
        if (conversation?.participants) {
          for (const participant of conversation.participants) {
            if (participant.id !== socket.profileId) {
              io.to(`profile:${participant.id}`).emit("message_notification", {
                conversationId,
                message: content,
                sender: {
                  id: socket.profileId,
                  name: conversation.participants.find(p => p.id === socket.profileId)?.name
                }
              });
            }
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (conversationId: number) => {
      socket.to(`conversation:${conversationId}`).emit("user_typing", {
        profileId: socket.profileId,
        conversationId
      });
    });

    socket.on("typing_stop", (conversationId: number) => {
      socket.to(`conversation:${conversationId}`).emit("user_stopped_typing", {
        profileId: socket.profileId,
        conversationId
      });
    });

    // Handle online status
    socket.on("update_status", (status: "online" | "away" | "offline") => {
      if (socket.profileId) {
        socket.to(`profile:${socket.profileId}`).emit("status_update", {
          profileId: socket.profileId,
          status
        });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`WebSocket disconnected: ${socket.id}, User: ${socket.userId}`);
      
      if (socket.profileId) {
        socket.to(`profile:${socket.profileId}`).emit("status_update", {
          profileId: socket.profileId,
          status: "offline"
        });
      }
    });
  });

  // Export io instance for use in other modules
  global.io = io;
}

// Helper functions for emitting events from other parts of the application
export function emitNotification(userId: number, notification: any) {
  if (global.io) {
    global.io.to(`user:${userId}`).emit("notification", notification);
  }
}

export function emitFriendRequest(userId: number, friendRequest: any) {
  if (global.io) {
    global.io.to(`user:${userId}`).emit("friend_request", friendRequest);
  }
}

export function emitPostUpdate(profileId: number, post: any) {
  if (global.io) {
    global.io.to(`profile:${profileId}`).emit("post_update", post);
  }
}

// Declare global io for TypeScript
declare global {
  var io: SocketIOServer | undefined;
}
