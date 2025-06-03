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
      return (
        <div className="flex space-x-3">
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
      <div className="bg-white dark:bg-gray-900 shadow-lg border border-neutral-200 dark:border-gray-800 mb-6 overflow-hidden">
        {/* Cover Photo - Increased height for better visual impact */}
        <div className="h-64 relative overflow-hidden bg-gradient-to-br from-slate-900 via-gray-900 to-black">
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
                className="w-full h-64 object-cover absolute inset-0 transition-opacity duration-300"
                onError={(e) => {
                  console.log("Cover image failed to load:", profile.coverImageUrl);
                  e.currentTarget.style.display = 'none';
                }}
                onLoad={() => {
                  console.log("Cover image loaded successfully:", profile.coverImageUrl);
                }}
              />
            )}

            {/* Enhanced overlay gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

            {/* Cover photo placeholder text when no image is set */}
            {!profile?.coverImageUrl && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white/70 text-center">
                  <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">{isOwn ? "Click to add a cover photo" : "No cover photo"}</p>
                </div>
              </div>
            )}

            {/* Hover overlay for owned profiles */}
            {isOwn && (
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 hover:opacity-100">
                <div className="text-white text-center">
                  <Camera className="w-10 h-10 mx-auto mb-2" />
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

        {/* Profile Info Section - Enhanced layout */}
        <div className="relative px-8 py-6">
          {/* Profile Picture - Repositioned and enhanced */}
          <div className="absolute -top-16 left-8">
            <div className="relative">
              <Avatar 
                className={`w-32 h-32 border-4 border-white dark:border-gray-900 shadow-2xl ${isOwn ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={handleProfilePictureClick}
              >
                <AvatarImage src={profile.profileImageUrl || ""} />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
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

          {/* Profile Details - Better organized layout */}
          <div className="ml-40 pt-2">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Left side - Name and info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                    {getDisplayName()}
                  </h1>
                  <Badge className={`${getProfileTypeColor(profile.type)} text-white font-medium px-3 py-1`}>
                    {getProfileTypeName(profile.type)}
                  </Badge>
                </div>

                {/* Stats and basic info */}
                <div className="flex flex-wrap items-center gap-6 text-gray-600 dark:text-gray-300 mb-4">
                  <span className="flex items-center gap-2 font-medium">
                    <Users className="w-5 h-5" />
                    <span className="text-gray-900 dark:text-white font-semibold">{friends.length}</span> friends
                  </span>
                  
                  {/* Genre for Artist profiles */}
                  {profile.type === "artist" && profile.genre && (
                    <span className="flex items-center gap-2">
                      <Music className="w-5 h-5" />
                      {profile.genre}
                    </span>
                  )}
                  
                  {/* Location info */}
                  {(profile.location || profile.hometown) && (
                    <span className="flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      {profile.location || profile.hometown}
                    </span>
                  )}
                  
                  {/* Profile visibility */}
                  <div className="flex items-center gap-2">
                    {getVisibilityIcon(profile.visibility)}
                    <span className="capitalize">{profile.visibility} Profile</span>
                  </div>
                </div>

                {/* Additional info for Artist profiles */}
                {profile.type === "artist" && profile.hometown && profile.location && profile.hometown !== profile.location && (
                  <div className="text-gray-600 dark:text-gray-300 mb-4">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Hometown: {profile.hometown}
                    </span>
                  </div>
                )}
              </div>

              {/* Right side - Social media and actions */}
              <div className="flex flex-col items-end gap-4">
                {/* Social Media Buttons - Enhanced styling */}
                <div className="flex items-center gap-2">
                  {/* Facebook */}
                  {(isOwn || profile.facebookUrl) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="p-2.5 bg-[#1877F2] hover:bg-[#166FE5] text-white border-[#1877F2] rounded-full shadow-md transition-all duration-200"
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
                      className="p-2.5 bg-gradient-to-r from-[#E4405F] to-[#F56040] hover:from-[#D73447] hover:to-[#F4553A] text-white border-0 rounded-full shadow-md transition-all duration-200"
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
                      className="p-2.5 bg-[#FFFC00] hover:bg-[#F0ED00] text-black border-[#FFFC00] rounded-full shadow-md transition-all duration-200"
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
                      className="p-2.5 bg-black hover:bg-gray-800 text-white border-black rounded-full shadow-md transition-all duration-200"
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
                      className="p-2.5 bg-black hover:bg-gray-800 text-white border-black rounded-full shadow-md transition-all duration-200"
                      onClick={() => profile.twitterUrl && window.open(profile.twitterUrl, '_blank')}
                      disabled={!profile.twitterUrl && !isOwn}
                    >
                      <Twitter className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Action Buttons - Enhanced styling */}
                <div className="flex gap-3">
                  {renderActionButtons()}
                  {isOwn && (
                    <Button variant="outline" size="sm" className="text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white border-gray-300 dark:border-gray-600">
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Profile
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
              {profile.type === "artist" && viewerProfile && 'type' in viewerProfile && (viewerProfile.type === "artist" || viewerProfile.type === "venue") && (
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