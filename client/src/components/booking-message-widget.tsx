
import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Send, X, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface BookingMessageWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number | null;
  bookingRequest?: any;
}

interface Message {
  id: number;
  content: string;
  senderId: number;
  senderName: string;
  senderImage?: string;
  createdAt: string;
}

export default function BookingMessageWidget({ 
  isOpen, 
  onClose, 
  conversationId, 
  bookingRequest 
}: BookingMessageWidgetProps) {
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch conversations first to get conversation details
  const { data: conversations } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: () => apiRequest("GET", "/api/conversations"),
    enabled: isOpen,
  });

  // Find the current conversation
  const conversation = React.useMemo(() => {
    console.log('Finding conversation:', { conversationId, conversationsCount: conversations?.length });
    if (!conversations || !conversationId) {
      console.log('No conversations or conversationId');
      return null;
    }
    const found = conversations.find((c: any) => c.id === conversationId);
    console.log('Found conversation:', found);
    return found;
  }, [conversations, conversationId]);

  // Fetch messages for the conversation
  const { data: messagesData, isLoading: loadingMessages, error: messagesError, isError } = useQuery({
    queryKey: ["/api/conversations", conversationId, "messages"],
    queryFn: () => {
      console.log('Fetching messages for conversation:', conversationId);
      return apiRequest("GET", `/api/conversations/${conversationId}/messages`);
    },
    enabled: !!conversationId && isOpen,
    refetchInterval: 3000, // Refresh every 3 seconds for real-time feel
    retry: 3,
    staleTime: 0, // Always fetch fresh data
    onSuccess: (data) => {
      console.log('Messages query successful:', data);
    },
    onError: (error) => {
      console.error('Messages query error:', error);
    }
  });

  // Debug logging for query state
  React.useEffect(() => {
    console.log('Query state:', {
      conversationId,
      isOpen,
      enabled: !!conversationId && isOpen,
      loadingMessages,
      isError,
      messagesData,
      messagesError
    });
  }, [conversationId, isOpen, loadingMessages, isError, messagesData, messagesError]);

  // Ensure messages is always an array and handle different response formats
  const messages = React.useMemo(() => {
    console.log('Raw messages data:', messagesData);
    console.log('Messages data type:', typeof messagesData);
    console.log('Is array?', Array.isArray(messagesData));
    
    if (!messagesData) return [];
    if (Array.isArray(messagesData)) return messagesData;
    if (messagesData.messages && Array.isArray(messagesData.messages)) return messagesData.messages;
    if (messagesData.data && Array.isArray(messagesData.data)) return messagesData.data;
    
    // Handle case where messagesData is an empty object but we should refetch
    if (typeof messagesData === 'object' && Object.keys(messagesData).length === 0) {
      console.log('Empty object received, messages might still be loading');
      return [];
    }
    
    console.warn('Unexpected messages data format:', messagesData);
    return [];
  }, [messagesData]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string }) => {
      console.log('Sending message:', data);
      console.log('To conversation:', conversationId);
      return apiRequest("POST", `/api/conversations/${conversationId}/messages`, data);
    },
    onSuccess: (response) => {
      console.log('Message sent successfully:', response);
      setNewMessage("");
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", conversationId, "messages"] 
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/conversations"]
      });
      scrollToBottom();
    },
    onError: (error: Error) => {
      console.error('Error sending message:', error);
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

  const handleSendMessage = () => {
    if (newMessage.trim() && conversationId) {
      sendMessageMutation.mutate({
        content: newMessage.trim(),
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
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
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const openFullMessages = () => {
    // Open the full messages page - you might want to implement routing here
    window.open('/messages', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] flex flex-col p-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={conversation?.image} />
                <AvatarFallback>
                  {conversation?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-sm font-medium">
                  {conversation?.name || 
                   (conversation?.participants?.find((p: any) => p.id !== JSON.parse(localStorage.getItem('user') || '{}').profileId)?.name) ||
                   "Booking Conversation"}
                </DialogTitle>
                {bookingRequest && (
                  <p className="text-xs text-neutral-500">
                    Re: {bookingRequest.eventDate ? 
                      new Date(bookingRequest.eventDate).toLocaleDateString() : 
                      'Booking Request'
                    }
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={openFullMessages}
                className="h-8 w-8 p-0"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {loadingMessages ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : messagesError ? (
                <div className="text-center py-8 text-red-500">
                  <p className="text-sm">Error loading messages</p>
                  <p className="text-xs">{messagesError.message}</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs">Start the conversation about your booking!</p>
                  {conversationId && (
                    <p className="text-xs mt-2 text-gray-400">Conversation ID: {conversationId}</p>
                  )}
                </div>
              ) : (
                messages.map((message: Message) => {
                  // Determine if message is from current user by checking if sender is in our known participant list
                  const currentUserData = JSON.parse(localStorage.getItem('user') || '{}');
                  const currentProfileId = currentUserData.activeProfileId || currentUserData.profileId;
                  const isCurrentUser = message.senderId === currentProfileId;

                  return (
                    <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                        <div className={`px-3 py-2 rounded-lg text-sm ${
                          isCurrentUser
                            ? 'bg-blue-500 text-white'
                            : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                        }`}>
                          {!isCurrentUser && (
                            <p className="text-xs font-semibold mb-1 opacity-75">
                              {message.senderName}
                            </p>
                          )}
                          <p className="break-words">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            isCurrentUser ? 'text-blue-100' : 'text-neutral-500'
                          }`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>

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

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2 items-end">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || sendMessageMutation.isPending}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
