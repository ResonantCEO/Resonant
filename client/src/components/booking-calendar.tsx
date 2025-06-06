import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO, isToday, isBefore, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, ChevronRight, Calendar, Clock, MapPin, User, Plus, Eye, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BookingCalendarProps {
  profileId: number;
  profileType: "artist" | "venue";
}

const eventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  description: z.string().optional(),
  eventType: z.enum(["concert", "private_event", "rehearsal", "meeting", "recording", "show"]),
  startDateTime: z.string().min(1, "Start date and time is required"),
  endDateTime: z.string().min(1, "End date and time is required"),
  location: z.string().optional(),
  maxCapacity: z.number().optional(),
  ticketPrice: z.string().optional(),
  contactEmail: z.string().email("Valid email is required").optional(),
  contactPhone: z.string().optional(),
  recurring: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
  status: z.enum(["draft", "published", "cancelled"]).default("draft"),
  visibility: z.enum(["public", "private", "friends"]).default("public"),
});

const bookingRequestSchema = z.object({
  venueId: z.number(),
  requestedDateTime: z.string().min(1, "Date and time is required"),
  endDateTime: z.string().min(1, "End date and time is required"),
  eventTitle: z.string().min(1, "Event title is required"),
  eventDescription: z.string().optional(),
  expectedAttendance: z.number().min(1, "Expected attendance is required"),
  setupRequirements: z.string().optional(),
  equipmentNeeds: z.string().optional(),
  budgetRange: z.string().optional(),
  contactEmail: z.string().email("Valid email is required"),
  contactPhone: z.string().optional(),
  artistNotes: z.string().optional(),
});

type EventForm = z.infer<typeof eventSchema>;
type BookingRequestForm = z.infer<typeof bookingRequestSchema>;

