import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false, // Explicitly disable interval refetching
    enabled: true, // Only fetch once
  });

  return {
    user,
    isLoading,
    error,
    isAuthenticated: !!user,
  };
}