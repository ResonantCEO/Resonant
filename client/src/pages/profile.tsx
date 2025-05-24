import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import ProfileHeader from "@/components/profile-header";
import PostFeed from "@/components/post-feed";
import FriendsWidget from "@/components/friends-widget";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const profileId = parseInt(id || "0");

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: [`/api/profiles/${profileId}`],
  });

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
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

  return (
    <div className="min-h-screen flex bg-neutral-50">
      <Sidebar />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-40">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-neutral-900">SocialConnect</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        <div className="max-w-4xl mx-auto p-6">
          <ProfileHeader profile={profile} isOwn={isOwn} />
          
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Friends Widget */}
            <div className="lg:col-span-1">
              <FriendsWidget profileId={profileId} />
            </div>

            {/* Right Column - Posts Feed */}
            <div className="lg:col-span-2">
              <PostFeed profileId={profileId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
