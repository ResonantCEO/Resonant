import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import ProfileHeader from "@/components/profile-header";
import PostFeed from "@/components/post-feed";
import FriendsWidget from "@/components/friends-widget";
import CreateProfileModal from "@/components/create-profile-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, Music, Building, Users } from "lucide-react";

export default function Home() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: activeProfile, isLoading: profileLoading } = useQuery({
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

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to SocialConnect!</h2>
            <p className="text-gray-600 mb-6">Create your first profile to start connecting with your community.</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Audience Member</h3>
                <p className="text-gray-600 text-sm">Discover music and connect with friends</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Artist Profile</h3>
                <p className="text-gray-600 text-sm">Showcase your music and connect with fans</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                <Building className="w-6 h-6 text-white" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-gray-900">Venue Profile</h3>
                <p className="text-gray-600 text-sm">Promote events and connect with artists</p>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Profile
          </Button>

          <CreateProfileModal 
            open={showCreateModal} 
            onOpenChange={setShowCreateModal} 
          />
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
