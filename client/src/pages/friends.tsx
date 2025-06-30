import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
    refetchOnMount: true,
    onSuccess: () => {
      // Refresh friend requests and notification counts when profile loads
      queryClient.invalidateQueries({ queryKey: [`/api/friend-requests`] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
    },
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

  console.log('Friends page - activeProfile:', activeProfile);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-900 dark:to-neutral-800">
      <Sidebar />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-40">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-neutral-900">Resonant</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 p-6 pt-16 lg:pt-6 transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto">
            {/* Main Content - Friends List */}
            <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
              {activeProfile && (
                <FriendsTab profile={activeProfile} isOwn={true} />
              )}
            </div>
          </div>
        </div>
      </div>
    
  );
}