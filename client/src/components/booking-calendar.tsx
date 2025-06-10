
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, MapPin, User } from "lucide-react";

interface Booking {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: 'booking' | 'event' | 'rehearsal' | 'meeting';
  status: 'confirmed' | 'pending' | 'cancelled';
  client?: string;
  location?: string;
  notes?: string;
}

interface BookingCalendarProps {
  profileType: 'artist' | 'venue';
}

export default function BookingCalendar({ profileType }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([
    {
      id: '1',
      title: profileType === 'artist' ? 'Studio Session' : 'Live Performance',
      date: new Date(2025, 5, 15),
      startTime: '14:00',
      endTime: '17:00',
      type: 'booking',
      status: 'confirmed',
      client: profileType === 'artist' ? 'Record Label XYZ' : 'The Jazz Quartet',
      location: profileType === 'artist' ? 'Studio A' : 'Main Stage',
      notes: 'Equipment setup required 1 hour before'
    },
    {
      id: '2',
      title: profileType === 'artist' ? 'Rehearsal' : 'Private Event',
      date: new Date(2025, 5, 20),
      startTime: '19:00',
      endTime: '22:00',
      type: profileType === 'artist' ? 'rehearsal' : 'event',
      status: 'pending',
      client: profileType === 'artist' ? 'Band Members' : 'Corporate Client',
      location: profileType === 'artist' ? 'Practice Room' : 'VIP Lounge'
    }
  ]);

  const [newBooking, setNewBooking] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    type: 'booking' as const,
    client: '',
    location: '',
    notes: ''
  });

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [currentDate]);

  // Get bookings for a specific date
  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => 
      booking.date.toDateString() === date.toDateString()
    );
  };

  // Handle adding new booking
  const handleAddBooking = () => {
    if (newBooking.title && newBooking.date && newBooking.startTime && newBooking.endTime) {
      const booking: Booking = {
        id: Date.now().toString(),
        ...newBooking,
        date: new Date(newBooking.date),
        status: 'pending'
      };
      setBookings([...bookings, booking]);
      setNewBooking({
        title: '',
        date: '',
        startTime: '',
        endTime: '',
        type: 'booking',
        client: '',
        location: '',
        notes: ''
      });
      setShowBookingDialog(false);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'booking': return 'bg-blue-500';
      case 'event': return 'bg-green-500';
      case 'rehearsal': return 'bg-yellow-500';
      case 'meeting': return 'bg-purple-500';
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>{profileType === 'artist' ? 'Event' : 'Event'} Calendar</span>
          </CardTitle>
          <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add {profileType === 'artist' ? 'Booking' : 'Event'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New {profileType === 'artist' ? 'Booking' : 'Event'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newBooking.title}
                    onChange={(e) => setNewBooking({...newBooking, title: e.target.value})}
                    placeholder={profileType === 'artist' ? 'Studio session, gig, etc.' : 'Event name'}
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newBooking.date}
                    onChange={(e) => setNewBooking({...newBooking, date: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="booking">{profileType === 'artist' ? 'Booking' : 'Booking'}</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="rehearsal">{profileType === 'artist' ? 'Rehearsal' : 'Setup'}</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
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
                    placeholder="Additional details..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowBookingDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddBooking}>
                    Add {profileType === 'artist' ? 'Booking' : 'Event'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = day.toDateString() === new Date().toDateString();
              const dayBookings = getBookingsForDate(day);
              
              return (
                <div
                  key={index}
                  className={`min-h-[80px] p-1 border border-gray-200 cursor-pointer hover:bg-gray-50 ${
                    !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                  } ${isToday ? 'bg-blue-50 border-blue-200' : ''}`}
                  onClick={() => setSelectedDate(day)}
                >
                  <div className={`text-sm font-medium ${isToday ? 'text-blue-600' : ''}`}>
                    {day.getDate()}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayBookings.slice(0, 2).map(booking => (
                      <div
                        key={booking.id}
                        className={`text-xs p-1 rounded text-white truncate ${getTypeColor(booking.type)}`}
                        title={`${booking.title} (${booking.startTime} - ${booking.endTime})`}
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

          {/* Selected Day Details */}
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
                  <div className="space-y-3">
                    {getBookingsForDate(selectedDate).map(booking => (
                      <div key={booking.id} className={`p-3 border rounded-lg ${getStatusColor(booking.status)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{booking.title}</h4>
                            <div className="mt-2 space-y-1 text-sm text-gray-600">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4" />
                                <span>{booking.startTime} - {booking.endTime}</span>
                              </div>
                              {booking.client && (
                                <div className="flex items-center space-x-2">
                                  <User className="w-4 h-4" />
                                  <span>{booking.client}</span>
                                </div>
                              )}
                              {booking.location && (
                                <div className="flex items-center space-x-2">
                                  <MapPin className="w-4 h-4" />
                                  <span>{booking.location}</span>
                                </div>
                              )}
                              {booking.notes && (
                                <p className="mt-2 text-sm">{booking.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <Badge variant="outline" className={getTypeColor(booking.type) + ' text-white'}>
                              {booking.type}
                            </Badge>
                            <Badge variant="outline" className={`ml-2 ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No {profileType === 'artist' ? 'bookings' : 'events'} scheduled for this day
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
