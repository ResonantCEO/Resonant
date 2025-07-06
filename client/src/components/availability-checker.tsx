import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, ChevronLeft, ChevronRight, Clock, X, AlertTriangle, User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Helper function to format time from 24-hour to 12-hour format
const formatTime = (time24: string): string => {
  if (!time24) return '';

  const [hours, minutes] = time24.split(':');
  const hour = parseInt(hours, 10);
  const minute = minutes || '00';

  if (hour === 0) {
    return `12:${minute} AM`;
  } else if (hour < 12) {
    return `${hour}:${minute} AM`;
  } else if (hour === 12) {
    return `12:${minute} PM`;
  } else {
    return `${hour - 12}:${minute} PM`;
  }
};

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

interface CalendarEvent {
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
  profileId: number;
  profileName: string;
  profileType: 'artist' | 'venue';
  profileImageUrl?: string;
}

interface AvailabilityCheckerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistProfileId: number;
  venueProfileId: number;
  artistName: string;
  venueName: string;
  onDateSelect?: (date: string) => void;
}

export default function AvailabilityChecker({
  open,
  onOpenChange,
  artistProfileId,
  venueProfileId,
  artistName,
  venueName,
  onDateSelect
}: AvailabilityCheckerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [combinedEvents, setCombinedEvents] = useState<CalendarEvent[]>([]);

  // Fetch booking requests for both profiles
  const { data: bookingRequests = [] } = useQuery<BookingRequest[]>({
    queryKey: ["/api/booking-requests"],
    enabled: open,
  });

  // Fetch calendar events from the actual API for both profiles
  const { data: calendarEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events", artistProfileId, venueProfileId],
    queryFn: async () => {
      const profileIds = [artistProfileId, venueProfileId].filter(id => id).join(',');
      const response = await fetch(`/api/calendar-events?profileIds=${profileIds}`);
      if (!response.ok) throw new Error("Failed to fetch calendar events");
      return response.json();
    },
    enabled: !!artistProfileId && !!venueProfileId,
  });

  useEffect(() => {
    if (!open) return;

    // Convert booking requests to calendar events for both artist and venue
    const eventsFromBookings: CalendarEvent[] = bookingRequests
      .filter(request => 
        request.eventDate &&
        (request.status === 'accepted' || request.status === 'pending')
      )
      .flatMap(request => {
        const events: CalendarEvent[] = [];

        // Add event for artist profile if it matches one of our profiles
        if (request.artistProfileId === artistProfileId || request.artistProfileId === venueProfileId) {
          events.push({
            id: `booking-artist-${request.id}`,
            title: `Booking at ${request.venueProfile.name}`,
            date: new Date(request.eventDate!),
            startTime: request.eventTime || '20:00',
            endTime: '', 
            type: 'booking' as const,
            status: request.status === 'accepted' ? 'confirmed' as const : 'pending' as const,
            client: request.venueProfile.name,
            location: request.venueProfile.location || '',
            notes: request.message || '',
            profileId: request.artistProfileId,
            profileName: request.artistProfile?.name || 'Unknown Artist',
            profileType: 'artist' as const,
            profileImageUrl: request.artistProfile?.profileImageUrl
          });
        }

        // Add event for venue profile if it matches one of our profiles
        if (request.venueProfileId === artistProfileId || request.venueProfileId === venueProfileId) {
          events.push({
            id: `booking-venue-${request.id}`,
            title: `Booking with ${request.artistProfile.name}`,
            date: new Date(request.eventDate!),
            startTime: request.eventTime || '20:00',
            endTime: '', 
            type: 'booking' as const,
            status: request.status === 'accepted' ? 'confirmed' as const : 'pending' as const,
            client: request.artistProfile.name,
            location: request.venueProfile.location || '',
            notes: request.message || '',
            profileId: request.venueProfileId,
            profileName: request.venueProfile?.name || 'Unknown Venue',
            profileType: 'venue' as const,
            profileImageUrl: request.venueProfile?.profileImageUrl
          });
        }

        return events;
      });

    // Filter calendar events to show events for both profiles and ensure profileName is set
    const relevantCalendarEvents = calendarEvents
      .filter(event => event.profileId === artistProfileId || event.profileId === venueProfileId)
      .map(event => ({
        ...event,
        profileName: event.profileName || (event.profileId === artistProfileId ? artistName : venueName)
      }));

    // Combine all events and remove duplicates by date
    const allEvents = [...relevantCalendarEvents, ...eventsFromBookings];

    setCombinedEvents(allEvents);
  }, [open, bookingRequests, calendarEvents, artistProfileId, venueProfileId, artistName, venueName]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
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

  const getDayEvents = (day: Date) => {
    return combinedEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day.getDate() &&
             eventDate.getMonth() === day.getMonth() &&
             eventDate.getFullYear() === day.getFullYear();
    });
  };

  const getSelectedDateEvents = () => {
    if (!selectedDate) return [];
    return getDayEvents(selectedDate);
  };

  const isDateUnavailable = (date: Date) => {
    const dayEvents = getDayEvents(date);
    return dayEvents.some(event => 
      event.type === 'unavailable' || 
      (event.status === 'confirmed' && event.type === 'booking') ||
      event.type === 'event'
    );
  };

  const getAvailabilityStatus = (date: Date) => {
    const dayEvents = getDayEvents(date);
    const artistEvents = dayEvents.filter(e => e.profileId === artistProfileId);
    const venueEvents = dayEvents.filter(e => e.profileId === venueProfileId);

    const artistUnavailable = artistEvents.some(e => 
      e.type === 'unavailable' || 
      (e.status === 'confirmed' && (e.type === 'booking' || e.type === 'event'))
    );

    const venueUnavailable = venueEvents.some(e => 
      e.type === 'unavailable' || 
      (e.status === 'confirmed' && (e.type === 'booking' || e.type === 'event'))
    );

    if (artistUnavailable && venueUnavailable) {
      return { status: 'both-unavailable', color: 'bg-red-500' };
    } else if (artistUnavailable) {
      return { status: 'artist-unavailable', color: 'bg-orange-500' };
    } else if (venueUnavailable) {
      return { status: 'venue-unavailable', color: 'bg-yellow-500' };
    } else if (dayEvents.length > 0) {
      return { status: 'has-events', color: 'bg-blue-500' };
    }
    return { status: 'available', color: 'bg-green-500' };
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'booking': return 'bg-blue-500';
      case 'event': return 'bg-purple-500';
      case 'rehearsal': return 'bg-yellow-500';
      case 'meeting': return 'bg-gray-500';
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Check Available Dates - {artistName} & {venueName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Availability Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Both Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded"></div>
                  <span>Artist Unavailable</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Venue Unavailable</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Both Unavailable</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span>Has Events</span>
                </div>
              </div>
            </CardContent>
          </Card>

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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                    {day}
                  </div>
                ))}
                {days.map((day, index) => {
                  const dayEvents = getDayEvents(day);
                  const isToday = day.toDateString() === new Date().toDateString();
                  const isSelected = selectedDate?.toDateString() === day.toDateString();
                  const isCurrentMonth = day.getMonth() === currentMonth;
                  const availability = getAvailabilityStatus(day);

                  return (
                    <div
                      key={index}
                      className={`
                        min-h-[60px] p-1 border cursor-pointer transition-colors relative
                        ${isCurrentMonth ? 'border-gray-200' : 'border-gray-100 text-gray-400'}
                        ${isToday ? 'ring-2 ring-blue-200' : ''}
                        ${isSelected ? 'ring-2 ring-blue-400' : ''}
                        hover:bg-gray-50
                      `}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`text-sm font-semibold ${
                          !isCurrentMonth ? 'text-gray-400' :
                          isToday ? 'text-blue-600' :
                          availability.status === 'both-unavailable' ? 'text-red-600' :
                          availability.status === 'artist-unavailable' ? 'text-orange-600' :
                          availability.status === 'venue-unavailable' ? 'text-yellow-600' :
                          availability.status === 'has-events' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {day.getDate()}
                        </div>

                        {/* Profile indicator - show profile avatar for events */}
                        {isCurrentMonth && dayEvents.length > 0 && (
                          <div className="flex items-center space-x-1">
                            {dayEvents.slice(0, 2).map((event, i) => (
                              <div key={i} className="flex items-center">
                                <Avatar className="w-4 h-4 border border-white">
                                  <AvatarImage src={event.profileImageUrl} alt={event.profileName} />
                                  <AvatarFallback className="text-xs font-medium">
                                    {event.profileName?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center text-xs font-medium text-white border border-white">
                                +{dayEvents.length - 2}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Event indicators */}
                      {dayEvents.slice(0, 2).map((event, i) => (
                        <div
                          key={i}
                          className={`text-xs px-1 py-0.5 rounded text-white truncate ${getTypeColor(event.type)} relative`}
                          title={`${event.profileName || 'Unknown'} (${event.profileType}): ${event.title} - ${event.status}`}
                        >
                          {event.status === 'pending' && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full border border-white"></span>
                          )}
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-gray-500">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Details */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'Select a Date'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDate && getSelectedDateEvents().length > 0 ? (
                    <div className="space-y-4">
                      {getSelectedDateEvents().map((event) => (
                        <div key={event.id} className={`bg-white p-3 rounded border ${event.status === 'pending' ? 'border-l-4 border-l-yellow-500' : event.status === 'confirmed' ? 'border-l-4 border-l-green-500' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              {/* Event Title */}
                              <h5 className="font-medium mb-2">
                                {event.status === 'pending' ? '⏳ ' : event.status === 'confirmed' ? '✅ ' : ''}{event.title}
                              </h5>

                              {/* Profile Info with Avatar */}
                              <div className="flex items-center space-x-2 mb-2">
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={event.profileImageUrl} alt={event.profileName} />
                                  <AvatarFallback className="text-xs font-medium">
                                    {event.profileName?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm text-gray-700">{event.profileName || 'Unknown'}</span>
                              </div>

                              {/* Time */}
                              {event.startTime && (
                                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                                  <Clock className="w-4 h-4" />
                                  <span>
                                    {formatTime(event.startTime)}
                                    {event.endTime && ` - ${formatTime(event.endTime)}`}
                                  </span>
                                </div>
                              )}

                              {/* Notes */}
                              {event.notes && (
                                <p className="text-xs text-gray-600 mb-2">{event.notes}</p>
                              )}

                              {/* Badges at bottom */}
                              <div className="flex items-center space-x-2 mt-2">
                                <Badge variant="outline" className={`${getTypeColor(event.type)} text-white`}>
                                  {event.type}
                                </Badge>
                                <Badge variant="outline" className={getStatusColor(event.status)}>
                                  {event.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          {(event.type === 'unavailable' || 
                            (event.status === 'confirmed' && (event.type === 'booking' || event.type === 'event'))) && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              ⚠️ Date Unavailable
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : selectedDate && !isDateUnavailable(selectedDate) ? (
                    <div className="text-center py-8">
                      <div className="text-green-600 text-lg mb-2">✅</div>
                      <p className="text-green-700 font-medium">Date Available</p>
                      <div className="text-sm text-gray-400 mb-4">
                        Both {artistName} and {venueName} are available on this date
                      </div>
                      {onDateSelect && (
                        <Button
                          onClick={() => {
                            const dateString = selectedDate.toISOString().split('T')[0];
                            onDateSelect(dateString);
                            onOpenChange(false);
                          }}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          Select This Date
                        </Button>
                      )}
                    </div>
                  ) : selectedDate ? (
                    <div className="text-center py-8">
                      <div className="text-red-600 text-lg mb-2">❌</div>
                      <p className="text-red-700 font-medium">Date Unavailable</p>
                      <p className="text-sm text-gray-600 mt-1">
                        One or both parties have conflicts on this date
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Click on a date to see availability details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}