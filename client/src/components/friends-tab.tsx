import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search, 
  Music, 
  Building,
  User,
  Heart,
  MessageCircle,
  Calendar
} from "lucide-react";

interface FriendsTabProps {
  profile: any;
  isOwn: boolean;
}

export default function FriendsTab({ profile, isOwn }: FriendsTabProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch friends data
  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: [`/api/profiles/${profile?.id}/friends`],
    enabled: !!profile?.id,
  });

  // Fetch friend requests (for own profiles)
  const { data: friendRequests, isLoading: requestsLoading } = useQuery({
    queryKey: [`/api/profiles/${profile?.id}/friend-requests`],
    enabled: !!profile?.id && isOwn,
  });

  // Fetch sent friend requests (for own profiles)
  const { data: sentRequests, isLoading: sentLoading } = useQuery({
    queryKey: [`/api/profiles/${profile?.id}/sent-requests`],
    enabled: !!profile?.id && isOwn,
  });

  // Send friend request mutation
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (targetProfileId: number) => {
      return await apiRequest("POST", `/api/profiles/${profile.id}/friend-requests`, {
        addresseeId: targetProfileId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/sent-requests`] });
      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
    },
  });

  // Accept friend request mutation
  const acceptFriendRequestMutation = useMutation({
    mutationFn: async (friendshipId: number) => {
      return await apiRequest("POST", `/api/friendships/${friendshipId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/friends`] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/friend-requests`] });
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
      return await apiRequest("POST", `/api/friendships/${friendshipId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/friend-requests`] });
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

  // Filter friends by type and search query
  const filterFriends = (friendsList: any[] | undefined, type?: string) => {
    if (!friendsList || !Array.isArray(friendsList)) return [];
    
    let filtered = friendsList;
    
    if (type && type !== "all") {
      filtered = filtered.filter(friend => friend.type === type);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(friend => 
        friend.name && friend.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  const getProfileTypeIcon = (type: string) => {
    switch (type) {
      case "artist":
        return <Music className="w-4 h-4" />;
      case "venue":
        return <Building className="w-4 h-4" />;
      case "audience":
        return <User className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getProfileTypeBadge = (type: string) => {
    const colors = {
      artist: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
      venue: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
      audience: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    };
    
    return (
      <Badge className={`${colors[type as keyof typeof colors]} text-xs`}>
        {getProfileTypeIcon(type)}
        <span className="ml-1 capitalize">{type}</span>
      </Badge>
    );
  };

  const friendsByType = {
    all: filterFriends(friends || []),
    audience: filterFriends(friends || [], "audience"),
    artist: filterFriends(friends || [], "artist"),
    venue: filterFriends(friends || [], "venue")
  };

  const FriendCard = ({ friend }: { friend: any }) => (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setLocation(`/profile/${friend.id}`)}>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={friend.profileImageUrl} alt={friend.name} />
            <AvatarFallback>{friend.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {friend.name}
              </p>
              {getProfileTypeBadge(friend.type)}
            </div>
            {friend.bio && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                {friend.bio}
              </p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
              {friend.mutualFriendsCount > 0 && (
                <span className="flex items-center">
                  <Users className="w-3 h-3 mr-1" />
                  {friend.mutualFriendsCount} mutual
                </span>
              )}
              {friend.lastActive && (
                <span className="flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  Active {friend.lastActive}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const FriendRequestCard = ({ request }: { request: any }) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src={request.profile.profileImageUrl} alt={request.profile.name} />
            <AvatarFallback>{request.profile.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {request.profile.name}
              </p>
              {getProfileTypeBadge(request.profile.type)}
            </div>
            {request.profile.bio && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                {request.profile.bio}
              </p>
            )}
            <div className="flex space-x-2 mt-3">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  acceptFriendRequestMutation.mutate(request.friendship.id);
                }}
                disabled={acceptFriendRequestMutation.isPending}
              >
                <Heart className="w-3 h-3 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  rejectFriendRequestMutation.mutate(request.friendship.id);
                }}
                disabled={rejectFriendRequestMutation.isPending}
              >
                <UserMinus className="w-3 h-3 mr-1" />
                Decline
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (friendsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Friends
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {friends?.length || 0} connections
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Friend Requests Section (for own profiles) */}
      {isOwn && friendRequests && friendRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserPlus className="w-5 h-5 mr-2" />
              Friend Requests ({friendRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friendRequests.map((request: any) => (
                <FriendRequestCard key={request.friendship.id} request={request} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Network</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all" className="flex items-center">
                <Users className="w-4 h-4 mr-1" />
                All ({friendsByType.all.length})
              </TabsTrigger>
              <TabsTrigger value="audience" className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                Audience ({friendsByType.audience.length})
              </TabsTrigger>
              <TabsTrigger value="artist" className="flex items-center">
                <Music className="w-4 h-4 mr-1" />
                Artists ({friendsByType.artist.length})
              </TabsTrigger>
              <TabsTrigger value="venue" className="flex items-center">
                <Building className="w-4 h-4 mr-1" />
                Venues ({friendsByType.venue.length})
              </TabsTrigger>
            </TabsList>

            {["all", "audience", "artist", "venue"].map((type) => (
              <TabsContent key={type} value={type} className="mt-6">
                {friendsByType[type as keyof typeof friendsByType].length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {friendsByType[type as keyof typeof friendsByType].map((friend: any) => (
                      <FriendCard key={friend.id} friend={friend} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">
                      {searchQuery 
                        ? `No ${type === "all" ? "friends" : type + " friends"} found matching "${searchQuery}"`
                        : `No ${type === "all" ? "friends" : type + " friends"} yet`
                      }
                    </p>
                    {!searchQuery && (
                      <p className="text-sm">
                        {type === "all" 
                          ? "Connect with other users to build your network"
                          : `Connect with ${type} profiles to see them here`
                        }
                      </p>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Sent Requests (for own profiles) */}
      {isOwn && sentRequests && sentRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Pending Requests ({sentRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sentRequests.map((request: any) => (
                <Card key={request.friendship.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={request.profile.profileImageUrl} alt={request.profile.name} />
                        <AvatarFallback>{request.profile.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {request.profile.name}
                        </p>
                        {getProfileTypeBadge(request.profile.type)}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Request sent
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}