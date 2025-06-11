import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider } from "@/hooks/useSidebar";
import Sidebar from "@/components/sidebar";
import BottomNav from "@/components/bottom-nav";
import AuthPage from "@/pages/auth-page";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Discover from "@/pages/discover";
import Dashboard from "@/pages/dashboard";
import Friends from "@/pages/friends";
import NotFound from "@/pages/not-found";

function LoadingScreen() {
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

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log("Router state:", { isLoading, isAuthenticated, hasUser: !!user });

  // Show loading screen during authentication check OR during auth state transitions
  if (isLoading || (isAuthenticated === undefined)) {
    console.log("Showing loading screen");
    return <LoadingScreen />;
  }

  // If not authenticated, show auth page for all routes
  if (!isAuthenticated) {
    console.log("Not authenticated, showing auth page");
    return (
      <Switch>
        <Route path="/" component={AuthPage} />
        <Route path="/*" component={AuthPage} />
      </Switch>
    );
  }

  // If authenticated, show main app routes
  console.log("Authenticated, showing main routes");
  return (
    <Switch>
      <Route path="/" component={Profile} />
      <Route path="/home" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/profile/:id" component={Profile} />
      <Route path="/settings" component={Settings} />
      <Route path="/discover" component={Discover} />
      <Route path="/friends" component={Friends} />
      <Route path="/*" component={LoadingScreen} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SidebarProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;