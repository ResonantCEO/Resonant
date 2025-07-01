import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onNewMessage?: (message: any) => void;
  onMessageNotification?: (notification: any) => void;
  onTyping?: (data: { profileId: number; conversationId: number }) => void;
  onStoppedTyping?: (data: { profileId: number; conversationId: number }) => void;
  onStatusUpdate?: (data: { profileId: number; status: string }) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { user } = useAuth();
  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || !activeProfile) {
      // Disconnect if no user/profile
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const newSocket = io(window.location.origin, {
      auth: {
        userId: (user as any).id,
        profileId: (activeProfile as any).id,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      options.onConnect?.();
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      options.onDisconnect?.();
    });

    // Message event handlers
    newSocket.on('new_message', (message) => {
      console.log('New message received:', message);
      options.onNewMessage?.(message);
    });

    newSocket.on('message_notification', (notification) => {
      console.log('Message notification received:', notification);
      options.onMessageNotification?.(notification);
    });

    // Typing indicators
    newSocket.on('user_typing', (data) => {
      options.onTyping?.(data);
    });

    newSocket.on('user_stopped_typing', (data) => {
      options.onStoppedTyping?.(data);
    });

    // Status updates
    newSocket.on('status_update', (data) => {
      options.onStatusUpdate?.(data);
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Cleanup on unmount or dependency change
    return () => {
      if (socket) {
        // Clean up all listeners before disconnecting
        socket.off('connect');
        socket.off('disconnect');
        socket.off('new_message');
        socket.off('message_notification');
        socket.off('user_typing');
        socket.off('user_stopped_typing');
        socket.off('status_update');

        // Disconnect the socket
        socket.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
    };
  }, [(user as any)?.id, (activeProfile as any)?.id]);

  // Socket methods
  const joinConversation = (conversationId: number) => {
    if (socket) {
      socket.emit('join_conversation', conversationId);
    }
  };

  const leaveConversation = (conversationId: number) => {
    if (socket) {
      socket.emit('leave_conversation', conversationId);
    }
  };

  const sendMessage = (data: {
    conversationId: number;
    content: string;
    messageType?: string;
    replyToId?: number;
  }) => {
    if (socket) {
      socket.emit('send_message', {
        ...data,
        messageType: data.messageType || 'text',
      });
    }
  };

  const startTyping = (conversationId: number) => {
    if (socket) {
      socket.emit('typing_start', conversationId);
    }
  };

  const stopTyping = (conversationId: number) => {
    if (socket) {
      socket.emit('typing_stop', conversationId);
    }
  };

  const updateStatus = (status: 'online' | 'away' | 'offline') => {
    if (socket) {
      socket.emit('update_status', status);
    }
  };

  return {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    updateStatus,
  };
}