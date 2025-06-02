import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import ProfileHeader from "@/components/profile-header";
import PostFeed from "@/components/post-feed";
import FriendsWidget from "@/components/friends-widget";
import EPKTab from "@/components/epk-tab";
import FriendsTab from "@/components/friends-tab";
import StatsTab from "@/components/stats-tab";
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

  const { data: user } = useQuery({
    queryKey: ["/api/user"],
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

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <div className="w-80 bg-white dark:bg-gray-900 shadow-lg border-r border-neutral-200 dark:border-gray-700 hidden lg:block">
        <Sidebar />
      </div>

      <div className={`flex-1 relative ${getPageBackground(profile?.profileBackground || 'default', profile?.backgroundImageUrl)}`}>
        {/* Background image overlay for custom photo */}
        {profile?.profileBackground === 'custom-photo' && profile?.backgroundImageUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${profile.backgroundImageUrl})` }}
          >
            <div className="absolute inset-0 bg-black/20 dark:bg-black/40"></div>
          </div>
        )}</div>
    </div>
  );
}