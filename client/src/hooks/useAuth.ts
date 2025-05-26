import { useQuery } from "@tanstack/react-query";

interface User {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  coverImageUrl: string | null;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the response
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 1000, // Force refresh every second for debugging
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
