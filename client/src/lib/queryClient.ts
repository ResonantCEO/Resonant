import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const isFormData = data instanceof FormData;

  const options: RequestInit = {
    method,
    headers: data && !isFormData ? { "Content-Type": "application/json" } : {},
    body: isFormData ? data : (data ? JSON.stringify(data) : undefined),
    credentials: "include",
  };

  try {
    const response = await fetch(url, options);
    await throwIfResNotOk(response);
    return response.json();
  } catch (error) {
    console.error(`API request failed: ${method} ${url}`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();

    // Debug logging for /api/user endpoint specifically
    if (queryKey[0] === '/api/user') {
      console.log("QueryClient - Raw API response for /api/user:", data);
      console.log("QueryClient - coverImageUrl in response:", data?.coverImageUrl);
    }

    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        // Only retry once for other errors
        return failureCount < 1;
      },
      retryDelay: 1000,
      suspense: false, // Disable suspense to prevent suspension errors
      refetchOnMount: false, // Don't automatically refetch on mount
      refetchOnReconnect: false, // Don't refetch on reconnect
    },
    mutations: {
      retry: false, // Don't retry mutations by default
    },
  },
});