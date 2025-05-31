import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, Music, Building, BarChart3, Settings, Plus } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();

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

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <div className="w-80 bg-white dark:bg-gray-900 shadow-lg border-r border-neutral-200 dark:border-gray-700 hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex-1 p-6">
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
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Post</span>
                </Button>
              </div>
            </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          {/* Additional Info */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-600 dark:text-gray-400">
                  <p className="mb-4">
                    {isArtist 
                      ? "Welcome to your artist dashboard! Here you can manage your music, connect with fans, and track your performance."
                      : "Welcome to your venue dashboard! Here you can manage events, bookings, and connect with artists and audiences."
                    }
                  </p>
                  <div className="space-y-2">
                    <p className="font-medium">Next steps:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Complete your profile information</li>
                      <li>Upload a cover photo</li>
                      <li>Create your first post</li>
                      {isArtist && <li>Upload your music</li>}
                      {isVenue && <li>Set up your venue information</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}