import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/user"],
    retry: false,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the response
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
