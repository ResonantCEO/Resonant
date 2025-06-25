import { useState } from "react";
import * as React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import Sidebar from "@/components/sidebar";
import ProfileHeader from "@/components/profile-header";
import PostFeed from "@/components/post-feed";
import FriendsWidget from "@/components/friends-widget";
import EPKTab from "@/components/epk-tab";
import FriendsTab from "@/components/friends-tab";
import StatsTab from "@/components/stats-tab";
import GalleryTab from "@/components/gallery-tab";
import MusicDiscoveryTab from "@/components/music-discovery-tab";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BarChart3, FileText, MessageSquare, Menu, Home, Search, Settings, ChevronDown, UserPlus, Globe, MapPin, Music, Edit, Save, X, Calendar, Heart, TrendingUp } from "lucide-react";

// Bio Editor Component
function BioEditor({ currentBio, profileId, profileType }: { currentBio: string; profileId: number; profileType: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [bioText, setBioText] = useState(currentBio);
  const { toast } = useToast();

  // Update local state when currentBio changes
  React.useEffect(() => {
    setBioText(currentBio);
  }, [currentBio]);

  const updateBioMutation = useMutation({
    mutationFn: async (newBio: string) => {
      // All profile types use the same profile update endpoint
      return await apiRequest("PUT", `/api/profiles/${profileId}`, { bio: newBio });
    },
    onSuccess: () => {
      toast({
        title: "Bio updated",
        description: "Your bio has been saved successfully.",
      });
      setIsEditing(false);
      // Invalidate relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/active"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update bio",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateBioMutation.mutate(bioText);
  };

  const handleCancel = () => {
    setBioText(currentBio);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <Textarea
          value={bioText}
          onChange={(e) => setBioText(e.target.value)}
          placeholder="Tell people about yourself..."
          className="min-h-32"
          maxLength={1500}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {bioText.length}/1500 characters
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={updateBioMutation.isPending}
            >
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateBioMutation.isPending}
            >
              <Save className="w-4 h-4 mr-1" />
              {updateBioMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {currentBio ? (
        <div className="relative group">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {currentBio}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Edit className="w-3 h-3 mr-1" />
            Edit
          </Button>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-gray-400 dark:text-gray-500 mb-3">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            You haven't added a bio yet. Click the button below to add one!
          </p>
          <Button
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            <Edit className="w-4 h-4 mr-1" />
            Add Bio
          </Button>
        </div>
      )}
    </div>
  );
}

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();

  // Set default tab based on profile type
  const getDefaultTab = (profileType: string) => {
    if (profileType === "artist") {
      return "epk"; // First tab for artist profiles
    }
    return "posts"; // First tab for non-artist profiles
  };

  const [activeTab, setActiveTab] = useState("posts");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();

  const { data: profiles = [] } = useQuery({
    queryKey: ["/api/profiles"],
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
  });

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  const activateProfileMutation = useMutation({
    mutationFn: async (profileId: number) => {
      return await apiRequest("POST", `/api/profiles/${profileId}/activate`);
    },
    onSuccess: () => {
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries(["/api/profiles/active"]);
      queryClient.invalidateQueries(["/api/profiles"]);
      // Navigate to profile page instead of reloading
      setLocation("/profile");
    },
  });

  // If no ID is provided, use the active profile ID
  const profileId = id ? parseInt(id) : activeProfile?.id;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/profiles/${profileId}`],
    enabled: !!profileId, // Only run query when we have a profile ID
  });

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  const { data: followedArtists = [] } = useQuery({
    queryKey: [`/api/profiles/${profileId}/following-artists`],
    enabled: !!profileId && profile?.type === 'audience',
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (profileId: number) => {
      return await apiRequest("POST", "/api/friend-requests", { addresseeId: profileId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/friendship-status/${profile?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
    },
  });

  // Update active tab when profile changes
  React.useEffect(() => {
    if (profile) {
      // Check for stored tab preference first
      const storedTab = localStorage.getItem('profileTab');
      if (storedTab) {
        // Validate that the stored tab is valid for this profile type
        const validTabs = profile.type === 'artist' 
          ? ['epk', 'community', 'stats', 'photos', 'members', 'management']
          : ['posts', 'about', 'music-discovery', 'friends', 'photos', 'members', 'management'];

        if (validTabs.includes(storedTab)) {
          setActiveTab(storedTab);
        } else {
          setActiveTab(getDefaultTab(profile.type));
        }
        localStorage.removeItem('profileTab'); // Clear after use
      } else {
        setActiveTab(getDefaultTab(profile.type));
      }
    }
  }, [profile?.id, profile?.type]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex">
        <div className="w-80 bg-white shadow-lg border-r border-neutral-200 hidden lg:block">
          <Skeleton className="h-full" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  // Only show "Profile Not Found" if we have a specific profile ID that doesn't exist
  // Don't show it during auth transitions or when using active profile
  if (!profile && profileId && !profileLoading) {
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

  const isOwn = activeProfile?.id === profile?.id;
  const isSharedProfile = profile?.type === "artist" || profile?.type === "venue";

  // For shared profiles, always show management if user owns the profile
  const canManageMembers = isOwn && isSharedProfile;

  const getPageBackground = (backgroundType: string, backgroundImageUrl?: string) => {
    switch (backgroundType) {
      case 'gradient-blue':
        return 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900';
      case 'gradient-purple':
        return 'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900';
      case 'gradient-green':
        return 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900';
      case 'gradient-orange':
        return 'bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900';
      case 'gradient-pink':
        return 'bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900';
      case 'solid-dark':
        return 'bg-gray-900 dark:bg-black';
      case 'solid-light':
        return 'bg-white dark:bg-gray-900';
      case 'pattern-dots':
        return 'bg-neutral-50 dark:bg-neutral-950 bg-[radial-gradient(circle_at_1px_1px,rgba(59,130,246,0.1)_1px,transparent_0)] bg-[length:30px_30px]';
      case 'pattern-waves':
        return 'bg-neutral-50 dark:bg-neutral-950 bg-[url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%2359130f\' fill-opacity=\'0.03\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")]';
      case 'custom-photo':
        return backgroundImageUrl ? '' : 'bg-neutral-50 dark:bg-neutral-950';
      default:
        return 'bg-neutral-50 dark:bg-neutral-950';
    }
  };

  const getBackgroundImageStyle = (backgroundImageUrl?: string) => {
    return backgroundImageUrl ? {
      backgroundImage: `url(${backgroundImageUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
      minHeight: '100vh',
      width: '100vw',
      height: '100vh',
    } : {}
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-white/20 dark:border-neutral-700/30 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <img src="/resonant-logo.png" alt="Resonant" className="h-8 block dark:hidden" />
            <img src="/resonant-logo-white.png" alt="Resonant" className="h-8 hidden dark:block" />
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="relative"
          >
            <Menu className="h-5 w-5" />
            {friendRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {friendRequests.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Full-Featured Sidebar */}
      <div className={`lg:hidden fixed top-0 left-0 h-full w-80 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md shadow-xl border-r border-white/20 dark:border-neutral-700/30 z-40 transform transition-all duration-300 ease-in-out ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } overflow-hidden`}>
        <div className="h-full flex flex-col">
          {/* Mobile Sidebar Header */}
          <div className="p-6 border-b border-white/10 dark:border-neutral-700/30">
            <div className="flex justify-center mb-6">
              <img src="/resonant-logo.png" alt="Resonant" className="h-16 block dark:hidden" />
              <img src="/resonant-logo-white.png" alt="Resonant" className="h-20 hidden dark:block" />
            </div>

            {/* Active Profile Display with Dropdown - Mobile Version */}
            {activeProfile && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-xl p-4 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12 border-2 border-blue-500">
                        <AvatarImage src={activeProfile.profileImageUrl || ""} />
                        <AvatarFallback>{activeProfile.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-neutral-900 dark:text-white">{activeProfile.name}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">Active Profile</p>
                          <Badge className={`${activeProfile.type === 'artist' ? 'bg-artist-green' : activeProfile.type === 'venue' ? 'bg-venue-red' : 'bg-fb-blue'} text-white text-xs`}>
                            {activeProfile.type === 'artist' ? 'Artist' : activeProfile.type === 'venue' ? 'Venue' : 'Audience'}
                          </Badge>
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
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
                    .map((profileOption: any) => (
                    <DropdownMenuItem
                      key={profileOption.id}
                      className={`p-3 ${profileOption.id === activeProfile?.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                      onClick={() => {
                    if (profileOption.id !== activeProfile?.id) {
                      activateProfileMutation.mutate(profileOption.id);
                    }
                    setIsMobileMenuOpen(false);
                  }}
                    >
                      <div className="flex items-center space-x-3 w-full">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={profileOption.profileImageUrl || ""} />
                          <AvatarFallback>{profileOption.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-neutral-900 dark:text-white">{profileOption.name}</span>
                            <Badge className={`${profileOption.type === 'artist' ? 'bg-artist-green' : profileOption.type === 'venue' ? 'bg-venue-red' : 'bg-fb-blue'} text-white text-xs`}>
                              {profileOption.type === 'artist' ? 'Artist' : profileOption.type === 'venue' ? 'Venue' : 'Audience'}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Globe className="w-3 h-3 text-green-500" />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 capitalize">{profileOption.visibility}</span>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="p-3"
                    onClick={() => {
                    setShowCreateModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  >
                    <div className="flex items-center space-x-3 w-full">
                      <div className="w-8 h-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-full flex items-center justify-center">
                        <UserPlus className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <span className="text-neutral-600 dark:text-neutral-400">Create New Profile</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Mobile Navigation Menu */}
          <div className="flex-1 p-6 overflow-y-auto">
            <ul className="space-y-2">
              <li>
                <Button
                  variant="ghost"
                  className={`w-full justify-start ${
                    location === "/profile" || location === "/"
                      ? "bg-blue-500 !text-white hover:bg-blue-600 font-medium" 
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                  onClick={() => {
                    setLocation("/profile");
                    setIsMobileMenuOpen(false);
                  }}
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
                      location === "/dashboard"
                        ? "bg-blue-500 !text-white hover:bg-blue-600 font-medium" 
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    }`}
                    onClick={() => {
                      setLocation("/dashboard");
                      setIsMobileMenuOpen(false);
                    }}
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
                    location === "/discover"
                      ? "bg-blue-500 !text-white hover:bg-blue-600 font-medium" 
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                  onClick={() => {
                    setLocation("/discover");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Search className="w-5 h-5 mr-3" />
                  Discover
                </Button>
              </li>

              <li>
                <Button
                  variant="ghost"
                  className={`w-full justify-start relative ${
                    location === "/friends"
                      ? "bg-blue-500 !text-white hover:bg-blue-600 font-medium" 
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                  onClick={() => {
                    setLocation("/friends");
                    setIsMobileMenuOpen(false);
                  }}
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
                    location === "/settings"
                      ? "bg-blue-500 !text-white hover:bg-blue-600 font-medium" 
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                  onClick={() => {
                    setLocation("/settings");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  <Settings className="w-5 h-5 mr-3" />
                  Settings
                </Button>
              </li>
            </ul>
          </div>

          {/* Mobile Sidebar Footer */}
          <div className="p-6 border-t border-white/10 dark:border-neutral-700/30">
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
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={`flex-1 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pt-16 lg:pt-0 min-h-screen relative mobile-content ${getPageBackground(profile?.profileBackground || 'default', profile?.backgroundImageUrl)}`}
        style={profile?.profileBackground === 'custom-photo' ? getBackgroundImageStyle(profile?.backgroundImageUrl) : {}}
      >
        {/* Fixed Background Image */}
        {profile?.profileBackground === 'custom-photo' && profile?.backgroundImageUrl && (
          <div 
            className="fixed top-0 bottom-0 right-0 pointer-events-none z-0"
            style={{
              backgroundImage: `url(${profile.backgroundImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
              left: isCollapsed ? '64px' : '320px',
              minHeight: '100vh',
              height: '100vh'
            }}
          />
        )}
        <div className="container-responsive mx-auto px-4 lg:px-responsive py-4 lg:py-responsive pb-24 lg:pb-responsive">
          <ProfileHeader 
            profile={profile} 
            isOwn={isOwn}
            canManageMembers={canManageMembers}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Tab Content */}
          {/* Posts Tab - only for non-artist profiles */}
          {activeTab === "posts" && profile?.type !== "artist" && (
            <div className="w-full">
              <PostFeed profileId={profileId} showCreatePost={isOwn} />
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
              {profile?.type === "audience" ? (
                <div className="space-y-8">
                  {/* Header */}
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">About {profile.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400">Get to know this music enthusiast</p>
                  </div>

                  {/* Personal Information - Moved to top */}
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Users className="w-5 h-5 mr-2 text-blue-500" />
                      Personal Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        {user?.firstName || user?.lastName ? (
                          <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400 font-medium w-20">Name:</span>
                            <span className="text-gray-900 dark:text-white">{user.firstName} {user.lastName}</span>
                          </div>
                        ) : null}

                        {profile.location && (
                          <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400 font-medium w-20">Location:</span>
                            <span className="text-gray-900 dark:text-white">{profile.location}</span>
                          </div>
                        )}

                        {user?.hometown && (
                          <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400 font-medium w-20">Hometown:</span>
                            <span className="text-gray-900 dark:text-white">{user.hometown}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {user?.birthdate && (
                          <div className="flex items-center">
                            <span className="text-gray-600 dark:text-gray-400 font-medium w-20">Birthday:</span>
                            <span className="text-gray-900 dark:text-white">
                              {new Date(user.birthdate).toLocaleDateString('en-US', { 
                                month: 'long', 
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center">
                          <span className="text-gray-600 dark:text-gray-400 font-medium w-20">Joined:</span>
                          <span className="text-gray-900 dark:text-white">
                            {new Date(profile.createdAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                        </div>

                        
                      </div>
                    </div>
                  </div>

                  {/* About Me Section */}
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-purple-500" />
                      About Me
                    </h4>
                    
                    {isOwn ? (
                      <BioEditor 
                        currentBio={profile.bio || ""} 
                        profileId={profileId}
                        profileType={profile.type}
                      />
                    ) : profile.bio ? (
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {profile.bio}
                      </p>
                    ) : (
                      <div className="text-center py-8">
                        <div className="text-gray-400 dark:text-gray-500 mb-3">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {`${profile.name} hasn't added a bio yet.`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Music Interests */}
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Music className="w-5 h-5 mr-2 text-green-500" />
                      Music Interests
                    </h4>
                    <div className="space-y-4">
                      {/* Favorite Genres */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Favorite Genres</h5>
                        <div className="flex flex-wrap gap-2">
                          {followedArtists.length > 0 ? (
                            // Extract unique genres from followed artists
                            [...new Set(followedArtists.filter(artist => artist.genre).map(artist => artist.genre))].slice(0, 5).map((genre, index) => (
                              <span 
                                key={index}
                                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                              >
                                {genre}
                              </span>
                            ))
                          ) : (
                            // Default interests for users without followed artists
                            ['Alternative Rock', 'Electronic', 'Indie Pop'].map((genre, index) => (
                              <span 
                                key={index}
                                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full opacity-50"
                              >
                                {genre}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Music Activity */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Music Activity</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center space-x-2 text-sm">
                            <Users className="w-4 h-4 text-purple-500" />
                            <span className="text-gray-600 dark:text-gray-400">Following:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {followedArtists.length} artists
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Calendar className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-600 dark:text-gray-400">Member since:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {new Date(profile.createdAt).getFullYear()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Music Discovery Preferences */}
                      <div>
                        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discovery Style</h5>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full flex items-center">
                            <Search className="w-3 h-3 mr-1" />
                            Explorer
                          </span>
                          {followedArtists.length > 5 && (
                            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs rounded-full flex items-center">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              Trendsetter
                            </span>
                          )}
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full flex items-center">
                            <Heart className="w-3 h-3 mr-1" />
                            Community Member
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      {followedArtists.length > 0 && (
                        <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {isOwn 
                                ? "Discover more artists in your Music Discovery tab"
                                : `See more of ${profile.name}'s music taste`
                              }
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveTab('music-discovery');
                                // Scroll to top after tab change
                                setTimeout(() => {
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }, 100);
                              }}
                              className="text-xs"
                            >
                              <Music className="w-3 h-3 mr-1" />
                              View Music Discovery
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* No Activity State */}
                      {followedArtists.length === 0 && (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">
                            {isOwn 
                              ? "Start following artists to build your music profile!"
                              : `${profile.name} hasn't started their music discovery journey yet.`
                            }
                          </p>
                          {isOwn && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActiveTab('music-discovery')}
                              className="mt-2"
                            >
                              <Search className="w-3 h-3 mr-1" />
                              Explore Music
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  

                  {/* Activity Stats */}
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2 text-orange-500" />
                      Activity Overview
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {/* This would show actual post count from API */}
                          --
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Posts Shared</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          --
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Friends</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          --
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Photos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          --
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Comments</div>
                      </div>
                    </div>
                  </div>

                  {/* Music Discovery Preferences */}
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Search className="w-5 h-5 mr-2 text-red-500" />
                      Music Discovery
                    </h4>
                    <div className="space-y-4">
                      <p className="text-gray-600 dark:text-gray-400">
                        This user enjoys discovering new music through the Resonant community. 
                        They engage with artists, venues, and fellow music lovers to expand their musical horizons.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <div className="flex items-center space-x-2 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900 dark:to-purple-900 px-3 py-2 rounded-lg">
                          <span className="text-sm font-medium text-pink-800 dark:text-pink-200">
                            🎵 Explores new genres
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-teal-100 dark:from-blue-900 dark:to-teal-900 px-3 py-2 rounded-lg">
                          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            🎤 Supports local artists
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 px-3 py-2 rounded-lg">
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            🎪 Attends live shows
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Followed Artists */}
                  {followedArtists.length > 0 && (
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Music className="w-5 h-5 mr-2 text-pink-500" />
                        Following Artists ({followedArtists.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {followedArtists.map((artist: any) => (
                          <div 
                            key={artist.id} 
                            className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                            onClick={() => setLocation(`/profile/${artist.id}`)}
                          >
                            <div className="flex items-center space-x-3 mb-3">
                              <Avatar className="w-12 h-12 ring-2 ring-pink-200 dark:ring-pink-800">
                                <AvatarImage src={artist.profileImageUrl} alt={artist.name} />
                                <AvatarFallback className="bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300">
                                  {artist.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 dark:text-white truncate">
                                  {artist.name}
                                </p>
                                {artist.genre && (
                                  <p className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                                    {artist.genre}
                                  </p>
                                )}
                                {artist.location && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                                    <MapPin className="w-3 h-3 mr-1" />
                                    {artist.location}
                                  </p>
                                )}
                              </div>
                            </div>
                            {artist.bio && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                {artist.bio}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {isOwn 
                            ? "These are the artists you're connected with on Resonant"
                            : `${profile.name} is connected with ${followedArtists.length} artist${followedArtists.length !== 1 ? 's' : ''}`
                          }
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Contact & Social */}
                  {profile.website && (
                    <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-6">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                        <Globe className="w-5 h-5 mr-2 text-indigo-500" />
                        Connect
                      </h4>
                      <div className="space-y-2">
                        <a 
                          href={profile.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                        >
                          <Globe className="w-4 h-4 mr-2" />
                          Visit Website
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p>
                      {isOwn 
                        ? "This is how your profile appears to others. You can edit your information in Settings."
                        : `This is ${profile.name}'s public profile on Resonant.`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">About</h3>
                  <p>About functionality for {profile?.type} profiles coming soon...</p>
                </div>
              )}
            </div>
          )}
          {activeTab === "music-discovery" && (
            <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
              {profile?.type === "audience" ? (
                <MusicDiscoveryTab 
                  profile={profile} 
                  isOwn={isOwn} 
                  followedArtists={followedArtists}
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Music Discovery</h3>
                  <p>Music discovery functionality coming soon...</p>
                </div>
              )}
            </div>
          )}

          {/* Friends Tab - only for non-artist profiles */}
          {activeTab === "friends" && profile?.type !== "artist" && (
            <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
              <FriendsTab profile={profile} isOwn={isOwn} />
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === "photos" && (
            <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
              <GalleryTab profile={profile} isOwn={isOwn} />
            </div>
          )}

          {/* EPK Tab - only for artist profiles */}
          {activeTab === "epk" && profile?.type === "artist" && (
            <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
              <EPKTab profile={profile} isOwn={isOwn} />
            </div>
          )}

          {/* Community Tab - only for artist profiles */}
          {activeTab === "community" && profile?.type === "artist" && (
            <div className="space-y-6">
              {/* Posts Section */}
              <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Recent Posts
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Share updates with your community
                    </p>
                  </div>
                </div>
                <PostFeed profileId={profileId} showCreatePost={isOwn} />
              </div>



              {/* Community Features */}
              <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Community Features
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      Connect with fans, collaborators, and fellow artists
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Fan Engagement */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
                          Fan Engagement
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Connect directly with your fanbase and build lasting relationships
                      </p>
                      <div className="text-center py-4">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Fan interaction features coming soon
                        </p>
                      </div>
                    </div>

                    {/* Collaborations */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <div className="bg-green-100 dark:bg-green-900 p-2 rounded-lg">
                          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="This commit modifies the Profile component to correctly display custom background images by using the user's background image URL when the custom photo option is selected.none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
                          Collaborations
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Find and connect with other artists for collaborations
                      </p>
                      <div className="text-center py-4">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Collaboration network coming soon
                        </p>
                      </div>
                    </div>

                    {/* Events & Shows */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-lg">
                          <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
                          Events & Shows
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Promote upcoming shows and connect with venues
                      </p>
                      <div className="text-center py-4">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Event management coming soon
                        </p>
                      </div>
                    </div>

                    {/* Music Sharing */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <div className="bg-red-100 dark:bg-red-900 p-2 rounded-lg">
                          <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
                          Music Sharing
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Share your latest tracks and get feedback from the community
                      </p>
                      <div className="text-center py-4">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Music player integration coming soon
                        </p>
                      </div>
                    </div>

                    {/* Industry Network */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <div className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-lg">
                          <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 002 2h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a2 2 0 00-2-2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
                          Industry Network
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Connect with industry professionals, promoters, and labels
                      </p>
                      <div className="text-center py-4">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Professional networking coming soon
                        </p>
                      </div>
                    </div>

                    {/* Fan Insights */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                      <div className="flex items-center mb-4">
                        <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                          <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
                          Fan Insights
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                        Understand your audience with detailed analytics and insights
                      </p>
                      <div className="text-center py-4">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          Analytics dashboard coming soon
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Tab - only for artist profiles */}
          {activeTab === "stats" && profile?.type === "artist" && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-neutral-200 dark:border-gray-700 p-6">
              <StatsTab profile={profile} isOwn={isOwn} />
            </div>
          )}

          {/* Members Tab */}
          {activeTab === "members" && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <div className="text-center text-gray-500">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Members</h3>
                <p>Members functionality coming soon...</p>
              </div>
            </div>
          )}

          {/* Management Tab - actual member management */}
          {activeTab === "management" && (
            <div>
              {/* This content is handled by ProfileHeader component */}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}