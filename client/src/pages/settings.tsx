import React, { useState, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../hooks/use-toast';
import { Trash2, User, Palette, Bell, Shield, Globe, Camera } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import Sidebar from '../components/sidebar';
import { useSidebar } from '../hooks/useSidebar';

function SettingsContent() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const backgroundFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch user profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['/api/profiles'],
    queryFn: async () => {
      const response = await fetch('/api/profiles', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch profiles');
      return response.json();
    }
  });

  // Fetch active profile
  const { data: activeProfile } = useQuery({
    queryKey: ['/api/profiles/active'],
    queryFn: async () => {
      const response = await fetch('/api/profiles/active', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch active profile');
      return response.json();
    }
  });

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: async (profileId: number) => {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete profile');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile deleted",
        description: "Profile has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete profile",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      toast({
        title: "Settings updated",
        description: "Your settings have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  // Profile image upload mutation
  const uploadProfileImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);

      const response = await fetch(`/api/profiles/${activeProfile?.id}/profile-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload profile image');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      setProfileImageFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload profile picture",
        variant: "destructive",
      });
    },
  });

  // Cover image upload mutation
  const uploadCoverImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('coverImage', file);

      const response = await fetch(`/api/profiles/${activeProfile?.id}/cover-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to upload cover image');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cover photo updated",
        description: "Your cover photo has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
      setCoverImageFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload cover photo",
        variant: "destructive",
      });
    },
  });

  // Alias for compatibility
  const uploadCoverPhotoMutation = uploadCoverImageMutation;

  // Remove cover photo mutation
  const removeCoverPhotoMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/profiles/${activeProfile?.id}/cover-image`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to remove cover photo');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cover photo removed",
        description: "Your cover photo has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove cover photo",
        variant: "destructive",
      });
    },
  });

  const handleUpdateSetting = (key: string, value: any) => {
    updateUserMutation.mutate({ [key]: value });
  };

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      const response = await fetch(`/api/profiles/${activeProfile?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles/active'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleUpdateProfileSetting = (key: string, value: any) => {
    updateProfileMutation.mutate({ [key]: value });
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      uploadProfileImageMutation.mutate(file);
    }
  };

  const handleCoverImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      uploadCoverImageMutation.mutate(file);
    }
  };

  const handleCoverPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImageFile(file);
      uploadCoverImageMutation.mutate(file);
    }
  };

  const handleRemoveCoverPhoto = async () => {
    await removeCoverPhotoMutation.mutateAsync();
    // Clear the input to allow re-uploading the same image
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = '';
    }
  };

  // Background photo upload mutation
  const uploadBackgroundMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('background', file);

      const response = await fetch('/api/profile/background-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to upload background image');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Background uploaded",
        description: "Your background image has been uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles/active'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload background image",
        variant: "destructive",
      });
    },
  });

  // Remove background photo mutation
  const removeBackgroundMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/profile/background-image', {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to remove background image');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Background removed",
        description: "Your background image has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles/active'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove background image",
        variant: "destructive",
      });
    },
  });

  const handleBackgroundPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImageFile(file);
      uploadBackgroundMutation.mutate(file);
    }
  };

  const handleRemoveBackgroundPhoto = async () => {
    await removeBackgroundMutation.mutateAsync();
    // Clear the input to allow re-uploading the same image
    if (backgroundFileInputRef.current) {
      backgroundFileInputRef.current.value = '';
    }
  };

  const artistProfiles = profiles.filter((p: any) => p.type === 'artist');
  const venueProfiles = profiles.filter((p: any) => p.type === 'venue');

  // Determine if we should show profile-specific settings
  const isAudienceProfile = activeProfile?.type === 'audience';
  const currentProfileData = isAudienceProfile ? user : activeProfile;

  if (!user || !activeProfile) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Accounts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAudienceProfile ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        value={user.firstName || ''}
                        onChange={(e) => handleUpdateSetting('firstName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={user.lastName || ''}
                        onChange={(e) => handleUpdateSetting('lastName', e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ''}
                      onChange={(e) => handleUpdateSetting('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hometown">Hometown</Label>
                    <Input
                      id="hometown"
                      value={user.hometown || ""}
                      onChange={(e) => handleUpdateSetting('hometown', e.target.value)}
                      placeholder="Enter your hometown"
                    />
                  </div>

                  <div>
                    <Label htmlFor="birthdate">Birthday</Label>
                    <Input
                      id="birthdate"
                      type="date"
                      value={user.birthdate ? new Date(user.birthdate).toISOString().split('T')[0] : ""}
                      onChange={(e) => {
                        const dateValue = e.target.value;
                        if (dateValue && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
                          // Only accept properly formatted YYYY-MM-DD dates
                          const [year, month, day] = dateValue.split('-');
                          const selectedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          handleUpdateSetting('birthdate', selectedDate.toISOString());
                        } else if (!dateValue) {
                          handleUpdateSetting('birthdate', null);
                        }
                      }}
                      placeholder="YYYY-MM-DD"
                    />
                    <p className="text-sm text-muted-foreground mt-1">Your birthday will only show the month and day on your profile</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <Label htmlFor="profileName">Profile Name</Label>
                    <Input
                      id="profileName"
                      value={activeProfile?.name || ''}
                      onChange={(e) => handleUpdateProfileSetting('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="profileBio">Bio</Label>
                    <Input
                      id="profileBio"
                      value={activeProfile?.bio || ''}
                      onChange={(e) => handleUpdateProfileSetting('bio', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="profileLocation">Location</Label>
                    <Input
                      id="profileLocation"
                      value={activeProfile?.location || ''}
                      onChange={(e) => handleUpdateProfileSetting('location', e.target.value)}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You are editing settings for your {activeProfile?.type} profile "{activeProfile?.name}".
                    User account settings (name, email) can be found in your audience profile.
                  </p>
                </>
              )}

              <Separator />

              <div>
                <Label>Profile Picture</Label>
                <div className="mt-2">
                  <div
                    className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer group"
                    onClick={() => document.getElementById('profileImageInput')?.click()}
                  >
                    {activeProfile?.profileImageUrl ? (
                      <img
                        src={activeProfile.profileImageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-sm">No Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                      <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        Click to change
                      </span>
                    </div>
                    {uploadProfileImageMutation.isPending && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <input
                    id="profileImageInput"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cover Photo</Label>
                <div className="space-y-3">
                  <div
                    className="relative w-full h-32 rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => document.getElementById('coverImageInput')?.click()}
                  >
                    {activeProfile?.coverImageUrl ? (
                      <img
                        src={activeProfile.coverImageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">Click to add cover photo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        Click to change cover photo
                      </span>
                    </div>
                    {uploadCoverPhotoMutation.isPending && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  <input
                    id="coverImageInput"
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverPhotoChange}
                    disabled={uploadCoverPhotoMutation.isPending}
                    className="hidden"
                  />
                  {activeProfile?.coverImageUrl && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleRemoveCoverPhoto}
                      disabled={removeCoverPhotoMutation.isPending}
                    >
                      {removeCoverPhotoMutation.isPending ? "Removing..." : "Remove Cover Photo"}
                    </Button>
                  )}
                  {uploadCoverPhotoMutation.isPending && (
                    <div className="text-sm text-muted-foreground">
                      Uploading cover photo...
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <Label htmlFor="profileBackground">Profile Background</Label>
                <p className="text-sm text-muted-foreground mb-3">Choose a background style for your profile page</p>
                <Select
                  value={user.profileBackground || 'default'}
                  onValueChange={(value) => handleUpdateSetting('profileBackground', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default (Cover Photo)</SelectItem>
                    <SelectItem value="gradient-blue">Blue Gradient</SelectItem>
                    <SelectItem value="gradient-purple">Purple Gradient</SelectItem>
                    <SelectItem value="gradient-green">Green Gradient</SelectItem>
                    <SelectItem value="gradient-orange">Orange Gradient</SelectItem>
                    <SelectItem value="gradient-pink">Pink Gradient</SelectItem>
                    <SelectItem value="solid-dark">Dark Solid</SelectItem>
                    <SelectItem value="solid-light">Light Solid</SelectItem>
                    <SelectItem value="pattern-dots">Dotted Pattern</SelectItem>
                    <SelectItem value="pattern-waves">Wave Pattern</SelectItem>
                    <SelectItem value="custom-photo">Custom Photo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {user.profileBackground === 'custom-photo' && (
                <div className="space-y-3">
                  <Label>Upload Custom Background Photo</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundPhotoUpload}
                      className="hidden"
                      ref={backgroundFileInputRef}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => backgroundFileInputRef.current?.click()}
                      disabled={uploadBackgroundMutation.isPending}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploadBackgroundMutation.isPending ? 'Uploading...' : 'Choose Photo'}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">Upload a custom photo to use as your profile page background.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>Customize how the app looks and feels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="theme">Theme</Label>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
                <Select
                  value={user.theme || 'system'}
                  onValueChange={(value) => handleUpdateSetting('theme', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="compactMode">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground">Use a more compact layout</p>
                </div>
                <Switch
                  id="compactMode"
                  checked={user.compactMode || false}
                  onCheckedChange={(checked) => handleUpdateSetting('compactMode', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoplayVideos">Autoplay Videos</Label>
                  <p className="text-sm text-muted-foreground">Automatically play videos in feed</p>
                </div>
                <Switch
                  id="autoplayVideos"
                  checked={user.autoplayVideos || false}
                  onCheckedChange={(checked) => handleUpdateSetting('autoplayVideos', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="emailNotifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={user.emailNotifications || false}
                  onCheckedChange={(checked) => handleUpdateSetting('emailNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifyFriendRequests">Friend Requests</Label>
                  <p className="text-sm text-muted-foreground">Get notified of new friend requests</p>
                </div>
                <Switch
                  id="notifyFriendRequests"
                  checked={user.notifyFriendRequests || false}
                  onCheckedChange={(checked) => handleUpdateSetting('notifyFriendRequests', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifyMessages">Messages</Label>
                  <p className="text-sm text-muted-foreground">Get notified of new messages</p>
                </div>
                <Switch
                  id="notifyMessages"
                  checked={user.notifyMessages || false}
                  onCheckedChange={(checked) => handleUpdateSetting('notifyMessages', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifyPostLikes">Post Likes</Label>
                  <p className="text-sm text-muted-foreground">Get notified when someone likes your posts</p>
                </div>
                <Switch
                  id="notifyPostLikes"
                  checked={user.notifyPostLikes || false}
                  onCheckedChange={(checked) => handleUpdateSetting('notifyPostLikes', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notifyComments">Comments</Label>
                  <p className="text-sm text-muted-foreground">Get notified of new comments on your posts</p>
                </div>
                <Switch
                  id="notifyComments"
                  checked={user.notifyComments || false}
                  onCheckedChange={(checked) => handleUpdateSetting('notifyComments', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Control your privacy and visibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="showOnlineStatus">Show Online Status</Label>
                  <p className="text-sm text-muted-foreground">Let others see when you're online</p>
                </div>
                <Switch
                  id="showOnlineStatus"
                  checked={user.showOnlineStatus || false}
                  onCheckedChange={(checked) => handleUpdateSetting('showOnlineStatus', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="allowFriendRequests">Allow Friend Requests</Label>
                  <p className="text-sm text-muted-foreground">Allow others to send you friend requests</p>
                </div>
                <Switch
                  id="allowFriendRequests"
                  checked={user.allowFriendRequests || false}
                  onCheckedChange={(checked) => handleUpdateSetting('allowFriendRequests', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="showActivityStatus">Show Activity Status</Label>
                  <p className="text-sm text-muted-foreground">Show your recent activity to friends</p>
                </div>
                <Switch
                  id="showActivityStatus"
                  checked={user.showActivityStatus || false}
                  onCheckedChange={(checked) => handleUpdateSetting('showActivityStatus', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Artist Profiles</CardTitle>
              <CardDescription>Manage your artist profile accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {artistProfiles.length > 0 ? (
                <div className="space-y-4">
                  {artistProfiles.map((profile: any) => (
                    <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {profile.profileImageUrl && (
                          <img
                            src={profile.profileImageUrl}
                            alt={profile.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <h3 className="font-medium">{profile.name}</h3>
                          <p className="text-sm text-muted-foreground">Artist Profile</p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Artist Profile</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the artist profile "{profile.name}"? This action cannot be undone and will remove all associated posts and data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteProfileMutation.mutate(profile.id)}
                            >
                              Delete Profile
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No artist profiles found.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Venue Profiles</CardTitle>
              <CardDescription>Manage your venue profile accounts</CardDescription>
            </CardHeader>
            <CardContent>
              {venueProfiles.length > 0 ? (
                <div className="space-y-4">
                  {venueProfiles.map((profile: any) => (
                    <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {profile.profileImageUrl && (
                          <img
                            src={profile.profileImageUrl}
                            alt={profile.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <h3 className="font-medium">{profile.name}</h3>
                          <p className="text-sm text-muted-foreground">Venue Profile</p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Venue Profile</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the venue profile "{profile.name}"? This action cannot be undone and will remove all associated posts and data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteProfileMutation.mutate(profile.id)}
                            >
                              Delete Profile
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No venue profiles found.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Settings() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />
      <div className={`${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} min-h-screen backdrop-blur-sm bg-white/30 dark:bg-neutral-950/30`}>
        <SettingsContent />
      </div>
    </div>
  );
}