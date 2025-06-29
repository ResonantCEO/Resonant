import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
  showOnlineStatus?: boolean;
  allowFriendRequests?: boolean;
  showActivityStatus?: boolean;
  emailNotifications?: boolean;
  notifyFriendRequests?: boolean;
  notifyMessages?: boolean;
  notifyPostLikes?: boolean;
  notifyComments?: boolean;
  theme?: string;
  language?: string;
  compactMode?: boolean;
  autoplayVideos?: boolean;
  profileBackground?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [initialLoad, setInitialLoad] = useState(true);
  const [showLoading, setShowLoading] = useState(true);

  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    onSuccess: (data) => {
      setUser(data);
      // Refresh friend-related data when user logs in
      queryClient.invalidateQueries({ queryKey: [`/api/friend-requests`] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
    },
  });

  // Only show loading screen on initial app load or when there's no cached data
  useEffect(() => {
    if (!isLoading && (user !== undefined || isError)) {
      if (initialLoad) {
        // Small delay only on initial load for smooth UX
        const timer = setTimeout(() => {
          setShowLoading(false);
          setInitialLoad(false);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        // For subsequent auth checks, show immediately
        setShowLoading(false);
      }
    }
  }, [isLoading, user, isError, initialLoad]);

  const updateUser = (updatedUser: User) => {
    queryClient.setQueryData(["/api/user"], updatedUser);
  };

  return {
    user,
    isLoading: showLoading,
    isAuthenticated: !!user,
    updateUser,
  };
}