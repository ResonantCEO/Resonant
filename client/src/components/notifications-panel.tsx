
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  UserPlus, 
  Heart, 
  MessageCircle, 
  Users,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
  sender?: {
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "friend_request":
    case "friend_accepted":
      return UserPlus;
    case "post_like":
      return Heart;
    case "post_comment":
      return MessageCircle;
    case "profile_invite":
      return Users;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "friend_request":
    case "friend_accepted":
      return "text-blue-500";
    case "post_like":
      return "text-red-500";
    case "post_comment":
      return "text-green-500";
    case "profile_invite":
      return "text-purple-500";
    default:
      return "text-gray-500";
  }
};

interface NotificationsPanelProps {
  showAsCard?: boolean;
}

export default function NotificationsPanel({ showAsCard = true }: NotificationsPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notifications/mark-all-read', "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    },
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleDelete = (notificationId: number) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const displayedNotifications = showAll ? notifications : notifications.slice(0, 5);

  const loadingContent = (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    if (showAsCard) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingContent}
          </CardContent>
        </Card>
      );
    }
    return loadingContent;
  }

  const headerContent = (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        {showAsCard && <Bell className="h-5 w-5" />}
        {showAsCard && (
          <h2 className="text-xl font-semibold">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </h2>
        )}
        {!showAsCard && unreadCount > 0 && (
          <Badge variant="destructive" className="ml-2">
            {unreadCount} unread
          </Badge>
        )}
      </div>
      {unreadCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => markAllAsReadMutation.mutate()}
          disabled={markAllAsReadMutation.isPending}
        >
          <CheckCheck className="h-4 w-4" />
          {!showAsCard && <span className="ml-2">Mark all read</span>}
        </Button>
      )}
    </div>
  );

  const mainContent = (
        <>
      {notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          <ScrollArea className={showAsCard ? "h-96" : "h-[calc(100vh-300px)]"}>
            {displayedNotifications.map((notification: Notification) => {
                const Icon = getNotificationIcon(notification.type);
                const iconColor = getNotificationColor(notification.type);
                
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors ${
                      notification.read 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {notification.sender ? (
                        <Avatar className="h-10 w-10">
                          <AvatarImage 
                            src={notification.sender.profileImageUrl} 
                            alt={`${notification.sender.firstName} ${notification.sender.lastName}`} 
                          />
                          <AvatarFallback>
                            {notification.sender.firstName[0]}{notification.sender.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className={`w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center ${iconColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm ${notification.read ? 'text-gray-500' : 'text-gray-600'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={markAsReadMutation.isPending}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(notification.id)}
                            disabled={deleteNotificationMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
          </ScrollArea>
          
          {notifications.length > 5 && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `Show All (${notifications.length})`}
            </Button>
          )}
        </div>
      )}
    </>
  );

  if (showAsCard) {
    return (
      <Card>
        <CardHeader>
          {headerContent}
        </CardHeader>
        <CardContent>
          {mainContent}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-md p-6">
      {headerContent}
      {mainContent}
    </div>
  );
}
