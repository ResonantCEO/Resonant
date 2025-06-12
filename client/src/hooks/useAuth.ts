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
  const {
    data: user,
    isLoading,
    error,
    isError,
  } = useQuery<User>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user");
        console.log("QueryClient - Raw API response for /api/user:", response);
        console.log("QueryClient - coverImageUrl in response:", response.coverImageUrl);
        return response;
      } catch (error) {
        console.error("Auth query error:", error);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 401 errors (unauthenticated)
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 1000,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: false,
    suspense: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isError,
    error,
  };
}