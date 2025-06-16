import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface FriendsWidgetProps {
  profileId?: number;
}

export default function FriendsWidget({ profileId }: FriendsWidgetProps) {
  const { toast } = useToast();

  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: profileId ? [`/api/profiles/${profileId}/friends`] : ["/api/friends"],
    select: (data) => {
      // Extract friend data from the API response structure
      if (!data || !Array.isArray(data)) return [];
      return data.map((item: any) => {
        if (item.friend) {
          return item.friend;
        }
        return item;
      });
    }
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: true,
  });

  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (friendshipId: number) => {
      return await apiRequest("POST", `/api/friend-requests/${friendshipId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
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
      return await apiRequest("POST", `/api/friend-requests/${friendshipId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
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

  const isAccepting = acceptFriendRequestMutation.isPending;
  const isRejecting = rejectFriendRequestMutation.isPending;

  const handleAcceptRequest = (friendshipId: number) => {
    acceptFriendRequestMutation.mutate(friendshipId);
  };

  const handleRejectRequest = (friendshipId: number) => {
    rejectFriendRequestMutation.mutate(friendshipId);
  };

  if (friendsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Friends Widget */}
      <Card className="bg-white dark:bg-gray-900 border border-neutral-200 dark:border-gray-700 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Friends</CardTitle>
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 p-0 h-auto font-medium">
              See all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {friends.length === 0 ? (
            <p className="text-center text-neutral-600 py-4">No friends yet.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                {friends.slice(0, 9).map((friend: any) => (
                  <div key={friend.id} className="text-center">
                    <Avatar className="w-full aspect-square mb-2">
                      <AvatarImage src={friend.profileImageUrl || ""} />
                      <AvatarFallback>{friend.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-medium text-neutral-900 truncate">
                      {friend.name}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-sm text-neutral-600 mt-4 text-center">
                {friends.length} friends
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Friend Requests (only show if user has pending requests) */}
      {friendRequests.length > 0 && (
        <Card className="bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold text-orange-700 dark:text-orange-300 flex items-center">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></div>
              Friend Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {friendRequests.map((request: any) => (
            <div key={request.id || request.friendship?.id} className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={request.profileImageUrl || ""} />
                <AvatarFallback>
                  {(request.profile?.name || request.name || "U")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-medium">{request.name || "Unknown User"}</h4>
                <p className="text-sm text-muted-foreground">Friend request</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => handleAcceptRequest(request.friendship?.id)}
                  disabled={isAccepting || !request.friendship?.id}
                >
                  {isAccepting ? "..." : "Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-white border-white hover:bg-white hover:text-black"
                  onClick={() => handleRejectRequest(request.friendship?.id)}
                  disabled={isRejecting || !request.friendship?.id}
                >
                  {isRejecting ? "..." : "Decline"}
                </Button>
              </div>
            </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}