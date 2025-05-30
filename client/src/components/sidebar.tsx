import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import CreateProfileModal from "./create-profile-modal";
import SharedProfilesWidget from "./shared-profiles-widget";
import { useState } from "react";
import { Settings, Home, UserPlus, Search, Users, Globe, UserCheck, Lock, ChevronDown, BarChart3, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import NotificationsPanel from "./notifications-panel";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useAuth();

  // Helper function to format user's display name
  const getUserDisplayName = () => {
    if (!user) return "";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName} ${lastName}`.trim() || user.email;
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    if (!user) return "";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return user.email ? user.email.charAt(0).toUpperCase() : "";
  };

  // Helper function to check if a path is active
  const isActivePath = (path: string) => {
    if (path === "/" && (location === "/" || location === "/profile")) return true;
    return location === path;
  };

  const { data: profiles = [] } = useQuery({
    queryKey: ["/api/profiles"],
  });

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
  });

  const { data: unreadNotificationCount = 0 } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const activateProfileMutation = useMutation({
    mutationFn: async (profileId: number) => {
      await apiRequest("POST", `/api/profiles/${profileId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
    },
  });

  const getProfileTypeColor = (type: string) => {
    switch (type) {
      case "artist":
        return "bg-artist-green";
      case "venue":
        return "bg-venue-red";
      default:
        return "bg-fb-blue";
    }
  };

  const getProfileTypeName = (type: string) => {
    switch (type) {
      case "artist":
        return "Artist";
      case "venue":
        return "Venue";
      default:
        return "Audience";
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="w-3 h-3 text-green-500" />;
      case "friends":
        return <UserCheck className="w-3 h-3 text-blue-500" />;
      case "private":
        return <Lock className="w-3 h-3 text-red-500" />;
      default:
        return <Globe className="w-3 h-3 text-green-500" />;
    }
  };

  const getDisplayName = (profile: any) => {
    if (profile.type === 'audience' && user) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || profile.name;
    }
    return profile.name;
  };

  const handleProfileSwitch = (profileId: number) => {
    if (profileId !== activeProfile?.id) {
      activateProfileMutation.mutate(profileId);
    }
  };



  return (
    <div className="w-80 bg-white dark:bg-neutral-900 shadow-lg border-r border-neutral-200 dark:border-neutral-700 hidden lg:block">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex justify-center mb-6">
          <img src="/resonant-logo.png" alt="Resonant" className="h-16 block dark:hidden" />
          <img src="/resonant-logo-white.png" alt="Resonant" className="h-20 hidden dark:block" />
        </div>

        {/* Active Profile Display with Dropdown */}
        {activeProfile && user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 cursor-pointer hover:bg-blue-100 transition-colors">
                <div className="flex items-center space-x-3">
                  <Avatar className="w-12 h-12 border-2 border-blue-500">
                    <AvatarImage src={activeProfile.profileImageUrl || ""} />
                    <AvatarFallback>{getDisplayName(activeProfile).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-neutral-900">{getDisplayName(activeProfile)}</span>
                    </div>
                    <div className="flex items-center space-x-2 whitespace-nowrap">
                      <p className="text-sm text-neutral-600">Active Profile</p>
                      <Badge className={`${getProfileTypeColor(activeProfile.type)} text-white text-xs flex-shrink-0`}>
                        {getProfileTypeName(activeProfile.type)}
                      </Badge>
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-neutral-500" />
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {Array.isArray(profiles) && profiles
                .sort((a: any, b: any) => {
                  // Put active profile first
                  if (a.id === activeProfile?.id) return -1;
                  if (b.id === activeProfile?.id) return 1;
                  return 0;
                })
                .map((profile: any) => (
                <DropdownMenuItem
                  key={profile.id}
                  className={`p-3 ${profile.id === activeProfile?.id ? "bg-blue-50" : ""}`}
                  onClick={() => handleProfileSwitch(profile.id)}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={profile.profileImageUrl || ""} />
                      <AvatarFallback>{getDisplayName(profile).slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-neutral-900">{getDisplayName(profile)}</span>
                        <Badge className={`${getProfileTypeColor(profile.type)} text-white text-xs`}>
                          {getProfileTypeName(profile.type)}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getVisibilityIcon(profile.visibility)}
                        <span className="text-xs text-neutral-600 capitalize">{profile.visibility}</span>
                      </div>
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="p-3"
                onClick={() => setShowCreateModal(true)}
              >
                <div className="flex items-center space-x-3 w-full">
                  <div className="w-8 h-8 border-2 border-dashed border-neutral-300 rounded-full flex items-center justify-center">
                    <UserPlus className="w-4 h-4 text-neutral-500" />
                  </div>
                  <span className="text-neutral-600">Create New Profile</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>



      {/* Navigation Menu */}
      <nav className="p-6">
        <ul className="space-y-2">
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                isActivePath("/profile") 
                  ? "bg-blue-500 !text-white hover:bg-blue-600 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
              onClick={() => setLocation("/profile")}
            >
              <Home className="w-5 h-5 mr-3" />
              Profile
            </Button>
          </li>

          {/* Dashboard - Only visible for Artist and Venue accounts */}
          {activeProfile && (activeProfile.type === "artist" || activeProfile.type === "venue") && (
            <li>
              <Button
                variant="ghost"
                className={`w-full justify-start ${
                  isActivePath("/dashboard") 
                    ? "bg-blue-500 !text-white hover:bg-blue-600 font-medium" 
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
                onClick={() => setLocation("/dashboard")}
              >
                <BarChart3 className="w-5 h-5 mr-3" />
                Dashboard
              </Button>
            </li>
          )}

          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                isActivePath("/discover") 
                  ? "bg-blue-500 !text-white hover:bg-blue-600 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
              onClick={() => setLocation("/discover")}
            >
              <Search className="w-5 h-5 mr-3" />
              Discover
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                isActivePath("/friends") 
                  ? "bg-blue-500 !text-white hover:bg-blue-600 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Friends
              {friendRequests.length > 0 && (
                <Badge className="ml-auto bg-blue-500 text-white text-xs">
                  {friendRequests.length}
                </Badge>
              )}
            </Button>
          </li>

          <li>
            <Button
              variant="ghost"
              className={`w-full justify-start ${
                isActivePath("/settings") 
                  ? "bg-blue-500 !text-white hover:bg-blue-600 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
              onClick={() => setLocation("/settings")}
            >
              <Settings className="w-5 h-5 mr-3" />
              Settings
            </Button>
          </li>
        </ul>



        {/* Logout Button */}
        <div className="mt-6 pt-6 border-t border-neutral-200">
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await apiRequest("POST", "/api/logout");
              queryClient.clear();
              window.location.href = "/";
            }}
          >
            Logout
          </Button>
        </div>
      </nav>

      <CreateProfileModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal} 
      />

    </div>
  );
}