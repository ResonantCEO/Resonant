import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Heart, 
  MessageCircle, 
  Share, 
  Image as ImageIcon, 
  Smile, 
  MapPin,
  MoreHorizontal,
  Globe,
  Users as FriendsIcon,
  Trash2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface PostFeedProps {
  profileId?: number;
}

export default function PostFeed({ profileId }: PostFeedProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [newPost, setNewPost] = useState("");

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: profileId ? [`/api/profiles/${profileId}/posts`] : ["/api/posts"],
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/posts", { content, visibility: "public" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/posts`] });
      setNewPost("");
      toast({
        title: "Post Created",
        description: "Your post has been shared successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      return await apiRequest("POST", `/api/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/posts`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle like",
        variant: "destructive",
      });
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      return await apiRequest("DELETE", `/api/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/posts`] });
      toast({
        title: "Post Deleted",
        description: "Your post has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    },
  });

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    createPostMutation.mutate(newPost.trim());
  };

  const handleLikePost = (postId: number) => {
    likePostMutation.mutate(postId);
  };

  const handleDeletePost = (postId: number) => {
    if (window.confirm("Are you sure you want to delete this post?")) {
      deletePostMutation.mutate(postId);
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case "friends":
        return <FriendsIcon className="w-4 h-4" />;
      case "private":
        return <MapPin className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Post (only show on own profile or feed) */}
      {(!profileId || profileId === activeProfile?.id) && activeProfile && (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleCreatePost}>
              <div className="flex items-start space-x-4">
                <Avatar>
                  <AvatarImage src={user?.profileImageUrl || ""} />
                  <AvatarFallback>{activeProfile.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <Textarea
                    value={newPost}
                    onChange={(e) => setNewPost(e.target.value)}
                    placeholder={`What's on your mind, ${activeProfile.name}?`}
                    className="w-full border border-neutral-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex space-x-4">
                      <Button type="button" variant="ghost" size="sm">
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Photo
                      </Button>
                      <Button type="button" variant="ghost" size="sm">
                        <MapPin className="w-4 h-4 mr-2" />
                        Location
                      </Button>
                    </div>
                    <Button
                      type="submit"
                      disabled={!newPost.trim() || createPostMutation.isPending}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                    >
                      {createPostMutation.isPending ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-neutral-600">No posts yet.</p>
          </CardContent>
        </Card>
      ) : (
        posts.map((post: any) => (
          <Card key={post.id}>
            <CardContent className="p-6">
              {/* Post Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={post.profile?.profileImageUrl || ""} />
                    <AvatarFallback>
                      {post.profile?.name?.slice(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-semibold text-neutral-900">
                      {post.profile?.name || "Unknown User"}
                    </h4>
                    <div className="flex items-center space-x-2 text-sm text-neutral-600">
                      <span>
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                      <span>•</span>
                      {getVisibilityIcon(post.visibility)}
                    </div>
                  </div>
                </div>
                {/* Show menu only for posts owned by current user */}
                {post.profileId === activeProfile?.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleDeletePost(post.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Post
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Post Content */}
              <div className="mb-4">
                <p className="text-neutral-900 leading-relaxed mb-4">{post.content}</p>
                
                {/* Post Image */}
                {post.imageUrl && (
                  <img 
                    src={post.imageUrl} 
                    alt="Post content" 
                    className="w-full rounded-xl object-cover"
                  />
                )}
              </div>

              {/* Post Actions */}
              <div className="border-t border-neutral-200 pt-4">
                <div className="flex items-center justify-between text-sm text-neutral-600 mb-3">
                  <span>
                    <Heart className="w-4 h-4 text-red-500 inline mr-1" />
                    {post.likesCount || 0} likes
                  </span>
                  <span>{post.commentsCount || 0} comments</span>
                </div>
                
                <div className="grid grid-cols-3 gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex items-center justify-center space-x-2 py-2 hover:bg-neutral-50 rounded-lg transition-colors"
                    onClick={() => handleLikePost(post.id)}
                    disabled={likePostMutation.isPending}
                  >
                    <Heart className="w-4 h-4" />
                    <span className="font-medium">Like</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex items-center justify-center space-x-2 py-2 hover:bg-neutral-50 rounded-lg transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium">Comment</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex items-center justify-center space-x-2 py-2 hover:bg-neutral-50 rounded-lg transition-colors"
                  >
                    <Share className="w-4 h-4" />
                    <span className="font-medium">Share</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
