import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Sidebar from "@/components/sidebar";
import { 
  User, 
  Shield, 
  Bell, 
  Palette, 
  Trash2, 
  Eye, 
  EyeOff,
  Camera,
  Save,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: (user as any)?.firstName || "",
    lastName: (user as any)?.lastName || "",
    email: (user as any)?.email || "",
  });

  // Settings state
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: "public",
    showOnlineStatus: true,
    allowFriendRequests: true,
    showActivityStatus: true,
  });

  const [notificationSettings, setNotificationSettings] = useState({
    friendRequests: true,
    newMessages: true,
    postLikes: true,
    comments: true,
    emailNotifications: false,
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: "light",
    language: "en",
    compactMode: false,
    autoplayVideos: true,
  });

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: (user as any)?.firstName || "",
        lastName: (user as any)?.lastName || "",
        email: (user as any)?.email || "",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      return await apiRequest("PUT", "/api/user", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setIsEditingProfile(false);
      toast({
        title: "Profile Updated",
        description: "Your profile information has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    updateProfileMutation.mutate(profileData);
  };

  const handleCancelEdit = () => {
    setProfileData({
      firstName: (user as any)?.firstName || "",
      lastName: (user as any)?.lastName || "",
      email: (user as any)?.email || "",
    });
    setIsEditingProfile(false);
  };

  // Profile picture upload mutation
  const uploadProfilePicture = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profileImage', file);
      
      const response = await fetch('/api/user/profile-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile Picture Updated",
        description: "Your profile picture has been updated successfully.",
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      uploadProfilePicture.mutate(file);
    }
  };

  // Settings update handlers
  const updatePrivacySetting = (key: string, value: any) => {
    setPrivacySettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Privacy Setting Updated",
      description: "Your privacy preferences have been saved.",
    });
  };

  const updateNotificationSetting = (key: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Notification Setting Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const updateAppearanceSetting = (key: string, value: any) => {
    setAppearanceSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Appearance Setting Updated",
      description: "Your appearance preferences have been saved.",
    });
  };

  return (
    <div className="min-h-screen flex bg-neutral-50">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
            <p className="text-neutral-600 mt-2">Manage your account settings and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile" className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>Profile</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>Privacy</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center space-x-2">
                <Bell className="w-4 h-4" />
                <span>Notifications</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex items-center space-x-2">
                <Palette className="w-4 h-4" />
                <span>Appearance</span>
              </TabsTrigger>
            </TabsList>

            {/* Profile Settings */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and profile details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Picture Section */}
                  <div className="flex items-center space-x-6">
                    <div className="relative">
                      <Avatar className="w-24 h-24">
                        <AvatarImage src={user?.profileImageUrl || ""} />
                        <AvatarFallback className="text-lg">
                          {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <Button
                        size="sm"
                        className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
                        onClick={() => document.getElementById('profile-picture-input')?.click()}
                        disabled={uploadProfilePicture.isPending}
                      >
                        <Camera className="w-4 h-4" />
                      </Button>
                      <input
                        id="profile-picture-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">{user?.firstName} {user?.lastName}</h3>
                      <p className="text-sm text-neutral-600">{user?.email}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Change Profile Picture
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Personal Information</h3>
                      {!isEditingProfile ? (
                        <Button onClick={() => setIsEditingProfile(true)} variant="outline">
                          Edit
                        </Button>
                      ) : (
                        <div className="flex space-x-2">
                          <Button onClick={handleSaveProfile} size="sm" disabled={updateProfileMutation.isPending}>
                            <Save className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                          <Button onClick={handleCancelEdit} variant="outline" size="sm">
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                          disabled={!isEditingProfile}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                          disabled={!isEditingProfile}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditingProfile}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Active Profile */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Active Profile</h3>
                    {activeProfile && (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={user?.profileImageUrl || ""} />
                            <AvatarFallback>
                              {activeProfile.name?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{activeProfile.name}</p>
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">{activeProfile.type}</Badge>
                              <Badge variant="outline">{activeProfile.visibility}</Badge>
                            </div>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Switch Profile
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Privacy Settings */}
            <TabsContent value="privacy" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>
                    Control who can see your content and interact with you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Profile Visibility</p>
                        <p className="text-sm text-neutral-600">Who can see your profile</p>
                      </div>
                      <Select 
                        value={privacySettings.profileVisibility} 
                        onValueChange={(value) => updatePrivacySetting('profileVisibility', value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Everyone</SelectItem>
                          <SelectItem value="friends">Friends Only</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Show Online Status</p>
                        <p className="text-sm text-neutral-600">Let others see when you're online</p>
                      </div>
                      <Switch 
                        checked={privacySettings.showOnlineStatus}
                        onCheckedChange={(checked) => updatePrivacySetting('showOnlineStatus', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Allow Friend Requests</p>
                        <p className="text-sm text-neutral-600">Let others send you friend requests</p>
                      </div>
                      <Switch 
                        checked={privacySettings.allowFriendRequests}
                        onCheckedChange={(checked) => updatePrivacySetting('allowFriendRequests', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Show Activity Status</p>
                        <p className="text-sm text-neutral-600">Show your recent activity to friends</p>
                      </div>
                      <Switch 
                        checked={privacySettings.showActivityStatus}
                        onCheckedChange={(checked) => updatePrivacySetting('showActivityStatus', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Blocked Users</CardTitle>
                  <CardDescription>
                    Manage users you've blocked
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600">No blocked users</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what notifications you want to receive
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Friend Requests</p>
                        <p className="text-sm text-neutral-600">Get notified when someone sends you a friend request</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.friendRequests}
                        onCheckedChange={(checked) => updateNotificationSetting('friendRequests', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">New Messages</p>
                        <p className="text-sm text-neutral-600">Get notified when you receive new messages</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.newMessages}
                        onCheckedChange={(checked) => updateNotificationSetting('newMessages', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Post Likes</p>
                        <p className="text-sm text-neutral-600">Get notified when someone likes your posts</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.postLikes}
                        onCheckedChange={(checked) => updateNotificationSetting('postLikes', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Comments</p>
                        <p className="text-sm text-neutral-600">Get notified when someone comments on your posts</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.comments}
                        onCheckedChange={(checked) => updateNotificationSetting('comments', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-neutral-600">Receive notifications via email</p>
                      </div>
                      <Switch 
                        checked={notificationSettings.emailNotifications}
                        onCheckedChange={(checked) => updateNotificationSetting('emailNotifications', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Appearance Settings */}
            <TabsContent value="appearance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Appearance Settings</CardTitle>
                  <CardDescription>
                    Customize how the app looks and feels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Theme</Label>
                      <Select 
                        value={appearanceSettings.theme} 
                        onValueChange={(value) => updateAppearanceSetting('theme', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light Mode</SelectItem>
                          <SelectItem value="dark">Dark Mode</SelectItem>
                          <SelectItem value="system">System Default</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select 
                        value={appearanceSettings.language} 
                        onValueChange={(value) => updateAppearanceSetting('language', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Spanish</SelectItem>
                          <SelectItem value="fr">French</SelectItem>
                          <SelectItem value="de">German</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Compact Mode</p>
                        <p className="text-sm text-neutral-600">Show more content with smaller spacing</p>
                      </div>
                      <Switch 
                        checked={appearanceSettings.compactMode}
                        onCheckedChange={(checked) => updateAppearanceSetting('compactMode', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">Auto-play Videos</p>
                        <p className="text-sm text-neutral-600">Automatically play videos in feed</p>
                      </div>
                      <Switch 
                        checked={appearanceSettings.autoplayVideos}
                        onCheckedChange={(checked) => updateAppearanceSetting('autoplayVideos', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible and destructive actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                  <div>
                    <p className="font-medium text-red-600">Delete Account</p>
                    <p className="text-sm text-neutral-600">Permanently delete your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}