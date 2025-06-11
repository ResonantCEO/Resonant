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
  const [hasMinimumLoadTime, setHasMinimumLoadTime] = useState(false);
  
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Ensure minimum loading time of 200ms to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMinimumLoadTime(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  const updateUser = (updatedUser: User) => {
    queryClient.setQueryData(["/api/user"], updatedUser);
  };

  // Only show loading on initial load and during minimum time
  const authLoading = isLoading && !hasMinimumLoadTime;

  return {
    user,
    isLoading: authLoading,
    isAuthenticated: !!user,
    updateUser,
  };
}
