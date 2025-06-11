import { useQuery, useQueryClient } from "@tanstack/react-query";

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
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
  });

  const updateUser = (updatedUser: User) => {
    queryClient.setQueryData(["/api/user"], updatedUser);
  };

  // Force loading state until we have a definitive result (success or error)
  const authLoading = isLoading || (user === undefined && !isError);

  return {
    user,
    isLoading: authLoading,
    isAuthenticated: !!user,
    updateUser,
  };
}
