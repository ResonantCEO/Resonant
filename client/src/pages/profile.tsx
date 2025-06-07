import { useState } from "react";
import * as React from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/hooks/useSidebar";
import ProfileHeader from "@/components/profile-header";
import PostFeed from "@/components/post-feed";
import FriendsWidget from "@/components/friends-widget";
import EPKTab from "@/components/epk-tab";
import FriendsTab from "@/components/friends-tab";
import StatsTab from "@/components/stats-tab";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { id } = useParams<{ id: string }>();

  // Set default tab based on profile type
  const getDefaultTab = (profileType: string) => {
    if (profileType === "artist") {
      return "epk"; // First tab for artist profiles
    }
    return "posts"; // First tab for non-artist profiles
  };

  const [activeTab, setActiveTab] = useState("posts");
  const { isCollapsed } = useSidebar();

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
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

  // Update active tab when profile changes
  React.useEffect(() => {
    if (profile) {
      setActiveTab(getDefaultTab(profile.type));
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h2>
          <p className="text-gray-600">The profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const isOwn = activeProfile?.id === profile.id;
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
    <div className="min-h-screen">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-40">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-neutral-900">Resonant</h1>
        </div>
      </div>

      {/* Main Content */}
      <div 
        className={`flex-1 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pt-16 lg:pt-0 min-h-screen relative ${getPageBackground(profile?.profileBackground || 'default', profile?.backgroundImageUrl)}`}
        style={profile?.profileBackground === 'custom-photo' ? getBackgroundImageStyle(profile?.backgroundImageUrl) : {}}
      >
        {/* Fixed Background Image */}
        {profile?.profileBackground === 'custom-photo' && profile?.backgroundImageUrl && (
          <div 
            className={`fixed top-0 bottom-0 left-0 right-0 pointer-events-none z-0 ${
              isCollapsed ? 'lg:left-16' : 'lg:left-80'
            }`}
            style={{
              backgroundImage: `url(${profile.backgroundImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundAttachment: 'fixed',
              minHeight: '100vh',
              width: '100vw',
              height: '100vh',
              left: 0,
              top: 0
            }}
          />
        )}
        <div className="container-responsive mx-auto px-responsive py-responsive">
          <ProfileHeader 
            profile={profile} 
            isOwn={isOwn}
            canManageMembers={canManageMembers}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Tab Content */}
          {/* Posts Tab - only for non-artist profiles */}
          {activeTab === "posts" && profile.type !== "artist" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Bio and Friends Widget */}
              <div className="lg:col-span-1 space-y-6">
                {/* Bio Section */}
                {profile.bio && (
                  <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">About</h3>
                    <p className="text-neutral-700 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
                  </div>
                )}

                {/* Friends Widget */}
                <FriendsWidget profileId={profileId} />
              </div>

              {/* Right Column - Posts Feed */}
              <div className="lg:col-span-2">
                <PostFeed profileId={profileId} showCreatePost={isOwn} />
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">About</h3>
                <p>About functionality coming soon...</p>
              </div>
            </div>
          )}

          {/* Friends Tab - only for non-artist profiles */}
          {activeTab === "friends" && profile.type !== "artist" && (
            <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
              <FriendsTab profile={profile} isOwn={isOwn} />
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === "photos" && (
            <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Photos</h3>
                <p>Photo gallery coming soon...</p>
              </div>
            </div>
          )}

          {/* EPK Tab - only for artist profiles */}
          {activeTab === "epk" && profile.type === "artist" && (
            <div className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-xl shadow-lg border border-white/20 dark:border-gray-700/30 p-6">
              <EPKTab profile={profile} isOwn={isOwn} />
            </div>
          )}

          {/* Community Tab - only for artist profiles */}
          {activeTab === "community" && profile.type === "artist" && (
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
                          <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {activeTab === "stats" && profile.type === "artist" && (
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