import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Search, 
  Users, 
  Settings, 
  BarChart3,
  Menu
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
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
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
  ];

  // Add Dashboard for Artist and Venue profiles
  if (activeProfile && (activeProfile.type === "artist" || activeProfile.type === "venue")) {
    navItems.splice(1, 0, { path: "/dashboard", icon: BarChart3, label: "Dashboard" });
  }

  return (
    <>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-white/20 dark:border-neutral-700/30 z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {/* Main navigation items */}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col items-center justify-center h-12 w-16 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Menu className="w-5 h-5 mb-1" />
                <span className="text-xs">Menu</span>
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
              className={`flex flex-col items-center justify-center h-12 w-16 relative ${
                isActivePath(item.path)
                  ? "bg-blue-500 !text-white hover:bg-blue-600"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
              onClick={() => setLocation(item.path)}
            >
              <item.icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
              {item.badge && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
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