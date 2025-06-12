import React from "react";
import { Router, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeSync } from "@/components/ThemeSync";

// Pages
import AuthPage from "@/pages/auth-page";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Friends from "@/pages/friends";
import Dashboard from "@/pages/dashboard";
import Discover from "@/pages/discover";
import Admin from "@/pages/admin";
import Notifications from "@/pages/notifications";
import NotFound from "@/pages/not-found";

// Components
import Sidebar from "@/components/sidebar";
import BottomNav from "@/components/bottom-nav";

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-4">Please refresh the page to try again</p>
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// App Router Component
function AppRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { isCollapsed } = useSidebar();

  console.log("Router state:", { isLoading, isAuthenticated, hasUser: !!user });

  if (isLoading) {
    console.log("Showing loading screen");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    console.log("Not authenticated, showing auth page");
    return <AuthPage />;
  }

  console.log("Authenticated, showing main routes");
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-neutral-900 dark:to-neutral-800">
      <Sidebar />
      <main className={`transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pb-16 lg:pb-0`}>
        <Router>
          <Route path="/" component={Profile} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={Settings} />
          <Route path="/friends" component={Friends} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/discover" component={Discover} />
          <Route path="/admin" component={Admin} />
          <Route path="/notifications" component={Notifications} />
          <Route component={NotFound} />
        </Router>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemeSync />
          <AppRouter />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}