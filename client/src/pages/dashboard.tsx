import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, Music, Building, BarChart3, Settings, Plus, Check, User, Image } from "lucide-react";
import ProfileManagement from "@/components/profile-management";
import BookingCalendar from "@/components/booking-calendar";
import { useSidebar } from "@/hooks/useSidebar";
import BookingManagement from "@/components/booking-management";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { isCollapsed } = useSidebar();

  const { data: activeProfile, isLoading } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  });

  // Redirect non-artist/venue profiles to home
  if (!isLoading && activeProfile && activeProfile.type === "audience") {
    setLocation("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex">
        <div className="w-80 bg-white dark:bg-gray-900 shadow-lg border-r border-neutral-200 dark:border-gray-700 hidden lg:block">
          <Skeleton className="h-full" />
        </div>
        <div className="flex-1">
          <Skeleton className="h-full" />
        </div>
      </div>
    );
  }

  if (!activeProfile || activeProfile.type === "audience") {
    return null;
  }

  const isArtist = activeProfile.type === "artist";
  const isVenue = activeProfile.type === "venue";

  // Check completion status for getting started tasks
  const hasProfileInfo = activeProfile.bio && activeProfile.bio.trim().length > 0;
  const hasCoverPhoto = activeProfile.coverImageUrl && activeProfile.coverImageUrl.trim().length > 0;
  
  // Get posts for this profile to check if they have created any
  const { data: posts } = useQuery({
    queryKey: [`/api/profiles/${activeProfile.id}/posts`],
    enabled: !!activeProfile.id,
  });
  const hasCreatedPost = posts && posts.length > 0;

  const completedTasks = [
    hasProfileInfo,
    hasCoverPhoto,
    hasCreatedPost,
    // Additional tasks can be added here
  ].filter(Boolean).length;

  const totalTasks = 3;
  const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      <div className={`flex-1 p-6 transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {isArtist ? "Artist Dashboard" : "Venue Dashboard"}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Welcome back, {activeProfile.name}
                </p>
              </div>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/settings")}
                  className="flex items-center space-x-2"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Button>
                <Button
                  onClick={() => setLocation("/post")}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 !text-white"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Post</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Getting Started Section */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Getting Started</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {completedTasks}/{totalTasks} completed
                    </div>
                    <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-gray-600 dark:text-gray-400 mb-4">
                  <p>
                    {isArtist 
                      ? "Welcome to your artist dashboard! Complete these steps to get the most out of your profile."
                      : "Welcome to your venue dashboard! Complete these steps to attract artists and audiences."
                    }
                  </p>
                </div>
                <div className="space-y-3">
                  {/* Complete Profile Information */}
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      hasProfileInfo 
                        ? 'bg-green-100 dark:bg-green-900' 
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {hasProfileInfo ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <User className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${hasProfileInfo ? 'line-through text-gray-500' : ''}`}>
                        Complete your profile information
                      </p>
                      {!hasProfileInfo && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Add a bio to tell people about yourself
                        </p>
                      )}
                    </div>
                    {!hasProfileInfo && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/profile/${activeProfile.id}`)}
                      >
                        Complete
                      </Button>
                    )}
                  </div>

                  {/* Upload Cover Photo */}
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      hasCoverPhoto 
                        ? 'bg-green-100 dark:bg-green-900' 
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {hasCoverPhoto ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Image className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${hasCoverPhoto ? 'line-through text-gray-500' : ''}`}>
                        Upload a cover photo
                      </p>
                      {!hasCoverPhoto && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Make your profile stand out with a cover image
                        </p>
                      )}
                    </div>
                    {!hasCoverPhoto && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/profile/${activeProfile.id}`)}
                      >
                        Upload
                      </Button>
                    )}
                  </div>

                  {/* Create First Post */}
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                      hasCreatedPost 
                        ? 'bg-green-100 dark:bg-green-900' 
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      {hasCreatedPost ? (
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <Plus className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${hasCreatedPost ? 'line-through text-gray-500' : ''}`}>
                        Create your first post
                      </p>
                      {!hasCreatedPost && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Share something with your audience
                        </p>
                      )}
                    </div>
                    {!hasCreatedPost && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation("/post")}
                      >
                        Create
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isArtist ? "Followers" : "Bookings"}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No data yet
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isArtist ? "Tracks" : "Events"}
                </CardTitle>
                {isArtist ? (
                  <Music className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No data yet
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Views</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No data yet
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {isArtist ? "Plays" : "Capacity"}
                </CardTitle>
                {isArtist ? (
                  <Music className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Building className="h-4 w-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  No data yet
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-responsive-1-2 gap-responsive">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No recent activity</p>
                    <p className="text-sm">Start creating content to see your activity here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation("/post")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create a new post
                  </Button>
                  
                  {isArtist && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setLocation("/upload-music")}
                      >
                        <Music className="w-4 h-4 mr-2" />
                        Upload music
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setLocation("/events")}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule event
                      </Button>
                    </>
                  )}
                  
                  {isVenue && (
                    <>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setLocation("/events")}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Create event
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setLocation("/bookings")}
                      >
                        <Building className="w-4 h-4 mr-2" />
                        Manage bookings
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setLocation(`/profile/${activeProfile.id}`)}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View public profile
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Management Section */}
          <div className="mt-8">
            <BookingManagement profileType={activeProfile.type as 'artist' | 'venue'} />
          </div>

          {/* Booking Calendar Section */}
          <div className="mt-8">
            <BookingCalendar profileType={activeProfile.type as 'artist' | 'venue'} />
          </div>

          {/* Members Management Section */}
          <div className="mt-8">
            <ProfileManagement 
              profileId={activeProfile.id}
              profileType={activeProfile.type}
              isOwner={true}
              canManageMembers={true}
            />
          </div>

        </div>
      </div>
    </div>
  );
}