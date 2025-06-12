

import React from "react";
import { Router, Route } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/hooks/useSidebar";
import { ThemeSync } from "@/components/ThemeSync";
import { useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home";
import ProfilePage from "@/pages/profile";
import DiscoverPage from "@/pages/discover";
import FriendsPage from "@/pages/friends";
import NotificationsPage from "@/pages/notifications";
import SettingsPage from "@/pages/settings";
import DashboardPage from "@/pages/dashboard";
import Sidebar from "@/components/sidebar";
import BottomNav from "@/components/bottom-nav";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-center">Something went wrong. Please refresh the page.</div>;
    }

    return this.props.children;
  }
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 dark:from-neutral-900 dark:to-neutral-800 flex items-center justify-center">
      <div className="text-center">
        <img src="/resonant-logo.png" alt="Resonant" className="h-16 mx-auto mb-4 block dark:hidden" />
        <img src="/resonant-logo-white.png" alt="Resonant" className="h-16 mx-auto mb-4 hidden dark:block" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-neutral-600 dark:text-neutral-400">Loading...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, isLoading, isAuthenticated } = useAuth();

  console.log("Router state:", { 
    isLoading, 
    isAuthenticated, 
    hasUser: !!user 
  });

  if (isLoading) {
    console.log("Showing loading screen");
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    console.log("Not authenticated, showing auth page");
    return <AuthPage />;
  }

  console.log("Authenticated, showing main app");
  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900">
      <Sidebar />
      <main className="flex-1 lg:pl-80 pb-16 lg:pb-0">
        <Router>
          <Route path="/" component={HomePage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/discover" component={DiscoverPage} />
          <Route path="/friends" component={FriendsPage} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route path="/dashboard" component={DashboardPage} />
          <Route>
            <div className="p-4 text-center">
              <h1 className="text-2xl font-bold">Page Not Found</h1>
              <p>The page you're looking for doesn't exist.</p>
            </div>
          </Route>
        </Router>
      </main>
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <SidebarProvider>
            <ThemeSync />
            <AppContent />
            <Toaster />
          </SidebarProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

