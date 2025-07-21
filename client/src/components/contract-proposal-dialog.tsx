import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FileText, DollarSign, Calendar, Clock, Users, Plus, Search } from "lucide-react";
import AvailabilityChecker from "./availability-checker";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ContractProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingRequest: any;
  venues?: any[]; // Optional venues list for direct proposals
}

interface ContractTerms {
  performanceDuration: string;
  soundCheck: string;
  setupTime: string;
  startTime: string;
  soundCheckLength: string;
  breakdownTime: string;
  doorsOpenTime: string;
  eventStartTime: string;
  setChangeWindow: string;
  hardStopTime: string;
  intermissionPerformer: string;
  venueSoundSystem: string;
  cancellationPolicy: string;
  forceMateure: boolean;
  merchandising: string;
  recording: string;
  additionalServices: string[];
  radiusClause: {
    enabled: boolean;
    distance: string;
    distanceUnit: string;
    timeRestriction: string;
    timeUnit: string;
    restrictions: string;
    exceptions: string;
    enforcement: string;
  };
  performers: PerformerRole[];
}

interface PaymentTerms {
  totalAmount: string;
  depositAmount: string;
  depositDueDate: string;
  finalPaymentDate: string;
  paymentMethod: string;
  currency: string;
  expenses: string;
  penaltyClause: string;
}

interface PerformerRole {
  id: string;
  name: string;
  profileId?: string;
  profileName: string;
  performanceOrder: number;
  setDuration: string;
  soundCheckTime: string;
  setupTime: string;
  paymentAmount: string;
  specialRequirements: string;
}

