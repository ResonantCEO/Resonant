import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CreateProfileModal from "./create-profile-modal";
import { useState } from "react";
import { Settings, Home, UserPlus, Search, Users, Globe, UserCheck, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";

export default function Sidebar() {
  const [, setLocation] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { user } = useAuth();

  // Helper function to format user's display name
  const getUserDisplayName = () => {
    if (!user) return "";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    console.log("User data:", { firstName, lastName, fullUser: user });
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

  const { data: profiles = [] } = useQuery({
    queryKey: ["/api/profiles"],
  });

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
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

  const handleProfileSwitch = (profileId: number) => {
    if (profileId !== activeProfile?.id) {
      activateProfileMutation.mutate(profileId);
    }
  };

  return (
    <div className="w-80 bg-white shadow-lg border-r border-neutral-200 hidden lg:block">
      {/* Header */}
      <div className="p-6 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-neutral-900">SocialConnect</h1>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4 text-neutral-600" />
          </Button>
        </div>

        {/* Active Profile Display */}
        {activeProfile && user && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12 border-2 border-blue-500">
                <AvatarImage src={user.profileImageUrl || ""} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-neutral-900">{getUserDisplayName()}</span>
                  <Badge className={`${getProfileTypeColor(activeProfile.type)} text-white text-xs`}>
                    {getProfileTypeName(activeProfile.type)}
                  </Badge>
                </div>
                <p className="text-sm text-neutral-600">Active Profile</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Profile Switcher */}
      <div className="p-6 border-b border-neutral-200">
        <h3 className="font-semibold text-neutral-900 mb-3">Your Profiles</h3>

        <div className="space-y-3">
          {profiles.map((profile: any) => (
            <div
              key={profile.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                profile.id === activeProfile?.id
                  ? "bg-blue-50 border border-blue-200"
                  : "border border-neutral-200 hover:bg-neutral-50"
              }`}
              onClick={() => handleProfileSwitch(profile.id)}
            >
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={profile.profileImageUrl || ""} />
                  <AvatarFallback>{profile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-neutral-900">{profile.name}</span>
                    <Badge className={`${getProfileTypeColor(profile.type)} text-white text-xs`}>
                      {getProfileTypeName(profile.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    {getVisibilityIcon(profile.visibility)}
                    <span className="text-xs text-neutral-600 capitalize">{profile.visibility}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Create New Profile Button */}
          <Button
            variant="outline"
            className="w-full py-3 border-2 border-dashed border-neutral-300 text-neutral-600 hover:border-blue-500 hover:text-blue-500 transition-colors"
            onClick={() => setShowCreateModal(true)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create New Profile
          </Button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-6">
        <ul className="space-y-2">
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start bg-blue-500 text-white hover:bg-blue-600"
              onClick={() => setLocation("/")}
            >
              <Home className="w-5 h-5 mr-3" />
              Profile
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start text-neutral-600 hover:bg-neutral-100"
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
              className="w-full justify-start text-neutral-600 hover:bg-neutral-100"
            >
              <Search className="w-5 h-5 mr-3" />
              Discover
            </Button>
          </li>
          <li>
            <Button
              variant="ghost"
              className="w-full justify-start text-neutral-600 hover:bg-neutral-100"
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
              window.location.reload();
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
