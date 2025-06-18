
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/hooks/useSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, Search, Plus } from "lucide-react";
import { useState } from "react";

export default function MessagesPage() {
  const { isCollapsed } = useSidebar();
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Mock conversations data - replace with actual API calls later
  const conversations = [
    {
      id: 1,
      name: "Sarah Johnson",
      avatar: "",
      lastMessage: "Hey! Are you free for the show tonight?",
      timestamp: "2 min ago",
      unread: 2,
      online: true
    },
    {
      id: 2,
      name: "Music Venue Team",
      avatar: "",
      lastMessage: "Thanks for the great performance!",
      timestamp: "1 hour ago",
      unread: 0,
      online: false
    },
    {
      id: 3,
      name: "Alex Chen",
      avatar: "",
      lastMessage: "Can we collaborate on that track?",
      timestamp: "Yesterday",
      unread: 1,
      online: true
    }
  ];

  const messages = selectedConversation ? [
    {
      id: 1,
      senderId: 2,
      content: "Hey! Are you free for the show tonight?",
      timestamp: "2:30 PM",
      isMe: false
    },
    {
      id: 2,
      senderId: 1,
      content: "Yes, I'll be there! What time should I arrive?",
      timestamp: "2:32 PM",
      isMe: true
    },
    {
      id: 3,
      senderId: 2,
      content: "Around 7 PM would be perfect. Looking forward to it!",
      timestamp: "2:33 PM",
      isMe: false
    }
  ] : [];

  const handleSendMessage = () => {
    if (newMessage.trim() && selectedConversation) {
      // TODO: Implement send message functionality
      console.log("Sending message:", newMessage);
      setNewMessage("");
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
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
                      {filteredConversations.map((conversation) => (
                        <div
                          key={conversation.id}
                          onClick={() => setSelectedConversation(conversation.id)}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedConversation === conversation.id
                              ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                              : "hover:bg-neutral-50 dark:hover:bg-neutral-800"
                          }`}
                        >
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={conversation.avatar} />
                              <AvatarFallback>
                                {conversation.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            {conversation.online && (
                              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-neutral-800"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-neutral-900 dark:text-white truncate">
                                {conversation.name}
                              </p>
                              <span className="text-xs text-neutral-500">
                                {conversation.timestamp}
                              </span>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                              {conversation.lastMessage}
                            </p>
                          </div>
                          {conversation.unread > 0 && (
                            <Badge className="bg-blue-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center">
                              {conversation.unread}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Message View */}
              <Card className="lg:col-span-2 flex flex-col">
                {selectedConversation ? (
                  <>
                    {/* Message Header */}
                    <CardHeader className="pb-4 border-b">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src="" />
                          <AvatarFallback>
                            {conversations.find(c => c.id === selectedConversation)?.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-neutral-900 dark:text-white">
                            {conversations.find(c => c.id === selectedConversation)?.name}
                          </h3>
                          <p className="text-sm text-neutral-500">
                            {conversations.find(c => c.id === selectedConversation)?.online ? "Online" : "Offline"}
                          </p>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Messages */}
                    <CardContent className="flex-1 p-4">
                      <ScrollArea className="h-full">
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${message.isMe ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  message.isMe
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                                }`}
                              >
                                <p className="text-sm">{message.content}</p>
                                <p className={`text-xs mt-1 ${
                                  message.isMe ? 'text-blue-100' : 'text-neutral-500'
                                }`}>
                                  {message.timestamp}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>

                    {/* Message Input */}
                    <div className="p-4 border-t">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type a message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          className="flex-1"
                        />
                        <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
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
