import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/sidebar";
import FriendsTab from "@/components/friends-tab";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Friend Requests Section Component
function FriendRequestsSection({ profileId }: { profileId: number }) {
  const { toast } = useToast();

  const { data: friendRequests = [] } = useQuery({
    queryKey: [`/api/profiles/${profileId}/friend-requests`],
    enabled: !!profileId,
  });

  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (friendshipId: number) => {
      return await apiRequest("POST", `/api/friendships/${friendshipId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/friends`] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/friend-requests`] });
      toast({
        title: "Friend Request Accepted",
        description: "You are now friends!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept friend request",
        variant: "destructive",
      });
    },
  });

  const rejectFriendRequestMutation = useMutation({
    mutationFn: async (friendshipId: number) => {
      return await apiRequest("POST", `/api/friendships/${friendshipId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/friend-requests`] });
      toast({
        title: "Friend Request Rejected",
        description: "The friend request has been declined.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject friend request",
        variant: "destructive",
      });
    },
  });

  const handleAcceptRequest = (friendshipId: number) => {
    acceptFriendRequestMutation.mutate(friendshipId);
  };

  const handleRejectRequest = (friendshipId: number) => {
    rejectFriendRequestMutation.mutate(friendshipId);
  };

  return (
    <div className="space-y-6">
      {/* Friend Requests */}
      <Card className="bg-white dark:bg-gray-900 border border-neutral-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-lg text-white">Friend Requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {friendRequests.length === 0 ? (
            <p className="text-center text-neutral-400 py-4">No pending requests.</p>
          ) : (
            friendRequests.map((request: any) => (
              <div key={request.friendship?.id} className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={request.profile?.profileImageUrl || ""} />
                  <AvatarFallback className="text-black">
                    {(request.profile?.name || "U")[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h4 className="font-medium text-white">{request.profile?.name || "Unknown User"}</h4>
                  <p className="text-sm text-neutral-400">Friend request</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleAcceptRequest(request.friendship?.id)}
                    disabled={acceptFriendRequestMutation.isPending || !request.friendship?.id}
                  >
                    {acceptFriendRequestMutation.isPending ? "..." : "Accept"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-white border-white hover:bg-white hover:text-black"
                    onClick={() => handleRejectRequest(request.friendship?.id)}
                    disabled={rejectFriendRequestMutation.isPending || !request.friendship?.id}
                  >
                    {rejectFriendRequestMutation.isPending ? "..." : "Decline"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
      <div className={`flex-1 p-6 pt-16 lg:pt-6 transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar - Friend Requests */}
            <div className="lg:col-span-1">
              {activeProfile && (
                <FriendRequestsSection profileId={activeProfile.id} />
              )}
            </div>
            
            {/* Main Content - Friends List */}
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