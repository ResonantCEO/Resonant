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
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Discover from "@/pages/discover";
import Dashboard from "@/pages/dashboard";
import Friends from "@/pages/friends";
import NotFound from "@/pages/not-found";
import NotificationsPage from "./pages/notifications";
import Messages from "./pages/messages";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-900">
      <div className="text-center px-4">
        <img 
          src="/resonant-logo.png" 
          alt="Resonant" 
          className="h-16 sm:h-20 mx-auto mb-4 animate-pulse block dark:hidden"
          loading="eager"
          decoding="sync"
        />
        <img 
          src="/resonant-logo-white.png" 
          alt="Resonant" 
          className="h-16 sm:h-20 mx-auto mb-4 animate-pulse hidden dark:block"
          loading="eager"
          decoding="sync"
        />
        <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 sm:border-4 border-neutral-300 dark:border-neutral-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  console.log("Router state:", { isLoading, isAuthenticated, hasUser: !!user });

  // Always show loading screen during loading state
  if (isLoading) {
    console.log("Showing loading screen");
    return <LoadingScreen />;
  }

  // If not authenticated after loading is complete, show landing page
  if (!isAuthenticated && !isLoading) {
    console.log("Not authenticated, showing landing page");
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route path="/*" component={Landing} />
      </Switch>
    );
  }

  // If authenticated and not loading, show main app routes
  console.log("Authenticated, showing main routes");
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 mobile-viewport-fix">
      <div className="lg:hidden mobile-content mobile-bottom-safe">
        <Switch>
          <Route path="/" component={Profile} />
          <Route path="/home" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/profile" component={Profile} />
          <Route path="/profile/:id" component={Profile} />
          <Route path="/friends" component={Friends} />
          <Route path="/discover" component={Discover} />
          <Route path="/settings" component={Settings} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/messages" component={Messages} />
          <Route path="/*" component={Profile} />
        </Switch>
        <BottomNav />
      </div>
      
      <div className="hidden lg:block">
        <Switch>
          <Route path="/" component={Profile} />
          <Route path="/home" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/profile" component={Profile} />
          <Route path="/profile/:id" component={Profile} />
          <Route path="/friends" component={Friends} />
          <Route path="/discover" component={Discover} />
          <Route path="/settings" component={Settings} />
          <Route path="/notifications" component={NotificationsPage} />
          <Route path="/messages" component={Messages} />
          <Route path="/*" component={Profile} />
        </Switch>
      </div>
    </div>
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