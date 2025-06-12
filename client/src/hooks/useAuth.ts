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
  const [loadingStartTime, setLoadingStartTime] = useState<number>(() => Date.now());
  const [showLoading, setShowLoading] = useState(true);
  const [hasReceivedData, setHasReceivedData] = useState(false);
  
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Track when we receive data (success or error)
  useEffect(() => {
    if ((user !== undefined || isError) && !hasReceivedData) {
      setHasReceivedData(true);
    }
  }, [user, isError, hasReceivedData]);

  // Handle minimum loading period, but allow immediate authentication for login
  useEffect(() => {
    if (hasReceivedData) {
      // If user is authenticated, skip the loading delay for immediate redirect
      if (user) {
        setShowLoading(false);
        return;
      }
      
      // For unauthenticated state, maintain the 2-second minimum
      const elapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, 2000 - elapsed);
      
      const timer = setTimeout(() => {
        setShowLoading(false);
      }, remainingTime);

      return () => clearTimeout(timer);
    }
  }, [hasReceivedData, loadingStartTime, user]);

  // Reset loading state when authentication changes (logout/login cycles)
  useEffect(() => {
    if (isLoading && hasReceivedData) {
      // New auth cycle started, reset everything
      setLoadingStartTime(Date.now());
      setShowLoading(true);
      setHasReceivedData(false);
    }
  }, [isLoading, hasReceivedData]);

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
