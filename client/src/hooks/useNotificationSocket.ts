import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';

export function useNotificationSocket() {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  const invalidateNotificationQueries = useCallback(() => {
    // Smart cache invalidation with selective updates
    queryClient.invalidateQueries({ 
      queryKey: ["/api/notifications/counts-by-profile"],
      refetchType: 'active' // Only refetch active queries
    });
    
    // Also invalidate profile-specific queries if needed
    queryClient.invalidateQueries({ 
      queryKey: ["/api/profiles/active"],
      refetchType: 'none' // Don't refetch immediately, just mark as stale
    });
  }, [queryClient]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Handle notification events efficiently
    const handleNotificationUpdate = () => {
      // Debounce multiple rapid updates
      clearTimeout((globalThis as any).__notificationUpdateTimeout);
      (globalThis as any).__notificationUpdateTimeout = setTimeout(() => {
        invalidateNotificationQueries();
      }, 1000); // Wait 1 second before invalidating
    };

    const handleProfileSwitch = () => {
      // Immediate invalidation for profile switches
      invalidateNotificationQueries();
    };

    // Listen for notification-related events
    socket.on('notification_received', handleNotificationUpdate);
    socket.on('notification_read', handleNotificationUpdate);
    socket.on('friend_request_sent', handleNotificationUpdate);
    socket.on('friend_request_accepted', handleNotificationUpdate);
    socket.on('profile_activated', handleProfileSwitch);

    return () => {
      socket.off('notification_received', handleNotificationUpdate);
      socket.off('notification_read', handleNotificationUpdate);
      socket.off('friend_request_sent', handleNotificationUpdate);
      socket.off('friend_request_accepted', handleNotificationUpdate);
      socket.off('profile_activated', handleProfileSwitch);
      
      // Clean up timeout
      clearTimeout((globalThis as any).__notificationUpdateTimeout);
    };
  }, [socket, isConnected, invalidateNotificationQueries]);

  return {
    isConnected,
    triggerNotificationUpdate: invalidateNotificationQueries
  };
}