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
    enabled: true, // Only run this query when explicitly enabled
    retry: false, // Completely disable retries for auth
    refetchOnWindowFocus: false,
    staleTime: Infinity, // Never consider this data stale
    refetchInterval: false,
    suspense: false,
    refetchOnMount: false, // Don't refetch on mount if we already have data
    refetchOnReconnect: false, // Don't refetch on reconnect
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !isError,
    error,
  };
}