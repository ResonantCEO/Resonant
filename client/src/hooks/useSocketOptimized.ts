import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onNewMessage?: (message: any) => void;
  onMessageNotification?: (notification: any) => void;
  onTyping?: (data: { profileId: number; conversationId: number }) => void;
  onStoppedTyping?: (data: { profileId: number; conversationId: number }) => void;
  onStatusUpdate?: (data: { profileId: number; status: string }) => void;
  enableNotifications?: boolean;
  enableMessaging?: boolean;
  enableStatusUpdates?: boolean;
}

// Connection management singleton
class SocketManager {
  private static instance: SocketManager;
  private socket: Socket | null = null;
  private subscribers = new Set<(socket: Socket | null, isConnected: boolean) => void>();
  private isConnected = false;
  private lastActivity = Date.now();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  connect(userId: number, profileId?: number): void {
    if (this.socket?.connected && (this.socket as any).auth?.userId === userId && (this.socket as any).auth?.profileId === profileId) {
      return; // Already connected with same credentials
    }

    this.disconnect();

    this.socket = io(window.location.origin, {
      auth: { userId, profileId },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected successfully');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.lastActivity = Date.now();
      this.startHeartbeat();
      this.notifySubscribers();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.stopHeartbeat();
      this.notifySubscribers();

      // Auto-reconnect for certain reasons
      if (reason === 'io server disconnect') {
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 5000);
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      }, delay);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping');
        this.lastActivity = Date.now();
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.stopHeartbeat();
    this.notifySubscribers();
  }

  subscribe(callback: (socket: Socket | null, isConnected: boolean) => void): () => void {
    this.subscribers.add(callback);
    // Immediately notify with current state
    callback(this.socket, this.isConnected);
    
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      callback(this.socket, this.isConnected);
    });
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }
}

// Message deduplication and caching
const messageCache = new Map<string, any>();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

function isDuplicateMessage(message: any): boolean {
  if (!message.id) return false;
  
  const cacheKey = `msg_${message.id}`;
  const cached = messageCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
    return true;
  }
  
  messageCache.set(cacheKey, { message, timestamp: Date.now() });
  return false;
}

// Event debouncing
function createDebouncer<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  
  const debouncedFn = ((...args: any[]) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T & { cancel: () => void };
  
  debouncedFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debouncedFn;
}

