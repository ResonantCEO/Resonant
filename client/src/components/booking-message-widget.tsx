
import { useState, useEffect, useRef } from "react";
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

  // Fetch messages for the conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["/api/conversations", conversationId, "messages"],
    queryFn: () => apiRequest("GET", `/api/conversations/${conversationId}/messages`),
    enabled: !!conversationId && isOpen,
    refetchInterval: 3000, // Refresh every 3 seconds for real-time feel
  });

  // Fetch conversation details
  const { data: conversation } = useQuery({
    queryKey: ["/api/conversations", conversationId],
    queryFn: async () => {
      const conversations = await apiRequest("GET", "/api/conversations");
      return conversations.find((c: any) => c.id === conversationId);
    },
    enabled: !!conversationId && isOpen,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (data: { content: string }) =>
      apiRequest("POST", `/api/conversations/${conversationId}/messages`, data),
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", conversationId, "messages"] 
      });
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
                  {conversation?.name || "Booking Conversation"}
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
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <p className="text-sm">No messages yet.</p>
                  <p className="text-xs">Start the conversation about your booking!</p>
                </div>
              ) : (
                messages.map((message: Message) => {
                  const isCurrentUser = message.senderId === JSON.parse(localStorage.getItem('user') || '{}').profileId;

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
