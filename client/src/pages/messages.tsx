import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/hooks/useSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Search, Plus, MoreVertical, Reply, Edit, Trash2, Trash, Check, CheckCheck, Archive, Volume2, VolumeX, AlertTriangle, UserX, Pin, Heart, Smile, FileText, Image as ImageIcon, Calendar, Link, Settings, Users } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/hooks/useSocket";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Message {
  id: number;
  content: string;
  messageType: string;
  senderId: number;
  senderName: string;
  senderImage?: string;
  attachments: any[];
  reactions: any;
  replyTo?: {
    id: number;
    content: string;
    senderName: string;
  };
  readBy: {
    profileId: number;
    profileName: string;
    profileImage?: string;
    readAt: string;
  }[];
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
  isPinned?: boolean;
}

interface Conversation {
  id: number;
  type: string;
  name: string;
  image?: string;
  lastMessage?: {
    id: number;
    content: string;
    senderId: number;
    senderName: string;
    createdAt: string;
    messageType: string;
  };
  unreadCount: number;
  lastActivityAt: string;
  isArchived: boolean;
  isMuted: boolean;
  isBlocked?: boolean;
  participants?: {
    id: number;
    name?: string;
  }[];
}

interface ConversationSettings {
  notifications: boolean;
  archived: boolean;
  muted: boolean;
}

async function apiRequest(method: string, url: string, data?: Record<string, any>) {
  const response = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }

  return response.json();
}

