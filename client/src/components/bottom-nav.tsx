import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Search, 
  Users, 
  Settings, 
  BarChart3,
  Menu,
  MessageCircle
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import CreateProfileModal from "./create-profile-modal";
import Sidebar from "./sidebar";

export default function BottomNav() {
  const [location, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
    refetchInterval: 30000, // 30 seconds instead of constant polling
    staleTime: 15000, // 15 seconds
  });

  // Helper function to check if a path is active
  const isActivePath = (path: string) => {
    if (path === "/" && (location === "/" || location === "/profile")) return true;
    return location === path;
  };

  const navItems = [
    { path: "/profile", icon: Home, label: "Profile" },
    { path: "/discover", icon: Search, label: "Discover" },
    { 
      path: "/friends", 
      icon: Users, 
      label: "Friends", 
      badge: friendRequests.length > 0 ? friendRequests.length : null 
    },
    { path: "/messages", icon: MessageCircle, label: "Messages" },
  ];

  // Add Dashboard for Artist and Venue profiles
  if (activeProfile && (activeProfile.type === "artist" || activeProfile.type === "venue")) {
    navItems.splice(1, 0, { path: "/dashboard", icon: BarChart3, label: "Dashboard" });
  }

  return (
    <>
      {/* Top header - only visible on mobile */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <img src="/resonant-logo.png" alt="Resonant" className="h-8 block dark:hidden" />
          <img src="/resonant-logo-white.png" alt="Resonant" className="h-8 hidden dark:block" />
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-neutral-600 dark:text-neutral-300"
              >
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 z-50 shadow-xl mobile-safe-area">
        <div className="flex items-center justify-around px-2 py-2 pb-safe">
          {/* Main navigation items */}

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="touch-button flex flex-col items-center justify-center h-16 min-w-[60px] flex-1 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 px-3 rounded-2xl"
              >
                <Menu className="w-5 h-5 mb-1" />
                <span className="text-xs font-medium leading-tight">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>

          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              className={`touch-button flex flex-col items-center justify-center h-16 min-w-[60px] flex-1 relative px-3 transition-all duration-200 ${
                isActivePath(item.path)
                  ? "bg-blue-500 !text-white hover:bg-blue-600 rounded-2xl shadow-lg transform scale-105"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-2xl"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium leading-tight">{item.label}</span>
              {item.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg">
                  {item.badge}
                </span>
              )}
            </Button>
          ))}

          {/* More menu */}

        </div>
      </div>

      <CreateProfileModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />
    </>
  );
}