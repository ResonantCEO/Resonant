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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showLoading, setShowLoading] = useState(true);
  
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Handle 2-second loading period
  useEffect(() => {
    if (user || isError) {
      // User data loaded or error occurred
      if (isInitialLoad) {
        // On initial load, show loading for full 2 seconds
        const timer = setTimeout(() => {
          setShowLoading(false);
          setIsInitialLoad(false);
        }, 2000);

        return () => clearTimeout(timer);
      } else {
        // On subsequent loads, hide loading immediately
        setShowLoading(false);
      }
    }
  }, [user, isError, isInitialLoad]);

  // Reset loading state when query starts loading again after being idle
  useEffect(() => {
    if (isLoading && !user && !isError && !isInitialLoad) {
      setShowLoading(true);
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, user, isError, isInitialLoad]);

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
