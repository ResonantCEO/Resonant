import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import ProfileHeader from "@/components/profile-header";
import PostFeed from "@/components/post-feed";
import FriendsWidget from "@/components/friends-widget";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("posts");

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  // If no ID is provided, use the active profile ID
  const profileId = id ? parseInt(id) : activeProfile?.id;

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/profiles/${profileId}`],
    enabled: !!profileId, // Only run query when we have a profile ID
  });

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

  return (
    <div className="min-h-screen flex bg-neutral-50">
      <Sidebar />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-40">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-neutral-900">Resonant</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        <div className="max-w-4xl mx-auto p-6">
          <ProfileHeader 
            profile={profile} 
            isOwn={isOwn}
            canManageMembers={canManageMembers}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />

          {/* Tab Content */}
          {activeTab === "posts" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Bio and Friends Widget */}
              <div className="lg:col-span-1 space-y-6">
                {/* Bio Section */}
                {profile.bio && (
                  <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
                    <h3 className="text-lg font-semibold text-neutral-900 mb-3">About</h3>
                    <p className="text-neutral-700 leading-relaxed">{profile.bio}</p>
                  </div>
                )}

                {/* Friends Widget */}
                <FriendsWidget profileId={profileId} />
              </div>

              {/* Right Column - Posts Feed */}
              <div className="lg:col-span-2">
                <PostFeed profileId={profileId} />
              </div>
            </div>
          )}

          {/* About Tab */}
          {activeTab === "about" && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 mb-4">About {profile.name}</h3>
              {profile.bio ? (
                <p className="text-neutral-700 leading-relaxed">{profile.bio}</p>
              ) : (
                <p className="text-neutral-500 italic">No bio available.</p>
              )}
              {profile.location && (
                <div className="mt-4">
                  <h4 className="font-medium text-neutral-900 mb-2">Location</h4>
                  <p className="text-neutral-700">{profile.location}</p>
                </div>
              )}
            </div>
          )}

          {/* Friends Tab */}
          {activeTab === "friends" && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <div className="text-center text-gray-500">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Friends</h3>
                <p>Friends functionality coming soon...</p>
              </div>
            </div>
          )}

          {/* Photos Tab */}
          {activeTab === "photos" && (
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              <div className="text-center text-gray-500">
                <h3 className="text-lg font-semibold text-neutral-900 mb-4">Photos</h3>
                <p>Photo gallery coming soon...</p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}