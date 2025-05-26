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

  // Handle profile picture upload
  const uploadProfilePictureMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);
      return await apiRequest("POST", "/api/user/profile-image", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
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

  const handleCoverPhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
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

      // Cover photo functionality removed
    }
  };

  // Handle cover photo upload
  const uploadCoverPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('coverImage', file);
      return await apiRequest("POST", "/api/user/cover-image", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Cover Photo Updated",
        description: "Your cover photo has been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload cover photo",
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
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mb-6 overflow-hidden">
        {/* Cover Photo */}
        <div className="h-48 relative overflow-hidden">
          {user?.coverImageUrl ? (
            <img 
              src={user.coverImageUrl} 
              alt="Cover photo" 
              className="w-full h-full object-cover"
              onLoad={() => console.log("Cover image loaded:", user.coverImageUrl)}
              onError={() => console.log("Cover image failed to load:", user.coverImageUrl)}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-blue-600" />
          )}

          {isOwn && (
            <>
              <Button
                variant="secondary"
                size="sm"
                className="absolute bottom-4 right-4 bg-white/90 hover:bg-white"
                onClick={() => coverFileInputRef.current?.click()}
                disabled={uploadCoverPhotoMutation.isPending}
              >
                <Camera className="w-4 h-4 mr-2" />
                {uploadCoverPhotoMutation.isPending ? "Uploading..." : "Edit Cover"}
              </Button>
              <input
                type="file"
                ref={coverFileInputRef}
                onChange={handleCoverUpload}
                accept="image/*"
                className="hidden"
              />
            </>
          )}
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
            {/* Profile Picture */}
            <div className="relative -mt-20">
              <div className="relative">
                <Avatar 
                  className={`w-32 h-32 border-4 border-white shadow-lg ${isOwn ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                  onClick={handleProfilePictureClick}
                >
                  <AvatarImage src={isOwn && user?.profileImageUrl ? user.profileImageUrl : profile.profileImageUrl || ""} />
                  <AvatarFallback className="text-2xl">
                    {isOwn ? getUserInitials() : profile.name.slice(0, 2).toUpperCase()}
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
                <div className="flex items-center space-x-2 text-sm text-neutral-600">
                  {getVisibilityIcon(profile.visibility)}
                  <span className="capitalize">{profile.visibility} Profile</span>
                  {isOwn && (
                    <Button variant="link" size="sm" className="text-blue-500 p-0 h-auto">
                      Change
                    </Button>
                  )}
                </div>
                <Badge className={`${getProfileTypeColor(profile.type)} text-white`}>
                  {getProfileTypeName(profile.type)}
                </Badge>
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
