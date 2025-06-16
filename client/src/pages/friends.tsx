import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import FriendsTab from "@/components/friends-tab";
import FriendsWidget from "@/components/friends-widget";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";

export default function Friends() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();

  // Get user's active profile
  const { data: activeProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  if (profileLoading) {
    return (
      <div className="min-h-screen flex bg-neutral-50">
        <Sidebar />
        <div className="flex-1 lg:ml-0 pt-16 lg:pt-0">
          <div className="max-w-4xl mx-auto p-6">
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
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
          <h1 className="text-lg font-bold text-neutral-900">Resonant</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 p-4 pt-16 lg:pt-6 transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'}`}>
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Friends</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your network and connections</p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* Sidebar - Friend Requests & Quick Actions */}
            <div className="xl:col-span-1 space-y-6">
              {activeProfile && (
                <FriendsWidget profileId={activeProfile.id} />
              )}
              
              {/* Quick Stats Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-4">Network Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Total Friends</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Artists</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Venues</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">0</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700 dark:text-blue-300">Audience</span>
                    <span className="font-medium text-blue-900 dark:text-blue-100">0</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main Content - Friends List */}
            <div className="xl:col-span-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-neutral-200 dark:border-gray-700 overflow-hidden">
                {activeProfile && (
                  <FriendsTab profile={activeProfile} isOwn={true} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}