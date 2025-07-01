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
      {/* Friend Requests (only show if user has pending requests) */}
      {friendRequests.length > 0 && (
        <Card className="border border-neutral-200 dark:border-neutral-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-600 dark:text-blue-400">
              Friend Requests ({friendRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {friendRequests.map((request: any) => (
            <div key={request.id || request.friendship?.id} className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Avatar className="w-12 h-12">
                <AvatarImage src={request.profileImageUrl || ""} />
                <AvatarFallback>
                  {(request.profile?.name || request.name || "U")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                  {request.name || "Unknown User"}
                </h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Wants to connect with you
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white font-medium"
                  onClick={() => handleAcceptRequest(request.friendship?.id)}
                  disabled={isAccepting || !request.friendship?.id}
                >
                  {isAccepting ? "..." : "Accept"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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