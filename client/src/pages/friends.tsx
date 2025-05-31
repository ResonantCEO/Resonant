import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import FriendsWidget from "@/components/friends-widget";
import FriendsTab from "@/components/friends-tab";
import { useAuth } from "@/hooks/useAuth";

export default function Friends() {
  const { user } = useAuth();

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
      <div className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Friends Widget */}
            <div className="lg:col-span-1">
              <div className="sticky top-6">
                <FriendsWidget profileId={activeProfile?.id} />
              </div>
            </div>

            {/* Main Content - Full Friends Management */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
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