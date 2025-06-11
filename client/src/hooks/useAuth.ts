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

  // Ensure minimum loading time of 500ms to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMinimumLoadTime(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const updateUser = (updatedUser: User) => {
    queryClient.setQueryData(["/api/user"], updatedUser);
  };

  // Force loading state until we have a definitive result (success or error)
  // Keep loading if still loading OR if we haven't gotten any result yet OR minimum time hasn't passed
  const authLoading = isLoading || (user === undefined && !isError) || !hasMinimumLoadTime;

  return {
    user,
    isLoading: authLoading,
    isAuthenticated: !!user,
    updateUser,
  };
}
