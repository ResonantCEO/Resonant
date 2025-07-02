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
import { Settings, Home, UserPlus, Search, Users, Globe, UserCheck, Lock, ChevronDown, BarChart3, Bell, Menu, ChevronLeft, ChevronRight, MessageCircle, Ticket } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";
import { useNotificationSocket } from "@/hooks/useNotificationSocket";
import { useDebounce } from "@/hooks/useDebounce";
import NotificationsPanel from "./notifications-panel";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const { user } = useAuth();
  
  // Initialize WebSocket notifications for real-time updates
  const { isConnected } = useNotificationSocket();

  // Helper function to format user's display name
  const getUserDisplayName = () => {
    if (!user) return "";
    const firstName = (user as any).firstName || "";
    const lastName = (user as any).lastName || "";
    return `${firstName} ${lastName}`.trim() || (user as any).email;
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    if (!user) return "";
    const firstName = (user as any).firstName || "";
    const lastName = (user as any).lastName || "";
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return (user as any).email ? (user as any).email.charAt(0).toUpperCase() : "";
  };

  // Helper function to check if a path is active
  const isActivePath = (path: string) => {
    return location === path || location.startsWith(path + "/");
  };

  // Fetch user profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ["/api/profiles"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch active profile
  const { data: activeProfile, isLoading: activeProfileLoading } = useQuery({
    queryKey: ["/api/profiles/active"],
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
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
    refetchInterval: 30000, // Reduced to 30 seconds instead of 5
    enabled: !!user && (profiles as any[]).length > 0,
    retry: 2, // Reduced retries
    retryDelay: 2000,
    staleTime: 25000, // Cache for 25 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
    refetchOnMount: false, // Don't refetch on every mount
    refetchOnWindowFocus: false, // Don't refetch on focus
  });

  // Log any errors
  if (profileCountsError) {
    console.error("Profile notification counts query error:", profileCountsError);
  }

  // Get notification count for active profile from the profile counts data
  const getActiveProfileNotificationCount = () => {
    if (!activeProfile || !profileNotificationCounts) return 0;
    const counts = profileNotificationCounts || {};
    const stringKey = String((activeProfile as any).id);
    const numberKey = Number((activeProfile as any).id);

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
      return ((countData as any).notifications || 0);
    }

    return 0;
  };

  const unreadNotificationCount = getActiveProfileNotificationCount();

  // Debounced profile activation to prevent rapid-fire API calls
  const rawActivateProfile = async (profileId: number) => {
    await apiRequest("POST", `/api/profiles/${profileId}/activate`);
    
    // Clear message-related caches that might block profile switching
    queryClient.removeQueries({ queryKey: ["/api/conversations"] });
    queryClient.removeQueries({ queryKey: ["/api/friends"] });
    
    // Invalidate core profile queries
    queryClient.invalidateQueries({ queryKey: ["/api/profiles/active"] });
    queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
  };
  
  const debouncedActivateProfile = useDebounce(rawActivateProfile, 300);

  const activateProfileMutation = useMutation({
    mutationFn: debouncedActivateProfile,
    onSuccess: () => {
      // Additional success logic can go here if needed
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
      return `${(user as any).firstName || ''} ${(user as any).lastName || ''}`.trim() || profile.name;
    }
    return profile.name;
  };

  const handleProfileSwitch = (profileId: number) => {
    if (profileId !== (activeProfile as any)?.id) {
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

      let countData = null;
      if (counts.hasOwnProperty(stringKey)) {
        countData = counts[stringKey];
      } else if (counts.hasOwnProperty(numberKey)) {
        countData = counts[numberKey];
      }

      // Handle both old format (number) and new format (object)
      let finalCount = 0;
      if (typeof countData === 'number') {
        finalCount = countData;
      } else if (countData && typeof countData === 'object') {
        // Use total count which includes both notifications and friend requests
        finalCount = (countData as any).total || 0;
      }

      console.log(`Final count for profile ${profile.id} (${profile.name}):`, finalCount);
      return finalCount;
  };

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-80'} bg-white dark:bg-neutral-900 shadow-lg border-r border-neutral-200 dark:border-neutral-700 hidden lg:block transition-all duration-300 fixed top-0 left-0 h-screen overflow-hidden z-40`}>
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
      <div className={`${isCollapsed ? 'p-2' : 'p-6'} border-b border-neutral-200 dark:border-neutral-700`}>
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
                    <AvatarImage src={(activeProfile as any).profileImageUrl || ""} />
                    <AvatarFallback>{getDisplayName(activeProfile).slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-neutral-900">{getDisplayName(activeProfile)}</span>
                    </div>
                    <div className="flex items-center space-x-2 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProfileTypeColor((activeProfile as any).type)} text-white`}>
                        {getProfileTypeName((activeProfile as any).type)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <ChevronDown className="w-4 h-4 text-neutral-600" />
                    {(() => {
                      // Get notification count for active profile from profile notification counts
                      let count = 0;
                      if (profileNotificationCounts && activeProfile) {
                        const counts = profileNotificationCounts || {};
                        console.log(`Getting notification count for profile ${(activeProfile as any).id} (${(activeProfile as any).name})`);
                        console.log("Available counts data:", counts);
                        console.log("Available keys:", Object.keys(counts));

                        const countData = counts[String((activeProfile as any).id)] || counts[Number((activeProfile as any).id)];
                        if (countData && typeof countData === 'object') {
                          count = (countData as any).total || 0;
                        }
                        console.log(`Final count for profile ${(activeProfile as any).id} (${(activeProfile as any).name}):`, count);
                        console.log(`Profile ${(activeProfile as any).id} (${(activeProfile as any).name}) notification count:`, count);
                      }

                      return count > 0 ? (
                        <Badge className="ml-2 bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                          {count > 99 ? '99+' : count}
                        </Badge>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" className="w-80">
              <DropdownMenuLabel>Switch Profile</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(profiles as any[]).map((profile: any) => (
                <DropdownMenuItem
                  key={profile.id}
                  className="p-3"
                  onClick={() => handleProfileSwitch(profile.id)}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={profile.profileImageUrl || ""} />
                      <AvatarFallback>{getDisplayName(profile).slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{getDisplayName(profile)}</span>
                        {(() => {
                          // Get notification count for this profile from profile notification counts
                          const count = getProfileNotificationCount(profile);
                          return count > 0 ? (
                            <Badge className="bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                              {count > 99 ? "99+" : count}
                            </Badge>
                          ) : null;
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
          {activeProfile && ((activeProfile as any).type === "artist" || (activeProfile as any).type === "venue") && (
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

          {/* Tickets - Only visible for Audience accounts */}
          {activeProfile && (activeProfile as any).type === "audience" && (
            <li>
              <Button
                variant="ghost"
                className={`${isCollapsed ? 'w-full justify-center p-2' : 'w-full justify-start'} ${
                  isActivePath("/tickets") 
                    ? "bg-blue-600 !text-white hover:bg-blue-700 font-medium" 
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
                onClick={() => setLocation("/tickets")}
              >
                <Ticket className={`w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
                {!isCollapsed && "Tickets"}
              </Button>
            </li>
          )}

          <li>
            <Button
              variant="ghost"
              className={`${isCollapsed ? 'w-full justify-center p-2 relative' : 'w-full justify-start'} ${
                isActivePath("/friends")
                  ? "bg-blue-600 !text-white hover:bg-blue-700 font-medium"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
              onClick={() => setLocation("/friends")}
            >
              <Users className={`w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
              {!isCollapsed && "Friends"}
              {(() => {
                // Get friend request count from profile notification counts
                let friendRequestCount = 0;
                if (profileNotificationCounts && activeProfile) {
                  const counts = profileNotificationCounts || {};
                  const countData = counts[String((activeProfile as any).id)] || counts[Number((activeProfile as any).id)];
                  if (countData && typeof countData === 'object') {
                    friendRequestCount = (countData as any).friendRequests || 0;
                  }
                }

                return friendRequestCount > 0 && !isCollapsed && (
                  <Badge className="ml-auto bg-red-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                    {friendRequestCount > 99 ? '99+' : friendRequestCount}
                  </Badge>
                );
              })()}
              {(() => {
                // Get friend request count from profile notification counts for collapsed state
                let friendRequestCount = 0;
                if (profileNotificationCounts && activeProfile) {
                  const counts = profileNotificationCounts || {};
                  const countData = counts[String((activeProfile as any).id)] || counts[Number((activeProfile as any).id)];
                  if (countData && typeof countData === 'object') {
                    friendRequestCount = (countData as any).friendRequests || 0;
                  }
                }

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
                isActivePath("/messages") 
                  ? "bg-blue-600 !text-white hover:bg-blue-700 font-medium" 
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
              onClick={() => setLocation("/messages")}
            >
              <MessageCircle className={`w-5 h-5 ${!isCollapsed ? 'mr-3' : ''}`} />
              {!isCollapsed && "Messages"}
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