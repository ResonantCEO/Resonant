import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, User, Plus, CheckCircle, XCircle, MessageSquare, BarChart3 } from "lucide-react";
import { FileText } from "lucide-react";
import ContractProposalDialog from './contract-proposal-dialog';
import AvailabilityChecker from './availability-checker';
import BookingMessageWidget from './booking-message-widget';

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
  const [showRequestTypeDialog, setShowRequestTypeDialog] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [newRequest, setNewRequest] = useState({
    eventDate: '',
    eventTime: '',
    budget: '',
    requirements: '',
    message: ''
  });
  const [showContractDialog, setShowContractDialog] = useState(false);
  const [selectedBookingForContract, setSelectedBookingForContract] = useState<any>(null);
  const [showAvailabilityChecker, setShowAvailabilityChecker] = useState(false);
  const [selectedAvailabilityRequest, setSelectedAvailabilityRequest] = useState<any>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [declineMessage, setDeclineMessage] = useState('');
  const [showMessageWidget, setShowMessageWidget] = useState(false);
  const [selectedBookingForMessage, setSelectedBookingForMessage] = useState<any>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);

  const queryClient = useQueryClient();

  // Move mutation to component level to avoid Rules of Hooks violation
  const startBookingConversationMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      return await response.json();
    },
    onSuccess: (data: any) => {
      setConversationId(data.id);
      setShowMessageWidget(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    },
  });

  // Fetch active profile
  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  // Fetch booking requests
  const { data: bookingRequests = [], isLoading } = useQuery<BookingRequest[]>({
    queryKey: ["/api/booking-requests"],
  });

  // Fetch venues for direct booking requests
  const { data: venues = [] } = useQuery({
    queryKey: ['/api/discover'],
    queryFn: async () => {
      const response = await fetch('/api/discover?type=venue');
      if (!response.ok) throw new Error('Failed to fetch venues');
      const data = await response.json();
      // Ensure we only return venue type profiles
      return data.filter((profile: any) => profile.type === 'venue');
    },
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
    mutationFn: async ({ requestId, status, message }: { requestId: number; status: 'accepted' | 'rejected'; message?: string }) => {
      const response = await fetch(`/api/booking-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, declineMessage: message }),
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
      setShowDeclineDialog(false);
      setDeclineMessage('');
      setSelectedRequestId(null);
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
    if (status === 'rejected') {
      setSelectedRequestId(requestId);
      setShowDeclineDialog(true);
    } else {
      updateBookingRequestMutation.mutate({ requestId, status });
    }
  };

  const handleDeclineConfirmation = () => {
    if (selectedRequestId) {
      updateBookingRequestMutation.mutate({ 
        requestId: selectedRequestId, 
        status: 'rejected',
        message: declineMessage || undefined
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-200 text-yellow-900 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter requests based on profile type and active profile
  const filteredRequests = profileType === 'artist'
    ? bookingRequests.filter(req => req.artistProfile && req.artistProfileId === activeProfile?.id) // Requests sent by this artist
    : bookingRequests.filter(req => req.venueProfile && req.venueProfileId === activeProfile?.id); // Requests received by this venue

  const pendingRequests = filteredRequests.filter(req => req.status === 'pending');
  const completedRequests = filteredRequests.filter(req => req.status !== 'pending');

  if (isLoading) {
    return <div>Loading booking requests...</div>;
  }

  const handleMessage = async (request: BookingRequest) => {
    setSelectedBookingForMessage(request);

    // Determine the target profile based on current user's role
    let targetProfileId;
    if (profileType === 'artist') {
      targetProfileId = request.venueProfile?.id;
    } else {
      targetProfileId = request.artistProfile?.id;
    }

    if (!targetProfileId) {
      toast({
        title: "Error",
        description: "Unable to determine conversation partner",
        variant: "destructive",
      });
      return;
    }

    // Check if conversation already exists for this booking
    try {
      const response = await fetch("/api/conversations", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.status}`);
      }

      const conversations = await response.json();
      console.log('All conversations:', conversations);

      // Find existing conversation with the target profile
      const existingConversation = conversations.find((conv: any) => 
        conv.participants?.some((p: any) => p.id === targetProfileId)
      );

      console.log('Existing conversation:', existingConversation);

      if (existingConversation) {
        // Conversation exists, just open it without sending any message
        setConversationId(existingConversation.id);
        setShowMessageWidget(true);
      } else {
        // Create new conversation without sending an initial message
        const createResponse = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: targetProfileId
            // Removed message and bookingRequestId to prevent auto-sending
          })
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create conversation: ${createResponse.status}`);
        }

        const newConversation = await createResponse.json();
        setConversationId(newConversation.id);
        setShowMessageWidget(true);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      toast({
        title: "Error",
        description: "Failed to open conversation",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with action button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {profileType === 'artist' ? 'Venue Bookings' : 'Booking Requests'}
        </h2>
        <div className="flex space-x-2">
          {profileType === 'artist' && (
            <Button
              onClick={() => setShowRequestTypeDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 !text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Request Booking
            </Button>
          )}

          {/* Request Type Selection Dialog */}
          <Dialog open={showRequestTypeDialog} onOpenChange={setShowRequestTypeDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Choose Request Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-gray-600">
                  How would you like to approach this venue?
                </p>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={() => {
                      setShowRequestTypeDialog(false);
                      setShowRequestDialog(true);
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium">Simple Booking Request</div>
                      <div className="text-sm text-gray-500">
                        Send a basic booking inquiry with event details
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    onClick={() => {
                      setShowRequestTypeDialog(false);
                      // Create a mock booking request for contract proposal
                      const mockBookingRequest = {
                        id: Date.now(), // Temporary ID
                        artistProfileId: activeProfile?.id,
                        venueProfileId: null, // Will be set when venue is selected
                        artistProfile: {
                          id: activeProfile?.id,
                          name: activeProfile?.name,
                          profileImageUrl: activeProfile?.profileImageUrl
                        },
                        venueProfile: {
                          id: null,
                          name: '',
                          profileImageUrl: null,
                          location: ''
                        }
                      };
                      setSelectedBookingForContract(mockBookingRequest);
                      setShowContractDialog(true);
                    }}
                  >
                    <div className="text-left">
                      <div className="font-medium">Propose Contract</div>
                      <div className="text-sm text-gray-500">
                        Send a detailed contract proposal with terms and payment
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Simple Booking Request Dialog */}
          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
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
                      onChange={(e) => setNewRequest({ ...newRequest, eventDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="eventTime">Event Time</Label>
                    <Input
                      id="eventTime"
                      type="time"
                      value={newRequest.eventTime}
                      onChange={(e) => setNewRequest({ ...newRequest, eventTime: e.target.value })}
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
                    onChange={(e) => setNewRequest({ ...newRequest, budget: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="requirements">Technical Requirements</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Sound system, lighting, staging requirements..."
                    value={newRequest.requirements}
                    onChange={(e) => setNewRequest({ ...newRequest, requirements: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message to Venue</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell the venue about your event..."
                    value={newRequest.message}
                    onChange={(e) => setNewRequest({ ...newRequest, message: e.target.value })}
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
          <Button
            variant="outline"
            onClick={() => {
              // Scroll to calendar section
              const calendarSection = document.querySelector('[data-calendar-section]');
              if (calendarSection) {
                calendarSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            <Calendar className="w-4 h-4 mr-2" />
            View Calendar
          </Button>
        </div>
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
                        <Avatar className="w-12 h-12 ring-2 ring-blue-400">
                          <AvatarImage src={request.artistProfile?.profileImageUrl || ""} />
                          <AvatarFallback className="bg-blue-500 text-white">
                            {request.artistProfile?.name?.charAt(0) || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium text-lg">
                            {profileType === 'artist' ? request.venueProfile.name : request.artistProfile.name}
                          </h4>
                          <p className="text-sm text-gray-600">
                            Request sent on {new Date(request.requestedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className="bg-white text-purple-600 font-bold border-0 shadow-lg text-sm">
                          pending
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
                    <div className="flex flex-wrap gap-2 ml-4">
                      {profileType === 'venue' && request.status === 'pending' && (
                        <div className="flex gap-4">
                          {/* Left column - EPK, Stats */}
                          <div className="flex flex-col gap-2 flex-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-indigo-600 border-indigo-600 hover:bg-indigo-600 hover:text-white w-full justify-start"
                              onClick={() => {
                                // Navigate to artist profile and set EPK tab
                                window.open(`/profile/${request.artistProfileId}`, '_blank');
                                // Note: The profile component will default to EPK tab for artist profiles
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              View EPK
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white w-full justify-start"
                              onClick={() => {
                                // Set the tab preference before navigation
                                localStorage.setItem('profileTab', 'stats');
                                // Small delay to ensure localStorage is set before navigation
                                setTimeout(() => {
                                  window.open(`/profile/${request.artistProfileId}`, '_blank');
                                }, 10);
                              }}
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              View Stats
                            </Button>
                          </div>

                          {/* Middle column - Check Dates, Propose Contract, Message */}
                          <div className="flex flex-col gap-2 flex-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-600 border-purple-600 hover:bg-purple-600 hover:text-white w-full justify-start"
                              onClick={() => {
                                setSelectedAvailabilityRequest(request);
                                setShowAvailabilityChecker(true);
                              }}
                            >
                              <Calendar className="w-4 h-4 mr-2" />
                              Check Dates
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 border-orange-600 hover:bg-orange-600 hover:text-white w-full justify-start"
                              onClick={() => {
                                setSelectedBookingForContract(request);
                                setShowContractDialog(true);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Propose Contract
                            </Button>
                            <Button
                              onClick={() => handleMessage(request)}
                              variant="outline"
                              size="sm"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Message
                            </Button>
                          </div>

                          {/* Right column - Accept and Decline */}
                          <div className="flex flex-col gap-2 min-w-[100px]">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 !text-white w-full justify-center"
                              onClick={() => handleBookingResponse(request.id, 'accepted')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white w-full justify-center"
                              onClick={() => handleBookingResponse(request.id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      )}
                      {!(profileType === 'venue' && request.status === 'pending') && (
                        <Button
                          onClick={() => handleMessage(request)}
                          variant="outline"
                          size="sm"
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                      )}
                    </div>
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
                onClick={() => setShowRequestTypeDialog(true)}
                className="bg-blue-600 hover:bg-blue-700 !text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Send First Request
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contract Proposal Dialog */}
      <ContractProposalDialog
        open={showContractDialog}
        onOpenChange={setShowContractDialog}
        bookingRequest={selectedBookingForContract}
        venues={venues}
      />

      {/* Availability Checker Dialog */}
      {selectedAvailabilityRequest && (
        <AvailabilityChecker
          open={showAvailabilityChecker}
          onOpenChange={setShowAvailabilityChecker}
          artistProfileId={selectedAvailabilityRequest.artistProfileId}
          venueProfileId={selectedAvailabilityRequest.venueProfileId}
          artistName={selectedAvailabilityRequest.artistProfile.name}
          venueName={selectedAvailabilityRequest.venueProfile.name}
        />
      )}
      {/* Decline Confirmation Dialog */}
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Booking Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to decline this booking request?</p>
            <Label htmlFor="declineMessage">Message (Optional):</Label>
            <Textarea
              id="declineMessage"
              placeholder="Enter a message to send with the decline notification"
              value={declineMessage}
              onChange={(e) => setDeclineMessage(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setShowDeclineDialog(false);
                setDeclineMessage('');
                setSelectedRequestId(null);
              }}>
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 !text-white"
                onClick={handleDeclineConfirmation}
              >
                Decline
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BookingMessageWidget
        isOpen={showMessageWidget}
        onClose={() => {
          setShowMessageWidget(false);
          setSelectedBookingForMessage(null);
          setConversationId(null);
        }}
        conversationId={conversationId}
        bookingRequest={selectedBookingForMessage}
      />
    </div>
  );
}