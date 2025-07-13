import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocketOptimized } from './useSocketOptimized';

interface NotificationCounts {
  [profileId: string]: {
    notifications: number;
    friendRequests: number;
    total: number;
  };
}

export function useNotificationOptimized() {
  const queryClient = useQueryClient();
  const lastUpdateRef = useRef(Date.now());
  const batchUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get notification counts with optimized caching
  const {
    data: notificationCounts,
    refetch: refetchNotifications,
    isLoading,
    error
  } = useQuery<NotificationCounts>({
    queryKey: ["/api/notifications/counts-by-profile"],
    staleTime: 60000, // 1 minute stale time - much longer since we have real-time updates
    gcTime: 5 * 60 * 1000, // 5 minute garbage collection
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Disable refetch on focus since we have real-time updates
    refetchOnMount: false, // Only refetch on mount if data is stale
    refetchOnReconnect: true, // Refetch when network reconnects
  });

  // Batch notification updates to prevent excessive re-renders
  const batchedInvalidateNotifications = useCallback(() => {
    if (batchUpdateTimeoutRef.current) {
      clearTimeout(batchUpdateTimeoutRef.current);
    }

    batchUpdateTimeoutRef.current = setTimeout(() => {
      const now = Date.now();
      // Only invalidate if enough time has passed since last update
      if (now - lastUpdateRef.current > 5000) { // 5 second minimum between updates
        queryClient.invalidateQueries({
          queryKey: ["/api/notifications/counts-by-profile"],
          refetchType: 'active'
        });
        lastUpdateRef.current = now;
      }
    }, 2000); // 2 second debounce
  }, [queryClient]);

  // Handle real-time notification events with deduplication
  const handleNotificationReceived = useCallback((notification: any) => {
    // Update cache optimistically if we have the data
    if (notificationCounts && notification.profileId) {
      queryClient.setQueryData<NotificationCounts>(
        ["/api/notifications/counts-by-profile"],
        (oldData) => {
          if (!oldData) return oldData;

          const profileId = notification.profileId.toString();
          const currentCounts = oldData[profileId] || { notifications: 0, friendRequests: 0, total: 0 };

          return {
            ...oldData,
            [profileId]: {
              ...currentCounts,
              notifications: currentCounts.notifications + 1,
              total: currentCounts.total + 1
            }
          };
        }
      );
    } else {
      // Fallback to invalidation if no cache data
      batchedInvalidateNotifications();
    }
  }, [notificationCounts, queryClient, batchedInvalidateNotifications]);

  const handleNotificationRead = useCallback((notification: any) => {
    // Update cache optimistically
    if (notificationCounts && notification.profileId) {
      queryClient.setQueryData<NotificationCounts>(
        ["/api/notifications/counts-by-profile"],
        (oldData) => {
          if (!oldData) return oldData;

          const profileId = notification.profileId.toString();
          const currentCounts = oldData[profileId] || { notifications: 0, friendRequests: 0, total: 0 };

          return {
            ...oldData,
            [profileId]: {
              ...currentCounts,
              notifications: Math.max(0, currentCounts.notifications - 1),
              total: Math.max(0, currentCounts.total - 1)
            }
          };
        }
      );
    } else {
      batchedInvalidateNotifications();
    }
  }, [notificationCounts, queryClient, batchedInvalidateNotifications]);

  const handleFriendRequest = useCallback((friendRequest: any) => {
    // Update cache optimistically
    if (notificationCounts && friendRequest.profileId) {
      queryClient.setQueryData<NotificationCounts>(
        ["/api/notifications/counts-by-profile"],
        (oldData) => {
          if (!oldData) return oldData;

          const profileId = friendRequest.profileId.toString();
          const currentCounts = oldData[profileId] || { notifications: 0, friendRequests: 0, total: 0 };

          return {
            ...oldData,
            [profileId]: {
              ...currentCounts,
              friendRequests: currentCounts.friendRequests + 1,
              total: currentCounts.total + 1
            }
          };
        }
      );
    } else {
      batchedInvalidateNotifications();
    }

    // Also invalidate friend requests list
    queryClient.invalidateQueries({
      queryKey: ["/api/friend-requests"],
      refetchType: 'active'
    });
  }, [notificationCounts, queryClient, batchedInvalidateNotifications]);

  const handleFriendRequestAccepted = useCallback((response: any) => {
    // Update cache optimistically
    if (notificationCounts && response.profileId) {
      queryClient.setQueryData<NotificationCounts>(
        ["/api/notifications/counts-by-profile"],
        (oldData) => {
          if (!oldData) return oldData;

          const profileId = response.profileId.toString();
          const currentCounts = oldData[profileId] || { notifications: 0, friendRequests: 0, total: 0 };

          return {
            ...oldData,
            [profileId]: {
              ...currentCounts,
              friendRequests: Math.max(0, currentCounts.friendRequests - 1),
              total: Math.max(0, currentCounts.total - 1)
            }
          };
        }
      );
    } else {
      batchedInvalidateNotifications();
    }

    // Invalidate friend-related queries
    queryClient.invalidateQueries({
      queryKey: ["/api/friend-requests"],
      refetchType: 'active'
    });
    queryClient.invalidateQueries({
      queryKey: ["/api/friends"],
      refetchType: 'none' // Just mark as stale
    });
  }, [notificationCounts, queryClient, batchedInvalidateNotifications]);

  // Use optimized WebSocket with selective event handling
  const { isConnected } = useSocketOptimized({
    enableNotifications: true,
    enableMessaging: false, // Only enable notifications for this hook
    enableStatusUpdates: false,
    onConnect: () => {
      // Refresh counts on reconnect to ensure consistency
      refetchNotifications();
    },
    onDisconnect: () => {
    }
  });

  // Listen for custom events from WebSocket
  useEffect(() => {
    const handleNotificationEvent = (event: CustomEvent) => {
      handleNotificationReceived(event.detail);
    };

    const handleFriendRequestEvent = (event: CustomEvent) => {
      handleFriendRequest(event.detail);
    };

    window.addEventListener('newNotification', handleNotificationEvent);
    window.addEventListener('newFriendRequest', handleFriendRequestEvent);

    return () => {
      window.removeEventListener('newNotification', handleNotificationEvent);
      window.removeEventListener('newFriendRequest', handleFriendRequestEvent);

      // Clean up batch timeout
      if (batchUpdateTimeoutRef.current) {
        clearTimeout(batchUpdateTimeoutRef.current);
      }
    };
  }, [handleNotificationReceived, handleFriendRequest]);

  // Utility function to get notification count for a specific profile
  const getNotificationCount = useCallback((profileId: number | string) => {
    if (!notificationCounts) return 0;
    const profileKey = profileId.toString();
    return notificationCounts[profileKey]?.total || 0;
  }, [notificationCounts]);

  // Utility function to get breakdown for a specific profile
  const getNotificationBreakdown = useCallback((profileId: number | string) => {
    if (!notificationCounts) return { notifications: 0, friendRequests: 0, total: 0 };
    const profileKey = profileId.toString();
    return notificationCounts[profileKey] || { notifications: 0, friendRequests: 0, total: 0 };
  }, [notificationCounts]);

  // Manual refresh function for edge cases
  const refreshNotifications = useCallback(() => {
    refetchNotifications();
  }, [refetchNotifications]);

  // Mark notifications as read (optimistic update)
  const markNotificationAsRead = useCallback((notificationId: number, profileId: number) => {
    handleNotificationRead({ id: notificationId, profileId });
  }, [handleNotificationRead]);

  return {
    notificationCounts,
    isLoading,
    error,
    isConnected,
    getNotificationCount,
    getNotificationBreakdown,
    refreshNotifications,
    markNotificationAsRead,
    // Health indicator
    isHealthy: isConnected && !error
  };
}