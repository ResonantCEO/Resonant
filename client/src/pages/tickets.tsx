
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useSidebar } from "@/hooks/useSidebar";
import Sidebar from "@/components/sidebar";
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  Clock, 
  Music, 
  Building, 
  CheckCircle, 
  XCircle,
  Download,
  QrCode,
  Star,
  Share2,
  Filter,
  Search,
  Send,
  RotateCcw,
  DollarSign,
  Gift
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";

export default function Tickets() {
  const { isCollapsed } = useSidebar();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  // Redirect non-audience accounts
  if (activeProfile && activeProfile.type !== "audience") {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className={`flex-1 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pt-16 lg:pt-0`}>
          <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
            <div className="text-center">
              <div className="text-red-500 dark:text-red-400 mb-4">
                <XCircle className="w-16 h-16 mx-auto mb-4" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Restricted</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                The tickets page is only available for audience accounts.
              </p>
              <Button onClick={() => setLocation("/profile")}>
                Return to Profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { data: userTickets } = useQuery({
    queryKey: ["/api/tickets"],
    enabled: !!activeProfile,
  });

  // Mock ticket data - will be replaced by real API data
  const mockTickets = userTickets || [
    {
      id: 1,
      eventName: "Arctic Monkeys Live",
      artistName: "Arctic Monkeys",
      artistImage: "/uploads/profile-1748278922133-878620440.jpg",
      venue: "Red Rocks Amphitheatre",
      venueImage: "/uploads/profile-1748279223336-857800152.jpg",
      date: "2025-07-15T20:00:00Z",
      section: "Section A",
      row: "Row 12",
      seat: "Seat 15-16",
      price: 89.50,
      status: "confirmed",
      ticketType: "General Admission",
      qrCode: "TICKET_123456789",
      orderNumber: "ORD-2025-001",
      purchaseDate: "2025-05-20T10:30:00Z"
    },
    {
      id: 2,
      eventName: "Local Music Festival 2025",
      artistName: "Various Artists",
      venue: "Downtown Park",
      date: "2025-08-22T14:00:00Z",
      section: "VIP Area",
      price: 125.00,
      status: "confirmed",
      ticketType: "VIP Pass",
      qrCode: "TICKET_987654321",
      orderNumber: "ORD-2025-002",
      purchaseDate: "2025-06-01T15:45:00Z"
    },
    {
      id: 3,
      eventName: "Jazz Night at Blue Note",
      artistName: "The Jazz Collective",
      venue: "Blue Note Jazz Club",
      date: "2025-06-30T19:30:00Z",
      section: "Front Table",
      price: 45.00,
      status: "pending",
      ticketType: "Reserved Seating",
      qrCode: "TICKET_456123789",
      orderNumber: "ORD-2025-003",
      purchaseDate: "2025-06-20T12:00:00Z"
    },
    {
      id: 4,
      eventName: "Indie Rock Showcase",
      artistName: "The Midnight Sons",
      venue: "The Venue",
      date: "2025-05-15T21:00:00Z",
      section: "General",
      price: 35.00,
      status: "used",
      ticketType: "General Admission",
      qrCode: "TICKET_789456123",
      orderNumber: "ORD-2025-004",
      purchaseDate: "2025-05-10T09:15:00Z"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500 text-white"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "used":
        return <Badge className="bg-gray-500 text-white"><CheckCircle className="w-3 h-3 mr-1" />Used</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-500 text-white">{status}</Badge>;
    }
  };

  const filterTickets = (tickets: any[], tab: string) => {
    const now = new Date();
    let filtered = tickets;

    // Filter by tab
    switch (tab) {
      case "upcoming":
        filtered = tickets.filter(ticket => new Date(ticket.date) > now && ticket.status !== "cancelled");
        break;
      case "past":
        filtered = tickets.filter(ticket => new Date(ticket.date) <= now || ticket.status === "used");
        break;
      case "cancelled":
        filtered = tickets.filter(ticket => ticket.status === "cancelled");
        break;
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(ticket =>
        ticket.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.artistName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.venue.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  // Transfer Dialog Component
  const TransferDialog = ({ ticket }: { ticket: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [transferType, setTransferType] = useState("free");
    const [recipient, setRecipient] = useState("");
    const [salePrice, setSalePrice] = useState("");
    const [message, setMessage] = useState("");
    const queryClient = useQueryClient();

    const transferMutation = useMutation({
      mutationFn: async (data: any) => {
        const response = await fetch(`/api/tickets/${ticket.id}/transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Transfer failed');
        return response.json();
      },
      onSuccess: () => {
        toast({ title: "Transfer initiated", description: "The recipient will be notified." });
        setIsOpen(false);
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      },
      onError: (error: any) => {
        toast({ title: "Transfer failed", description: error.message, variant: "destructive" });
      }
    });

    const handleTransfer = () => {
      const data: any = {
        toEmail: recipient,
        transferType,
        message,
      };
      
      if (transferType === "sale") {
        data.salePrice = parseFloat(salePrice);
      }

      transferMutation.mutate(data);
    };

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <Send className="w-4 h-4 mr-1" />
            Transfer
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Transfer Type</Label>
              <RadioGroup value={transferType} onValueChange={setTransferType} className="mt-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="free" id="free" />
                  <Label htmlFor="free" className="flex items-center">
                    <Gift className="w-4 h-4 mr-1" />
                    Send for free
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sale" id="sale" />
                  <Label htmlFor="sale" className="flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Sell ticket
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="recipient">Recipient Email</Label>
              <Input
                id="recipient"
                type="email"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="friend@example.com"
              />
            </div>

            {transferType === "sale" && (
              <div>
                <Label htmlFor="price">Sale Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}

            <div>
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={() => setIsOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleTransfer} 
                disabled={!recipient || (transferType === "sale" && !salePrice) || transferMutation.isPending}
                className="flex-1"
              >
                {transferMutation.isPending ? "Sending..." : "Send Transfer"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Return Dialog Component
  const ReturnDialog = ({ ticket }: { ticket: any }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [reasonDetails, setReasonDetails] = useState("");
    const queryClient = useQueryClient();

    const returnMutation = useMutation({
      mutationFn: async (data: any) => {
        const response = await fetch(`/api/tickets/${ticket.id}/return`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Return request failed');
        return response.json();
      },
      onSuccess: () => {
        toast({ title: "Return request submitted", description: "We'll process your request within 3-5 business days." });
        setIsOpen(false);
        queryClient.invalidateQueries({ queryKey: ["tickets"] });
      },
      onError: (error: any) => {
        toast({ title: "Return failed", description: error.message, variant: "destructive" });
      }
    });

    const handleReturn = () => {
      returnMutation.mutate({ reason, reasonDetails });
    };

    // Calculate estimated refund (5% processing fee)
    const processingFee = ticket.price * 0.05;
    const estimatedRefund = ticket.price - processingFee;

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <RotateCcw className="w-4 h-4 mr-1" />
            Return
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Return Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>Estimated Refund:</strong> ${estimatedRefund.toFixed(2)}
                <br />
                <span className="text-xs">Processing fee: ${processingFee.toFixed(2)} (5%)</span>
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason for return</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cant_attend">Can't attend</SelectItem>
                  <SelectItem value="event_cancelled">Event cancelled</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="details">Additional details (optional)</Label>
              <Textarea
                id="details"
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                placeholder="Provide more details about your return request..."
                rows={3}
              />
            </div>

            <div className="flex space-x-2">
              <Button onClick={() => setIsOpen(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleReturn} 
                disabled={!reason || returnMutation.isPending}
                className="flex-1"
                variant="destructive"
              >
                {returnMutation.isPending ? "Processing..." : "Submit Return"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const TicketCard = ({ ticket }: { ticket: any }) => (
    <Card className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border border-white/20 dark:border-gray-700/30 hover:shadow-lg transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Avatar className="w-12 h-12 border-2 border-blue-500">
                <AvatarImage src={ticket.artistImage} />
                <AvatarFallback>{ticket.artistName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                <Music className="w-3 h-3" />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg text-gray-900 dark:text-white">{ticket.eventName}</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">{ticket.artistName}</p>
            </div>
          </div>
          {getStatusBadge(ticket.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Building className="w-4 h-4 mr-2" />
              {ticket.venue}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              {new Date(ticket.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 mr-2" />
              {new Date(ticket.date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </div>
          </div>
          <div className="space-y-2">
            {ticket.section && (
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Section:</span>
                <span className="font-medium text-gray-900 dark:text-white ml-2">{ticket.section}</span>
              </div>
            )}
            {ticket.row && (
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Row:</span>
                <span className="font-medium text-gray-900 dark:text-white ml-2">{ticket.row}</span>
              </div>
            )}
            {ticket.seat && (
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">Seat:</span>
                <span className="font-medium text-gray-900 dark:text-white ml-2">{ticket.seat}</span>
              </div>
            )}
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Price:</span>
              <span className="font-bold text-green-600 dark:text-green-400 ml-2">${ticket.price}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Order #{ticket.orderNumber}
            </div>
            <div className="flex space-x-2">
              <Button size="sm" variant="outline">
                <QrCode className="w-4 h-4 mr-1" />
                QR Code
              </Button>
              <Button size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              {ticket.status === "confirmed" && (
                <>
                  <TransferDialog ticket={ticket} />
                  <ReturnDialog ticket={ticket} />
                </>
              )}
              <Button size="sm" variant="outline">
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen flex bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-white/20 dark:border-neutral-700/30 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <img src="/resonant-logo.png" alt="Resonant" className="h-8 block dark:hidden" />
            <img src="/resonant-logo-white.png" alt="Resonant" className="h-8 hidden dark:block" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pt-16 lg:pt-0`}>
        <div className="container mx-auto px-4 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Ticket className="w-8 h-8 mr-3 text-blue-500" />
                  My Tickets
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage your event tickets and view upcoming shows
                </p>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events, artists, or venues..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button variant="outline" className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:grid-cols-3">
              <TabsTrigger value="upcoming" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="past" className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Past Events
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="flex items-center">
                <XCircle className="w-4 h-4 mr-2" />
                Cancelled
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-6">
              <div className="space-y-6">
                {filterTickets(mockTickets, "upcoming").length > 0 ? (
                  filterTickets(mockTickets, "upcoming").map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Ticket className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Upcoming Events
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      You don't have any upcoming tickets. Explore events and book your next show!
                    </p>
                    <Button onClick={() => setLocation("/discover")}>
                      <Search className="w-4 h-4 mr-2" />
                      Discover Events
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="past" className="mt-6">
              <div className="space-y-6">
                {filterTickets(mockTickets, "past").length > 0 ? (
                  filterTickets(mockTickets, "past").map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Past Events
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Your attended events will appear here.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="cancelled" className="mt-6">
              <div className="space-y-6">
                {filterTickets(mockTickets, "cancelled").length > 0 ? (
                  filterTickets(mockTickets, "cancelled").map((ticket) => (
                    <TicketCard key={ticket.id} ticket={ticket} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <XCircle className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Cancelled Tickets
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Your cancelled tickets will appear here.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Quick Stats */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border border-white/20 dark:border-gray-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events Attended</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mockTickets.filter(t => t.status === "used").length}
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border border-white/20 dark:border-gray-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {filterTickets(mockTickets, "upcoming").length}
                </div>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border border-white/20 dark:border-gray-700/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${mockTickets.reduce((sum, ticket) => sum + ticket.price, 0).toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
