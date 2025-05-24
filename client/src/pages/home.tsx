import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/sidebar";
import ProfileHeader from "@/components/profile-header";
import PostFeed from "@/components/post-feed";
import FriendsWidget from "@/components/friends-widget";
import CreateProfileModal from "@/components/create-profile-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Music, Building, Users } from "lucide-react";

export default function Home() {
  const { data: user } = useQuery({ queryKey: ["/api/user"] });
  const { data: activeProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  // Auto-create audience profile if user doesn't have one
  const createDefaultProfile = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/profiles", {
        type: "audience", 
        name: (user as any)?.username || "My Profile",
        bio: "",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/active"] });
    },
  });

  // Automatically create profile if user doesn't have one
  useEffect(() => {
    if (!profileLoading && !activeProfile && user && !createDefaultProfile.isPending) {
      createDefaultProfile.mutate();
    }
  }, [activeProfile, profileLoading, user, createDefaultProfile]);

  if (profileLoading || createDefaultProfile.isPending) {
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

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Setting up your profile...</h2>
          <Skeleton className="w-48 h-4 mx-auto" />
        </div>
      </div>
    );
  }

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
          <ProfileHeader profile={activeProfile} isOwn={true} />
          
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Friends Widget */}
            <div className="lg:col-span-1">
              <FriendsWidget />
            </div>

            {/* Right Column - Posts Feed */}
            <div className="lg:col-span-2">
              <PostFeed />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
