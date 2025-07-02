import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin, User, Edit, Trash2, CheckCircle, XCircle, DollarSign } from "lucide-react";

interface Booking {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'booking' | 'event' | 'rehearsal' | 'meeting' | 'unavailable';
  status: 'confirmed' | 'pending' | 'cancelled';
  client?: string;
  location?: string;
  notes?: string;
  artistProfileId?: number;
  venueProfileId?: number;
  isRequest?: boolean;
}

interface BookingRequest {
  id: number;
  artistProfileId: number;
  venueProfileId: number;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: string;
  eventDate?: string;
  eventTime?: string;
  message?: string;
  budget?: string;
  artistProfile: {
    id: number;
    name: string;
    profileImageUrl?: string;
  };
  venueProfile: {
    id: number;
    name: string;
    profileImageUrl?: string;
    location?: string;
  };
}

interface CalendarEvent extends Omit<Booking, 'date'> {
  date: Date;
  artistProfileId?: number;
  venueProfileId?: number;
  isRequest?: boolean;
  budget?: number;
}

interface BookingCalendarProps {
  profileType: 'artist' | 'venue';
}

export default function BookingCalendar({ profileType }: BookingCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState<CalendarEvent | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [newBooking, setNewBooking] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'booking' as const,
    status: 'confirmed' as const,
    client: '',
    location: '',
    notes: '',
    budget: ''
  });

  const queryClient = useQueryClient();

  // Fetch booking requests
  const { data: bookingRequests = [] } = useQuery<BookingRequest[]>({
    queryKey: ["/api/booking-requests"],
  });

  // Fetch active profile
  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  // Fetch calendar events (mock for now, you can implement actual storage later)
  const { data: storedEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
    queryFn: async () => {
      // Mock calendar data for demonstration
      if (!activeProfile) return [];
      
      const mockEvents: CalendarEvent[] = [
        // Sample events for artist profiles
        {
          id: `mock-${activeProfile.id}-1`,
          title: profileType === 'artist' ? "Band Rehearsal" : "Sound Check",
          date: new Date("2025-07-08T19:00:00Z"),
          startTime: "19:00",
          endTime: "22:00",
          type: "rehearsal",
          status: "confirmed",
          client: profileType === 'artist' ? "Full Band" : "Evening Concert Setup",
          location: profileType === 'artist' ? "Rehearsal Studio A" : activeProfile.name,
          notes: profileType === 'artist' ? "Working on new arrangements for upcoming shows" : "Technical setup for tonight's performance"
        },
        {
          id: `mock-${activeProfile.id}-2`,
          title: profileType === 'artist' ? "Live Performance" : "Jazz Night",
          date: new Date("2025-07-15T20:00:00Z"),
          startTime: "20:00",
          endTime: "23:30",
          type: "booking",
          status: "confirmed",
          client: profileType === 'artist' ? "The Blue Note Lounge" : "Local Jazz Trio",
          location: profileType === 'artist' ? "Downtown Music District" : activeProfile.name,
          notes: profileType === 'artist' ? "Headline show with full production" : "Regular weekly jazz series",
          budget: profileType === 'artist' ? 1500 : 800
        },
        {
          id: `mock-${activeProfile.id}-3`,
          title: profileType === 'artist' ? "Recording Session" : "Private Event",
          date: new Date("2025-07-22T14:00:00Z"),
          startTime: "14:00",
          endTime: "18:00",
          type: profileType === 'artist' ? "event" : "booking",
          status: "pending",
          client: profileType === 'artist' ? "Indie Records" : "Corporate Client",
          location: profileType === 'artist' ? "Soundwave Studios" : activeProfile.name,
          notes: profileType === 'artist' ? "Recording vocals for new album" : "Company celebration event",
          budget: profileType === 'artist' ? 800 : 3500
        },
        {
          id: `mock-${activeProfile.id}-4`,
          title: profileType === 'artist' ? "Photo Shoot" : "Venue Maintenance",
          date: new Date("2025-07-25T10:00:00Z"),
          startTime: "10:00",
          endTime: "15:00",
          type: profileType === 'artist' ? "meeting" : "unavailable",
          status: "confirmed",
          client: profileType === 'artist' ? "Photography Studio" : "Audio Tech Services",
          location: profileType === 'artist' ? "Urban Photo Studio" : activeProfile.name,
          notes: profileType === 'artist' ? "Press photos for album promotion" : "Annual sound system maintenance",
          budget: profileType === 'artist' ? 600 : undefined
        },
        {
          id: `mock-${activeProfile.id}-5`,
          title: profileType === 'artist' ? "Festival Audition" : "Album Release Party",
          date: new Date("2025-08-02T16:00:00Z"),
          startTime: "16:00",
          endTime: "17:30",
          type: profileType === 'artist' ? "meeting" : "event",
          status: profileType === 'artist' ? "pending" : "confirmed",
          client: profileType === 'artist' ? "Summer Music Festival" : "Luna & The Midnight Collective",
          location: profileType === 'artist' ? "Festival Grounds" : activeProfile.name,
          notes: profileType === 'artist' ? "Audition for summer festival slot" : "Exclusive listening party with live performance",
          budget: profileType === 'artist' ? 3000 : 2500
        }
      ];
      
      return mockEvents;
    },
  });

  // Update booking request mutation
  const updateBookingRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number; status: 'accepted' | 'rejected' }) => {
      const response = await fetch(`/api/booking-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update booking request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booking-requests"] });
      toast({
        title: "Success",
        description: "Booking request updated successfully",
      });
      setShowRequestDialog(false);
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    // Convert booking requests to calendar events
    const eventsFromRequests: CalendarEvent[] = bookingRequests
      .filter(request => request.eventDate)
      .map(request => ({
        id: `request-${request.id}`,
        title: profileType === 'artist' 
          ? `Booking at ${request.venueProfile.name}` 
          : `Booking with ${request.artistProfile.name}`,
        date: new Date(request.eventDate!),
        startTime: request.eventTime || '20:00',
        endTime: '', // Can be calculated or added later
        type: 'booking' as const,
        status: request.status === 'accepted' ? 'confirmed' as const : 
               request.status === 'rejected' ? 'cancelled' as const : 'pending' as const,
        client: profileType === 'artist' ? request.venueProfile.name : request.artistProfile.name,
        location: request.venueProfile.location || '',
        notes: request.message || '',
        artistProfileId: request.artistProfileId,
        venueProfileId: request.venueProfileId,
        isRequest: true,
        budget: request.budget ? parseFloat(request.budget) : undefined
      }));

    // Combine with stored events
    setCalendarEvents([...storedEvents, ...eventsFromRequests]);
  }, [bookingRequests, storedEvents, profileType]);

  const resetForm = () => {
    setNewBooking({
      title: '',
      date: '',
      startTime: '',
      endTime: '',
      type: 'booking',
      status: 'confirmed',
      client: '',
      location: '',
      notes: '',
      budget: ''
    });
    setEditingBooking(null);
  };

  const handleSaveBooking = () => {
    if (!newBooking.title || !newBooking.date) {
      toast({
        title: "Error",
        description: "Please fill in the required fields",
        variant: "destructive",
      });
      return;
    }

    const event: CalendarEvent = {
      id: editingBooking?.id || Date.now().toString(),
      title: newBooking.title,
      date: new Date(newBooking.date),
      startTime: newBooking.startTime,
      endTime: newBooking.endTime,
      type: newBooking.type,
      status: newBooking.status,
      client: newBooking.client,
      location: newBooking.location,
      notes: newBooking.notes,
      budget: newBooking.budget ? parseFloat(newBooking.budget) : undefined
    };

    if (editingBooking) {
      setCalendarEvents(prev => prev.map(e => e.id === event.id ? event : e));
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
    } else {
      setCalendarEvents(prev => [...prev, event]);
      toast({
        title: "Success",
        description: "Event created successfully",
      });
    }

    setShowBookingDialog(false);
    setEditingBooking(null);
    setNewBooking({
      title: '',
      date: '',
      startTime: '',
      endTime: '',
      type: 'booking',
      status: 'confirmed',
      client: '',
      location: '',
      notes: '',
      budget: ''
    });
  };

  const handleEditEvent = (event: CalendarEvent) => {
    if (event.isRequest) {
      // If it's a booking request, open request dialog instead
      const request = bookingRequests.find(r => `request-${r.id}` === event.id);
      if (request) {
        setSelectedRequest(request);
        setShowRequestDialog(true);
      }
      return;
    }

    setEditingBooking(event);
    setNewBooking({
      title: event.title,
      date: event.date.toISOString().split('T')[0],
      startTime: event.startTime,
      endTime: event.endTime,
      type: event.type,
      status: event.status,
      client: event.client || '',
      location: event.location || '',
      notes: event.notes || '',
      budget: event.budget?.toString() || ''
    });
    setShowBookingDialog(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    const event = calendarEvents.find(e => e.id === eventId);
    if (event?.isRequest) {
      toast({
        title: "Cannot Delete",
        description: "Booking requests must be accepted or rejected, not deleted.",
        variant: "destructive",
      });
      return;
    }

    setCalendarEvents(prev => prev.filter(e => e.id !== eventId));
    toast({
      title: "Success",
      description: "Event deleted successfully",
    });
  };

  const handleBookingResponse = (requestId: number, status: 'accepted' | 'rejected') => {
    updateBookingRequestMutation.mutate({ requestId, status });
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getDayEvents = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return calendarEvents.filter(event => {
      const eventDate = event.date;
      return eventDate.getDate() === day &&
             eventDate.getMonth() === currentMonth &&
             eventDate.getFullYear() === currentYear;
    });
  };

  const getSelectedDateEvents = () => {
    if (!selectedDate) return [];
    return calendarEvents.filter(event => {
      const eventDate = event.date;
      return eventDate.getDate() === selectedDate.getDate() &&
             eventDate.getMonth() === selectedDate.getMonth() &&
             eventDate.getFullYear() === selectedDate.getFullYear();
    });
  };

  const isDateUnavailable = (date: Date) => {
    const unavailableBookings = getSelectedDateEvents().filter(b => b.type === 'unavailable');
    return unavailableBookings.length > 0;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'booking': return 'bg-blue-500';
      case 'event': return 'bg-green-500';
      case 'rehearsal': return 'bg-yellow-500';
      case 'meeting': return 'bg-purple-500';
      case 'unavailable': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'border-green-500 text-green-700';
      case 'pending': return 'border-yellow-500 text-yellow-700';
      case 'cancelled': return 'border-red-500 text-red-700';
      default: return 'border-gray-500 text-gray-700';
    }
  };

  const currentDate = new Date(currentYear, currentMonth);
  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'next') {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    } else {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    }
  };

  const calendarDays = Array.from({ length: new Date(currentYear, currentMonth + 1, 0).getDate() }, (_, i) => i + 1);

  return (
    <div className="space-y-6">


      {/* Calendar Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>{profileType === 'artist' ? 'Event' : 'Event'} Calendar</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Dialog open={showBookingDialog} onOpenChange={(open) => {
                setShowBookingDialog(open);
                if (!open) resetForm();
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700 !text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add {profileType === 'artist' ? 'Booking' : 'Event'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingBooking ? 'Edit' : 'New'} {profileType === 'artist' ? 'Booking' : 'Event'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={newBooking.title}
                        onChange={(e) => setNewBooking({...newBooking, title: e.target.value})}
                        placeholder={profileType === 'artist' ? 'Studio session, gig, etc.' : 'Event name'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={newBooking.date}
                        onChange={(e) => setNewBooking({...newBooking, date: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time *</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newBooking.startTime}
                          onChange={(e) => setNewBooking({...newBooking, startTime: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newBooking.endTime}
                          onChange={(e) => setNewBooking({...newBooking, endTime: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select value={newBooking.type} onValueChange={(value: any) => setNewBooking({...newBooking, type: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="booking">{profileType === 'artist' ? 'Booking' : 'Booking'}</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                          <SelectItem value="rehearsal">{profileType === 'artist' ? 'Rehearsal' : 'Setup'}</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="unavailable">Unavailable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={newBooking.status} onValueChange={(value: any) => setNewBooking({...newBooking, status: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="client">{profileType === 'artist' ? 'Client/Venue' : 'Client/Artist'}</Label>
                      <Input
                        id="client"
                        value={newBooking.client}
                        onChange={(e) => setNewBooking({...newBooking, client: e.target.value})}
                        placeholder={profileType === 'artist' ? 'Venue name or client' : 'Artist or client name'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={newBooking.location}
                        onChange={(e) => setNewBooking({...newBooking, location: e.target.value})}
                        placeholder={profileType === 'artist' ? 'Studio, venue address' : 'Room, stage area'}
                      />
                    </div>
                     <div>
                      <Label htmlFor="budget">Budget</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={newBooking.budget}
                        onChange={(e) => setNewBooking({...newBooking, budget: e.target.value})}
                        placeholder="Enter budget if applicable"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newBooking.notes}
                        onChange={(e) => setNewBooking({...newBooking, notes: e.target.value})}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveBooking} className="bg-blue-600 hover:bg-blue-700 !text-white">
                        {editingBooking ? 'Update' : 'Create'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {monthNames[currentMonth]} {currentYear}
              </h3>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Legend</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span>Booking</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span>Event</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span>Rehearsal</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded"></div>
                    <span>Meeting</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span>Unavailable</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Request</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Confirmed</span>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full ml-3"></div>
                  <span>Pending</span>
                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-3"></div>
                  <span>Booking Request</span>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              {days.map((day, index) => {
                const dayEvents = getDayEvents(day.getDate());
                const isToday = day.toDateString() === new Date().toDateString();
                const isSelected = selectedDate?.toDateString() === day.toDateString();
                const isUnavailable = isDateUnavailable(day);
                const isCurrentMonth = day.getMonth() === currentMonth;

                // Group events by type for better indicators
                const eventsByType = dayEvents.reduce((acc, event) => {
                  acc[event.type] = (acc[event.type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const hasConfirmed = dayEvents.some(e => e.status === 'confirmed');
                const hasPending = dayEvents.some(e => e.status === 'pending');
                const hasRequests = dayEvents.some(e => e.isRequest);

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[80px] p-1 border cursor-pointer transition-colors relative
                      ${isCurrentMonth ? 'border-gray-200' : 'border-gray-100 text-gray-400'}
                      ${isToday ? 'bg-blue-50 border-blue-200' : ''}
                      ${isSelected ? 'bg-blue-100 border-blue-300' : ''}
                      ${isUnavailable ? 'bg-red-50 border-red-200' : ''}
                      hover:bg-gray-50
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    {/* Date number */}
                    <div className={`text-sm flex items-center justify-between ${isToday ? 'font-bold text-blue-600' : ''}`}>
                      <span>{day.getDate()}</span>
                      {/* Status indicator dots */}
                      {dayEvents.length > 0 && (
                        <div className="flex space-x-1">
                          {hasConfirmed && (
                            <div className="w-2 h-2 bg-green-500 rounded-full" title="Confirmed events"></div>
                          )}
                          {hasPending && (
                            <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Pending events"></div>
                          )}
                          {hasRequests && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" title="Booking requests"></div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Event indicators */}
                    <div className="space-y-1 mt-1">
                      {/* Show first 2 events as bars */}
                      {dayEvents.slice(0, 2).map((event, i) => (
                        <div
                          key={i}
                          className={`text-xs px-1 py-0.5 rounded text-white truncate ${getTypeColor(event.type)} relative`}
                        >
                          {event.isRequest && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-400 rounded-full border border-white"></span>
                          )}
                          {event.title}
                        </div>
                      ))}
                      
                      {/* Show event type indicators for remaining events */}
                      {dayEvents.length > 2 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(eventsByType).slice(0, 4).map(([type, count]) => (
                            <div
                              key={type}
                              className={`w-3 h-3 rounded-full ${getTypeColor(type)} flex items-center justify-center`}
                              title={`${count} ${type} event${count > 1 ? 's' : ''}`}
                            >
                              {count > 1 && (
                                <span className="text-xs text-white font-bold" style={{ fontSize: '8px' }}>
                                  {count}
                                </span>
                              )}
                            </div>
                          ))}
                          {dayEvents.length > 6 && (
                            <div className="text-xs text-gray-500">
                              +{dayEvents.length - 6}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Event count badge for days with many events */}
                    {dayEvents.length > 3 && (
                      <div className="absolute bottom-1 right-1 bg-gray-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {dayEvents.length}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Selected Date Details */}
            {selectedDate && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getSelectedDateEvents().length > 0 ? (
                    <div className="space-y-4">
                      {getSelectedDateEvents().map((event) => (
                        <div key={event.id} className={`bg-white p-3 rounded border ${event.isRequest ? 'border-l-4 border-l-blue-500' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h5 className="font-medium">
                                  {event.isRequest ? '📩 ' : ''}{event.title}
                                  {event.isRequest && ' (Booking Request)'}
                                </h5>
                                <Badge variant="outline" className={getTypeColor(event.type) + ' text-white'}>
                                  {event.type}
                                </Badge>
                                <Badge variant="outline" className={getStatusColor(event.status)}>
                                  {event.status}
                                </Badge>
                              </div>
                              {event.startTime && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {event.startTime}
                                    {event.endTime && ` - ${event.endTime}`}
                                  </span>
                                </div>
                              )}
                              {event.client && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                                  <User className="w-4 h-4" />
                                  <span>{event.client}</span>
                                </div>
                              )}
                              {event.location && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{event.location}</span>
                                </div>
                              )}
                              {event.budget && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                                  <DollarSign className="w-4 h-4" />
                                  <span>${event.budget}</span>
                                </div>
                              )}
                              {event.notes && (
                                <p className="mt-2 text-sm text-gray-600">{event.notes}</p>
                              )}
                            </div>
                            <div className="flex space-x-2 ml-4">
                              {event.isRequest && profileType === 'venue' && event.status === 'pending' ? (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 !text-white"
                                    onClick={() => {
                                      const request = bookingRequests.find(r => `request-${r.id}` === event.id);
                                      if (request) handleBookingResponse(request.id, 'accepted');
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      const request = bookingRequests.find(r => `request-${r.id}` === event.id);
                                      if (request) handleBookingResponse(request.id, 'rejected');
                                    }}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : !event.isRequest ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditEvent(event)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => handleDeleteEvent(event.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditEvent(event)}
                                >
                                  View Details
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : !isDateUnavailable(selectedDate) ? (
                    <p className="text-gray-500 text-center py-4">
                      No {profileType === 'artist' ? 'bookings' : 'events'} scheduled for this day
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}