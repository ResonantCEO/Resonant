
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
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin, User, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";

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
  artistProfile: {
    id: number;
    name: string;
    profileImageUrl?: string;
  };
  venueProfile: {
    id: number;
    name: string;
    profileImageUrl?: string;
  };
}

interface BookingCalendarProps {
  profileType: 'artist' | 'venue';
}

export default function BookingCalendar({ profileType }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [newBooking, setNewBooking] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'booking' as const,
    status: 'confirmed' as const,
    client: '',
    location: '',
    notes: ''
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

  // Mutation for accepting/rejecting booking requests
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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
      notes: ''
    });
    setEditingBooking(null);
  };

  const handleSaveBooking = () => {
    if (!newBooking.title || !newBooking.date || !newBooking.startTime) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const bookingData: Booking = {
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
    };

    if (editingBooking) {
      setBookings(prev => prev.map(b => b.id === editingBooking.id ? bookingData : b));
      toast({
        title: "Success",
        description: "Booking updated successfully",
      });
    } else {
      setBookings(prev => [...prev, bookingData]);
      toast({
        title: "Success",
        description: "Booking created successfully",
      });
    }

    setShowBookingDialog(false);
    resetForm();
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setNewBooking({
      title: booking.title,
      date: booking.date.toISOString().split('T')[0],
      startTime: booking.startTime,
      endTime: booking.endTime,
      type: booking.type,
      status: booking.status,
      client: booking.client || '',
      location: booking.location || '',
      notes: booking.notes || ''
    });
    setShowBookingDialog(true);
  };

  const handleDeleteBooking = (bookingId: string) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    toast({
      title: "Success",
      description: "Booking deleted successfully",
    });
  };

  const handleBookingRequestResponse = (requestId: number, status: 'accepted' | 'rejected') => {
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

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => 
      booking.date.toDateString() === date.toDateString()
    );
  };

  const isDateUnavailable = (date: Date) => {
    const unavailableBookings = getBookingsForDate(date).filter(b => b.type === 'unavailable');
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

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const days = getDaysInMonth(currentDate);
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  return (
    <div className="space-y-6">
      {/* Booking Requests Section - Only for venues */}
      {profileType === 'venue' && bookingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Booking Requests</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookingRequests
                .filter(request => request.status === 'pending')
                .map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">{request.artistProfile.name}</h4>
                        <p className="text-sm text-gray-600">
                          Booking request received on {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 border-green-600 hover:bg-green-50"
                        onClick={() => handleBookingRequestResponse(request.id, 'accepted')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-600 hover:bg-red-50"
                        onClick={() => handleBookingRequestResponse(request.id, 'rejected')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                  {day}
                </div>
              ))}
              {days.map((day, index) => {
                const dayBookings = getBookingsForDate(day);
                const isCurrentMonth = day.getMonth() === currentMonth;
                const isToday = day.toDateString() === new Date().toDateString();
                const isSelected = selectedDate?.toDateString() === day.toDateString();
                const isUnavailable = isDateUnavailable(day);

                return (
                  <div
                    key={index}
                    className={`
                      min-h-[80px] p-1 border cursor-pointer transition-colors
                      ${isCurrentMonth ? 'border-gray-200' : 'border-gray-100 text-gray-400'}
                      ${isToday ? 'bg-blue-50 border-blue-200' : ''}
                      ${isSelected ? 'bg-blue-100 border-blue-300' : ''}
                      ${isUnavailable ? 'bg-red-50 border-red-200' : ''}
                      hover:bg-gray-50
                    `}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className={`text-sm ${isToday ? 'font-bold text-blue-600' : ''}`}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1 mt-1">
                      {dayBookings.slice(0, 2).map((booking, i) => (
                        <div
                          key={i}
                          className={`text-xs px-1 py-0.5 rounded text-white truncate ${getTypeColor(booking.type)}`}
                        >
                          {booking.title}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{dayBookings.length - 2} more
                        </div>
                      )}
                    </div>
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
                  {getBookingsForDate(selectedDate).length > 0 ? (
                    <div className="space-y-4">
                      {getBookingsForDate(selectedDate).map((booking) => (
                        <div key={booking.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-medium">{booking.title}</h4>
                                <Badge variant="outline" className={getTypeColor(booking.type) + ' text-white'}>
                                  {booking.type}
                                </Badge>
                                <Badge variant="outline" className={getStatusColor(booking.status)}>
                                  {booking.status}
                                </Badge>
                              </div>
                              {booking.startTime && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {booking.startTime}
                                    {booking.endTime && ` - ${booking.endTime}`}
                                  </span>
                                </div>
                              )}
                              {booking.client && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                                  <User className="w-4 h-4" />
                                  <span>{booking.client}</span>
                                </div>
                              )}
                              {booking.location && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                                  <MapPin className="w-4 h-4" />
                                  <span>{booking.location}</span>
                                </div>
                              )}
                              {booking.notes && (
                                <p className="mt-2 text-sm text-gray-600">{booking.notes}</p>
                              )}
                            </div>
                            <div className="flex space-x-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditBooking(booking)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteBooking(booking.id)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
