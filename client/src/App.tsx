import React, { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Router } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { SidebarProvider } from "@/hooks/useSidebar";

// Pages
import LandingPage from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import ProfilePage from "@/pages/profile";
import DiscoverPage from "@/pages/discover";
import FriendsPage from "@/pages/friends";
import SettingsPage from "@/pages/settings";
import DashboardPage from "@/pages/dashboard";
import NotificationsPage from "@/pages/notifications";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

// Components
import Sidebar from "@/components/sidebar";
import BottomNav from "@/components/bottom-nav";

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 dark:from-neutral-900 dark:to-neutral-800">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">Something went wrong</h2>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.reload();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-900 dark:to-neutral-800">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-neutral-600 dark:text-neutral-400">Loading...</p>
    </div>
  </div>
);

function App() {
  const { isLoading, isAuthenticated, user } = useAuth();

  console.log("Router state:", { isLoading, isAuthenticated, hasUser: !!user });

  if (isLoading) {
    console.log("Showing loading screen");
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    console.log("Not authenticated, showing auth page");
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <Suspense fallback={<LoadingScreen />}>
            <AuthPage />
          </Suspense>
          <Toaster />
        </ThemeProvider>
      </ErrorBoundary>
    );
  }

  console.log("Authenticated, showing main routes");
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppearanceProvider>
          <SidebarProvider>
            <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
              <Suspense fallback={<LoadingScreen />}>
                <Sidebar />
              </Suspense>
              <div className="lg:pl-80">
                <Router>
                  <Suspense fallback={<LoadingScreen />}>
                    <Switch>
                      <Route path="/" component={LandingPage} />
                      <Route path="/profile/:id?" component={ProfilePage} />
                      <Route path="/discover" component={DiscoverPage} />
                      <Route path="/friends" component={FriendsPage} />
                      <Route path="/settings" component={SettingsPage} />
                      <Route path="/dashboard" component={DashboardPage} />
                      <Route path="/notifications" component={NotificationsPage} />
                      <Route path="/admin" component={AdminPage} />
                      <Route component={NotFound} />
                    </Switch>
                  </Suspense>
                </Router>
              </div>
              <Suspense fallback={null}>
                <BottomNav />
              </Suspense>
            </div>
            <Toaster />
          </SidebarProvider>
        </AppearanceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default function AppWithProviders() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}