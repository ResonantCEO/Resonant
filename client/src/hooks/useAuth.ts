import { useQuery } from "@tanstack/react-query";

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
  createdAt?: string;
  updatedAt?: string;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    onSuccess: (data) => {
      console.log("useAuth - Received user data:", data);
      console.log("useAuth - Theme field:", data?.theme);
    },
  });

  console.log("useAuth - Current user state:", user);
  console.log("useAuth - Current user theme:", user?.theme);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
