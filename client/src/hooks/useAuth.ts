
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
  backgroundImageUrl?: string;
  showOnlineStatus: boolean;
  allowFriendRequests: boolean;
  showActivityStatus: boolean;
  emailNotifications: boolean;
  notifyFriendRequests: boolean;
  notifyMessages: boolean;
  notifyPostLikes: boolean;
  notifyComments: boolean;
  theme: string;
  language: string;
  compactMode: boolean;
  autoplayVideos: boolean;
  profileBackground: string;
  createdAt: string;
  updatedAt: string;
}

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user");
        return response;
      } catch (error: any) {
        // If we get a 401, return null instead of throwing
        if (error.message?.includes('401')) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    enabled: true,
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}
