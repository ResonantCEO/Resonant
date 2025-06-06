import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";

interface BookingCalendarProps {
  profileId: number;
  isOwner: boolean;
  profileType: string;
}

interface AvailabilitySlot {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
}

interface Booking {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  eventTitle: string;
  eventDescription?: string;
  bookerName?: string;
  bookerEmail?: string;
}

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", 
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"
];

export default function BookingCalendar({ profileId, isOwner, profileType }: BookingCalendarProps) {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isSlotDialogOpen, setIsSlotDialogOpen] = useState(false);
  const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<AvailabilitySlot | null>(null);
  const [slotFormData, setSlotFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
    status: "available",
    notes: ""
  });
  const [bookingFormData, setBookingFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "09:00",
    endTime: "10:00",
    eventTitle: "",
    eventDescription: "",
    bookerName: "",
    bookerEmail: "",
    contactInfo: ""
  });

  // Get current week dates
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch availability slots
  const { data: availabilitySlots = [] } = useQuery<AvailabilitySlot[]>({
    queryKey: [`/api/profiles/${profileId}/availability`],
  });

  // Fetch bookings
  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: [`/api/profiles/${profileId}/bookings`],
  });

  // Create/update availability slot
  const createSlotMutation = useMutation({
    mutationFn: (data: any) => 
      editingSlot 
        ? apiRequest(`/api/profiles/${profileId}/availability/${editingSlot.id}`, "PATCH", data)
        : apiRequest(`/api/profiles/${profileId}/availability`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/availability`] });
      setIsSlotDialogOpen(false);
      setEditingSlot(null);
      resetSlotForm();
      toast({ description: editingSlot ? "Availability updated" : "Availability slot created" });
    },
    onError: () => {
      toast({ description: "Failed to save availability slot", variant: "destructive" });
    }
  });

  // Delete availability slot
  const deleteSlotMutation = useMutation({
    mutationFn: (slotId: number) => 
      apiRequest(`/api/profiles/${profileId}/availability/${slotId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/availability`] });
      toast({ description: "Availability slot deleted" });
    },
    onError: () => {
      toast({ description: "Failed to delete availability slot", variant: "destructive" });
    }
  });

  // Create booking
  const createBookingMutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/api/profiles/${profileId}/bookings`, "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profileId}/bookings`] });
      setIsBookingDialogOpen(false);
      resetBookingForm();
      toast({ description: "Booking request submitted" });
    },
    onError: () => {
      toast({ description: "Failed to create booking", variant: "destructive" });
    }
  });

  const resetSlotForm = () => {
    setSlotFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "10:00",
      status: "available",
      notes: ""
    });
  };

  const resetBookingForm = () => {
    setBookingFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      startTime: "09:00",
      endTime: "10:00",
      eventTitle: "",
      eventDescription: "",
      bookerName: "",
      bookerEmail: "",
      contactInfo: ""
    });
  };

  const handleSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSlotMutation.mutate(slotFormData);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBookingMutation.mutate(bookingFormData);
  };

  const editSlot = (slot: AvailabilitySlot) => {
    setEditingSlot(slot);
    setSlotFormData({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.status,
      notes: slot.notes || ""
    });
    setIsSlotDialogOpen(true);
  };

  const deleteSlot = (slotId: number) => {
    deleteSlotMutation.mutate(slotId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-100 text-green-800";
      case "unavailable": return "bg-red-100 text-red-800";
      case "booked": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getSlotsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return availabilitySlots.filter(slot => slot.date === dateStr);
  };

  const getBookingsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return bookings.filter(booking => booking.date === dateStr);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Calendar className="w-6 h-6 mr-2" />
          Booking Calendar
        </h2>
        <div className="flex gap-2">
          {isOwner && (
            <Dialog open={isSlotDialogOpen} onOpenChange={setIsSlotDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { resetSlotForm(); setEditingSlot(null); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Set Availability
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSlot ? "Edit Availability" : "Set Availability"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSlotSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={slotFormData.date}
                      onChange={(e) => setSlotFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Select
                        value={slotFormData.startTime}
                        onValueChange={(value) => setSlotFormData(prev => ({ ...prev, startTime: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Select
                        value={slotFormData.endTime}
                        onValueChange={(value) => setSlotFormData(prev => ({ ...prev, endTime: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={slotFormData.status}
                      onValueChange={(value) => setSlotFormData(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={slotFormData.notes}
                      onChange={(e) => setSlotFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any notes about this time slot..."
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createSlotMutation.isPending}>
                    {editingSlot ? "Update" : "Create"} Availability
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          {!isOwner && (
            <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={resetBookingForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Request Booking
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Booking</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="eventTitle">Event Title</Label>
                    <Input
                      id="eventTitle"
                      value={bookingFormData.eventTitle}
                      onChange={(e) => setBookingFormData(prev => ({ ...prev, eventTitle: e.target.value }))}
                      placeholder="Event name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bookingDate">Date</Label>
                    <Input
                      id="bookingDate"
                      type="date"
                      value={bookingFormData.date}
                      onChange={(e) => setBookingFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bookingStartTime">Start Time</Label>
                      <Select
                        value={bookingFormData.startTime}
                        onValueChange={(value) => setBookingFormData(prev => ({ ...prev, startTime: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bookingEndTime">End Time</Label>
                      <Select
                        value={bookingFormData.endTime}
                        onValueChange={(value) => setBookingFormData(prev => ({ ...prev, endTime: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map(time => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="eventDescription">Event Description</Label>
                    <Textarea
                      id="eventDescription"
                      value={bookingFormData.eventDescription}
                      onChange={(e) => setBookingFormData(prev => ({ ...prev, eventDescription: e.target.value }))}
                      placeholder="Describe your event..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bookerName">Your Name</Label>
                      <Input
                        id="bookerName"
                        value={bookingFormData.bookerName}
                        onChange={(e) => setBookingFormData(prev => ({ ...prev, bookerName: e.target.value }))}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="bookerEmail">Your Email</Label>
                      <Input
                        id="bookerEmail"
                        type="email"
                        value={bookingFormData.bookerEmail}
                        onChange={(e) => setBookingFormData(prev => ({ ...prev, bookerEmail: e.target.value }))}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contactInfo">Contact Information</Label>
                    <Textarea
                      id="contactInfo"
                      value={bookingFormData.contactInfo}
                      onChange={(e) => setBookingFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
                      placeholder="Phone number, additional contact details..."
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createBookingMutation.isPending}>
                    Submit Booking Request
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
          <div key={day} className="text-center font-medium text-gray-700 dark:text-gray-300 p-2">
            {day}
          </div>
        ))}
        
        {weekDates.map(date => {
          const daySlots = getSlotsForDate(date);
          const dayBookings = getBookingsForDate(date);
          
          return (
            <Card key={date.toISOString()} className="min-h-32">
              <CardHeader className="p-2">
                <CardTitle className="text-sm font-medium text-center">
                  {format(date, "d")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {/* Availability Slots */}
                {daySlots.map(slot => (
                  <div key={slot.id} className="text-xs">
                    <div className="flex items-center justify-between">
                      <Badge className={`${getStatusColor(slot.status)} text-xs px-1 py-0`}>
                        {slot.startTime}-{slot.endTime}
                      </Badge>
                      {isOwner && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0"
                            onClick={() => editSlot(slot)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-4 w-4 p-0"
                            onClick={() => deleteSlot(slot.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Bookings */}
                {dayBookings.map(booking => (
                  <div key={booking.id} className="text-xs">
                    <Badge className={`${getStatusColor(booking.status)} text-xs px-1 py-0`}>
                      {booking.startTime}-{booking.endTime}
                    </Badge>
                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {booking.eventTitle}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Week Navigation */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={() => setSelectedDate(addDays(selectedDate, -7))}
        >
          Previous Week
        </Button>
        <span className="font-medium">
          {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
        </span>
        <Button 
          variant="outline" 
          onClick={() => setSelectedDate(addDays(selectedDate, 7))}
        >
          Next Week
        </Button>
      </div>
    </div>
  );
}