export default function BookingCalendar({ profileId, profileType }: BookingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { toast } = useToast();

  // Fetch events for the current profile
  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: [`/api/profiles/${profileId}/events`],
  });

  // Fetch bookings for the current profile
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: [`/api/profiles/${profileId}/bookings`],
  });

  // Fetch venues for booking requests (if artist)
  const { data: venues = [] } = useQuery({
    queryKey: ["/api/venues"],
    enabled: profileType === "artist",
  });

  const eventForm = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      eventType: "concert",
      recurring: "none",
      status: "draft",
      visibility: "public",
    },
  });

  const bookingForm = useForm<BookingRequestForm>({
    resolver: zodResolver(bookingRequestSchema),
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: EventForm) => {
      return apiRequest(`/api/profiles/${profileId}/events`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          profileId,
          startDateTime: new Date(data.startDateTime).toISOString(),
          endDateTime: new Date(data.endDateTime).toISOString(),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/events`] });
      setIsEventDialogOpen(false);
      eventForm.reset();
      toast({
        title: "Event created",
        description: "Your event has been created successfully.",
      });
    },
  });

  // Create booking request mutation
  const createBookingMutation = useMutation({
    mutationFn: async (data: BookingRequestForm) => {
      return apiRequest(`/api/bookings`, {
        method: "POST",
        body: JSON.stringify({
          ...data,
          artistId: profileId,
          requestedDateTime: new Date(data.requestedDateTime).toISOString(),
          endDateTime: new Date(data.endDateTime).toISOString(),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/bookings`] });
      setIsBookingDialogOpen(false);
      bookingForm.reset();
      toast({
        title: "Booking request sent",
        description: "Your booking request has been sent to the venue.",
      });
    },
  });

  // Update booking status mutation (for venues)
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status, notes }: { bookingId: number; status: string; notes?: string }) => {
      return apiRequest(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          venueNotes: notes,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/bookings`] });
      toast({
        title: "Booking updated",
        description: "The booking status has been updated.",
      });
    },
  });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter((event: any) => {
      const eventDate = parseISO(event.startDateTime);
      return isSameDay(eventDate, date);
    });
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking: any) => {
      const bookingDate = parseISO(booking.requestedDateTime);
      return isSameDay(bookingDate, date);
    });
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCreateEvent = () => {
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd'T'HH:mm");
      eventForm.setValue("startDateTime", dateStr);
      eventForm.setValue("endDateTime", dateStr);
    }
    setIsEventDialogOpen(true);
  };

  const handleCreateBooking = () => {
    if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd'T'HH:mm");
      bookingForm.setValue("requestedDateTime", dateStr);
      bookingForm.setValue("endDateTime", dateStr);
    }
    setIsBookingDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-3 h-3" />;
      case "pending":
        return <AlertCircle className="w-3 h-3" />;
      case "rejected":
        return <XCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>{profileType === "venue" ? "Venue Calendar" : "Event Calendar"}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="text-lg font-semibold min-w-[200px] text-center">
                {format(currentDate, "MMMM yyyy")}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const dayEvents = getEventsForDate(date);
              const dayBookings = getBookingsForDate(date);
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              const isPastDate = isBefore(date, startOfDay(new Date()));
              
              return (
                <div
                  key={date.toISOString()}
                  onClick={() => handleDateClick(date)}
                  className={`
                    min-h-[80px] p-1 border border-gray-200 dark:border-gray-700 cursor-pointer
                    hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                    ${!isSameMonth(date, currentDate) ? 'text-gray-400 dark:text-gray-600' : ''}
                    ${isToday(date) ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : ''}
                    ${isSelected ? 'ring-2 ring-blue-500' : ''}
                    ${isPastDate ? 'opacity-50' : ''}
                  `}
                >
                  <div className="text-sm font-medium mb-1">
                    {format(date, "d")}
                  </div>
                  
                  {/* Events */}
                  {dayEvents.slice(0, 2).map((event: any) => (
                    <div
                      key={event.id}
                      className="text-xs p-1 mb-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded truncate"
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                  
                  {/* Bookings */}
                  {dayBookings.slice(0, 2).map((booking: any) => (
                    <div
                      key={booking.id}
                      className={`text-xs p-1 mb-1 rounded truncate flex items-center space-x-1 ${getStatusColor(booking.status)}`}
                      title={booking.eventTitle}
                    >
                      {getStatusIcon(booking.status)}
                      <span className="truncate">{booking.eventTitle}</span>
                    </div>
                  ))}
                  
                  {/* Show more indicator */}
                  {(dayEvents.length + dayBookings.length) > 2 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{(dayEvents.length + dayBookings.length) - 2} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{format(selectedDate, "EEEE, MMMM d, yyyy")}</CardTitle>
              <div className="flex space-x-2">
                {profileType === "venue" && (
                  <Button onClick={handleCreateEvent} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                )}
                {profileType === "artist" && (
                  <Button onClick={handleCreateBooking} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Request Booking
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="events" className="w-full">
              <TabsList>
                <TabsTrigger value="events">Events</TabsTrigger>
                <TabsTrigger value="bookings">Bookings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="events" className="space-y-4">
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No events scheduled for this date
                  </p>
                ) : (
                  getEventsForDate(selectedDate).map((event: any) => (
                    <div key={event.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{event.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {format(parseISO(event.startDateTime), "h:mm a")} - {format(parseISO(event.endDateTime), "h:mm a")}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{event.description}</p>
                          )}
                          {event.location && (
                            <div className="flex items-center space-x-1 mt-2 text-sm text-gray-600 dark:text-gray-400">
                              <MapPin className="w-3 h-3" />
                              <span>{event.location}</span>
                            </div>
                          )}
                        </div>
                        <Badge variant="secondary">{event.eventType}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
              
              <TabsContent value="bookings" className="space-y-4">
                {getBookingsForDate(selectedDate).length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No bookings for this date
                  </p>
                ) : (
                  getBookingsForDate(selectedDate).map((booking: any) => (
                    <div key={booking.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-semibold">{booking.eventTitle}</h4>
                            <Badge className={getStatusColor(booking.status)}>
                              {getStatusIcon(booking.status)}
                              <span className="ml-1">{booking.status}</span>
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {format(parseISO(booking.requestedDateTime), "h:mm a")} - {format(parseISO(booking.endDateTime), "h:mm a")}
                          </p>
                          {booking.eventDescription && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{booking.eventDescription}</p>
                          )}
                          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                            <div>
                              <span className="font-medium">Expected Attendance:</span> {booking.expectedAttendance}
                            </div>
                            {booking.budgetRange && (
                              <div>
                                <span className="font-medium">Budget:</span> {booking.budgetRange}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {profileType === "venue" && booking.status === "pending" && (
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              onClick={() => updateBookingMutation.mutate({
                                bookingId: booking.id,
                                status: "approved"
                              })}
                              disabled={updateBookingMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBookingMutation.mutate({
                                bookingId: booking.id,
                                status: "rejected"
                              })}
                              disabled={updateBookingMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Create Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
          </DialogHeader>
          <Form {...eventForm}>
            <form onSubmit={eventForm.handleSubmit((data) => createEventMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={eventForm.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Concert at Main Stage" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={eventForm.control}
                  name="eventType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Event Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select event type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="concert">Concert</SelectItem>
                          <SelectItem value="private_event">Private Event</SelectItem>
                          <SelectItem value="rehearsal">Rehearsal</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="recording">Recording</SelectItem>
                          <SelectItem value="show">Show</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={eventForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Event description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={eventForm.control}
                  name="startDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={eventForm.control}
                  name="endDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={eventForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Venue location" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={eventForm.control}
                  name="maxCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Capacity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={eventForm.control}
                  name="ticketPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ticket Price</FormLabel>
                      <FormControl>
                        <Input placeholder="$25 or Free" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={eventForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={eventForm.control}
                  name="visibility"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Visibility</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="friends">Friends Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createEventMutation.isPending}>
                  {createEventMutation.isPending ? "Creating..." : "Create Event"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Booking Request Dialog */}
      <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Request Venue Booking</DialogTitle>
          </DialogHeader>
          <Form {...bookingForm}>
            <form onSubmit={bookingForm.handleSubmit((data) => createBookingMutation.mutate(data))} className="space-y-4">
              <FormField
                control={bookingForm.control}
                name="venueId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue</FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a venue" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {venues.map((venue: any) => (
                          <SelectItem key={venue.id} value={venue.id.toString()}>
                            {venue.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bookingForm.control}
                name="eventTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Live Performance" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bookingForm.control}
                name="eventDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your event..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bookingForm.control}
                  name="requestedDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bookingForm.control}
                  name="endDateTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={bookingForm.control}
                  name="expectedAttendance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Attendance</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="50" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={bookingForm.control}
                  name="budgetRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget Range</FormLabel>
                      <FormControl>
                        <Input placeholder="$500-1000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={bookingForm.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bookingForm.control}
                name="setupRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setup Requirements</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Sound check at 6 PM, stage setup requirements..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={bookingForm.control}
                name="equipmentNeeds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment Needs</FormLabel>
                    <FormControl>
                      <Textarea placeholder="PA system, lighting, microphones..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsBookingDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBookingMutation.isPending}>
                  {createBookingMutation.isPending ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}