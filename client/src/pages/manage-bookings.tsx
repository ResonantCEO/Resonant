
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  DollarSign, 
  MapPin, 
  Users, 
  FileText,
  Filter,
  Search,
  Download,
  Eye,
  MessageSquare,
  ChevronRight
} from "lucide-react";
import EventManagement from "@/components/event-management";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BookingManagement from "@/components/booking-management";
import BookingCalendar from "@/components/booking-calendar";
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/hooks/useSidebar";

interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  revenue: number;
}

export default function ManageBookings() {
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  // Fetch active profile
  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  // Fetch booking requests
  const { data: bookingRequests = [], isLoading } = useQuery({
    queryKey: ["/api/booking-requests"],
  });

  // Calculate booking statistics
  const bookingStats: BookingStats = {
    total: bookingRequests.length,
    pending: bookingRequests.filter(req => req.status === 'pending').length,
    confirmed: bookingRequests.filter(req => req.status === 'accepted').length,
    completed: bookingRequests.filter(req => req.status === 'completed').length,
    revenue: bookingRequests
      .filter(req => req.status === 'accepted' && req.budget)
      .reduce((total, req) => total + (req.budget || 0), 0)
  };

  // Filter bookings based on search and filters
  const filteredBookings = bookingRequests.filter(booking => {
    const matchesSearch = searchTerm === "" || 
      (activeProfile?.type === 'venue' 
        ? booking.artistProfile?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        : booking.venueProfile?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    
    const matchesDate = dateFilter === "all" || (() => {
      if (!booking.eventDate) return false;
      const eventDate = new Date(booking.eventDate);
      const now = new Date();
      
      switch (dateFilter) {
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

  if (!activeProfile) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className={`flex-1 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pt-16 lg:pt-0`}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-neutral-300 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className={`flex-1 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pt-16 lg:pt-0`}>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Manage Bookings
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {activeProfile.type === 'venue' 
                    ? 'Track and manage your venue booking requests'
                    : 'Monitor your performance booking requests'
                  }
                </p>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Reports
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total Bookings
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {bookingStats.total}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Pending
                      </p>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                        {bookingStats.pending}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Confirmed
                      </p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {bookingStats.confirmed}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        Completed
                      </p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {bookingStats.completed}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
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
                        ${bookingStats.revenue.toLocaleString()}
                      </p>
                    </div>
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="requests">Requests</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Filter className="w-5 h-5" />
                    <span>Filters & Search</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={`Search ${activeProfile.type === 'venue' ? 'artists' : 'venues'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="accepted">Confirmed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
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
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setDateFilter("all");
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Bookings */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Booking Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-6 h-6 border-4 border-neutral-300 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No bookings found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                          ? "Try adjusting your filters to see more results."
                          : activeProfile.type === 'venue'
                          ? "You haven't received any booking requests yet."
                          : "You haven't sent any booking requests yet."
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredBookings.slice(0, 5).map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <img
                              src={
                                activeProfile.type === 'venue' 
                                  ? booking.artistProfile?.profileImageUrl || "/default-avatar.png"
                                  : booking.venueProfile?.profileImageUrl || "/default-venue.png"
                              }
                              alt="Profile"
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div>
                              <h4 className="font-medium">
                                {activeProfile.type === 'venue' 
                                  ? booking.artistProfile?.name 
                                  : booking.venueProfile?.name
                                }
                              </h4>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                                {booking.eventDate && (
                                  <span className="flex items-center space-x-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(booking.eventDate).toLocaleDateString()}</span>
                                  </span>
                                )}
                                {booking.budget && (
                                  <span className="flex items-center space-x-1">
                                    <DollarSign className="w-3 h-3" />
                                    <span>${booking.budget}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge 
                              className={
                                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                booking.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              }
                            >
                              {booking.status}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MessageSquare className="w-4 h-4" />
                            </Button>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      ))}
                      {filteredBookings.length > 5 && (
                        <div className="text-center pt-4">
                          <Button variant="outline">
                            View All {filteredBookings.length} Bookings
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests">
              <BookingManagement profileType={activeProfile.type as 'artist' | 'venue'} />
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events">
              <EventManagement activeProfile={activeProfile} />
            </TabsContent>

            {/* Calendar Tab */}
            <TabsContent value="calendar">
              <Card>
                <CardHeader>
                  <CardTitle>Booking Calendar</CardTitle>
                </CardHeader>
                <CardContent>
                  <BookingCalendar />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Booking Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>Analytics dashboard coming soon</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span>Response Rate</span>
                        <span className="font-medium">85%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Average Response Time</span>
                        <span className="font-medium">2.3 hours</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Booking Confirmation Rate</span>
                        <span className="font-medium">
                          {bookingStats.total > 0 ? Math.round((bookingStats.confirmed / bookingStats.total) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
