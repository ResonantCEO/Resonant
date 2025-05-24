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
  });

  const { data: friendRequests = [] } = useQuery({
    queryKey: ["/api/friend-requests"],
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
    <div className="space-y-6">
      {/* Friends Widget */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Friends</CardTitle>
            <Button variant="link" size="sm" className="text-blue-500 p-0">
              See all
            </Button>
          </div>
        </CardHeader>
        <CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Friend Requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {friendRequests.map((request: any) => (
              <div key={request.friendship.id} className="flex items-center space-x-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={request.profile.profileImageUrl || ""} />
                  <AvatarFallback>
                    {request.profile.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-neutral-900">{request.profile.name}</p>
                  <p className="text-sm text-neutral-600">Wants to be friends</p>
                  <div className="flex space-x-2 mt-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request.friendship.id)}
                      disabled={acceptFriendRequestMutation.isPending}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRejectRequest(request.friendship.id)}
                      disabled={rejectFriendRequestMutation.isPending}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
