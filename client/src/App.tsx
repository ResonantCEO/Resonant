import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { SidebarProvider, useSidebar } from "@/hooks/useSidebar";
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

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={AuthPage} />
      ) : (
        <>
          <Route path="/" component={Profile} />
          <Route path="/home" component={Home} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/profile" component={Profile} />
          <Route path="/profile/:id" component={Profile} />
          <Route path="/settings" component={Settings} />
          <Route path="/discover" component={Discover} />
          <Route path="/friends" component={Friends} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isCollapsed } = useSidebar();

  if (isLoading || !isAuthenticated) {
    return <Router />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ${
        isCollapsed ? 'lg:ml-16' : 'lg:ml-80'
      } pb-16 lg:pb-0`}>
        <Router />
      </div>
      <BottomNav />
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
            <AppContent />
          </TooltipProvider>
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;