export default function MessagesPage() {
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<number[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isPrivateGroup, setIsPrivateGroup] = useState(false);
  const [maxGroupMembers, setMaxGroupMembers] = useState(50);
  const [showArchivedConversations, setShowArchivedConversations] = useState(false);
  const [showConversationSettings, setShowConversationSettings] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [initialMessage, setInitialMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Real-time WebSocket connection
  const {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage: sendSocketMessage,
    startTyping,
    stopTyping,
  } = useSocket({
    onConnect: () => {
      console.log('Socket connected to messaging');
    },
    onDisconnect: () => {
      console.log('Socket disconnected from messaging');
    },
    onNewMessage: (message) => {
      console.log('Received new message:', message);
      // Update messages cache with new message
      queryClient.setQueryData(
        ["/api/conversations", message.conversationId, "messages"],
        (oldMessages: any[]) => {
          const newMessages = oldMessages || [];
          // Avoid duplicates
          if (!newMessages.find(m => m.id === message.id)) {
            return [...newMessages, message].sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          }
          return newMessages;
        }
      );

      // Update conversations list with latest message
      queryClient.setQueryData(["/api/conversations"], (oldConversations: any[]) => {
        return (oldConversations || []).map((conv: any) => 
          conv.id === message.conversationId 
            ? { ...conv, lastMessage: {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                senderName: message.senderName,
                createdAt: message.createdAt,
                messageType: message.messageType
              }, lastActivityAt: message.createdAt }
            : conv
        );
      });
    },
    onTyping: ({ profileId, conversationId }) => {
      if (conversationId === selectedConversation) {
        setTypingUsers(prev => {
          if (!prev.includes(`user-${profileId}`)) {
            return [...prev, `user-${profileId}`];
          }
          return prev;
        });
      }
    },
    onStoppedTyping: ({ profileId, conversationId }) => {
      if (conversationId === selectedConversation) {
        setTypingUsers(prev => prev.filter(id => id !== `user-${profileId}`));
      }
    },
  });

  // Fetch conversations (initial load only, updates via WebSocket)
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: () => apiRequest("GET", "/api/conversations"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    // Remove polling - WebSocket handles real-time updates
  });

  // Fetch messages for selected conversation (initial load only, updates via WebSocket)
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    queryFn: () => apiRequest("GET", `/api/conversations/${selectedConversation}/messages`),
    enabled: !!selectedConversation,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Remove polling - WebSocket handles real-time updates
  });

  // Fetch friends for starting new conversations
  const { data: friends = [], isLoading: loadingFriends, error: friendsError } = useQuery({
    queryKey: ["/api/friends"],
    queryFn: () => apiRequest("GET", "/api/friends"),
    select: (data) => {
      if (!data || !Array.isArray(data)) return [];
      return data.map((item: any) => {
        if (item.friend) {
          return item.friend;
        }
        return item;
      });
    }
  });

  // Get active profile to filter out current user from friends list
  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });



  // Send message using WebSocket (fallback to HTTP if socket unavailable)
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string; replyToId?: number }) => {
      if (socket && isConnected && selectedConversation) {
        // Use WebSocket for real-time messaging
        sendSocketMessage({
          conversationId: selectedConversation,
          content: data.content,
          replyToId: data.replyToId,
        });
        return { success: true };
      } else {
        // Fallback to HTTP API
        return apiRequest("POST", `/api/conversations/${selectedConversation}/messages`, data);
      }
    },
    onSuccess: () => {
      setNewMessage("");
      setReplyingTo(null);
      scrollToBottom();
      // No need to invalidate queries - WebSocket updates cache in real-time
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit message mutation
  const editMessageMutation = useMutation({
    mutationFn: (data: { messageId: number; content: string }) =>
      apiRequest("PUT", `/api/messages/${data.messageId}`, { content: data.content }),
    onSuccess: () => {
      setEditingMessage(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation, "messages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: number) =>
      apiRequest("DELETE", `/api/messages/${messageId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark messages as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (conversationId: number) =>
      apiRequest("POST", `/api/conversations/${conversationId}/read`),
  });

  // Archive conversation mutation
  const archiveConversationMutation = useMutation({
    mutationFn: (conversationId: number) =>
      apiRequest("PATCH", `/api/conversations/${conversationId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Conversation archived",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mute conversation mutation
  const muteConversationMutation = useMutation({
    mutationFn: ({ conversationId, muted }: { conversationId: number; muted: boolean }) =>
      apiRequest("PATCH", `/api/conversations/${conversationId}/mute`, { muted }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Notification settings updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: (profileId: number) =>
      apiRequest("POST", `/api/profiles/${profileId}/block`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setShowBlockDialog(false);
      toast({
        title: "Success",
        description: "User blocked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Report user mutation
  const reportUserMutation = useMutation({
    mutationFn: ({ profileId, reason }: { profileId: number; reason: string }) =>
      apiRequest("POST", `/api/profiles/${profileId}/report`, { reason }),
    onSuccess: () => {
      setShowReportDialog(false);
      toast({
        title: "Success",
        description: "Report submitted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Pin message mutation
  const pinMessageMutation = useMutation({
    mutationFn: (messageId: number) =>
      apiRequest("POST", `/api/messages/${messageId}/pin`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation, "messages"] });
      toast({
        title: "Success",
        description: "Message pinned",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // React to message mutation
  const reactToMessageMutation = useMutation({
    mutationFn: ({ messageId, reaction }: { messageId: number; reaction: string }) =>
      apiRequest("POST", `/api/messages/${messageId}/react`, { reaction }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation, "messages"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: (data: { 
      name: string; 
      description?: string; 
      isPrivate?: boolean; 
      maxMembers?: number; 
      participantIds: number[] 
    }) => apiRequest("POST", "/api/groups", data),
    onSuccess: (group) => {
      setSelectedConversation(group.id);
      setShowNewGroup(false);
      setGroupName("");
      setGroupDescription("");
      setSelectedGroupMembers([]);
      setIsPrivateGroup(false);
      setMaxGroupMembers(50);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Group created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: (data: { profileId: number; message?: string }) =>
      apiRequest("POST", "/api/conversations", data),
    onSuccess: (conversation) => {
      setSelectedConversation(conversation.id);
      setShowNewConversation(false);
      setSelectedFriend(null);
      setInitialMessage("");
      setFriendSearchQuery("");
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({
        title: "Success",
        description: "Conversation started successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Join/leave conversations via WebSocket - optimized for fast switching
  useEffect(() => {
    if (selectedConversation && joinConversation) {
      console.log('Joining conversation:', selectedConversation);
      joinConversation(selectedConversation);

      // Mark conversation as read (non-blocking)
      setTimeout(() => {
        markAsReadMutation.mutate(selectedConversation);
      }, 0);

      return () => {
        // Non-blocking leave conversation
        if (leaveConversation) {
          console.log('Leaving conversation:', selectedConversation);
          setTimeout(() => {
            leaveConversation(selectedConversation);
          }, 0);
        }
      };
    }
  }, [selectedConversation, joinConversation, leaveConversation]);

  // Cleanup when component unmounts - optimized for faster cleanup
  useEffect(() => {
    return () => {
      // Clear typing timeout immediately
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      // Quick cleanup without waiting for network calls
      setTypingUsers([]);
      setIsTyping(false);
      setSelectedConversation(null);
      
      // Async cleanup that doesn't block component unmounting
      setTimeout(() => {
        if (selectedConversation && leaveConversation) {
          leaveConversation(selectedConversation);
        }
        if (selectedConversation && stopTyping) {
          stopTyping(selectedConversation);
        }
      }, 0); // Run after component unmounts
    };
  }, []);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (selectedConversation && startTyping) {
      startTyping(selectedConversation);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        if (stopTyping && selectedConversation) {
          stopTyping(selectedConversation);
        }
      }, 3000);
    }
  }, [selectedConversation, startTyping, stopTyping]);

  // Handle message input changes with typing indicators
  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      sendMessageMutation.mutate({
        content: newMessage.trim(),
        replyToId: replyingTo?.id,
      });
    }
  };

  const handleEditMessage = (messageId: number) => {
    if (editContent.trim()) {
      editMessageMutation.mutate({
        messageId,
        content: editContent.trim(),
      });
    }
  };

  const handleDeleteMessage = (messageId: number) => {
    if (confirm("Are you sure you want to delete this message?")) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const startEdit = (message: Message) => {
    setEditingMessage(message.id);
    setEditContent(message.content);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setEditContent("");
  };

  const startReply = (message: Message) => {
    setReplyingTo(message);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // Typing indicator effect
  useEffect(() => {
    if (newMessage.length > 0 && !isTyping) {
      setIsTyping(true);
      // Send typing indicator to other participants
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (selectedConversation && stopTyping) {
        stopTyping(selectedConversation);
      }
    }, 1000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    };
  }, [newMessage, isTyping, selectedConversation, stopTyping]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleArchiveConversation = (conversationId: number) => {
    archiveConversationMutation.mutate(conversationId);
  };

  const handleMuteConversation = (conversationId: number, muted: boolean) => {
    muteConversationMutation.mutate({ conversationId, muted });
  };

  const handleBlockUser = (profileId: number) => {
    blockUserMutation.mutate(profileId);
  };

  const handleReportUser = (profileId: number, reason: string) => {
    reportUserMutation.mutate({ profileId, reason });
  };

  const handlePinMessage = (messageId: number) => {
    pinMessageMutation.mutate(messageId);
  };

  const handleReactToMessage = (messageId: number, reaction: string) => {
    reactToMessageMutation.mutate({ messageId, reaction });
  };

  const handleStartConversation = () => {
    if (!selectedFriend) {
      toast({
        title: "Error",
        description: "Please select a friend to message",
        variant: "destructive",
      });
      return;
    }

    startConversationMutation.mutate({
      profileId: selectedFriend.id,
      message: initialMessage.trim() || undefined,
    });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedGroupMembers.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one member",
        variant: "destructive",
      });
      return;
    }

    createGroupMutation.mutate({
      name: groupName.trim(),
      description: groupDescription.trim() || undefined,
      isPrivate: isPrivateGroup,
      maxMembers: maxGroupMembers,
      participantIds: selectedGroupMembers,
    });
  };

  const filteredConversations = conversations
    .filter((conv: Conversation) => {
      const matchesSearch = conv.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesArchiveFilter = showArchivedConversations ? conv.isArchived : !conv.isArchived;
      return matchesSearch && matchesArchiveFilter;
    });

  const filteredFriends = friends.filter((friend: any) => {
    const nameMatch = friend.name.toLowerCase().includes(friendSearchQuery.toLowerCase());
    const notCurrentUser = friend.id !== activeProfile?.id;
    return nameMatch && notCurrentUser;
  });

  const filteredMessages = messages.filter((message: Message) => {
    if (!messageSearchQuery) return true;
    return message.content.toLowerCase().includes(messageSearchQuery.toLowerCase());
  });

  const selectedConversationData = conversations.find((c: Conversation) => c.id === selectedConversation);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-900 dark:to-neutral-800">
      <Sidebar />
      <div className={`flex-1 transition-all duration-300 ${
        isCollapsed ? 'lg:ml-16' : 'lg:ml-80'
      }`}>
        <div className="container mx-auto px-4 py-8 h-screen">
          <div className="max-w-7xl mx-auto h-full">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
                Messages
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400">
                Connect and communicate with your network
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
              {/* Conversations List */}
              <Card className="lg:col-span-1 flex flex-col">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5" />
                      Conversations
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={showArchivedConversations ? "default" : "outline"}
                        onClick={() => setShowArchivedConversations(!showArchivedConversations)}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setShowNewConversation(true)}>
                            <MessageCircle className="w-4 h-4 mr-2" />
                            New Chat
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowNewGroup(true)}>
                            <Users className="w-4 h-4 mr-2" />
                            New Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                        <DialogTrigger asChild>
                          <div style={{ display: 'none' }} />
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Start New Conversation</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Friend Search */}
                            <div>
                              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                Select a friend to message
                              </label>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                                <Input
                                  placeholder="Search friends..."
                                  value={friendSearchQuery}
                                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                                  className="pl-10"
                                />
                              </div>
                            </div>

                            {/* Friends List */}
                            <div className="max-h-60 overflow-y-auto space-y-2">
                              {loadingFriends ? (
                                <div className="text-center py-4">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                </div>
                              ) : filteredFriends.length === 0 ? (
                                <div className="text-center py-4 text-neutral-500">
                                  {friendSearchQuery ? "No friends found" : "No friends available"}
                                </div>
                              ) : (
                                filteredFriends.map((friend: any) => (
                                  <div
                                    key={friend.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                      selectedFriend?.id === friend.id
                                        ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                    }`}
                                    onClick={() => setSelectedFriend(friend)}
                                  >
                                    <Avatar className="w-10 h-10">
                                      <AvatarImage src={friend.profileImageUrl} />
                                      <AvatarFallback>
                                        {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-neutral-900 dark:text-white truncate">
                                        {friend.name}
                                      </p>
                                      {friend.bio && (
                                        <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                                          {friend.bio}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Initial Message */}
                            {selectedFriend && (
                              <div>
                                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                  Start with a message (optional)
                                </label>
                                <Textarea
                                  placeholder="Type your message..."
                                  value={initialMessage}
                                  onChange={(e) => setInitialMessage(e.target.value)}
                                  className="min-h-[80px] resize-none"
                                />
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowNewConversation(false);
                                  setSelectedFriend(null);
                                  setInitialMessage("");
                                  setFriendSearchQuery("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleStartConversation}
                                disabled={!selectedFriend || startConversationMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {startConversationMutation.isPending ? "Starting..." : "Start Conversation"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* New Group Dialog */}
                      <Dialog open={showNewGroup} onOpenChange={setShowNewGroup}>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Create New Group</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Group Name */}
                            <div>
                              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                Group Name *
                              </label>
                              <Input
                                placeholder="Enter group name"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                              />
                            </div>

                            {/* Group Description */}
                            <div>
                              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                Description (optional)
                              </label>
                              <Textarea
                                placeholder="Enter group description"
                                value={groupDescription}
                                onChange={(e) => setGroupDescription(e.target.value)}
                                className="min-h-[60px] resize-none"
                              />
                            </div>

                            {/* Group Settings */}
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                                    Private Group
                                  </label>
                                  <p className="text-xs text-neutral-500">
                                    Only admins can add new members
                                  </p>
                                </div>
                                <Switch
                                  checked={isPrivateGroup}
                                  onCheckedChange={setIsPrivateGroup}
                                />
                              </div>

                              <div>
                                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                  Max Members ({maxGroupMembers})
                                </label>
                                <input
                                  type="range"
                                  min="5"
                                  max="100"
                                  value={maxGroupMembers}
                                  onChange={(e) => setMaxGroupMembers(parseInt(e.target.value))}
                                  className="w-full"
                                />
                              </div>
                            </div>

                            {/* Member Selection */}
                            <div>
                              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                                Add Members
                              </label>
                              <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                                <Input
                                  placeholder="Search friends..."
                                  value={friendSearchQuery}
                                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                                  className="pl-10"
                                />
                              </div>

                              {/* Selected Members Count */}
                              {selectedGroupMembers.length > 0 && (
                                <p className="text-sm text-blue-600 mb-2">
                                  {selectedGroupMembers.length} member(s) selected
                                </p>
                              )}

                              <div className="max-h-48 overflow-y-auto space-y-2">
                                {loadingFriends ? (
                                  <div className="text-center py-4">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                  </div>
                                ) : filteredFriends.length === 0 ? (
                                  <div className="text-center py-4 text-neutral-500">
                                    {friendSearchQuery ? "No friends found" : "No friends available"}
                                  </div>
                                ) : (
                                  filteredFriends.map((friend: any) => {
                                    const isSelected = selectedGroupMembers.includes(friend.id);
                                    return (
                                      <div
                                        key={friend.id}
                                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                          isSelected
                                            ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                            : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        }`}
                                        onClick={() => {
                                          if (isSelected) {
                                            setSelectedGroupMembers(prev => prev.filter(id => id !== friend.id));
                                          } else {
                                            setSelectedGroupMembers(prev => [...prev, friend.id]);
                                          }
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => {}}
                                          className="text-blue-600"
                                        />
                                        <Avatar className="w-10 h-10">
                                          <AvatarImage src={friend.profileImageUrl} />
                                          <AvatarFallback>
                                            {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-neutral-900 dark:text-white truncate">
                                            {friend.name}
                                          </p>
                                          {friend.bio && (
                                            <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                                              {friend.bio}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowNewGroup(false);
                                  setGroupName("");
                                  setGroupDescription("");
                                  setSelectedGroupMembers([]);
                                  setIsPrivateGroup(false);
                                  setMaxGroupMembers(50);
                                  setFriendSearchQuery("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleCreateGroup}
                                disabled={!groupName.trim() || selectedGroupMembers.length === 0 || createGroupMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-1 p-4">
                      {loadingConversations ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        </div>
                      ) : filteredConversations.length === 0 ? (
                        <div className="text-center py-8 text-neutral-500">
                          No conversations found
                        </div>
                      ) : (
                        filteredConversations.map((conversation: Conversation) => (
                          <div
                            key={conversation.id}
                            className={`relative group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedConversation === conversation.id
                                ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                            }`}
                            onClick={() => setSelectedConversation(conversation.id)}
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={conversation.image} />
                              <AvatarFallback>
                                {conversation.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-neutral-900 dark:text-white truncate">
                                    {conversation.name}
                                  </p>
                                  {conversation.isMuted && (
                                    <VolumeX className="w-3 h-3 text-neutral-400" />
                                  )}
                                  {conversation.isArchived && (
                                    <Archive className="w-3 h-3 text-neutral-400" />
                                  )}
                                </div>
                                <span className="text-xs text-neutral-500">
                                  {conversation.lastMessage && formatTime(conversation.lastMessage.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                                {conversation.lastMessage ? (
                                  `${conversation.lastMessage.senderName}: ${conversation.lastMessage.content}`
                                ) : (
                                  "No messages yet"
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {conversation.unreadCount > 0 && (
                                <Badge className="bg-blue-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                                  {conversation.unreadCount}
                                </Badge>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="w-3 h-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMuteConversation(conversation.id, !conversation.isMuted);
                                    }}
                                  >
                                    {conversation.isMuted ? (
                                      <>
                                        <Volume2 className="w-4 h-4 mr-2" />
                                        Unmute
                                      </>
                                    ) : (
                                      <>
                                        <VolumeX className="w-4 h-4 mr-2" />
                                        Mute
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleArchiveConversation(conversation.id);
                                    }}
                                  >
                                    <Archive className="w-4 h-4 mr-2" />
                                    {conversation.isArchived ? "Unarchive" : "Archive"}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Message View */}
              <Card className="lg:col-span-2 flex flex-col">
                {selectedConversation && selectedConversationData ? (
                  <>
                    {/* Message Header */}
                    <CardHeader className="pb-4 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={selectedConversationData.image} />
                            <AvatarFallback>
                              {selectedConversationData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-white">
                              {selectedConversationData.name}
                            </h3>
                            <p className="text-sm text-neutral-500">
                              {selectedConversationData.type === 'direct' ? 'Direct Message' : 'Group Chat'}
                              {typingUsers.length > 0 && (
                                <span className="ml-2 text-blue-500">
                                  {typingUsers.join(', ')} typing...
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                            <Input
                              placeholder="Search messages..."
                              value={messageSearchQuery}
                              onChange={(e) => setMessageSearchQuery(e.target.value)}
                              className="pl-10 w-48"
                            />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleMuteConversation(selectedConversation, !selectedConversationData.isMuted)}
                              >
                                {selectedConversationData.isMuted ? (
                                  <>
                                    <Volume2 className="w-4 h-4 mr-2" />
                                    Unmute Notifications
                                  </>
                                ) : (
                                  <>
                                    <VolumeX className="w-4 h-4 mr-2" />
                                    Mute Notifications
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleArchiveConversation(selectedConversation)}
                              >
                                <Archive className="w-4 h-4 mr-2" />
                                Archive Conversation
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setShowBlockDialog(true)}
                                className="text-red-600"
                              >
                                <UserX className="w-4 h-4 mr-2" />
                                Block User
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setShowReportDialog(true)}
                                className="text-red-600"
                              >
                                <AlertTriangle className="w-4 h-4 mr-2" />
                                Report User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Messages */}
                    <CardContent className="flex-1 p-4 overflow-hidden flex flex-col">
                      <ScrollArea className="flex-1">
                        <div className="space-y-4 pr-4">
                          {loadingMessages ? (
                            <div className="text-center py-4">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            </div>
                          ) : messages.length === 0 ? (
                            <div className="text-center py-8 text-neutral-500">
                              No messages yet. Start the conversation!
                            </div>
                          ) : (
                            filteredMessages.map((message: Message) => {
                              const isCurrentUser = message.senderId === currentUser.profileId;

                              return (
                                <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                                    {/* Pinned indicator */}
                                    {message.isPinned && (
                                      <div className="mb-1 flex items-center gap-1 text-xs text-amber-600">
                                        <Pin className="w-3 h-3" />
                                        <span>Pinned message</span>
                                      </div>
                                    )}

                                    {/* Reply indicator */}
                                    {message.replyTo && (
                                      <div className="mb-1 px-3 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 rounded border-l-2 border-blue-500">
                                        <span className="font-semibold">{message.replyTo.senderName}:</span>
                                        <span className="ml-1">{message.replyTo.content.substring(0, 50)}...</span>
                                      </div>
                                    )}

                                    <div className={`group relative px-4 py-2 rounded-lg ${
                                      isCurrentUser
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                                    }`}>
                                      {editingMessage === message.id ? (
                                        <div className="space-y-2">
                                          <Textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            className="min-h-[60px] resize-none"
                                          />
                                          <div className="flex gap-2">
                                            <Button
                                              size="sm"
                                              onClick={() => handleEditMessage(message.id)}
                                              disabled={editMessageMutation.isPending}
                                            >
                                              Save
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={cancelEdit}
                                            >
                                              Cancel
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          {!isCurrentUser && (
                                            <p className="text-xs font-semibold mb-1 opacity-75">
                                              {message.senderName}
                                            </p>
                                          )}
                                          <p className="text-sm break-words">{message.content}</p>

                                          {/* Message reactions */}
                                          {message.reactions && Object.keys(message.reactions).length > 0 && (
                                            <div className="flex gap-1 mt-2 flex-wrap">
                                              {Object.entries(message.reactions).map(([emoji, count]) => (
                                                <Button
                                                  key={emoji}
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 px-2 text-xs"
                                                  onClick={() => handleReactToMessage(message.id, emoji)}
                                                >
                                                  {emoji} {count}
                                                </Button>
                                              ))}
                                            </div>
                                          )}

                                          <div className="flex items-center justify-between mt-1">
                                            <p className={`text-xs ${
                                              isCurrentUser ? 'text-blue-100' : 'text-neutral-500'
                                            }`}>
                                              {formatTime(message.createdAt)}
                                              {message.editedAt && " (edited)"}
                                            </p>

                                            {/* Read receipts for current user's messages */}
                                            {isCurrentUser && message.readBy.length > 1 && (
                                              <div className="flex items-center gap-1">
                                                {message.readBy.length > 1 ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                              </div>
                                            )}
                                          </div>
                                        </>
                                      )}

                                      {/* Message actions */}
                                      <div className="absolute -left-12 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          className="h-6 w-6 p-0"
                                          onClick={() => handleReactToMessage(message.id, '❤️')}
                                        >
                                          <Heart className="w-3 h-3" />
                                        </Button>
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                              <Smile className="w-3 h-3" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent>
                                            {['😀', '😂', '😍', '👍', '👎', '😢', '😮', '😡'].map((emoji) => (
                                              <DropdownMenuItem
                                                key={emoji}
                                                onClick={() => handleReactToMessage(message.id, emoji)}
                                              >
                                                {emoji}
                                              </DropdownMenuItem>
                                            ))}
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                        {(isCurrentUser || !isCurrentUser) && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                                <MoreVertical className="w-3 h-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent>
                                              <DropdownMenuItem onClick={() => startReply(message)}>
                                                <Reply className="w-4 h-4 mr-2" />
                                                Reply
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => handlePinMessage(message.id)}>
                                                <Pin className="w-4 h-4 mr-2" />
                                                Pin Message
                                              </DropdownMenuItem>
                                              {isCurrentUser && (
                                                <>
                                                  <DropdownMenuItem onClick={() => startEdit(message)}>
                                                    <Edit className="w-4 h-4 mr-2" />
                                                    Edit
                                                  </DropdownMenuItem>
                                                  <DropdownMenuItem 
                                                    onClick={() => handleDeleteMessage(message.id)}
                                                    className="text-red-600"
                                                  >
                                                    <Trash className="w-4 h-4 mr-2" />
                                                    Delete
                                                  </DropdownMenuItem>
                                                </>
                                              )}
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Avatar for other users */}
                                  {!isCurrentUser && (
                                    <Avatar className="w-6 h-6 mr-2 order-1">
                                      <AvatarImage src={message.senderImage} />
                                      <AvatarFallback className="text-xs">
                                        {message.senderName[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                              );
                            })
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </ScrollArea>
                    </CardContent>

                    {/* Message Input */}
                    <div className="p-4 border-t">
                      {/* Typing indicator */}
                      {typingUsers.length > 0 && (
                        <div className="mb-2 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-sm text-neutral-600 dark:text-neutral-400">
                              Someone is typing...
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Reply indicator */}
                      {replyingTo && (
                        <div className="mb-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-700 rounded border-l-2 border-blue-500 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">Replying to</span>
                            <p className="text-sm font-semibold">{replyingTo.senderName}</p>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              {replyingTo.content.substring(0, 100)}...
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={cancelReply}>
                            ×
                          </Button>
                        </div>
                      )}

                      <div className="flex gap-2 items-end">
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-10 w-10 p-0">
                            <ImageIcon className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-10 w-10 p-0">
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex-1 relative">
                          <Input
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={handleMessageInputChange}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            className="pr-12"
                          />
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                          >
                            <Smile className="w-4 h-4" />
                          </Button>
                        </div>
                        <Button 
                          onClick={handleSendMessage} 
                          disabled={!newMessage.trim() || sendMessageMutation.isPending}
                          className="h-10"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <CardContent className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageCircle className="w-16 h-16 text-neutral-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
                        Select a conversation
                      </h3>
                      <p className="text-neutral-500">
                        Choose a conversation from the list to start messaging
                      </p>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Block User Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block this user? They won't be able to send you messages or see your profile.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedConversationData?.participants?.[0]?.id) {
                  handleBlockUser(selectedConversationData.participants[0].id);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report User Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Please tell us why you're reporting this user:
            </p>
            <div className="space-y-2">
              {[
                "Harassment or bullying",
                "Spam or unwanted messages",
                "Inappropriate content",
                "Impersonation",
                "Other"
              ].map((reason) => (
                <Label key={reason} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason}
                    className="text-blue-600"
                  />
                  <span>{reason}</span>
                </Label>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowReportDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const reason = document.querySelector('input[name="reportReason"]:checked')?.value as string;
                  if (reason && selectedConversationData?.participants?.[0]?.id) {
                    handleReportUser(selectedConversationData.participants[0].id, reason);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Submit Report
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}