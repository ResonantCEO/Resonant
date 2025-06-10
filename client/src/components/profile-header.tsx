import { useState, useRef } from "react";
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
  Clock,
  Music
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ProfileManagement from "./profile-management";
import { Facebook, Instagram, MessageCircle, Twitter } from "lucide-react";
import Sidebar from '../components/sidebar';

const getProfileBackground = (backgroundType: string) => {
  switch (backgroundType) {
    case 'gradient-blue':
      return 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700';
    case 'gradient-purple':
      return 'bg-gradient-to-r from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700';
    case 'gradient-green':
      return 'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700';
    case 'gradient-orange':
      return 'bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-600 dark:to-orange-700';
    case 'gradient-pink':
      return 'bg-gradient-to-r from-pink-500 to-pink-600 dark:from-pink-600 dark:to-pink-700';
    case 'solid-dark':
      return 'bg-gray-800 dark:bg-gray-900';
    case 'solid-light':
      return 'bg-gray-100 dark:bg-gray-800';
    case 'pattern-dots':
      return 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.3)_1px,transparent_0)] bg-[length:20px_20px]';
    case 'pattern-waves':
      return 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 bg-[url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")]';
    default:
      return 'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700';
  }
};

interface ProfileHeaderProps {
  profile: any;
  isOwn: boolean;
  canManageMembers?: boolean;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export default function ProfileHeader({ profile, isOwn, canManageMembers, activeTab = "posts", setActiveTab }: ProfileHeaderProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  // Get viewer's active profile to check their type
  const { data: viewerProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to get display name for profile
  const getDisplayName = () => {
    if (profile.type === 'audience' && user) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || profile.name;
    }
    return profile.name;
  };

  const { data: friendshipStatus } = useQuery({
    queryKey: [`/api/friendship-status/${profile.id}`],
    enabled: !isOwn,
  });

  const { data: friends = [] } = useQuery<any[]>({
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

  // Handle profile picture upload
  const uploadProfilePictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);
      return await apiRequest("POST", `/api/profiles/${profile.id}/profile-image`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/active"] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    },
  });



  const handleProfilePictureClick = () => {
    if (isOwn) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      uploadProfilePictureMutation.mutate(file);
    }
  };



