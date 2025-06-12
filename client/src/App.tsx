import React from "react";
import { Router, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider } from "@/hooks/useSidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeSync } from "@/components/ThemeSync";

import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Discover from "@/pages/discover";
import Friends from "@/pages/friends";
import Notifications from "@/pages/notifications";
import NotFound from "@/pages/not-found";

// Create a single QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
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
    console.error("Error boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              The application encountered an error. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
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

  // Main routing logic
  if (isLoading) {
    console.log("Showing loading screen");
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-900">
        <div className="text-center">
          <img src="/resonant-logo.png" alt="Resonant" className="h-20 mx-auto mb-4 animate-pulse block dark:hidden" />
          <img src="/resonant-logo-white.png" alt="Resonant" className="h-20 mx-auto mb-4 animate-pulse hidden dark:block" />
          <div className="w-8 h-8 border-4 border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  console.log("Router state:", { isLoading, isAuthenticated, hasUser: !!user });

  if (!user) {
    console.log("Not authenticated, showing auth page");
    return <AuthPage />;
  }

  console.log("User authenticated, showing main app");

  return (
    <Router>
      <Route path="/" component={Dashboard} />
      <Route path="/profile/:id?" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/discover" component={Discover} />
      <Route path="/friends" component={Friends} />
      <Route path="/notifications" component={Notifications} />
      <Route component={NotFound} />
    </Router>
  );
}

// Main App Component
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <ThemeProvider>
            <ThemeSync />
            <AppRouter />
            <Toaster />
          </ThemeProvider>
        </SidebarProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;