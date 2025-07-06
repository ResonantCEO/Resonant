
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { FileText, DollarSign, Calendar, Clock } from "lucide-react";
import AvailabilityChecker from "./availability-checker";

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
  cancellationPolicy: string;
  forceMateure: boolean;
  merchandising: string;
  recording: string;
  additionalServices: string[];
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

export default function ContractProposalDialog({ 
  open, 
  onOpenChange, 
  bookingRequest,
  venues = []
}: ContractProposalDialogProps) {
  const [selectedVenueForContract, setSelectedVenueForContract] = useState<any>(null);
  const [showAvailabilityChecker, setShowAvailabilityChecker] = useState(false);
  const [currentPage, setCurrentPage] = useState('event-terms');
  
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
    cancellationPolicy: "",
    forceMateure: false,
    merchandising: "",
    recording: "",
    additionalServices: [],
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

  const queryClient = useQueryClient();

  // Update contract title when booking request or selected venue changes
  useEffect(() => {
    if (bookingRequest) {
      setFormData(prev => ({
        ...prev,
        title: getDefaultTitle()
      }));
    }
  }, [bookingRequest, selectedVenueForContract]);

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
      cancellationPolicy: "",
      forceMateure: false,
      merchandising: "",
      recording: "",
      additionalServices: [],
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
    };

    createProposalMutation.mutate(proposalData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Propose Contract - {bookingRequest?.artistProfile?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-full">
          {/* Sidebar Navigation */}
          <div className="w-64 border-r border-gray-700 bg-gray-900 p-4 rounded-l-lg">
            <div className="space-y-2">
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
                variant={currentPage === 'docs' ? "default" : "ghost"}
                className={`w-full justify-start text-white ${
                  currentPage === 'docs' 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "hover:bg-gray-800"
                }`}
                onClick={() => setCurrentPage('docs')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Docs
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
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
                          {venues.map((venue: any) => (
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
                  <CardHeader>
                    <CardTitle>Contract Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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

                {/* Performance Schedule */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Clock className="w-5 h-5" />
                      <span>Performance Schedule</span>
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
                        <Label htmlFor="soundCheckLength">Sound Check Length</Label>
                        <Input
                          id="soundCheckLength"
                          placeholder="e.g., 30 minutes"
                          value={terms.soundCheckLength}
                          onChange={(e) => setTerms({...terms, soundCheckLength: e.target.value})}
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
              </>
            )}

            {currentPage === 'artist-terms' && (
              <>
                {/* Artist Requirements */}
                <Card>
                  <CardHeader>
                    <CardTitle>Artist Requirements & Rights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
                      <Textarea
                        id="cancellationPolicy"
                        placeholder="Describe cancellation terms and notice requirements..."
                        value={terms.cancellationPolicy}
                        onChange={(e) => setTerms({...terms, cancellationPolicy: e.target.value})}
                        rows={3}
                      />
                    </div>
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

            {currentPage === 'payment' && (
              <>
                {/* Payment Terms */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <DollarSign className="w-5 h-5" />
                      <span>Payment Terms</span>
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
              </>
            )}

            {currentPage === 'docs' && (
              <>
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
                    <div>
                      <Label htmlFor="legalTerms">Legal Terms & Conditions</Label>
                      <Textarea
                        id="legalTerms"
                        placeholder="Governing law, jurisdiction, dispute resolution, liability limitations..."
                        rows={4}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
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
