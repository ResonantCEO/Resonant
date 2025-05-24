import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Camera, 
  Edit, 
  Share, 
  MapPin, 
  Users, 
  Globe, 
  UserCheck, 
  Lock,
  UserPlus,
  UserMinus,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface ProfileHeaderProps {
  profile: any;
  isOwn: boolean;
}

export default function ProfileHeader({ profile, isOwn }: ProfileHeaderProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Helper function to format user's display name
  const getUserDisplayName = () => {
    if (!user) return profile.name || "";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName} ${lastName}`.trim() || user.email || profile.name;
  };

  // Helper function to get user initials
  const getUserInitials = () => {
    if (!user) return profile.name?.slice(0, 2).toUpperCase() || "";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return user.email ? user.email.charAt(0).toUpperCase() : profile.name?.slice(0, 2).toUpperCase() || "";
  };
  const [activeTab, setActiveTab] = useState("posts");

  const { data: friendshipStatus } = useQuery({
    queryKey: [`/api/friendship-status/${profile.id}`],
    enabled: !isOwn,
  });

  const { data: friends = [] } = useQuery({
    queryKey: [`/api/profiles/${profile.id}/friends`],
  });

  const sendFriendRequestMutation = useMutation({
    mutationFn: async (addresseeId: number) => {
      return await apiRequest("POST", "/api/friend-requests", { addresseeId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/friendship-status/${profile.id}`] });
      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent.",
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
        return "Audience Member";
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "public":
        return <Globe className="w-4 h-4 text-green-500" />;
      case "friends":
        return <UserCheck className="w-4 h-4 text-blue-500" />;
      case "private":
        return <Lock className="w-4 h-4 text-red-500" />;
      default:
        return <Globe className="w-4 h-4 text-green-500" />;
    }
  };

  const handleSendFriendRequest = () => {
    sendFriendRequestMutation.mutate(profile.id);
  };

  const renderActionButtons = () => {
    if (isOwn) {
      return (
        <div className="flex space-x-3">
          <Button className="bg-blue-500 hover:bg-blue-600 text-white">
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button variant="outline">
            <Share className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      );
    }

    // TODO: Implement friendship status checking
    return (
      <div className="flex space-x-3">
        <Button 
          onClick={handleSendFriendRequest}
          disabled={sendFriendRequestMutation.isPending}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Friend
        </Button>
        <Button variant="outline">
          <Share className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>
    );
  };

  return (
    <>
      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mb-6 overflow-hidden">
        {/* Cover Photo */}
        <div className="h-48 bg-gradient-to-r from-blue-500 to-blue-600 relative">
          {profile.coverImageUrl && (
            <img 
              src={profile.coverImageUrl} 
              alt="Cover photo" 
              className="w-full h-full object-cover"
            />
          )}
          {isOwn && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute bottom-4 right-4 bg-white/90 hover:bg-white"
            >
              <Camera className="w-4 h-4 mr-2" />
              Edit Cover
            </Button>
          )}
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Profile Picture */}
            <div className="relative -mt-20">
              <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                <AvatarImage src={isOwn && user?.profileImageUrl ? user.profileImageUrl : profile.profileImageUrl || ""} />
                <AvatarFallback className="text-2xl">
                  {isOwn ? getUserInitials() : profile.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOwn && (
                <Button
                  size="sm"
                  className="absolute bottom-2 right-2 rounded-full w-8 h-8 p-0 bg-neutral-600 hover:bg-neutral-700"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Profile Details */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-neutral-900 mb-2">{isOwn ? getUserDisplayName() : profile.name}</h1>
                  <div className="flex items-center space-x-4 text-neutral-600 mb-4">
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      {friends.length} friends
                    </span>
                    {profile.location && (
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2" />
                        {profile.location}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                {renderActionButtons()}
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="bg-neutral-50 rounded-lg p-4 mb-4">
                  <p className="text-neutral-700 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Profile Type & Visibility */}
              <div className="flex items-center space-x-4">
                <Badge className={`${getProfileTypeColor(profile.type)} text-white`}>
                  {getProfileTypeName(profile.type)}
                </Badge>
                <div className="flex items-center space-x-2 text-sm text-neutral-600">
                  {getVisibilityIcon(profile.visibility)}
                  <span className="capitalize">{profile.visibility} Profile</span>
                  {isOwn && (
                    <Button variant="link" size="sm" className="text-blue-500 p-0 h-auto">
                      Change
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-neutral-200">
            <TabsList className="w-full justify-start rounded-none border-0 bg-transparent px-6">
              <TabsTrigger value="posts" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                Posts
              </TabsTrigger>
              <TabsTrigger value="about" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                About
              </TabsTrigger>
              <TabsTrigger value="friends" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                Friends
              </TabsTrigger>
              <TabsTrigger value="photos" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                Photos
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>
    </>
  );
}
