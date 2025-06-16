import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Check, Trash2, Heart, UserMinus, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface NotificationsPanelProps {
  showAsCard?: boolean;
}

async function apiRequest(method: string, url: string, body?: any) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export default function NotificationsPanel({ showAsCard = true }: NotificationsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications with real-time polling
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: () => apiRequest("GET", "/api/notifications"),
    refetchInterval: 3000, // Poll every 3 seconds
    refetchIntervalInBackground: true,
    refetchOnMount: true, // Always fetch fresh data when component mounts
    refetchOnWindowFocus: true, // Refresh when window gains focus
    staleTime: 0, // Always consider data stale to ensure fresh fetches
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest("POST", `/api/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/notifications/mark-all-read");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest("DELETE", `/api/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    },
  });

  // Accept friend request mutation
  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (senderId: number) => {
      // First get the friend request
      const friendRequests = await apiRequest("GET", "/api/friend-requests");
      const request = friendRequests.find((req: any) => req.profile.userId === senderId);
      if (!request) throw new Error("Friend request not found");

      return await apiRequest("POST", `/api/friend-requests/${request.friendship.id}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
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

  // Reject friend request mutation
  const rejectFriendRequestMutation = useMutation({
    mutationFn: async (senderId: number) => {
      // First get the friend request
      const friendRequests = await apiRequest("GET", "/api/friend-requests");
      const request = friendRequests.find((req: any) => req.profile.userId === senderId);
      if (!request) throw new Error("Friend request not found");

      return await apiRequest("POST", `/api/friend-requests/${request.friendship.id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
      toast({
        title: "Friend Request Declined",
        description: "Friend request has been declined",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to decline friend request",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (notificationId: number) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleAcceptFriendRequest = (senderId: number) => {
    acceptFriendRequestMutation.mutate(senderId);
  };

  const handleRejectFriendRequest = (senderId: number) => {
    rejectFriendRequestMutation.mutate(senderId);
  };

  const handleViewProfile = async (senderId: number) => {
    try {
      // Get the sender's active profile
      const profile = await apiRequest("GET", `/api/users/${senderId}/profiles`);
      if (profile) {
        window.location.href = `/profile/${profile.id}`;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not find user profile",
        variant: "destructive",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "friend_request":
        return "👤";
      case "friend_accepted":
        return "✅";
      case "post_like":
        return "❤️";
      case "post_comment":
        return "💬";
      case "booking_request":
        return "📅";
      case "booking_response":
        return "🎵";
      case "profile_invite":
        return "📧";
      case "profile_deleted":
        return "🗑️";
      default:
        return "🔔";
    }
  };

  const NotificationItem = ({ notification }: { notification: any }) => (
    <div
      className={`p-4 border rounded-lg transition-colors ${
        notification.read 
          ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700" 
          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
      }`}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {notification.sender?.profileImageUrl ? (
            <Avatar className="w-10 h-10">
              <AvatarImage src={notification.sender.profileImageUrl} />
              <AvatarFallback>
                {notification.sender.firstName?.[0]}{notification.sender.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-lg">
              {getNotificationIcon(notification.type)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              {notification.title}
            </h4>
            {!notification.read && (
              <Badge variant="secondary" className="ml-2">
                New
              </Badge>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {notification.message}
          </p>

          {/* Friend Request Actions */}
          {notification.type === "friend_request" && notification.sender && (
            <div className="flex space-x-2 mt-3">
              <Button
                size="sm"
                onClick={() => handleAcceptFriendRequest(notification.sender.id)}
                disabled={acceptFriendRequestMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Heart className="w-3 h-3 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRejectFriendRequest(notification.sender.id)}
                disabled={rejectFriendRequestMutation.isPending}
              >
                <UserMinus className="w-3 h-3 mr-1" />
                Decline
              </Button>
            </div>
          )}

          {/* Booking Request Actions */}
          {notification.type === "booking_request" && notification.sender && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleViewProfile(notification.sender.id)}
                className="flex items-center"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Artist Profile
              </Button>
            </div>
          )}

          {/* Booking Response Actions */}
          {notification.type === "booking_response" && notification.sender && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleViewProfile(notification.sender.id)}
                className="flex items-center"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View Venue Profile
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>

            <div className="flex space-x-2">
              {!notification.read && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMarkAsRead(notification.id)}
                  disabled={markAsReadMutation.isPending}
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDelete(notification.id)}
                disabled={deleteNotificationMutation.isPending}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  const content = (
    <div className="space-y-4">
      {notifications.length > 0 && (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications ({notifications.filter((n: any) => !n.read).length} unread)
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending || notifications.every((n: any) => n.read)}
          >
            Mark all as read
          </Button>
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No notifications
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            You're all caught up! Check back later for new updates.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification: any) => (
            <NotificationItem key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );

  if (!showAsCard) {
    return content;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent>
        {content}
      </CardContent>
    </Card>
  );
}