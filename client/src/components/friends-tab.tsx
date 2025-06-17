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

  // Fetch friend requests (for own profiles)
  const { data: friendRequests, isLoading: requestsLoading } = useQuery({
    queryKey: [`/api/friend-requests`],
    enabled: !!profile?.id && isOwn,
  });

  // Fetch sent friend requests (for own profiles)
  const { data: sentRequests, isLoading: sentLoading } = useQuery({
    queryKey: [`/api/sent-requests`],
    enabled: !!profile?.id && isOwn,
  });

  // Send friend request mutation
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (targetProfileId: number) => {
      return await apiRequest("POST", `/api/friend-requests`, {
        addresseeId: targetProfileId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/sent-requests`] });
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
      return await apiRequest("POST", `/api/friend-requests/${friendshipId}/accept`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/friends`] });
      queryClient.invalidateQueries({ queryKey: [`/api/friend-requests`] });
      queryClient.invalidateQueries({ queryKey: [`/api/friends`] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/friend-requests`] });
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "artist": return "🎤";
      case "venue": return "🏛️";
      case "audience": return "👤";
      default: return "📋";
    }
  };

  const getProfileTypeBadge = (type: string) => {
    return (
      <Badge className="bg-white text-purple-600 font-bold border-0 shadow-lg text-xs">
        {getTypeIcon(type)}
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
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {friend.name}
            </p>
            <div className="mt-1">
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

  const FriendRequestCard = ({ request }: { request: any }) => {
    // Handle cases where profile data might not be available
    if (!request) {
      console.warn('Invalid friend request data:', request);
      return null;
    }

    // The profile data is directly on the request object, not nested under 'profile'
    const profile = {
      id: request.id,
      name: request.name,
      profileImageUrl: request.profileImageUrl,
      type: request.type,
      bio: request.bio
    };

    return (
      <Card className="hover:shadow-xl transition-all duration-300 border border-gray-700 bg-gray-800 hover:bg-gray-750">
        <CardContent className="p-4">
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-3">
              <Avatar className="w-14 h-14 ring-2 ring-blue-500">
                <AvatarImage src={profile.profileImageUrl} alt={profile.name || 'Unknown'} />
                <AvatarFallback className="bg-blue-600 text-white font-semibold">
                  {(profile.name || 'U').charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate mb-1">
                  {profile.name || 'Unknown User'}
                </p>
                {profile.type && (
                  <Badge className="bg-purple-600 text-white font-bold border-0 shadow-lg text-xs mb-1">
                    {getTypeIcon(profile.type)}
                    <span className="ml-1 capitalize">{profile.type}</span>
                  </Badge>
                )}
                <p className="text-xs text-blue-400 font-medium flex items-center">
                  <Heart className="w-3 h-3 mr-1" />
                  Wants to connect
                </p>
              </div>
            </div>
            <div className="flex space-x-2 w-full">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (request.friendship?.id) {
                    acceptFriendRequestMutation.mutate(request.friendship.id);
                  }
                }}
                disabled={acceptFriendRequestMutation.isPending || !request.friendship?.id}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0 shadow-lg"
              >
                <Heart className="w-3 h-3 mr-1" />
                {acceptFriendRequestMutation.isPending ? "Accepting..." : "Accept"}
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  if (request.friendship?.id) {
                    rejectFriendRequestMutation.mutate(request.friendship.id);
                  }
                }}
                disabled={rejectFriendRequestMutation.isPending || !request.friendship?.id}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 border-0 shadow-lg"
              >
                <UserMinus className="w-3 h-3 mr-1" />
                {rejectFriendRequestMutation.isPending ? "Declining..." : "Decline"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
        <Card className="border-gray-800 bg-gray-900 shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg border-b border-gray-700">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <UserPlus className="w-5 h-5 mr-2" />
                <span className="text-lg font-semibold">Friend Requests</span>
              </div>
              <Badge className="bg-gray-800 text-white font-bold border border-gray-600 px-3 py-1 rounded-full">
                {friendRequests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-gray-900">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friendRequests.map((request: any) => (
                <FriendRequestCard key={request.friendship?.id || request.id} request={request} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty Friend Requests State (for own profiles) */}
      {isOwn && (!friendRequests || friendRequests.length === 0) && (
        <Card className="border-dashed border-2 border-gray-600 bg-gray-900/50">
          <CardContent className="p-6 text-center">
            <UserPlus className="w-8 h-8 mx-auto text-gray-500 mb-3" />
            <p className="text-sm text-gray-400 mb-2">
              No pending friend requests
            </p>
            <p className="text-xs text-gray-500">
              When someone sends you a friend request, it will appear here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Your Network</span>
            {friends && friends.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {friends.length} {friends.length === 1 ? 'friend' : 'friends'}
              </Badge>
            )}
          </CardTitle>
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
                      <div className="space-y-2">
                        <p className="text-sm">
                          {type === "all" 
                            ? "Connect with other users to build your network"
                            : `Connect with ${type} profiles to see them here`
                          }
                        </p>
                        {isOwn && friendRequests && friendRequests.length > 0 && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                            You have {friendRequests.length} pending friend request{friendRequests.length !== 1 ? 's' : ''} above
                          </p>
                        )}
                      </div>
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
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-amber-700 dark:text-amber-300">
              <div className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Pending Requests
              </div>
              <Badge className="bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                {sentRequests.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sentRequests.map((request: any) => (
                <Card key={request.friendship.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12 ring-2 ring-amber-200 dark:ring-amber-800">
                        <AvatarImage src={request.profile.profileImageUrl} alt={request.profile.name} />
                        <AvatarFallback className="bg-amber-100 text-amber-600 font-semibold">
                          {request.profile.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {request.profile.name}
                        </p>
                        {getProfileTypeBadge(request.profile.type)}
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center">
                          <MessageCircle className="w-3 h-3 mr-1" />
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