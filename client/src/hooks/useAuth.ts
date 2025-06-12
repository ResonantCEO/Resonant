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
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  // Track initial load completion
  useEffect(() => {
    if (!isLoading && !hasInitialLoad) {
      setHasInitialLoad(true);
    }
  }, [isLoading, hasInitialLoad]);

  const updateUser = (updatedUser: User) => {
    queryClient.setQueryData(["/api/user"], updatedUser);
  };

  return {
    user,
    isLoading: !hasInitialLoad,
    isAuthenticated: !!user,
    updateUser,
  };
}