export default function ContractProposalDialog({ 
  open, 
  onOpenChange, 
  bookingRequest,
  venues = []
}: ContractProposalDialogProps) {
  const [selectedVenueForContract, setSelectedVenueForContract] = useState<any>(null);
  const [showAvailabilityChecker, setShowAvailabilityChecker] = useState(false);
  const [currentPage, setCurrentPage] = useState('event-terms');
  const [performers, setPerformers] = useState<PerformerRole[]>([
    {
      id: 'performer-1',
      name: 'Headliner',
      profileId: bookingRequest?.artistProfile?.id,
      profileName: bookingRequest?.artistProfile?.name || '',
      performanceOrder: 1,
      setDuration: '60',
      soundCheckTime: '30',
      setupTime: '15',
      paymentAmount: '',
      specialRequirements: ''
    }
  ]);
  const [currentPerformer, setCurrentPerformer] = useState<string>(performers[0]?.id || '');
  const [artistSearchQueries, setArtistSearchQueries] = useState<Record<string, string>>({});
  const [showArtistDropdown, setShowArtistDropdown] = useState<Record<string, boolean>>({});
  const [selectedArtistProfile, setSelectedArtistProfile] = useState<any>(null);
  
  // Get search query for current performer
  const getCurrentSearchQuery = (performerId: string) => {
    return artistSearchQueries[performerId] || '';
  };

  // Set search query for specific performer
  const setSearchQueryForPerformer = (performerId: string, query: string) => {
    setArtistSearchQueries(prev => ({
      ...prev,
      [performerId]: query
    }));
  };

  // Get current performer's search query - use the actual input value being typed
  const currentSearchQuery = getCurrentSearchQuery(currentPerformer);
  
  // Debounce the search query
  const debouncedSearchQuery = useDebounce(currentSearchQuery, 300);

  // Search for artist profiles with better debugging
  const { data: artistSearchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ['/api/profiles/search', debouncedSearchQuery, 'artist'],
    queryFn: async () => {
      console.log('Search API call triggered with query:', debouncedSearchQuery);
      if (!debouncedSearchQuery || debouncedSearchQuery.length < 2) return [];
      
      const searchParams = new URLSearchParams({
        q: debouncedSearchQuery,
        type: 'artist',
        limit: '10'
      });
      
      const response = await fetch(`/api/profiles/search?${searchParams.toString()}`);
      if (!response.ok) {
        console.error('Search API failed:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error('Failed to search artists');
      }
      const results = await response.json();
      console.log('Search results:', results);
      return results;
    },
    enabled: debouncedSearchQuery.length >= 2,
  });

  // Generate default contract title
  const getDefaultTitle = () => {
    const artistName = bookingRequest?.artistProfile?.name || "Artist";
    let venueName = "";

    if (bookingRequest?.venueProfile?.name) {
      venueName = bookingRequest.venueProfile.name;
    } else if (selectedVenueForContract?.name) {
      venueName = selectedVenueForContract.name;
    } else {
      venueName = "Venue";
    }

    return `${artistName} at ${venueName}`;
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    requirements: "",
    expiresAt: "",
  });

  const [terms, setTerms] = useState<ContractTerms>({
    performanceDuration: "",
    soundCheck: "",
    setupTime: "",
    startTime: "",
    soundCheckLength: "",
    breakdownTime: "",
    doorsOpenTime: "",
    eventStartTime: "",
    setChangeWindow: "",
    hardStopTime: "",
    intermissionPerformer: "",
    venueSoundSystem: "",
    cancellationPolicy: "",
    forceMateure: false,
    merchandising: "",
    recording: "",
    additionalServices: [],
    radiusClause: {
      enabled: false,
      distance: "",
      distanceUnit: "miles",
      timeRestriction: "",
      timeUnit: "days",
      restrictions: "",
      exceptions: "",
      enforcement: "",
    },
    performers: []
  });

  const [payment, setPayment] = useState<PaymentTerms>({
    totalAmount: "",
    depositAmount: "",
    depositDueDate: "",
    finalPaymentDate: "",
    paymentMethod: "",
    currency: "USD",
    expenses: "",
    penaltyClause: "",
  });

  const [requiredDocuments, setRequiredDocuments] = useState<{
    [key: string]: boolean;
  }>({
    w9: false,
    stagePlot: false,
    technicalRider: false,
    hospitalityRider: false,
    performanceRider: false,
    contactInfo: false,
    other: false,
  });

  const [requiredVenueDocuments, setRequiredVenueDocuments] = useState<{
    [key: string]: boolean;
    }>({
    venueInsurance: false,
    loadInSpecs: false,
    parkingInfo: false,
    venuePolicies: false,
    cancellationAgreements: false,
  });

  const [otherDocumentType, setOtherDocumentType] = useState("");

  const queryClient = useQueryClient();

  // Update contract title when booking request or selected venue changes
  useEffect(() => {
    if (bookingRequest) {
      setFormData(prev => ({
        ...prev,
        title: getDefaultTitle()
      }));
      
      // Update headliner performer with artist profile name
      setPerformers(prev => prev.map(performer => 
        performer.name === 'Headliner' 
          ? { 
              ...performer, 
              profileId: bookingRequest.artistProfile?.id,
              profileName: bookingRequest.artistProfile?.name || ''
            }
          : performer
      ));
      
      // Initialize search query with artist name if available
      if (bookingRequest.artistProfile?.name) {
        setSearchQueryForPerformer(performers[0]?.id || '', bookingRequest.artistProfile.name);
      }
    }
  }, [bookingRequest, selectedVenueForContract]);

  // Update currentPerformer if it becomes invalid
  useEffect(() => {
    if (performers.length > 0 && !performers.find(p => p.id === currentPerformer)) {
      setCurrentPerformer(performers[0].id);
    }
  }, [performers, currentPerformer]);

  // Initialize search queries for performers
  useEffect(() => {
    const newQueries: Record<string, string> = {};
    performers.forEach(performer => {
      if (!artistSearchQueries[performer.id]) {
        newQueries[performer.id] = performer.profileName || '';
      }
    });
    
    if (Object.keys(newQueries).length > 0) {
      setArtistSearchQueries(prev => ({
        ...prev,
        ...newQueries
      }));
    }
  }, [performers]);

  // Update search query when current performer changes
  useEffect(() => {
    const currentPerformerData = performers.find(p => p.id === currentPerformer);
    if (currentPerformerData?.profileName && !getCurrentSearchQuery(currentPerformer)) {
      setSearchQueryForPerformer(currentPerformer, currentPerformerData.profileName);
    }
  }, [currentPerformer, performers]);

  const createProposalMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/contract-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create contract proposal");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booking-requests"] });
      toast({
        title: "Success",
        description: "Contract proposal sent successfully",
      });
      onOpenChange(false);
      resetForm();
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
    setFormData({
      title: getDefaultTitle(),
      description: "",
      requirements: "",
      expiresAt: "",
    });
    setTerms({
      performanceDuration: "",
      soundCheck: "",
      setupTime: "",
      startTime: "",
      soundCheckLength: "",
      breakdownTime: "",
      doorsOpenTime: "",
      eventStartTime: "",
      setChangeWindow: "",
      hardStopTime: "",
      intermissionPerformer: "",
      venueSoundSystem: "",
      cancellationPolicy: "",
      forceMateure: false,
      merchandising: "",
      recording: "",
      additionalServices: [],
      radiusClause: {
        enabled: false,
        distance: "",
        distanceUnit: "miles",
        timeRestriction: "",
        timeUnit: "days",
        restrictions: "",
        exceptions: "",
        enforcement: "",
      },
      performers: []
    });
    setPayment({
      totalAmount: "",
      depositAmount: "",
      depositDueDate: "",
      finalPaymentDate: "",
      paymentMethod: "",
      currency: "USD",
      expenses: "",
      penaltyClause: "",
    });
    setRequiredDocuments({
      w9: false,
      stagePlot: false,
      technicalRider: false,
      hospitalityRider: false,
      performanceRider: false,
      contactInfo: false,
      other: false,
    });
    setRequiredVenueDocuments({
      venueInsurance: false,
      loadInSpecs: false,
      parkingInfo: false,
      venuePolicies: false,
      cancellationAgreements: false,
    });
    setOtherDocumentType("");
  };

  const handleDateSelect = (selectedDate: string) => {
    setFormData(prev => ({
      ...prev,
      expiresAt: selectedDate
    }));
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Contract title is required",
        variant: "destructive",
      });
      return;
    }

    if (!payment.totalAmount) {
      toast({
        title: "Error",
        description: "Total payment amount is required",
        variant: "destructive",
      });
      return;
    }

    // For direct proposals, we need a venue selected
    if (!bookingRequest?.venueProfile?.name && !selectedVenueForContract) {
      toast({
        title: "Error",
        description: "Please select a venue",
        variant: "destructive",
      });
      return;
    }

    const proposalData = {
      bookingRequestId: bookingRequest.id,
      venueId: selectedVenueForContract?.id || bookingRequest.venueProfileId,
      title: formData.title,
      description: formData.description,
      terms,
      payment,
      requirements: formData.requirements,
      expiresAt: formData.expiresAt || null,
      requiredDocuments,
      requiredVenueDocuments,
      otherDocumentType: requiredDocuments.other ? otherDocumentType : "",
    };

    createProposalMutation.mutate(proposalData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-4xl h-[90vh] overflow-hidden">
        {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span className="font-medium">Propose Contract</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Performer Selector - Show on all pages except event-terms */}
          {currentPage !== 'event-terms' && (
            <div className="p-4 border-b bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Configure terms for:</span>
                <Select value={currentPerformer} onValueChange={setCurrentPerformer}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {performers.map((performer) => (
                      <SelectItem key={performer.id} value={performer.id}>
                        {performer.name} {performer.profileName && `(${performer.profileName})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

        <div className="flex h-[calc(90vh-140px)] overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-52 min-w-52 max-w-52 border-r border-gray-700 bg-gray-900 p-2 rounded-l-lg flex-shrink-0 h-full">
            <div className="space-y-1 h-full overflow-y-auto">
              <Button
                variant={currentPage === 'event-terms' ? "default" : "ghost"}
                className={`w-full justify-start text-white ${
                  currentPage === 'event-terms' 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "hover:bg-gray-800"
                }`}
                onClick={() => setCurrentPage('event-terms')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Event Terms
              </Button>
              <Button
                variant={currentPage === 'artist-terms' ? "default" : "ghost"}
                className={`w-full justify-start text-white ${
                  currentPage === 'artist-terms' 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "hover:bg-gray-800"
                }`}
                onClick={() => setCurrentPage('artist-terms')}
              >
                <Clock className="w-4 h-4 mr-2" />
                Artist Terms
              </Button>
              <Button
                variant={currentPage === 'tickets' ? "default" : "ghost"}
                className={`w-full justify-start text-white ${
                  currentPage === 'tickets' 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "hover:bg-gray-800"
                }`}
                onClick={() => setCurrentPage('tickets')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Tickets
              </Button>
              <Button
                variant={currentPage === 'payment' ? "default" : "ghost"}
                className={`w-full justify-start text-white ${
                  currentPage === 'payment' 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "hover:bg-gray-800"
                }`}
                onClick={() => setCurrentPage('payment')}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Payment
              </Button>
              <Button
                variant={currentPage === 'artist-docs' ? "default" : "ghost"}
                className={`w-full justify-start text-white ${
                  currentPage === 'artist-docs' 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "hover:bg-gray-800"
                }`}
                onClick={() => setCurrentPage('artist-docs')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Artist Docs
              </Button>
              <Button
                variant={currentPage === 'venue-docs' ? "default" : "ghost"}
                className={`w-full justify-start text-white ${
                  currentPage === 'venue-docs' 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "hover:bg-gray-800"
                }`}
                onClick={() => setCurrentPage('venue-docs')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Venue Docs
              </Button>
              <Button
                variant={currentPage === 'radius-clause' ? "default" : "ghost"}
                className={`w-full justify-start text-white ${
                  currentPage === 'radius-clause' 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "hover:bg-gray-800"
                }`}
                onClick={() => setCurrentPage('radius-clause')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Radius Clause
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
            {currentPage === 'event-terms' && (
              <>
                {/* Venue Selection (only for direct proposals) */}
                {!bookingRequest?.venueProfile?.name && venues.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Select Venue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Label htmlFor="venue">Choose Venue *</Label>
                      <Select onValueChange={(value) => {
                        const venue = venues.find(v => v.id.toString() === value);
                        setSelectedVenueForContract(venue);
                        // Update contract title when venue is selected
                        const artistName = bookingRequest?.artistProfile?.name || "Artist";
                        const venueName = venue?.name || "Venue";
                        setFormData(prev => ({
                          ...prev,
                          title: `${artistName} at ${venueName}`
                        }));
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a venue" />
                        </SelectTrigger>
                        <SelectContent>
                          {venues?.filter(venue => venue.type === 'venue').map((venue) => (
                            <SelectItem key={venue.id} value={venue.id.toString()}>
                              {venue.name} {venue.location && `- ${venue.location}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                )}

                {/* Basic Information */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Contract Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="title">Event Name *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Performance Agreement - Live Concert"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description of the contract and performance expectations..."
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiresAt">Event Date</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="expiresAt"
                          type="date"
                          value={formData.expiresAt}
                          onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                          className="flex-1 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                        />
                        {(bookingRequest?.artistProfile?.id && bookingRequest?.venueProfile?.id) && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowAvailabilityChecker(true)}
                            className="whitespace-nowrap"
                          >
                            Check Availability
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Event Timing */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Event Timing</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="doorsOpenTime">Doors Open Time</Label>
                        <Input
                          id="doorsOpenTime"
                          type="time"
                          value={terms.doorsOpenTime}
                          onChange={(e) => setTerms({...terms, doorsOpenTime: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="eventStartTime">Event Start Time</Label>
                        <Input
                          id="eventStartTime"
                          type="time"
                          value={terms.eventStartTime}
                          onChange={(e) => setTerms({...terms, eventStartTime: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="setChangeWindow">Set Change Window Length</Label>
                        <Input
                          id="setChangeWindow"
                          placeholder="e.g., 15 minutes"
                          value={terms.setChangeWindow}
                          onChange={(e) => setTerms({...terms, setChangeWindow: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="hardStopTime">Hard Stop Time</Label>
                        <Input
                          id="hardStopTime"
                          type="time"
                          value={terms.hardStopTime}
                          onChange={(e) => setTerms({...terms, hardStopTime: e.target.value})}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performer Lineup */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="w-5 h-5" />
                      <span>Performer Lineup</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {performers.sort((a, b) => {
                      // If one is headliner and the other isn't, headliner goes first
                      if (a.name === 'Headliner' && b.name !== 'Headliner') return -1;
                      if (b.name === 'Headliner' && a.name !== 'Headliner') return 1;
                      // Otherwise sort by performance order in reverse (higher order first, opening act last)
                      return b.performanceOrder - a.performanceOrder;
                    }).map((performer, index) => (
                      <div key={performer.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{performer.name}</span>
                            <Badge variant="outline">
                              {performer.name === 'Headliner' ? 'Headliner' : 
                               performer.performanceOrder === 1 ? 'Opening Act' : 
                               `${performer.performanceOrder}${performer.performanceOrder === 2 ? 'nd' : performer.performanceOrder === 3 ? 'rd' : 'th'} Act`}
                            </Badge>
                          </div>
                          {performer.name !== 'Headliner' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const newPerformers = performers.filter(p => p.id !== performer.id);

                                // Reorder remaining performers to fill gaps, keeping headliner last
                                const headliner = newPerformers.find(p => p.name === 'Headliner');
                                const supportActs = newPerformers.filter(p => p.name !== 'Headliner');

                                // Reassign orders: support acts get 1, 2, 3... and headliner gets the last position
                                supportActs.forEach((p, i) => {
                                  p.performanceOrder = i + 1;
                                });

                                if (headliner) {
                                  headliner.performanceOrder = supportActs.length + 1;
                                }

                                setPerformers(newPerformers);

                                // If we removed the current performer, switch to the first available performer
                                if (currentPerformer === performer.id && newPerformers.length > 0) {
                                  setCurrentPerformer(newPerformers[0].id);
                                }
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <Label htmlFor={`${performer.id}-name`}>Artist/Band Name</Label>
                            <div className="relative">
                              <Input
                                id={`${performer.id}-name`}
                                value={getCurrentSearchQuery(performer.id)}
                                onChange={(e) => {
                                  const query = e.target.value;
                                  console.log('Input changed for performer', performer.id, 'query:', query);
                                  
                                  // Set current performer FIRST for API calls
                                  setCurrentPerformer(performer.id);
                                  
                                  // Update search query
                                  setSearchQueryForPerformer(performer.id, query);
                                  
                                  // Show dropdown if query is long enough
                                  setShowArtistDropdown(prev => ({
                                    ...prev,
                                    [performer.id]: query.length >= 2
                                  }));
                                  
                                  // Also update the performer name as they type
                                  const newPerformers = [...performers];
                                  newPerformers[index].profileName = query;
                                  setPerformers(newPerformers);
                                }}
                                onFocus={() => {
                                  console.log('Input focused for performer', performer.id);
                                  setCurrentPerformer(performer.id);
                                  const query = getCurrentSearchQuery(performer.id);
                                  if (query.length >= 2) {
                                    setShowArtistDropdown(prev => ({
                                      ...prev,
                                      [performer.id]: true
                                    }));
                                  }
                                }}
                                onBlur={() => {
                                  // Delay hiding to allow for selection
                                  setTimeout(() => {
                                    setShowArtistDropdown(prev => ({
                                      ...prev,
                                      [performer.id]: false
                                    }));
                                  }, 200);
                                }}
                                placeholder="Search for artist profile..."
                                className="pr-10"
                              />
                              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            </div>
                            
                            {/* Artist Search Dropdown */}
                            {showArtistDropdown[performer.id] && getCurrentSearchQuery(performer.id).length >= 2 && currentPerformer === performer.id && (
                              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                {isSearching ? (
                                  <div className="p-3 text-sm text-gray-500 text-center">
                                    Searching artists...
                                  </div>
                                ) : artistSearchResults.length > 0 ? (
                                  artistSearchResults.map((artist: any) => (
                                    <div
                                      key={artist.id}
                                      className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                                      onClick={() => {
                                        console.log('Artist selected:', artist);
                                        // Update the performer with selected artist data
                                        const newPerformers = [...performers];
                                        newPerformers[index].profileName = artist.name;
                                        newPerformers[index].profileId = artist.id;
                                        setPerformers(newPerformers);
                                        
                                        // Update search state
                                        setSearchQueryForPerformer(performer.id, artist.name);
                                        setSelectedArtistProfile(artist);
                                        setShowArtistDropdown(prev => ({
                                          ...prev,
                                          [performer.id]: false
                                        }));
                                      }}
                                    >
                                      <div className="flex items-center space-x-3">
                                        <Avatar className="w-8 h-8">
                                          <AvatarImage src={artist.profileImageUrl} alt={artist.name} />
                                          <AvatarFallback className="text-xs">
                                            {artist.name.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                          <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                            {artist.name}
                                          </p>
                                          {artist.genre && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              {artist.genre}
                                            </p>
                                          )}
                                          {artist.location && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                              📍 {artist.location}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="p-3 text-sm text-gray-500 text-center">
                                    No artists found matching "{getCurrentSearchQuery(performer.id)}"
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor={`${performer.id}-order`}>Performance Order</Label>
                            <Select 
                              value={performer.performanceOrder.toString()}
                              onValueChange={(value) => {
                                const newOrder = parseInt(value);
                                const newPerformers = [...performers];
                                const currentPerformer = newPerformers[index];
                                const oldOrder = currentPerformer.performanceOrder;

                                // If this is the headliner, always make it the last act
                                if (currentPerformer.name === 'Headliner') {
                                  const maxOrder = Math.max(...newPerformers.map(p => p.performanceOrder));
                                  currentPerformer.performanceOrder = maxOrder;
                                } else {
                                  // For other performers, shift orders as needed
                                  newPerformers.forEach((p, i) => {
                                    if (i !== index) {
                                      if (oldOrder < newOrder) {
                                        // Moving performer later in order
                                        if (p.performanceOrder > oldOrder && p.performanceOrder <= newOrder) {
                                          p.performanceOrder--;
                                        }
                                      } else {
                                        // Moving performer earlier in order
                                        if (p.performanceOrder >= newOrder && p.performanceOrder < oldOrder) {
                                          p.performanceOrder++;
                                        }
                                      }
                                    }
                                  });
                                  currentPerformer.performanceOrder = newOrder;
                                }

                                // Sort by performance order
                                newPerformers.sort((a, b) => a.performanceOrder - b.performanceOrder);
                                setPerformers(newPerformers);
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: performers.length }, (_, i) => i + 1).map(num => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num === 1 ? '1st (Opening Act)' : 
                                     num === performers.length && performers.find(p => p.name === 'Headliner') ? 
                                     `${num}${num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} (Headliner)` :
                                     `${num}${num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor={`${performer.id}-duration`}>Set Duration (mins)</Label>
                            <Input
                              id={`${performer.id}-duration`}
                              type="number"
                              value={performer.setDuration}
                              onChange={(e) => {
                                const newPerformers = [...performers];
                                newPerformers[index].setDuration = e.target.value;
                                setPerformers(newPerformers);
                              }}
                              placeholder="60"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${performer.id}-soundcheck`}>Sound Check (mins)</Label>
                            <Input
                              id={`${performer.id}-soundcheck`}
                              type="number"
                              value={performer.soundCheckTime}
                              onChange={(e) => {
                                const newPerformers = [...performers];
                                newPerformers[index].soundCheckTime = e.target.value;
                                setPerformers(newPerformers);
                              }}
                              placeholder="30"
                            />
                          </div>
                          <div>
                            <Label htmlFor={`${performer.id}-setup`}>Setup Time (mins)</Label>
                            <Input
                              id={`${performer.id}-setup`}
                              type="number"
                              value={performer.setupTime}
                              onChange={(e) => {
                                const newPerformers = [...performers];
                                newPerformers[index].setupTime = e.target.value;
                                setPerformers(newPerformers);
                              }}
                              placeholder="15"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`${performer.id}-requirements`}>Special Requirements</Label>
                          <Textarea
                            id={`${performer.id}-requirements`}
                            value={performer.specialRequirements}
                            onChange={(e) => {
                              const newPerformers = [...performers];
                              newPerformers[index].specialRequirements = e.target.value;
                              setPerformers(newPerformers);
                            }}
                            placeholder="Any special requirements for this performer..."
                            rows={2}
                          />
                        </div>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      onClick={() => {
                        const headliner = performers.find(p => p.name === 'Headliner');
                        const supportActCount = performers.filter(p => p.name !== 'Headliner').length;

                        // New support act gets the next available position before headliner
                        const newOrder = supportActCount + 1;

                        const newPerformer: PerformerRole = {
                          id: `performer-${Date.now()}`,
                          name: `Support ${supportActCount + 1}`,
                          profileId: undefined,
                          profileName: '',
                          performanceOrder: newOrder,
                          setDuration: '30',
                          soundCheckTime: '15',
                          setupTime: '10',
                          paymentAmount: '',
                          specialRequirements: ''
                        };

                        // Update headliner to be last
                        const updatedPerformers = performers.map(p => {
                          if (p.name === 'Headliner') {
                            return { ...p, performanceOrder: newOrder + 1 };
                          }
                          return p;
                        });

                        setPerformers([...updatedPerformers, newPerformer]);
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Support Act
                    </Button>
                  </CardContent>
                </Card>

                {/* Performance & Sound Setup */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>Performance & Sound Setup</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label htmlFor="intermissionPerformer">Intermission Performer</Label>
                      <Select onValueChange={(value) => setTerms({...terms, intermissionPerformer: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select intermission option" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes - There will be an intermission performer</SelectItem>
                          <SelectItem value="house_sound">House Sound Only</SelectItem>
                          <SelectItem value="n/a">N/A - No intermission</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="venueSoundSystem">Venue Sound System</Label>
                      <Select onValueChange={(value) => setTerms({...terms, venueSoundSystem: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Will venue provide sound system?" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes - Venue provides full sound system</SelectItem>
                          <SelectItem value="partial">Partial - Venue provides basic equipment</SelectItem>
                          <SelectItem value="no">No - Artist must provide own sound system</SelectItem>
                          <SelectItem value="negotiable">Negotiable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {currentPage === 'artist-terms' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Performance Terms - {performers.find(p => p.id === currentPerformer)?.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="setupTime">Load-in Time</Label>
                        <Input
                          id="setupTime"
                          type="time"
                          value={terms.setupTime}
                          onChange={(e) => setTerms({...terms, setupTime: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="soundCheck">Sound Check Time</Label>
                        <Input
                          id="soundCheck"
                          type="time"
                          value={terms.soundCheck}
                          onChange={(e) => setTerms({...terms, soundCheck: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={terms.startTime}
                          onChange={(e) => setTerms({...terms, startTime: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="performanceDuration">Performance Duration</Label>
                        <Input
                          id="performanceDuration"
                          placeholder="e.g., 90 minutes"
                          value={terms.performanceDuration}
                          onChange={(e) => setTerms({...terms, performanceDuration: e.target.value})}
                        />                      </div>
                      <div>
                        <Label htmlFor="soundCheckLength">Number of Sets</Label>
                        <Input
                          id="soundCheckLength"
                          placeholder="e.g., 2 sets"
                          value={terms.soundCheckLength}
                          onChange={(e) => setTerms({...terms, soundCheckLength: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="breakdownTime">Breakdown Time</Label>
                        <Input
                          id="breakdownTime"
                          placeholder="e.g., 1 hour"
                          value={terms.breakdownTime}
                          onChange={(e) => setTerms({...terms, breakdownTime: e.target.value})}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Artist Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle>Artist Requirements & Rights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="merchandising">Merchandising Rights</Label>
                        <Select onValueChange={(value) => setTerms({...terms, merchandising: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select merchandising rights" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="artist_exclusive">Artist Exclusive</SelectItem>
                            <SelectItem value="venue_percentage">Venue Takes Percentage</SelectItem>
                            <SelectItem value="shared">Shared Revenue</SelectItem>
                            <SelectItem value="no_merchandising">No Merchandising</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="recording">Recording/Streaming Rights</Label>
                        <Select onValueChange={(value) => setTerms({...terms, recording: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select recording rights" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="no_recording">No Recording Allowed</SelectItem>
                            <SelectItem value="venue_only">Venue Recording Only</SelectItem>
                            <SelectItem value="artist_approval">Artist Approval Required</SelectItem>
                            <SelectItem value="unrestricted">Unrestricted</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Force Majeure Clause</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="checkbox"
                          id="forceMateure"
                          checked={terms.forceMateure}
                          onChange={(e) => setTerms({...terms, forceMateure: e.target.checked})}
                          className="rounded border border-gray-300"
                        />
                        <Label htmlFor="forceMateure" className="text-sm">
                          Include force majeure protection clause
                        </Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle>Technical Requirements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      placeholder="Sound equipment, stage setup, lighting, power requirements, security, etc..."
                      value={formData.requirements}
                      onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                      rows={6}
                    />
                  </CardContent>
                </Card>
              </>
            )}

            {currentPage === 'tickets' && (
              <>
                {/* Ticket Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Ticket Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="ticketPrice">General Admission Price</Label>
                        <Input
                          id="ticketPrice"
                          type="number"
                          placeholder="0.00"
                          // value={ticketData.generalPrice}
                          // onChangeing performer details in contract proposal form.//(e) => setTicketData({...ticketData, generalPrice: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="vipPrice">VIP/Premium Price</Label>
                        <Input
                          id="vipPrice"
                          type="number"
                          placeholder="0.00"
                          // value={ticketData.vipPrice}
                          // onChangeing performer details in contract proposal form.
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="capacity">Venue Capacity</Label>
                        <Input
                          id="capacity"
                          type="number"
                          placeholder="e.g., 500"
                          // value={ticketData.capacity}
                          // onChangeing performer details in contract proposal form.
                        />
                      </div>
                      <div>
                        <Label htmlFor="ticketSalesStart">Ticket Sales Start Date</Label>
                        <Input
                          id="ticketSalesStart"
                          type="date"
                          // value={ticketData.salesStartDate}
                          // onChangeing performer details in contract proposal form.
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Guest List & Comps */}
                <Card>
                  <CardHeader>
                    <CardTitle>Guest List & Complimentary Tickets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="artistGuestList">Artist Guest List Limit</Label>
                      <Input
                        id="artistGuestList"
                        type="number"
                        placeholder="e.g., 10"
                        className="max-w-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="guestListPolicy">Guest List Policy</Label>
                      <Textarea
                        id="guestListPolicy"
                        placeholder="Additional guest list terms, restrictions, or requirements..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {currentPage === 'payment' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="w-5 h-5" />
                      <span>Payment Terms - {performers.find(p => p.id === currentPerformer)?.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="totalAmount">Total Amount *</Label>
                        <Input
                          id="totalAmount"
                          type="number"
                          placeholder="0.00"
                          value={payment.totalAmount}
                          onChange={(e) => setPayment({...payment, totalAmount: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="depositAmount">Deposit Amount</Label>
                        <Input
                          id="depositAmount"
                          type="number"
                          placeholder="0.00"
                          value={payment.depositAmount}
                          onChange={(e) => setPayment({...payment, depositAmount: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select value={payment.currency} onValueChange={(value) => setPayment({...payment, currency: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                            <SelectItem value="CAD">CAD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="depositDueDate">Deposit Due Date</Label>
                        <Input
                          id="depositDueDate"
                          type="date"
                          value={payment.depositDueDate}
                          onChange={(e) => setPayment({...payment, depositDueDate: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="finalPaymentDate">Final Payment Date</Label>
                        <Input
                          id="finalPaymentDate"
                          type="date"
                          value={payment.finalPaymentDate}
                          onChange={(e) => setPayment({...payment, finalPaymentDate: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select onValueChange={(value) => setPayment({...payment, paymentMethod: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="stripe">Credit Card</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="expenses">Expenses Coverage</Label>
                      <Textarea
                        id="expenses"
                        placeholder="Describe what expenses are covered (travel, accommodation, meals, etc.)"
                        value={payment.expenses}
                        onChange={(e) => setPayment({...payment, expenses: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label htmlFor="penaltyClause">Penalty Clause</Label>
                      <Textarea
                        id="penaltyClause"
                        placeholder="Late payment penalties, breach of contract penalties, etc..."
                        value={payment.penaltyClause}
                        onChange={(e) => setPayment({...payment, penaltyClause: e.target.value})}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue Sharing */}
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Sharing</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="revenueModel">Revenue Model</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select revenue sharing model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flat_fee">Flat Fee (No Revenue Share)</SelectItem>
                          <SelectItem value="percentage_split">Percentage Split</SelectItem>
                          <SelectItem value="door_split">Door Split</SelectItem>
                          <SelectItem value="guarantee_plus">Guarantee Plus Percentage</SelectItem>
                          <SelectItem value="merchandise_split">Merchandise Revenue Split</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="artistPercentage">Artist Percentage</Label>
                        <Input
                          id="artistPercentage"
                          type="number"
                          placeholder="e.g., 70"
                        />
                      </div>
                      <div>
                        <Label htmlFor="venuePercentage">Venue Percentage</Label>
                        <Input
                          id="venuePercentage"
                          type="number"
                          placeholder="e.g., 30"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="ticketProcessingFees">Ticket Processing Fees</Label>
                      <Textarea
                        id="ticketProcessingFees"
                        placeholder="Describe who pays processing fees, service charges, etc..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {currentPage === 'artist-docs' && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Required Documents from Artist</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Select documents the artist must provide:</Label>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="w9"
                            checked={requiredDocuments.w9}
                            onChange={(e) => setRequiredDocuments(prev => ({
                              ...prev,
                              w9: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="w9" className="text-sm font-normal">W-9 Tax Form</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="stagePlot"
                            checked={requiredDocuments.stagePlot}
                            onChange={(e) => setRequiredDocuments(prev => ({
                              ...prev,
                              stagePlot: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="stagePlot" className="text-sm font-normal">Stage Plot</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="technicalRider"
                            checked={requiredDocuments.technicalRider}
                            onChange={(e) => setRequiredDocuments(prev => ({
                              ...prev,
                              technicalRider: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="technicalRider" className="text-sm font-normal">Technical Rider</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="hospitalityRider"
                            checked={requiredDocuments.hospitalityRider}
                            onChange={(e) => setRequiredDocuments(prev => ({
                              ...prev,
                              hospitalityRider: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="hospitalityRider" className="text-sm font-normal">Hospitality Rider</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="performanceRider"
                            checked={requiredDocuments.performanceRider}
                            onChange={(e) => setRequiredDocuments(prev => ({
                              ...prev,
                              performanceRider: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="performanceRider" className="text-sm font-normal">Performance Rider</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="contactInfo"
                            checked={requiredDocuments.contactInfo}
                            onChange={(e) => setRequiredDocuments(prev => ({
                              ...prev,
                              contactInfo: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="contactInfo" className="text-sm font-normal">Contact Info Sheet</Label>
                        </div>
                      </div>

                      {/* Other Document Type */}
                      <div className="mt-4">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="other"
                            checked={requiredDocuments.other}
                            onChange={(e) => setRequiredDocuments(prev => ({
                              ...prev,
                              other: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="other" className="text-sm font-normal">Other (specify below)</Label>
                        </div>

                        {requiredDocuments.other && (
                          <div className="mt-2">
                            <Input
                              placeholder="Specify the type of document required..."
                              value={otherDocumentType}
                              onChange={(e) => setOtherDocumentType(e.target.value)}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contract Documents */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Contract Documentation</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="additionalClauses">Additional Contract Clauses</Label>
                      <Textarea
                        id="additionalClauses"
                        placeholder="Any additional legal clauses, special terms, or contract addendums..."
                        rows={6}
                      />
                    </div>
                    <div>
                      <Label>Contract Attachments</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-gray-600">Upload contract documents, riders, or technical specs</p>
                        <Input type="file" multiple className="mt-2" accept=".pdf,.doc,.docx" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {currentPage === 'venue-docs' && (
              <>
                {/* Required Documents from Venue */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Required Documents from Venue</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Select documents the venue must provide:</Label>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="venueInsurance"
                            checked={requiredVenueDocuments.venueInsurance}
                            onChange={(e) => setRequiredVenueDocuments(prev => ({
                              ...prev,
                              venueInsurance: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="venueInsurance" className="text-sm font-normal">Venue Insurance Certificate</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="loadInSpecs"
                            checked={requiredVenueDocuments.loadInSpecs}
                            onChange={(e) => setRequiredVenueDocuments(prev => ({
                              ...prev,
                              loadInSpecs: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="loadInSpecs" className="text-sm font-normal">Load-in/Load-out Specifications</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="parkingInfo"
                            checked={requiredVenueDocuments.parkingInfo}
                            onChange={(e) => setRequiredVenueDocuments(prev => ({
                              ...prev,
                              parkingInfo: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="parkingInfo" className="text-sm font-normal">Parking Information</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="venuePolicies"
                            checked={requiredVenueDocuments.venuePolicies}
                            onChange={(e) => setRequiredVenueDocuments(prev => ({
                              ...prev,
                              venuePolicies: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="venuePolicies" className="text-sm font-normal">Venue Policies</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="cancellationAgreements"
                            checked={requiredVenueDocuments.cancellationAgreements}
                            onChange={(e) => setRequiredVenueDocuments(prev => ({
                              ...prev,
                              cancellationAgreements: e.target.checked
                            }))}
                            className="rounded border border-gray-300"
                          />
                          <Label htmlFor="cancellationAgreements" className="text-sm font-normal">Cancellation Agreements</Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Venue Policies Upload - Only show if selected */}
                {requiredVenueDocuments.venuePolicies && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>Venue Policies</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Upload Venue Policy Documents</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-2">Upload venue policies, rules, procedures, and regulations</p>
                          <p className="text-xs text-gray-500 mb-3">Accepted formats: PDF, DOC, DOCX</p>
                          <Input type="file" multiple className="mt-2" accept=".pdf,.doc,.docx" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="policyNotes">Policy Notes & Special Instructions</Label>
                        <Textarea
                          id="policyNotes"
                          placeholder="Any additional notes about venue policies, special requirements, or important reminders..."
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Cancellation Agreements Upload - Only show if selected */}
                {requiredVenueDocuments.cancellationAgreements && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>Cancellation Agreements</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Upload Cancellation Agreement Documents</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <FileText className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-2">Upload cancellation policies, penalty structures, and refund procedures</p>
                          <p className="text-xs text-gray-500 mb-3">Accepted formats: PDF, DOC, DOCX</p>
                          <Input type="file" multiple className="mt-2" accept=".pdf,.doc,.docx" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="cancellationTerms">Cancellation Terms Summary</Label>
                        <Textarea
                          id="cancellationTerms"
                          placeholder="Brief summary of cancellation terms, notice requirements, penalty fees, force majeure clauses..."
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {currentPage === 'radius-clause' && (
              <>
                {/* Radius Clause Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileText className="w-5 h-5" />
                      <span>Radius Clause Terms</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-base font-medium">Enable Radius Clause</Label>
                      <div className="flex items-center space-x-2 mt-2">
                        <input
                          type="checkbox"
                          id="radiusEnabled"
                          checked={terms.radiusClause.enabled}
                          onChange={(e) => setTerms(prev => ({
                            ...prev,
                            radiusClause: {
                              ...prev.radiusClause,
                              enabled: e.target.checked
                            }
                          }))}
                          className="rounded border border-gray-300"
                        />
                        <Label htmlFor="radiusEnabled" className="text-sm font-normal">
                          Include radius clause restrictions in this contract
                        </Label>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">
                        A radius clause restricts the artist from performing within a certain distance and time frame from this event.
                      </p>
                    </div>

                    {terms.radiusClause.enabled && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="radiusDistance">Distance Restriction</Label>
                            <Input
                              id="radiusDistance"
                              type="number"
                              placeholder="e.g., 50"
                              value={terms.radiusClause.distance}
                              onChange={(e) => setTerms(prev => ({
                                ...prev,
                                radiusClause: {
                                  ...prev.radiusClause,
                                  distance: e.target.value
                                }
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="radiusDistanceUnit">Distance Unit</Label>
                            <Select value={terms.radiusClause.distanceUnit} onValueChange={(value) => setTerms(prev => ({
                              ...prev,
                              radiusClause: {
                                ...prev.radiusClause,
                                distanceUnit: value
                              }
                            }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="miles">Miles</SelectItem>
                                <SelectItem value="kilometers">Kilometers</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="radiusTime">Time Restriction</Label>
                            <Input
                              id="radiusTime"
                              type="number"
                              placeholder="e.g., 30"
                              value={terms.radiusClause.timeRestriction}
                              onChange={(e) => setTerms(prev => ({
                                ...prev,
                                radiusClause: {
                                  ...prev.radiusClause,
                                  timeRestriction: e.target.value
                                }
                              }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="radiusTimeUnit">Time Unit</Label>
                            <Select value={terms.radiusClause.timeUnit} onValueChange={(value) => setTerms(prev => ({
                              ...prev,
                              radiusClause: {
                                ...prev.radiusClause,
                                timeUnit: value
                              }
                            }))}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="days">Days</SelectItem>
                                <SelectItem value="weeks">Weeks</SelectItem>
                                <SelectItem value="months">Months</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {terms.radiusClause.enabled && (
                  <>
                    {/* Radius Clause Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Radius Clause Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="radiusRestrictions">Specific Restrictions</Label>
                          <Textarea
                            id="radiusRestrictions"
                            placeholder="Detail specific restrictions (e.g., no performances at competing venues, festival exclusions, etc.)"
                            value={terms.radiusClause.restrictions}
                            onChange={(e) => setTerms(prev => ({
                              ...prev,
                              radiusClause: {
                                ...prev.radiusClause,
                                restrictions: e.target.value
                              }
                            }))}
                            rows={4}
                          />
                        </div>

                        <div>
                          <Label htmlFor="radiusExceptions">Exceptions</Label>
                          <Textarea
                            id="radiusExceptions"
                            placeholder="List any exceptions to the radius clause (e.g., previously booked shows, private events, etc.)"
                            value={terms.radiusClause.exceptions}
                            onChange={(e) => setTerms(prev => ({
                              ...prev,
                              radiusClause: {
                                ...prev.radiusClause,
                                exceptions: e.target.value
                              }
                            }))}
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label htmlFor="radiusEnforcement">Enforcement & Penalties</Label>
                          <Textarea
                            id="radiusEnforcement"
                            placeholder="Describe enforcement terms and penalties for violations (e.g., financial penalties, contract termination, etc.)"
                            value={terms.radiusClause.enforcement}
                            onChange={(e) => setTerms(prev => ({
                              ...prev,
                              radiusClause: {
                                ...prev.radiusClause,
                                enforcement: e.target.value
                              }
                            }))}
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Radius Clause Preview */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Clause Preview</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <p className="text-sm font-medium mb-2">Radius Clause Summary:</p>
                          <p className="text-sm text-gray-700">
                            {terms.radiusClause.distance && terms.radiusClause.timeRestriction ? (
                              <>
                                Artist agrees not to perform within {terms.radiusClause.distance} {terms.radiusClause.distanceUnit} 
                                of this venue for {terms.radiusClause.timeRestriction} {terms.radiusClause.timeUnit} 
                                {terms.radiusClause.timeRestriction === "1" ? terms.radiusClause.timeUnit.slice(0, -1) : terms.radiusClause.timeUnit} 
                                before and after the contracted performance date.
                              </>
                            ) : (
                              "Complete the distance and time restrictions above to see the clause preview."
                            )}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </>
            )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center p-3 border-t bg-background">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createProposalMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createProposalMutation.isPending ? "Sending..." : "Send Contract Proposal"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Availability Checker Modal */}
      {showAvailabilityChecker && bookingRequest?.artistProfile?.id && bookingRequest?.venueProfile?.id && (
        <AvailabilityChecker
          open={showAvailabilityChecker}
          onOpenChange={setShowAvailabilityChecker}
          artistProfileId={bookingRequest.artistProfile.id}
          venueProfileId={bookingRequest.venueProfile.id}
          artistName={bookingRequest.artistProfile.name}
          venueName={bookingRequest.venueProfile.name}
          onDateSelect={handleDateSelect}
        />
      )}
    </Dialog>
  );
}