import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Bell, Check, Trash2, Heart, UserMinus, ExternalLink, Reply, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [acceptingRequest, setAcceptingRequest] = useState<number | null>(null);
  const [decliningRequest, setDecliningRequest] = useState<number | null>(null);
  const [acceptingBooking, setAcceptingBooking] = useState<number | null>(null);
  const [decliningBooking, setDecliningBooking] = useState<number | null>(null);

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
    onSuccess: (data, notificationId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });

      // Find the deleted notification to check if it was a friend request
      const deletedNotification = notifications?.find(n => n.id === notificationId);
      if (deletedNotification?.type === 'friend_request') {
        // Invalidate all friendship-related queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ['/api/friend-requests'] });
        queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
        // Invalidate friendship status queries for all profiles
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            return query.queryKey[0] === '/api/friendship-status';
          }
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete notification",
        variant: "destructive",
      });
    },
  });

  // Accept friend request mutation
  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (friendshipId: number) => {
      return await apiRequest("POST", `/api/friend-requests/${friendshipId}/accept`);
    },
    onSuccess: (data, friendshipId) => {
      // Find and remove the accepted notification from local state immediately
      queryClient.setQueryData(["/api/notifications"], (oldData: any[]) => {
        if (!oldData) return oldData;
        return oldData.filter(notification => {
          const notificationData = notification.data as any;
          return !(notification.type === 'friend_request' && notificationData?.friendshipId === friendshipId);
        });
      });

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });

      // Invalidate friendship status queries for all profiles
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] === '/api/friendship-status';
        }
      });

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
    mutationFn: async (friendshipId: number) => {
      return await apiRequest("POST", `/api/friend-requests/${friendshipId}/reject`);
    },
    onSuccess: (data, friendshipId) => {
      // Find and remove the rejected notification from local state immediately
      queryClient.setQueryData(["/api/notifications"], (oldData: any[]) => {
        if (!oldData) return oldData;
        return oldData.filter(notification => {
          const notificationData = notification.data as any;
          return !(notification.type === 'friend_request' && notificationData?.friendshipId === friendshipId);
        });
      });

      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });

      // Invalidate friendship status queries for all profiles
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          return query.queryKey[0] === '/api/friendship-status';
        }
      });

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

  // Reply to photo comment mutation
  const replyToCommentMutation = useMutation({
    mutationFn: async ({ photoId, content }: { photoId: number; content: string }) => {
      return await apiRequest("POST", `/api/photos/${photoId}/comments`, { content });
    },
    onSuccess: () => {
      setReplyingTo(null);
      setReplyText("");
      toast({
        title: "Reply sent",
        description: "Your reply has been added to the photo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reply",
        variant: "destructive",
      });
    },
  });

  // Accept booking request mutation
  const acceptBookingRequestMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return await apiRequest("POST", `/api/bookings/${bookingId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
      toast({
        title: "Booking Request Accepted",
        description: "You have accepted the booking request",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to accept booking request",
        variant: "destructive",
      });
    },
  });

  // Decline booking request mutation
  const declineBookingRequestMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      return await apiRequest("POST", `/api/bookings/${bookingId}/decline`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
      toast({
        title: "Booking Request Declined",
        description: "You have declined the booking request",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to decline booking request",
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

  const handleAcceptFriendRequest = (friendshipId: number) => {
    acceptFriendRequestMutation.mutate(friendshipId);
  };

  const handleRejectFriendRequest = (friendshipId: number) => {
    rejectFriendRequestMutation.mutate(friendshipId);
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read when clicked if not already read
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
  };

  const handleReplyToComment = (photoId: number) => {
    if (replyText.trim()) {
      replyToCommentMutation.mutate({ photoId, content: replyText.trim() });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, photoId: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleReplyToComment(photoId);
    }
  };

  const handleDeclineFriendRequest = async (friendshipId: number) => {
    if (!friendshipId) return;

    setDecliningRequest(friendshipId);
    try {
      await apiRequest("POST", `/api/friend-requests/${friendshipId}/reject`);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friend-requests"] });
      toast({
        title: "Friend Request Declined",
        description: "The friend request has been declined.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to decline friend request",
        variant: "destructive",
      });
    } finally {
      setDecliningRequest(null);
    }
  };

  const handleAcceptBookingRequest = async (bookingId: number) => {
    if (!bookingId) return;

    setAcceptingBooking(bookingId);
    try {
      const response = await apiRequest("PATCH", `/api/booking-requests/${bookingId}`, { status: 'accepted' });
      
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/booking-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
      toast({
        title: "Booking Request Accepted",
        description: "The booking request has been accepted.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept booking request",
        variant: "destructive",
      });
    } finally {
      setAcceptingBooking(null);
    }
  };

  const handleDeclineBookingRequest = async (bookingId: number) => {
    if (!bookingId) return;

    setDecliningBooking(bookingId);
    try {
      const response = await apiRequest("PATCH", `/api/booking-requests/${bookingId}`, { status: 'rejected' });
      
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/booking-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/counts-by-profile"] });
      toast({
        title: "Booking Request Declined",
        description: "The booking request has been declined.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to decline booking request",
        variant: "destructive",
      });
    } finally {
      setDecliningBooking(null);
    }
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
      className={`p-4 border rounded-lg transition-colors cursor-pointer ${
        notification.read 
          ? "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700" 
          : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
      }`}
      onClick={() => handleNotificationClick(notification)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {/* Determine the best profile image URL to use */}
          {(() => {
            const profileImageUrl = notification.data?.primaryImageUrl || 
                                  notification.data?.senderProfile?.profileImageUrl || 
                                  notification.sender?.profileImageUrl ||
                                  notification.data?.senderUser?.profileImageUrl;

            const fallbackInitials = notification.data?.senderProfile?.name?.[0] || 
                                   (notification.sender?.firstName?.[0] || notification.data?.senderUser?.firstName?.[0]) + 
                                   (notification.sender?.lastName?.[0] || notification.data?.senderUser?.lastName?.[0] || '');

            return profileImageUrl ? (
              <Avatar className="w-10 h-10">
                <AvatarImage src={profileImageUrl} />
                <AvatarFallback>
                  {fallbackInitials}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-lg">
                {getNotificationIcon(notification.type)}
              </div>
            );
          })()}
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

          {/* Photo comment specific content */}
          {notification.type === 'photo_comment' && notification.data && (
            <div className="mt-2">
              <div className="flex items-start space-x-2">
                {notification.data.photoUrl && (
                  <img
                    src={notification.data.photoUrl}
                    alt="Photo thumbnail"
                    className="w-12 h-12 rounded object-cover flex-shrink-0"
                  />
                )}
                {notification.data.commentContent && (
                  <div className="flex-grow min-w-0">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Comment:</p>
                    <p className="text-sm bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-800 dark:text-gray-200 break-words">
                      "{notification.data.commentContent}"
                    </p>
                  </div>
                )}
              </div>

              {/* Reply section */}
              <div className="mt-3">
                {replyingTo === notification.id ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-grow text-sm"
                      onKeyPress={(e) => handleKeyPress(e, notification.data.photoId)}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={() => handleReplyToComment(notification.data.photoId)}
                      disabled={!replyText.trim() || replyToCommentMutation.isPending}
                    >
                      <Send className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyingTo(notification.id);
                    }}
                    className="flex items-center"
                  >
                    <Reply className="w-3 h-3 mr-1" />
                    Reply
                  </Button>
                )}
              </div>
            </div>
          )}

          {notification.type === 'friend_request' && (
                <div className="flex space-x-2 mt-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcceptFriendRequest(notification.data?.friendshipId);
                    }}
                    disabled={acceptingRequest === notification.data?.friendshipId}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {acceptingRequest === notification.data?.friendshipId ? "..." : "Accept"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeclineFriendRequest(notification.data?.friendshipId);
                    }}
                    disabled={decliningRequest === notification.data?.friendshipId}
                    className="text-white border-white hover:bg-white hover:text-black"
                  >
                    {decliningRequest === notification.data?.friendshipId ? "..." : "Decline"}
                  </Button>
                </div>
              )}

              {notification.type === 'booking_request' && (
                <div className="flex space-x-2 mt-2">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // For booking_request notifications, the booking ID should be in the notification ID itself
                      // or we need to derive it from the notification data
                      const bookingId = notification.data?.bookingRequestId || 
                                      notification.data?.bookingId || 
                                      notification.data?.id ||
                                      notification.data?.requestId ||
                                      notification.data?.booking_id ||
                                      notification.data?.booking_request_id ||
                                      notification.id; // Use notification ID as fallback
                      
                      console.log('Accept booking - Full notification:', notification);
                      console.log('Accept booking - Notification data:', notification.data);
                      console.log('Accept booking - Extracted booking ID:', bookingId);
                      console.log('Accept booking - Available keys:', notification.data ? Object.keys(notification.data) : 'No data');
                      
                      if (bookingId) {
                        handleAcceptBookingRequest(bookingId);
                      } else {
                        toast({
                          title: "Error",
                          description: "Could not find booking request ID. Available data: " + (notification.data ? Object.keys(notification.data).join(', ') : 'None'),
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={acceptingBooking === (notification.data?.bookingRequestId || notification.data?.bookingId || notification.data?.id || notification.data?.requestId || notification.id)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {acceptingBooking === (notification.data?.bookingRequestId || notification.data?.bookingId || notification.data?.id || notification.data?.requestId || notification.id) ? "..." : "Accept"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      // For booking_request notifications, the booking ID should be in the notification ID itself
                      // or we need to derive it from the notification data
                      const bookingId = notification.data?.bookingRequestId || 
                                      notification.data?.bookingId || 
                                      notification.data?.id ||
                                      notification.data?.requestId ||
                                      notification.data?.booking_id ||
                                      notification.data?.booking_request_id ||
                                      notification.id; // Use notification ID as fallback
                      
                      console.log('Decline booking - Full notification:', notification);
                      console.log('Decline booking - Notification data:', notification.data);
                      console.log('Decline booking - Extracted booking ID:', bookingId);
                      console.log('Decline booking - Available keys:', notification.data ? Object.keys(notification.data) : 'No data');
                      
                      if (bookingId) {
                        handleDeclineBookingRequest(bookingId);
                      } else {
                        toast({
                          title: "Error",
                          description: "Could not find booking request ID. Available data: " + (notification.data ? Object.keys(notification.data).join(', ') : 'None'),
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={decliningBooking === (notification.data?.bookingRequestId || notification.data?.bookingId || notification.data?.id || notification.data?.requestId || notification.id)}
                    className="text-white border-white hover:bg-white hover:text-black"
                  >
                    {decliningBooking === (notification.data?.bookingRequestId || notification.data?.bookingId || notification.data?.id || notification.data?.requestId || notification.id) ? "..." : "Decline"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to artist profile - try multiple possible field names
                      const profileId = notification.data?.artistProfileId || 
                                      notification.data?.senderProfileId || 
                                      notification.data?.artistId ||
                                      notification.data?.fromProfileId ||
                                      notification.data?.senderProfile?.id;
                      console.log('View artist profile - Notification data:', notification.data);
                      console.log('View artist profile - Extracted profile ID:', profileId);
                      if (profileId) {
                        window.location.href = `/profile/${profileId}`;
                      } else {
                        // If no profile ID found, try to get it from the sender
                        if (notification.sender?.id) {
                          handleViewProfile(notification.sender.id);
                        } else {
                          toast({
                            title: "Error",
                            description: "Could not find artist profile ID",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                    className="text-blue-400 border-blue-400 hover:bg-blue-400 hover:text-white"
                  >
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewProfile(notification.sender.id);
                }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                  disabled={markAsReadMutation.isPending}
                >
                  <Check className="w-3 h-3" />
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(notification.id);
                }}
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