  // Handle cover photo upload
  const uploadCoverPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('coverImage', file);
      return await apiRequest("POST", `/api/profiles/${profile.id}/cover-image`, formData);
    },
    onSuccess: async (data) => {
      console.log("Cover photo upload response:", data);

      // Invalidate and refetch profile data to get updated cover photo
      await queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}`] });
      await queryClient.refetchQueries({ queryKey: [`/api/profiles/${profile.id}`] });

      toast({
        title: "Cover Photo Updated",
        description: "Your cover photo has been successfully updated.",
      });
    },
    onError: (error: any) => {
      console.error("Cover photo upload error:", error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload cover photo",
        variant: "destructive",
      });
    },
  });

  const removeCoverPhotoMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/profiles/${profile.id}/cover-image`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}`] });
      toast({
        title: "Cover Photo Removed",
        description: "Your cover photo has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove cover photo",
        variant: "destructive",
      });
    },
  });

  const handleCoverUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      uploadCoverPhotoMutation.mutate(file);
    }
  };

  const handleRemoveCoverPhoto = () => {
    removeCoverPhotoMutation.mutate();
  };

  const handleCoverPhotoClick = () => {
    if (isOwn) {
      coverFileInputRef.current?.click();
    }
  };

  const renderActionButtons = () => {
    if (isOwn) {
      return null;
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
      </div>
    );
  };

  return (
    <>
      {/* Profile Header */}
      <div className={`bg-white rounded-xl shadow-sm border border-neutral-200 mb-6 overflow-hidden ${profile.type === 'artist' ? 'min-h-[275px] sm:min-h-[375px]' : 'min-h-[300px] sm:min-h-[340px]'}`}>
        {/* Cover Photo */}
        <div className="h-32 sm:h-48 relative overflow-hidden bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700">
          {/* Clickable cover photo area */}
          <div 
            className={`absolute inset-0 ${isOwn ? 'cursor-pointer' : ''}`}
            onClick={isOwn ? handleCoverPhotoClick : undefined}
          >
            {/* Cover photo image - only show if coverImageUrl exists */}
            {profile?.coverImageUrl && (
              <img 
                src={profile.coverImageUrl} 
                alt="Cover photo" 
                className="w-full h-48 object-cover absolute inset-0 transition-opacity duration-300"
                onError={(e) => {
                  console.log("Cover image failed to load:", profile.coverImageUrl);
                  // Hide the broken image and show gradient background
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  console.log("Cover image loaded successfully:", profile.coverImageUrl);
                }}
              />
            )}

            {/* Overlay gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>

            {/* Cover photo placeholder text when no image is set */}
            {!profile?.coverImageUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/70 text-center">
                  <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">{isOwn ? "Click to add a cover photo" : "No cover photo"}</p>
                </div>
              </div>
            )}

            {/* Hover overlay for owned profiles */}
            {isOwn && (
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                <div className="text-white text-center">
                  <Camera className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm font-medium">
                    {uploadCoverPhotoMutation.isPending ? "Uploading..." : profile?.coverImageUrl ? "Change Cover Photo" : "Add Cover Photo"}
                  </p>
                </div>
              </div>
            )}

            {/* Upload progress indicator */}
            {uploadCoverPhotoMutation.isPending && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>



          {/* Hidden file input for cover upload */}
          {isOwn && (
            <input
              type="file"
              ref={coverFileInputRef}
              onChange={handleCoverUpload}
              accept="image/*"
              className="hidden"
            />
          )}
        </div>

        {/* Profile Picture - Absolutely positioned for artist profiles */}
        {profile.type === 'artist' && (
          <div className="absolute left-4 sm:left-6 top-20 sm:top-40 z-10">
            <div className="relative">
              <Avatar 
                className={`w-24 h-24 sm:w-40 sm:h-40 border-4 border-white shadow-lg ${isOwn ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={handleProfilePictureClick}
              >
                <AvatarImage src={profile.profileImageUrl || ""} />
                <AvatarFallback className="text-lg sm:text-3xl">
                  {getDisplayName().slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOwn && (
                <>
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={handleProfilePictureClick}
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  {uploadProfilePictureMutation.isPending && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Profile Info */}
        <div className={`p-4 sm:p-6 ${profile.type === 'artist' ? 'pt-8 sm:pt-4 pb-32 pl-32 sm:pl-52' : 'pt-6 pb-16'} relative`}>
          {/* Profile Type & Visibility - Top Right of Content Area */}
          <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
            <div className="flex flex-col sm:flex-row items-end sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
              <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                {getVisibilityIcon(profile.visibility)}
                <span className="capitalize hidden sm:inline">{profile.visibility} Profile</span>
                <span className="capitalize sm:hidden">{profile.visibility}</span>
                {isOwn && (
                  <Button variant="link" size="sm" className="text-blue-500 hover:text-blue-600 p-0 h-auto text-xs sm:text-sm">
                    Change
                  </Button>
                )}
              </div>
              <Badge className={`${getProfileTypeColor(profile.type)} text-white text-xs sm:text-sm`}>
                {profile.type === 'artist' ? 'Artist' : profile.type === 'venue' ? 'Venue' : 'Audience'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Profile Picture - for non-artist profiles */}
            {profile.type !== 'artist' && (
              // Modified the top position here
              <div className="relative -mt-16 sm:-mt-28">
                <div className="relative">
                  <Avatar 
                    className={`w-24 h-24 sm:w-40 sm:h-40 border-4 border-white shadow-lg ${isOwn ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                    onClick={handleProfilePictureClick}
                  >
                    <AvatarImage src={profile.profileImageUrl || ""} />
                    <AvatarFallback className="text-lg sm:text-3xl">
                      {getDisplayName().slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isOwn && (
                    <>
                      <div 
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                        onClick={handleProfilePictureClick}
                      >
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                      {uploadProfilePictureMutation.isPending && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Profile Details */}
            <div className="flex-1 -mt-4 sm:-mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-3xl font-bold text-neutral-900 mb-1 truncate">{getDisplayName()}</h1>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 text-neutral-600 mb-3 space-y-1 sm:space-y-0">
                    <span className="flex items-center text-sm">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      {friends.length} friends
                    </span>
                    {profile.location && (
                      <span className="flex items-center text-sm">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="truncate">{profile.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Genre and Hometown for Artist profiles */}
                  {profile.type === "artist" && (
                    <div className="space-y-0.5 text-neutral-600 mb-2">
                      <span className="flex items-center text-sm">
                        <Music className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="truncate">{profile.genre || "Genre not specified"}</span>
                      </span>
                      <span className="flex items-center text-sm">
                        <MapPin className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                        <span className="truncate">{profile.hometown || "Hometown not specified"}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-2 sm:mt-0 sm:ml-4">
                  {renderActionButtons()}
                </div>
              </div>

              {/* Social Media Buttons - Position based on profile type */}
              <div className={`flex items-center space-x-2 ${profile.type === 'artist' ? 'absolute -bottom-2 left-0 right-0 justify-center' : 'justify-center absolute -bottom-2 left-0 right-0 pt-4'}`}>
                {/* Facebook */}
                {(isOwn || profile.facebookUrl) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 rounded-full"
                    onClick={() => profile.facebookUrl && window.open(profile.facebookUrl, '_blank')}
                    disabled={!profile.facebookUrl && !isOwn}
                  >
                    <Facebook className="w-4 h-4" />
                  </Button>
                )}

                {/* Instagram */}
                {(isOwn || profile.instagramUrl) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 rounded-full"
                    onClick={() => profile.instagramUrl && window.open(profile.instagramUrl, '_blank')}
                    disabled={!profile.instagramUrl && !isOwn}
                  >
                    <Instagram className="w-4 h-4" />
                  </Button>
                )}

                {/* Snapchat */}
                {(isOwn || profile.snapchatUrl) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="p-2 bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-400 rounded-full"
                    onClick={() => profile.snapchatUrl && window.open(profile.snapchatUrl, '_blank')}
                    disabled={!profile.snapchatUrl && !isOwn}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </Button>
                )}

                {/* TikTok */}
                {(isOwn || profile.tiktokUrl) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="p-2 bg-black hover:bg-gray-800 text-white border-black rounded-full"
                    onClick={() => profile.tiktokUrl && window.open(profile.tiktokUrl, '_blank')}
                    disabled={!profile.tiktokUrl && !isOwn}
                  >
                    <div className="w-4 h-4 font-bold text-xs flex items-center justify-center">T</div>
                  </Button>
                )}

                {/* X (Twitter) */}
                {(isOwn || profile.twitterUrl) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="p-2 bg-black hover:bg-gray-800 text-white border-black rounded-full"
                    onClick={() => profile.twitterUrl && window.open(profile.twitterUrl, '_blank')}
                    disabled={!profile.twitterUrl && !isOwn}
                  >
                    <Twitter className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Share Button - Bottom Right */}
              <div className="absolute -bottom-2 sm:-bottom-2 right-2 sm:right-4">
                <Button variant="outline" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
                  <Share className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Share</span>
                </Button>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mb-6">
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <div className="border-b border-neutral-200">
            <TabsList className="w-full justify-start rounded-none border-0 bg-transparent px-6">
              {/* EPK tab - first tab for artist profiles */}
              {profile.type === "artist" && (
                <TabsTrigger value="epk" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                  EPK
                </TabsTrigger>
              )}
              {/* Posts tab - only for non-artist profiles */}
              {profile.type !== "artist" && (
                <TabsTrigger value="posts" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                  Posts
                </TabsTrigger>
              )}
              {/* About tab - hidden for artist profiles */}
              {profile.type !== "artist" && (
                <TabsTrigger value="about" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                  About
                </TabsTrigger>
              )}
              {/* Friends tab - only for non-artist profiles */}
              {profile.type !== "artist" && (
                <TabsTrigger value="friends" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                  Friends
                </TabsTrigger>
              )}
              <TabsTrigger value="photos" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                Photos
              </TabsTrigger>
              {/* Community tab - only visible for artist profiles */}
              {profile.type === "artist" && (
                <TabsTrigger value="community" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                  Community
                </TabsTrigger>
              )}
              {/* Stats tab - only visible for artist profiles and only to artist/venue viewers */}
              {profile.type === "artist" && viewerProfile && (viewerProfile.type === "artist" || viewerProfile.type === "venue") && (
                <TabsTrigger value="stats" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                  Stats
                </TabsTrigger>
              )}
              {/* Management tab - visible only for venue profiles (artist members moved to dashboard) */}
              {profile.type === "venue" && (
                <TabsTrigger value="management" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-500 rounded-none">
                  Staff
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Management tab content - only show for venue profiles */}
          {profile.type === "venue" && (
            <TabsContent value="management" className="p-6">
              <ProfileManagement 
                profileId={profile.id}
                profileType={profile.type}
                isOwner={isOwn}
                canManageMembers={canManageMembers || false}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Hidden file inputs for uploads */}
      {isOwn && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
          <input
            type="file"
            ref={coverFileInputRef}
            onChange={handleCoverUpload}
            accept="image/*"
            className="hidden"
          />
        </>
      )}
    </>
  );
}