export function useSocketOptimized(options: UseSocketOptions = {}) {
  const { user } = useAuth();
  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
  const queryClient = useQueryClient();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketManager = useMemo(() => SocketManager.getInstance(), []);
  
  // Debounced event handlers
  const debouncedTypingStart = useRef(createDebouncer((conversationId: number) => {
    socket?.emit('typing_start', conversationId);
  }, 300));
  
  const debouncedTypingStop = useRef(createDebouncer((conversationId: number) => {
    socket?.emit('typing_stop', conversationId);
  }, 500));

  // Optimized cache invalidation
  const invalidateQueries = useCallback((queryKeys: string[]) => {
    const batchInvalidation = queryKeys.map(key => 
      queryClient.invalidateQueries({ 
        queryKey: [key],
        refetchType: 'active'
      })
    );
    
    Promise.all(batchInvalidation).catch(console.error);
  }, [queryClient]);

  // Socket event handlers with deduplication
  const handleNewMessage = useCallback((message: any) => {
    if (isDuplicateMessage(message)) return;
    
    console.log('Received new message:', message);
    options.onNewMessage?.(message);
    
    // Optimized cache update
    queryClient.setQueryData(
      ["/api/conversations", message.conversationId, "messages"],
      (oldMessages: any[]) => {
        if (!oldMessages) return [message];
        
        const exists = oldMessages.some(m => m.id === message.id);
        if (exists) return oldMessages;
        
        return [...oldMessages, message].sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
    );
  }, [options.onNewMessage, queryClient]);

  const handleMessageNotification = useCallback((notification: any) => {
    console.log('Message notification received:', notification);
    options.onMessageNotification?.(notification);
    
    // Update conversation list cache
    invalidateQueries(["/api/conversations"]);
  }, [options.onMessageNotification, invalidateQueries]);

  const handleNotification = useCallback((notification: any) => {
    if (isDuplicateMessage(notification)) return;
    
    console.log('Notification received:', notification);
    
    // Batch invalidate notification-related queries
    invalidateQueries([
      "/api/notifications/counts-by-profile",
      "/api/notifications"
    ]);
    
    // Emit custom event for components to listen
    window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }));
  }, [invalidateQueries]);

  const handleFriendRequest = useCallback((friendRequest: any) => {
    if (isDuplicateMessage(friendRequest)) return;
    
    console.log('Friend request received:', friendRequest);
    
    invalidateQueries([
      "/api/friend-requests",
      "/api/notifications/counts-by-profile"
    ]);
    
    window.dispatchEvent(new CustomEvent('newFriendRequest', { detail: friendRequest }));
  }, [invalidateQueries]);

  // Connection management
  useEffect(() => {
    if (!user || !activeProfile) {
      socketManager.disconnect();
      return;
    }

    const userId = (user as any).id;
    const profileId = (activeProfile as any).id;
    
    socketManager.connect(userId, profileId);

    const unsubscribe = socketManager.subscribe((newSocket, connected) => {
      setSocket(newSocket);
      setIsConnected(connected);
      
      if (connected) {
        options.onConnect?.();
      } else {
        options.onDisconnect?.();
      }
    });

    return unsubscribe;
  }, [(user as any)?.id, (activeProfile as any)?.id, socketManager]);

  // Event listener setup
  useEffect(() => {
    if (!socket || !isConnected) return;

    const eventHandlers: Array<[string, Function]> = [];

    // Messaging events
    if (options.enableMessaging !== false) {
      eventHandlers.push(
        ['new_message', handleNewMessage],
        ['message_notification', handleMessageNotification]
      );
    }

    // Notification events
    if (options.enableNotifications !== false) {
      eventHandlers.push(
        ['notification', handleNotification],
        ['friend_request', handleFriendRequest]
      );
    }

    // Typing events
    if (options.onTyping || options.onStoppedTyping) {
      eventHandlers.push(
        ['user_typing', options.onTyping || (() => {})],
        ['user_stopped_typing', options.onStoppedTyping || (() => {})]
      );
    }

    // Status events
    if (options.onStatusUpdate && options.enableStatusUpdates !== false) {
      eventHandlers.push(['status_update', options.onStatusUpdate]);
    }

    // Register all event handlers
    eventHandlers.forEach(([event, handler]) => {
      socket.on(event, handler as any);
    });

    // Cleanup
    return () => {
      eventHandlers.forEach(([event, handler]) => {
        socket.off(event, handler as any);
      });
    };
  }, [
    socket,
    isConnected,
    handleNewMessage,
    handleMessageNotification,
    handleNotification,
    handleFriendRequest,
    options.onTyping,
    options.onStoppedTyping,
    options.onStatusUpdate,
    options.enableMessaging,
    options.enableNotifications,
    options.enableStatusUpdates
  ]);

  // Socket methods with error handling
  const joinConversation = useCallback((conversationId: number) => {
    if (socket?.connected) {
      socket.emit('join_conversation', conversationId);
    }
  }, [socket]);

  const leaveConversation = useCallback((conversationId: number) => {
    if (socket?.connected) {
      socket.emit('leave_conversation', conversationId);
    }
  }, [socket]);

  const sendMessage = useCallback((data: {
    conversationId: number;
    content: string;
    messageType?: string;
    replyToId?: number;
  }) => {
    if (!socket?.connected) {
      console.warn('Socket not connected, message not sent');
      return false;
    }

    socket.emit('send_message', {
      ...data,
      messageType: data.messageType || 'text',
      timestamp: Date.now(), // Add client timestamp for ordering
    });
    
    return true;
  }, [socket]);

  const startTyping = useCallback((conversationId: number) => {
    debouncedTypingStart.current(conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: number) => {
    debouncedTypingStart.current.cancel();
    debouncedTypingStop.current(conversationId);
  }, []);

  const updateStatus = useCallback((status: 'online' | 'away' | 'offline') => {
    if (socket?.connected) {
      socket.emit('update_status', status);
    }
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedTypingStart.current.cancel();
      debouncedTypingStop.current.cancel();
    };
  }, []);

  return {
    socket,
    isConnected: isConnected && socket?.connected === true,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    updateStatus,
    // Health check method
    isHealthy: () => socketManager.isSocketConnected(),
    // Force reconnect method
    reconnect: () => {
      if (user && activeProfile) {
        socketManager.connect((user as any).id, (activeProfile as any).id);
      }
    }
  };
}

// Cleanup utility for periodic cache maintenance
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of messageCache.entries()) {
    if (now - value.timestamp > CACHE_EXPIRY) {
      messageCache.delete(key);
    }
  }
}, CACHE_EXPIRY);