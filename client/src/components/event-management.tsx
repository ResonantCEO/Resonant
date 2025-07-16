
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Users, 
  TrendingUp, 
  Edit, 
  Eye, 
  BarChart3,
  Ticket,
  CheckCircle,
  Clock,
  MapPin,
  Music,
  Star,
  Share2,
  Plus,
  Settings,
  Download,
  RefreshCw
} from "lucide-react";
import ContractViewer from "./contract-viewer";

interface EventManagementProps {
  activeProfile: any;
}

export default function EventManagement({ activeProfile }: EventManagementProps) {
  const [selectedContract, setSelectedContract] = useState<number | null>(null);
  const [showContractViewer, setShowContractViewer] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showEventEditor, setShowEventEditor] = useState(false);
  const [eventFilters, setEventFilters] = useState({
    status: "all",
    dateRange: "all",
    search: ""
  });

  const queryClient = useQueryClient();

  // Fetch contracts for this profile
  const { data: contracts = [] } = useQuery({
    queryKey: ["/api/contract-proposals", { proposedBy: activeProfile.id }],
  });

  // Fetch events created from contracts
  const { data: events = [] } = useQuery({
    queryKey: ["/api/events", { organizerId: activeProfile.id }],
  });

  // Fetch ticket sales data
  const { data: ticketSales = [] } = useQuery({
    queryKey: ["/api/ticket-sales", { profileId: activeProfile.id }],
  });

  const handleContractView = (contractId: number) => {
    setSelectedContract(contractId);
    setShowContractViewer(true);
  };

  const handleEventEdit = (event: any) => {
    setSelectedEvent(event);
    setShowEventEditor(true);
  };

  // Filter events based on current filters
  const filteredEvents = events.filter((event: any) => {
    const matchesSearch = eventFilters.search === "" || 
      event.name.toLowerCase().includes(eventFilters.search.toLowerCase());
    
    const matchesStatus = eventFilters.status === "all" || event.status === eventFilters.status;
    
    const matchesDate = eventFilters.dateRange === "all" || (() => {
      const eventDate = new Date(event.eventDate);
      const now = new Date();
      
      switch (eventFilters.dateRange) {
        case "upcoming":
          return eventDate > now;
        case "past":
          return eventDate < now;
        case "this_month":
          return eventDate.getMonth() === now.getMonth() && 
                 eventDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate analytics
  const eventAnalytics = {
    totalEvents: events.length,
    upcomingEvents: events.filter((e: any) => new Date(e.eventDate) > new Date()).length,
    totalTicketsSold: ticketSales.reduce((sum: number, sale: any) => sum + sale.quantity, 0),
    totalRevenue: ticketSales.reduce((sum: number, sale: any) => sum + (sale.quantity * sale.price), 0),
    averageTicketPrice: ticketSales.length > 0 
      ? ticketSales.reduce((sum: number, sale: any) => sum + sale.price, 0) / ticketSales.length 
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Header with Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Events
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {eventAnalytics.totalEvents}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Upcoming
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {eventAnalytics.upcomingEvents}
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Tickets Sold
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {eventAnalytics.totalTicketsSold}
                </p>
              </div>
              <Ticket className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Revenue
                </p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${eventAnalytics.totalRevenue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg. Price
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${eventAnalytics.averageTicketPrice.toFixed(0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="contracts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="contracts">Contract Review</TabsTrigger>
          <TabsTrigger value="events">Event Management</TabsTrigger>
          <TabsTrigger value="analytics">Sales Analytics</TabsTrigger>
        </TabsList>

        {/* Contract Review Tab */}
        <TabsContent value="contracts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Active Contracts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No contracts found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    You haven't created any contract proposals yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contracts.map((contract: any) => (
                    <div key={contract.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium">{contract.title}</h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center space-x-1">
                              <DollarSign className="w-3 h-3" />
                              <span>${contract.payment?.totalAmount || 0}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(contract.createdAt).toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          className={
                            contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            contract.status === 'accepted' ? 'bg-green-100 text-green-800' :
                            contract.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }
                        >
                          {contract.status}
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleContractView(contract.id)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Event Management Tab */}
        <TabsContent value="events" className="space-y-6">
          {/* Event Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Event Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Input
                  placeholder="Search events..."
                  value={eventFilters.search}
                  onChange={(e) => setEventFilters({ ...eventFilters, search: e.target.value })}
                />
                <Select 
                  value={eventFilters.status} 
                  onValueChange={(value) => setEventFilters({ ...eventFilters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="sold_out">Sold Out</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={eventFilters.dateRange} 
                  onValueChange={(value) => setEventFilters({ ...eventFilters, dateRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past Events</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline"
                  onClick={() => setEventFilters({ status: "all", dateRange: "all", search: "" })}
                >
                  Clear Filters
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Your Events</span>
                </CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No events found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {eventFilters.search || eventFilters.status !== "all" || eventFilters.dateRange !== "all"
                      ? "Try adjusting your filters to see more results."
                      : "You haven't created any events yet."
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredEvents.map((event: any) => (
                    <Card key={event.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        {event.eventImageUrl && (
                          <div className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden mb-3">
                            <img 
                              src={event.eventImageUrl} 
                              alt={event.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {event.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {event.description}
                            </p>
                          </div>
                          <Badge 
                            className={
                              event.status === 'published' ? 'bg-green-100 text-green-800' :
                              event.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              event.status === 'sold_out' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }
                          >
                            {event.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Event Details */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(event.eventDate).toLocaleDateString()}
                          </div>
                          {event.eventTime && (
                            <div className="flex items-center text-gray-600 dark:text-gray-400">
                              <Clock className="w-4 h-4 mr-2" />
                              {event.eventTime}
                            </div>
                          )}
                        </div>

                        {event.venue && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4 mr-2" />
                            {event.venue.name}
                          </div>
                        )}

                        {event.genre && (
                          <div className="flex items-center">
                            <Badge variant="outline" className="flex items-center">
                              <Music className="w-3 h-3 mr-1" />
                              {event.genre}
                            </Badge>
                          </div>
                        )}

                        {/* Ticket Sales Summary */}
                        {event.ticketTypes && event.ticketTypes.length > 0 && (
                          <div className="border-t pt-3">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Tickets Sold:</span>
                                <p className="text-green-600 dark:text-green-400 font-semibold">
                                  {event.ticketTypes.reduce((sum: number, ticket: any) => sum + ticket.quantitySold, 0)}
                                </p>
                              </div>
                              <div>
                                <span className="font-medium">Revenue:</span>
                                <p className="text-green-600 dark:text-green-400 font-semibold">
                                  ${event.ticketTypes.reduce((sum: number, ticket: any) => sum + (ticket.quantitySold * ticket.price), 0).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex space-x-2 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => handleEventEdit(event)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Revenue by Event</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.slice(0, 5).map((event: any) => {
                    const eventRevenue = event.ticketTypes?.reduce((sum: number, ticket: any) => 
                      sum + (ticket.quantitySold * ticket.price), 0) || 0;
                    const maxRevenue = Math.max(...events.map((e: any) => 
                      e.ticketTypes?.reduce((sum: number, ticket: any) => 
                        sum + (ticket.quantitySold * ticket.price), 0) || 0));
                    const percentage = maxRevenue > 0 ? (eventRevenue / maxRevenue) * 100 : 0;

                    return (
                      <div key={event.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate">{event.name}</span>
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            ${eventRevenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Ticket Sales Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Ticket className="w-5 h-5" />
                  <span>Tickets Sold by Event</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {events.slice(0, 5).map((event: any) => {
                    const ticketsSold = event.ticketTypes?.reduce((sum: number, ticket: any) => 
                      sum + ticket.quantitySold, 0) || 0;
                    const maxTickets = Math.max(...events.map((e: any) => 
                      e.ticketTypes?.reduce((sum: number, ticket: any) => 
                        sum + ticket.quantitySold, 0) || 0));
                    const percentage = maxTickets > 0 ? (ticketsSold / maxTickets) * 100 : 0;

                    return (
                      <div key={event.id} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium truncate">{event.name}</span>
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">
                            {ticketsSold}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-purple-600 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Average Event Capacity</span>
                    <span className="font-semibold">
                      {events.length > 0 ? Math.round(events.reduce((sum: number, e: any) => sum + (e.capacity || 0), 0) / events.length) : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Average Ticket Price</span>
                    <span className="font-semibold">${eventAnalytics.averageTicketPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Conversion Rate</span>
                    <span className="font-semibold">
                      {events.length > 0 ? Math.round((eventAnalytics.totalTicketsSold / events.reduce((sum: number, e: any) => sum + (e.capacity || 0), 0)) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Revenue per Event</span>
                    <span className="font-semibold">
                      ${events.length > 0 ? Math.round(eventAnalytics.totalRevenue / events.length).toLocaleString() : 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Export Options */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5" />
                  <span>Export & Reports</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Export Sales Data (CSV)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Revenue Report (PDF)
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Event Performance Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Analytics
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Contract Viewer Dialog */}
      <ContractViewer
        open={showContractViewer}
        onOpenChange={setShowContractViewer}
        contractId={selectedContract}
        userProfile={activeProfile}
      />

      {/* Event Editor Dialog */}
      <Dialog open={showEventEditor} onOpenChange={setShowEventEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Event Name</label>
                  <Input defaultValue={selectedEvent.name} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Event Date</label>
                  <Input type="date" defaultValue={selectedEvent.eventDate?.split('T')[0]} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea rows={4} defaultValue={selectedEvent.description} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Genre</label>
                  <Input defaultValue={selectedEvent.genre} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Capacity</label>
                  <Input type="number" defaultValue={selectedEvent.capacity} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Age Restriction</label>
                  <Select defaultValue={selectedEvent.ageRestriction}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_ages">All Ages</SelectItem>
                      <SelectItem value="18+">18+</SelectItem>
                      <SelectItem value="21+">21+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowEventEditor(false)}>
                  Cancel
                </Button>
                <Button>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
