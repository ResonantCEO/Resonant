import { useState } from "react";
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
import { Calendar, Clock, MapPin, User, Plus, CheckCircle, XCircle, MessageSquare } from "lucide-react";

interface BookingRequest {
  id: number;
  artistProfileId: number;
  venueProfileId: number;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: string;
  eventDate?: string;
  eventTime?: string;
  budget?: number;
  requirements?: string;
  artistProfile: {
    id: number;
    name: string;
    profileImageUrl?: string;
    bio?: string;
  };
  venueProfile: {
    id: number;
    name: string;
    profileImageUrl?: string;
    location?: string;
  };
}

interface BookingManagementProps {
  profileType: 'artist' | 'venue';
}

export default function BookingManagement({ profileType }: BookingManagementProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [newRequest, setNewRequest] = useState({
    eventDate: '',
    eventTime: '',
    budget: '',
    requirements: '',
    message: ''
  });

  const queryClient = useQueryClient();

  // Fetch booking requests
  const { data: bookingRequests = [], isLoading } = useQuery<BookingRequest[]>({
    queryKey: ["/api/booking-requests"],
  });

  // Fetch venues for artists to book
  const { data: venues = [] } = useQuery({
    queryKey: ["/api/discover", { type: "venue" }],
    enabled: profileType === 'artist',
  });

  // Create booking request mutation
  const createBookingRequestMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('Sending booking request with data:', data);
      const response = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Booking request failed:', response.status, errorData);
        throw new Error(errorData.message || `Failed to create booking request (${response.status})`);
      }

      const result = await response.json();
      console.log('Booking request created successfully:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booking-requests"] });
      setShowRequestDialog(false);
      setSelectedVenue(null);
      setNewRequest({
        eventDate: '',
        eventTime: '',
        budget: '',
        requirements: '',
        message: ''
      });
      toast({
        title: "Success",
        description: "Booking request sent successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Booking request mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send booking request",
        variant: "destructive",
      });
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
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateBookingRequest = () => {
    if (!selectedVenue) {
      toast({
        title: "Error",
        description: "Please select a venue",
        variant: "destructive",
      });
      return;
    }

    if (!newRequest.eventDate) {
      toast({
        title: "Error",
        description: "Please select an event date",
        variant: "destructive",
      });
      return;
    }

    const requestData = {
      venueId: selectedVenue.id,
      eventDate: newRequest.eventDate,
      eventTime: newRequest.eventTime || null,
      budget: newRequest.budget ? parseFloat(newRequest.budget) : null,
      requirements: newRequest.requirements || null,
      message: newRequest.message || null,
    };

    console.log('Creating booking request with data:', requestData);
    createBookingRequestMutation.mutate(requestData);
  };

  const handleBookingResponse = (requestId: number, status: 'accepted' | 'rejected') => {
    updateBookingRequestMutation.mutate({ requestId, status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter requests based on profile type
  const filteredRequests = profileType === 'artist' 
    ? bookingRequests.filter(req => req.artistProfile) // Requests sent by this artist
    : bookingRequests.filter(req => req.venueProfile); // Requests received by this venue

  const pendingRequests = filteredRequests.filter(req => req.status === 'pending');
  const completedRequests = filteredRequests.filter(req => req.status !== 'pending');

  if (isLoading) {
    return <div>Loading booking requests...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with action button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {profileType === 'artist' ? 'Venue Bookings' : 'Booking Requests'}
        </h2>
        {profileType === 'artist' && (
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 !text-white">
                <Plus className="w-4 h-4 mr-2" />
                Request Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Request Venue Booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="venue">Select Venue *</Label>
                  <Select onValueChange={(value) => {
                    const venue = venues.find(v => v.id.toString() === value);
                    setSelectedVenue(venue);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a venue" />
                    </SelectTrigger>
                    <SelectContent>
                      {venues.map((venue: any) => (
                        <SelectItem key={venue.id} value={venue.id.toString()}>
                          {venue.name} {venue.location && `- ${venue.location}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="eventDate">Event Date *</Label>
                    <Input
                      id="eventDate"
                      type="date"
                      value={newRequest.eventDate}
                      onChange={(e) => setNewRequest({...newRequest, eventDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventTime">Event Time</Label>
                    <Input
                      id="eventTime"
                      type="time"
                      value={newRequest.eventTime}
                      onChange={(e) => setNewRequest({...newRequest, eventTime: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    placeholder="Enter your budget"
                    value={newRequest.budget}
                    onChange={(e) => setNewRequest({...newRequest, budget: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="requirements">Technical Requirements</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Sound system, lighting, staging requirements..."
                    value={newRequest.requirements}
                    onChange={(e) => setNewRequest({...newRequest, requirements: e.target.value})}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message to Venue</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell the venue about your event..."
                    value={newRequest.message}
                    onChange={(e) => setNewRequest({...newRequest, message: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateBookingRequest}
                    disabled={createBookingRequestMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 !text-white"
                  >
                    Send Request
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Pending Requests ({pendingRequests.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="font-medium text-lg">
                            {profileType === 'artist' ? request.venueProfile.name : request.artistProfile.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Request sent on {new Date(request.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>

                      {request.eventDate && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(request.eventDate).toLocaleDateString()}
                            {request.eventTime && ` at ${request.eventTime}`}
                          </span>
                        </div>
                      )}

                      {request.budget && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                          <span className="font-medium">Budget:</span>
                          <span>${request.budget}</span>
                        </div>
                      )}

                      {request.requirements && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Requirements:</p>
                          <p className="text-sm text-gray-600">{request.requirements}</p>
                        </div>
                      )}

                      {profileType === 'artist' ? (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">
                            {request.venueProfile.location && `📍 ${request.venueProfile.location}`}
                          </p>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <p className="text-sm text-gray-600">
                            {request.artistProfile.bio && request.artistProfile.bio.substring(0, 100)}
                            {request.artistProfile.bio && request.artistProfile.bio.length > 100 && '...'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col space-y-2 ml-4">
                      {profileType === 'venue' && request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 !text-white"
                            onClick={() => handleBookingResponse(request.id, 'accepted')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleBookingResponse(request.id, 'rejected')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Decline
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        Message
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Requests */}
      {completedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {completedRequests.slice(0, 5).map((request) => (
                <div key={request.id} className="border rounded-lg p-4 opacity-75">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {profileType === 'artist' ? request.venueProfile.name : request.artistProfile.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {request.eventDate && new Date(request.eventDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {profileType === 'artist' ? 'No Booking Requests' : 'No Booking Requests'}
            </h3>
            <p className="text-gray-600 mb-4">
              {profileType === 'artist' 
                ? "You haven't sent any booking requests yet. Start by browsing venues and sending your first request."
                : "You haven't received any booking requests yet. Artists will be able to send you booking requests soon."
              }
            </p>
            {profileType === 'artist' && (
              <Button 
                onClick={() => setShowRequestDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 !text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Send First Request
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}