
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/hooks/useSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Send, Search, Plus, MoreVertical, Reply, Edit, Trash2, Check, CheckCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  participants?: {
    id: number;
    name?: string;
  }[];
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

export default function MessagesPage() {
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: () => apiRequest("GET", "/api/conversations"),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["/api/conversations", selectedConversation, "messages"],
    queryFn: () => apiRequest("GET", `/api/conversations/${selectedConversation}/messages`),
    enabled: !!selectedConversation,
    refetchInterval: 2000, // Refresh every 2 seconds for real-time feel
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string; replyToId?: number }) =>
      apiRequest("POST", `/api/conversations/${selectedConversation}/messages`, data),
    onSuccess: () => {
      setNewMessage("");
      setReplyingTo(null);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation, "messages"] });
      scrollToBottom();
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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark conversation as read when selected
  useEffect(() => {
    if (selectedConversation) {
      markAsReadMutation.mutate(selectedConversation);
    }
  }, [selectedConversation]);

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

  const filteredConversations = conversations.filter((conv: Conversation) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    <Dialog open={showNewConversation} onOpenChange={setShowNewConversation}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Start New Conversation</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          To start a new conversation, visit a profile and click the "Message" button.
                        </p>
                      </DialogContent>
                    </Dialog>
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
                            onClick={() => setSelectedConversation(conversation.id)}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              selectedConversation === conversation.id
                                ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                                : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                            }`}
                          >
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={conversation.image} />
                              <AvatarFallback>
                                {conversation.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-neutral-900 dark:text-white truncate">
                                  {conversation.name}
                                </p>
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
                            {conversation.unreadCount > 0 && (
                              <Badge className="bg-blue-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                                {conversation.unreadCount}
                              </Badge>
                            )}
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
                          </p>
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
                            messages.map((message: Message) => {
                              const isCurrentUser = message.senderId === currentUser.profileId;
                              
                              return (
                                <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'order-2' : 'order-1'}`}>
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
                                      {isCurrentUser && editingMessage !== message.id && (
                                        <div className="absolute -left-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                              <DropdownMenuItem onClick={() => startEdit(message)}>
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit
                                              </DropdownMenuItem>
                                              <DropdownMenuItem 
                                                onClick={() => handleDeleteMessage(message.id)}
                                                className="text-red-600"
                                              >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                              </DropdownMenuItem>
                                            </DropdownMenuContent>
                                          </DropdownMenu>
                                        </div>
                                      )}

                                      {/* Reply button for other users' messages */}
                                      {!isCurrentUser && (
                                        <div className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Button 
                                            size="sm" 
                                            variant="ghost" 
                                            className="h-6 w-6 p-0"
                                            onClick={() => startReply(message)}
                                          >
                                            <Reply className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      )}
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
                      
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="flex-1"
                        />
                        <Button 
                          onClick={handleSendMessage} 
                          disabled={!newMessage.trim() || sendMessageMutation.isPending}
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
    </div>
  );
}
