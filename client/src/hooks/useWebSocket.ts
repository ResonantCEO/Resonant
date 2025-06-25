
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

export function useWebSocket() {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    const socket = io('/', {
      auth: {
        userId: user.id,
        token: 'dummy_token' // You can implement proper JWT tokens if needed
      }
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Real-time notification handling
    socket.on('notification', (notification) => {
      console.log('Received real-time notification:', notification);
      // You can dispatch this to your notification state management
      // or trigger a refetch of notifications
      window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }));
    });

    socket.on('friend_request', (friendRequest) => {
      console.log('Received friend request:', friendRequest);
      window.dispatchEvent(new CustomEvent('newFriendRequest', { detail: friendRequest }));
    });

    socket.on('new_message', (message) => {
      console.log('Received new message:', message);
      window.dispatchEvent(new CustomEvent('newMessage', { detail: message }));
    });

    socket.on('message_notification', (data) => {
      console.log('Received message notification:', data);
      window.dispatchEvent(new CustomEvent('messageNotification', { detail: data }));
    });

    socket.on('user_typing', (data) => {
      window.dispatchEvent(new CustomEvent('userTyping', { detail: data }));
    });

    socket.on('user_stopped_typing', (data) => {
      window.dispatchEvent(new CustomEvent('userStoppedTyping', { detail: data }));
    });

    return () => {
      socket.disconnect();
      setIsConnected(false);
    };
  }, [user]);

  const joinConversation = (conversationId: number) => {
    socketRef.current?.emit('join_conversation', conversationId);
  };

  const leaveConversation = (conversationId: number) => {
    socketRef.current?.emit('leave_conversation', conversationId);
  };

  const sendMessage = (data: {
    conversationId: number;
    content: string;
    messageType?: string;
    replyToId?: number;
  }) => {
    socketRef.current?.emit('send_message', data);
  };

  const startTyping = (conversationId: number) => {
    socketRef.current?.emit('typing_start', conversationId);
  };

  const stopTyping = (conversationId: number) => {
    socketRef.current?.emit('typing_stop', conversationId);
  };

  const updateStatus = (status: 'online' | 'away' | 'offline') => {
    socketRef.current?.emit('update_status', status);
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    updateStatus
  };
}
