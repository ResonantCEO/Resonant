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
    console.log('Conversations type:', typeof conversations, 'Is array:', Array.isArray(conversations));

    if (!conversationId) {
      console.log('No conversationId');
      return null;
    }

    if (!conversations) {
      console.log('No conversations data');
      return null;
    }

    // Ensure conversations is an array
    const conversationsArray = Array.isArray(conversations) ? conversations : 
                              (conversations.data && Array.isArray(conversations.data)) ? conversations.data :
                              [];

    if (conversationsArray.length === 0) {
      console.log('Conversations array is empty');
      return null;
    }

    const found = conversationsArray.find((c: any) => c.id === conversationId);
    console.log('Found conversation:', found);
    return found;
  }, [conversations, conversationId]);

  // Fetch messages for the conversation
  const { data: messagesData, isLoading: loadingMessages, error: messagesError, isError } = useQuery({
    queryKey: ["/api/conversations", conversationId, "messages"],
    queryFn: async () => {
      console.log('Fetching messages for conversation:', conversationId);
      try {
        const response = await apiRequest("GET", `/api/conversations/${conversationId}/messages`);
        // Parse the JSON from the Response object
        const data = await response.json();
        console.log('Raw API Response:', data);
        console.log('Response type:', typeof data);
        console.log('Response is array:', Array.isArray(data));

        // The API should return an array directly, but let's handle different formats
        if (Array.isArray(data)) {
          console.log('Direct array response with', data.length, 'messages');
          return data;
        }

        if (data && typeof data === 'object') {
          console.log('Object response, checking for nested arrays');
          console.log('Response keys:', Object.keys(data));

          // Check common wrapper patterns
          if (data.data && Array.isArray(data.data)) {
            console.log('Found messages in data.data');
            return data.data;
          }
          if (data.messages && Array.isArray(data.messages)) {
            console.log('Found messages in data.messages');
            return data.messages;
          }

          // Look for any array property that contains message-like objects
          for (const [key, value] of Object.entries(data)) {
            if (Array.isArray(value)) {
              console.log(`Found array in ${key} with ${value.length} items`);
              if (value.length > 0 && value[0]?.id && value[0]?.content) {
                console.log(`Using ${key} as messages array`);
                return value;
              }
            }
          }

          console.warn('No valid messages array found in response');
          return [];
        }

        console.warn('Unexpected response format, returning empty array');
        return [];
      } catch (error) {
        console.error('Error fetching messages:', error);
        throw error;
      }
    },
    enabled: !!conversationId && isOpen,
    refetchInterval: 3000, // Refresh every 3 seconds
    retry: 2,
    staleTime: 500, // Very short cache
    refetchOnWindowFocus: true,
    refetchOnMount: true,
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
      messagesError,
      messagesDataType: typeof messagesData,
      messagesDataKeys: messagesData && typeof messagesData === 'object' ? Object.keys(messagesData) : null,
      messagesLength: Array.isArray(messagesData) ? messagesData.length : null
    });

    if (messagesData && !Array.isArray(messagesData)) {
      console.log('Non-array messages data received:', messagesData);
    }
  }, [conversationId, isOpen, loadingMessages, isError, messagesData, messagesError]);

  // Ensure messages is always an array and handle different response formats
  const messages = React.useMemo(() => {
    console.log('Processing messages data:', messagesData);
    console.log('Messages data type:', typeof messagesData);
    console.log('Is array?', Array.isArray(messagesData));

    if (!messagesData) {
      console.log('No messages data, returning empty array');
      return [];
    }

    // Check if messagesData is directly an array
    if (Array.isArray(messagesData)) {
      console.log('Messages data is array with length:', messagesData.length);
      // Filter out any invalid messages and sort by creation date
      const validMessages = messagesData.filter(msg => msg && typeof msg === 'object' && msg.id && msg.content);
      console.log('Valid messages count:', validMessages.length);
      return validMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    // Check for nested messages property
    if (messagesData.messages && Array.isArray(messagesData.messages)) {
      console.log('Messages nested in .messages property');
      const validMessages = messagesData.messages.filter(msg => msg && typeof msg === 'object' && msg.id && msg.content);
      return validMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    // Check for nested data property
    if (messagesData.data && Array.isArray(messagesData.data)) {
      console.log('Messages nested in .data property');
      const validMessages = messagesData.data.filter(msg => msg && typeof msg === 'object' && msg.id && msg.content);
      return validMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    // Handle case where messagesData is an empty object
    if (typeof messagesData === 'object' && Object.keys(messagesData).length === 0) {
      console.warn('Empty object received from API - this indicates a server-side issue');
      return [];
    }

    // If messagesData is an object but not in expected format, try to extract messages
    if (typeof messagesData === 'object') {
      console.log('Attempting to extract messages from object keys:', Object.keys(messagesData));
      // Try to find any property that contains an array of messages
      for (const key of Object.keys(messagesData)) {
        const value = messagesData[key];
        if (Array.isArray(value) && value.length > 0 && value[0]?.id && value[0]?.content) {
          console.log(`Found messages in property '${key}' with ${value.length} items`);
          const validMessages = value.filter(msg => msg && typeof msg === 'object' && msg.id && msg.content);
          return validMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        }
      }
    }

    console.warn('Unexpected messages data format:', messagesData);
    // Force refresh if we can't parse the data properly
    if (conversationId && messagesData && typeof messagesData === 'object') {
      console.log('Attempting to refetch messages due to parsing issue');
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", conversationId, "messages"] 
      });
    }
    return [];
  }, [messagesData, conversationId, queryClient]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { content: string }) => {
      console.log('Sending message:', data);
      console.log('To conversation:', conversationId);
      const response = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, data);
      return await response.json();
    },
    onSuccess: async (response) => {
      console.log('Message sent successfully:', response);
      setNewMessage("");

      // Force immediate refetch of messages
      await queryClient.refetchQueries({ 
        queryKey: ["/api/conversations", conversationId, "messages"] 
      });
      await queryClient.refetchQueries({
        queryKey: ["/api/conversations"]
      });

      // Also invalidate for good measure
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
                  <p className="text-xs text-gray-500 mt-2">Loading messages...</p>
                </div>
              ) : messagesError ? (
                <div className="text-center py-8 text-red-500">
                  <p className="text-sm">Error loading messages</p>
                  <p className="text-xs">{messagesError.message}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="text-blue-500 underline text-xs mt-2"
                  >
                    Retry
                  </button>
                </div>
              ) : !messages || messages.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs">Start the conversation about your booking!</p>
                  {conversationId && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400">Conversation ID: {conversationId}</p>
                      <p className="text-xs text-gray-400">Loading: {loadingMessages ? 'Yes' : 'No'}</p>
                      <p className="text-xs text-gray-400">Messages count: {messages ? messages.length : 'null'}</p>
                      <p className="text-xs text-gray-400">Raw data type: {typeof messagesData}</p>
                      <p className="text-xs text-gray-400">Raw data is array: {Array.isArray(messagesData) ? 'Yes' : 'No'}</p>
                      {messagesData && typeof messagesData === 'object' && (
                        <p className="text-xs text-gray-400">Raw data keys: {Object.keys(messagesData).join(', ')}</p>
                      )}
                    </div>
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