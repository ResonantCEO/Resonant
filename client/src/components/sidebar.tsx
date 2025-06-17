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
import { Settings, Home, UserPlus, Search, Users, Globe, UserCheck, Lock, ChevronDown, BarChart3, Bell, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";
import NotificationsPanel from "./notifications-panel";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isCollapsed, setIsCollapsed } = useSidebar();
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

  // Fetch profile-specific notification counts
  const { data: profileNotificationCounts = {}, error: profileCountsError } = useQuery({
    queryKey: ["/api/notifications/counts-by-profile"],
    queryFn: async () => {
      try {
        console.log("Fetching profile notification counts...");

        // Direct fetch to ensure we get the actual response
        const response = await fetch("/api/notifications/counts-by-profile", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Raw API response:", data);
        console.log("Response type:", typeof data);

        // Validate response structure
        if (!data || typeof data !== 'object') {
          console.warn("Invalid response structure, returning empty object");
          return {};
        }

        console.log("Response keys:", Object.keys(data));
        console.log("Response values:", Object.values(data));
        console.log("Final counts being returned:", data);
        return data;
      } catch (error) {
        console.error("Error fetching profile notification counts:", error);
        return {};
      }
    },
    refetchInterval: 5000,
    enabled: !!user && profiles.length > 0,
    retry: 3,
    retryDelay: 1000,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Log any errors
  if (profileCountsError) {
    console.error("Profile notification counts query error:", profileCountsError);
  }

  // Get notification count for active profile from the profile counts data
  const getActiveProfileNotificationCount = () => {
    if (!activeProfile || !profileNotificationCounts) return 0;
    const counts = profileNotificationCounts || {};
    const stringKey = String(activeProfile.id);
    const numberKey = Number(activeProfile.id);

    let countData = null;
    if (counts.hasOwnProperty(stringKey)) {
      countData = counts[stringKey];
    } else if (counts.hasOwnProperty(numberKey)) {
      countData = counts[numberKey];
    }

    // Handle both old format (number) and new format (object)
    if (typeof countData === 'number') {
      return countData;
    } else if (countData && typeof countData === 'object') {
      return (countData.notifications || 0);
    }

    return 0;
  };

  const unreadNotificationCount = getActiveProfileNotificationCount();

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

    const getTypeIcon = (type: string) => {
        switch (type) {
            case "artist":
                return <BarChart3 className="w-3 h-3 mr-1" />;
            case "venue":
                return <Home className="w-3 h-3 mr-1" />;
            default:
                return <Users className="w-3 h-3 mr-1" />;
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
      activateProfileMutation.mutate(profileId, {
        onSuccess: () => {
          // Navigate to the profile page after successful profile switch
          setLocation("/profile");
        }
      });
    }
  };

    // Get profile-specific notification count
    const getProfileNotificationCount = (profile: any) => {
      const counts = profileNotificationCounts || {};
      console.log(`Getting notification count for profile ${profile.id} (${profile.name})`);
      console.log("Available counts data:", counts);
      console.log("Available keys:", Object.keys(counts));

      // Try string key first, then number key
      const stringKey = String(profile.id);
      const numberKey = Number(profile.id);

      let count = 0;
      if (counts.hasOwnProperty(stringKey)) {
        count = counts[stringKey];
      } else if (counts.hasOwnProperty(numberKey)) {
        count = counts[numberKey];
      }

      const finalCount = Number(count) || 0;
      console.log(`Final count for profile ${profile.id} (${profile.name}):`, finalCount);
      return finalCount;
  };



  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-80'} bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-lg border-r border-white/20 dark:border-neutral-700/30 hidden lg:block transition-all duration-300 fixed top-0 left-0 h-screen overflow-hidden z-40`}>
      {/* Collapse toggle button positioned in the middle of the sidebar */}
      <div className="absolute top-1/2 -translate-y-1/2 right-0 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-16 w-3 p-0 rounded-l-lg rounded-r-none bg-white dark:bg-neutral-800 border-2 border-r-0 border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500 shadow-sm hover:shadow-md transition-all duration-200"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
          )}
        </Button>
      </div>

      {/* Header */}
      <div className={`${isCollapsed ? 'p-2' : 'p-6'} border-b border-white/10 dark:border-neutral-700/30 backdrop-blur-sm`}>
        {!isCollapsed && (
          <div className="flex justify-center mb-6">
            <img src="/resonant-logo.png" alt="Resonant" className="h-16 block dark:hidden" />
            <img src="/resonant-logo-white.png" alt="Resonant" className="h-20 hidden dark:block" />
          </div>
        )}

        {/* Active Profile Display with Dropdown */}
        {activeProfile && user && !isCollapsed && (
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
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-neutral-900">{getDisplayName(profile)}</span>
                        <Badge className={`${getProfileTypeColor(profile.type)} text-white text-xs shrink-0`}>
                          {getTypeIcon(profile.type)} {getProfileTypeName(profile.type)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {getVisibilityIcon(profile.visibility)}
                          <span className="text-xs text-neutral-600 capitalize">{profile.visibility}</span>
                        </div>
                        {(() => {
                          const count = getProfileNotificationCount(profile);
                          console.log(`Profile ${profile.id} (${profile.name}) notification count:`, count);
                          return count > 0 ? (
                            <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center shrink-0">
                              {count > 99 ? "99+" : count}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-400 text-white text-xs min-w-[20px] h-5 flex items-center justify-center shrink-0">
                              0
                            </Badge>
                          );
                        })()}
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
      <nav className={`${isCollapsed ? 'p-2' : 'p-6'}`}>
        <ul className="space-y-2">
          <li>
            <Button
              variant="ghost"
              className={`${isCollapsed ? 'w-full justify-center p-2' : 'w-full justify-start'} ${
                isActivePath("/profile") 
                  ? "bg-blue-600 !text-white hover:bg-blue-700 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
              onClick={() => setLocation("/profile")}
            >
              <Home className={`w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
              {!isCollapsed && "Profile"}
            </Button>
          </li>

          {/* Dashboard - Only visible for Artist and Venue accounts */}
          {activeProfile && (activeProfile.type === "artist" || activeProfile.type === "venue") && (
            <li>
              <Button
                variant="ghost"
                className={`${isCollapsed ? 'w-full justify-center p-2' : 'w-full justify-start'} ${
                  isActivePath("/dashboard") 
                    ? "bg-blue-600 !text-white hover:bg-blue-700 font-medium" 
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
                onClick={() => setLocation("/dashboard")}
              >
                <BarChart3 className={`w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                {!isCollapsed && "Dashboard"}
              </Button>
            </li>
          )}

          <li>
            <Button
              variant="ghost"
              className={`${isCollapsed ? 'w-full justify-center p-2' : 'w-full justify-start'} ${
                isActivePath("/discover") 
                  ? "bg-blue-600 !text-white hover:bg-blue-700 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
              onClick={() => {
                console.log("Discover button clicked");
                setLocation("/discover");
              }}
            >
              <Search className={`w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
              {!isCollapsed && "Discover"}
            </Button>
          </li>
          <li>
            <Button
                variant="ghost"
                className={`${isCollapsed ? 'w-full justify-center p-2' : 'w-full justify-start'} ${
                  isActivePath("/friends")
                    ? "bg-blue-600 !text-white hover:bg-blue-700 font-medium"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
                onClick={() => setLocation("/friends")}
              >
                <Users className={`w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                {!isCollapsed && "Friends"}
                {(() => {
                  const counts = profileNotificationCounts || {};
                  const profileId = activeProfile?.id;
                  const countData = profileId && (counts[String(profileId)] || counts[Number(profileId)]);
                  const friendRequestCount = typeof countData === 'object' ? (countData.friendRequests || 0) : 0;
                  
                  return friendRequestCount > 0 && !isCollapsed && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                      {friendRequestCount > 99 ? '99+' : friendRequestCount}
                    </Badge>
                  );
                })()}
                {(() => {
                  const counts = profileNotificationCounts || {};
                  const profileId = activeProfile?.id;
                  const countData = profileId && (counts[String(profileId)] || counts[Number(profileId)]);
                  const friendRequestCount = typeof countData === 'object' ? (countData.friendRequests || 0) : 0;
                  
                  return isCollapsed && friendRequestCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium">
                      {friendRequestCount > 99 ? '99+' : friendRequestCount}
                    </span>
                  );
                })()}
              </Button>
          </li>

          <li>
            <Button
              variant="ghost"
              className={`${isCollapsed ? 'w-full justify-center p-2 relative' : 'w-full justify-start'} ${
                isActivePath("/notifications") 
                  ? "bg-blue-600 !text-white hover:bg-blue-700 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
              onClick={() => setLocation("/notifications")}
            >
              <Bell className={`w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
              {!isCollapsed && "Notifications"}
              {!isCollapsed && unreadNotificationCount > 0 && (
                <Badge className="ml-auto bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </Badge>
              )}
              {isCollapsed && unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </Button>
          </li>

          <li>
            <Button
              variant="ghost"
              className={`${isCollapsed ? 'w-full justify-center p-2' : 'w-full justify-start'} ${
                isActivePath("/settings") 
                  ? "bg-blue-600 !text-white hover:bg-blue-700 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
              onClick={() => setLocation("/settings")}
            >
              <Settings className={`w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
              {!isCollapsed && "Settings"}
            </Button>
          </li>
        </ul>



        {/* Logout Button */}
        <div className={`mt-6 pt-6 border-t border-neutral-200 ${isCollapsed ? 'border-neutral-700' : ''}`}>
          <Button
            variant="outline"
            className={`${isCollapsed ? 'w-full p-2' : 'w-full'}`}
            onClick={async () => {
              await apiRequest("POST", "/api/logout");
              queryClient.clear();
              window.location.href = "/";
            }}
          >
            {!isCollapsed && "Logout"}
            {isCollapsed && <Settings className="w-4 h-4" />}
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