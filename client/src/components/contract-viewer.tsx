
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { FileText, DollarSign, Clock, CheckCircle, XCircle, MessageSquare, Calendar } from "lucide-react";

interface ContractViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: number | null;
  userProfile: any;
}

export default function ContractViewer({ 
  open, 
  onOpenChange, 
  contractId, 
  userProfile 
}: ContractViewerProps) {
  const [negotiationMessage, setNegotiationMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const queryClient = useQueryClient();

  // Fetch contract details
  const { data: contract, isLoading } = useQuery({
    queryKey: ["/api/contract-proposals", contractId],
    queryFn: async () => {
      if (!contractId) return null;
      const response = await fetch(`/api/contract-proposals/${contractId}`);
      if (!response.ok) throw new Error("Failed to fetch contract");
      return response.json();
    },
    enabled: !!contractId && open,
  });

  // Accept contract mutation
  const acceptMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/contract-proposals/${contractId}/accept`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to accept contract");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-proposals", contractId] });
      toast({
        title: "Contract Accepted",
        description: "You have accepted the contract proposal",
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

  // Reject contract mutation
  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const response = await fetch(`/api/contract-proposals/${contractId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!response.ok) throw new Error("Failed to reject contract");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-proposals", contractId] });
      setShowRejectDialog(false);
      setRejectionReason("");
      toast({
        title: "Contract Rejected",
        description: "You have rejected the contract proposal",
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

  // Add negotiation mutation
  const negotiateMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch(`/api/contract-proposals/${contractId}/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) throw new Error("Failed to add negotiation");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contract-proposals", contractId] });
      setNegotiationMessage("");
      toast({
        title: "Message Sent",
        description: "Your negotiation message has been sent",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'negotiating': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatCurrency = (amount: string, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(amount));
  };

  const canUserRespond = contract && contract.proposedTo === userProfile?.id && contract.status === 'pending';
  const canUserNegotiate = contract && 
    (contract.proposedBy === userProfile?.id || contract.proposedTo === userProfile?.id) && 
    ['pending', 'negotiating'].includes(contract.status);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <div>Loading contract...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!contract) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>{contract.title}</span>
              </div>
              <Badge className={getStatusColor(contract.status)}>
                {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Contract Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {contract.description && (
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-gray-600">{contract.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-1">Created</h4>
                    <p className="text-sm text-gray-600">
                      {new Date(contract.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {contract.expiresAt && (
                    <div>
                      <h4 className="font-medium mb-1">Expires</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(contract.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="w-5 h-5" />
                  <span>Performance Terms</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  {contract.terms.performanceDuration && (
                    <div>
                      <h4 className="font-medium mb-1">Performance Duration</h4>
                      <p className="text-sm text-gray-600">{contract.terms.performanceDuration}</p>
                    </div>
                  )}
                  {contract.terms.soundCheck && (
                    <div>
                      <h4 className="font-medium mb-1">Sound Check</h4>
                      <p className="text-sm text-gray-600">{contract.terms.soundCheck}</p>
                    </div>
                  )}
                  {contract.terms.setupTime && (
                    <div>
                      <h4 className="font-medium mb-1">Setup Time</h4>
                      <p className="text-sm text-gray-600">{contract.terms.setupTime}</p>
                    </div>
                  )}
                  {contract.terms.breakdownTime && (
                    <div>
                      <h4 className="font-medium mb-1">Breakdown Time</h4>
                      <p className="text-sm text-gray-600">{contract.terms.breakdownTime}</p>
                    </div>
                  )}
                </div>
                {contract.terms.cancellationPolicy && (
                  <div>
                    <h4 className="font-medium mb-1">Cancellation Policy</h4>
                    <p className="text-sm text-gray-600">{contract.terms.cancellationPolicy}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {contract.terms.merchandising && (
                    <div>
                      <h4 className="font-medium mb-1">Merchandising</h4>
                      <p className="text-sm text-gray-600">{contract.terms.merchandising}</p>
                    </div>
                  )}
                  {contract.terms.recording && (
                    <div>
                      <h4 className="font-medium mb-1">Recording Rights</h4>
                      <p className="text-sm text-gray-600">{contract.terms.recording}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5" />
                  <span>Payment Terms</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium mb-1">Total Amount</h4>
                    <p className="text-lg font-semibold text-green-600">
                      {formatCurrency(contract.payment.totalAmount, contract.payment.currency)}
                    </p>
                  </div>
                  {contract.payment.depositAmount && (
                    <div>
                      <h4 className="font-medium mb-1">Deposit</h4>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(contract.payment.depositAmount, contract.payment.currency)}
                      </p>
                    </div>
                  )}
                  {contract.payment.paymentMethod && (
                    <div>
                      <h4 className="font-medium mb-1">Payment Method</h4>
                      <p className="text-sm text-gray-600">{contract.payment.paymentMethod}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {contract.payment.depositDueDate && (
                    <div>
                      <h4 className="font-medium mb-1">Deposit Due</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(contract.payment.depositDueDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {contract.payment.finalPaymentDate && (
                    <div>
                      <h4 className="font-medium mb-1">Final Payment Due</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(contract.payment.finalPaymentDate).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
                {contract.payment.expenses && (
                  <div>
                    <h4 className="font-medium mb-1">Expenses Coverage</h4>
                    <p className="text-sm text-gray-600">{contract.payment.expenses}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Additional Requirements */}
            {contract.requirements && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{contract.requirements}</p>
                </CardContent>
              </Card>
            )}

            {/* Negotiations */}
            {contract.negotiations && contract.negotiations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MessageSquare className="w-5 h-5" />
                    <span>Discussion</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {contract.negotiations.map((negotiation: any) => (
                    <div key={negotiation.id} className="border-l-4 border-blue-200 pl-4">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium">{negotiation.profile.name}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(negotiation.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-600">{negotiation.message}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Add Negotiation */}
            {canUserNegotiate && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Message</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Add a comment or request changes to this contract..."
                    value={negotiationMessage}
                    onChange={(e) => setNegotiationMessage(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={() => negotiateMutation.mutate(negotiationMessage)}
                    disabled={!negotiationMessage.trim() || negotiateMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {negotiateMutation.isPending ? "Sending..." : "Send Message"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            {canUserRespond && (
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectDialog(true)}
                  className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {acceptMutation.isPending ? "Accepting..." : "Accept Contract"}
                </Button>
              </div>
            )}

            {/* Signatures */}
            {contract.signatures && contract.signatures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Digital Signatures</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {contract.signatures.map((signature: any) => (
                      <div key={signature.id} className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="font-medium">{signature.profile.name}</span>
                        <span className="text-sm text-gray-500">
                          signed on {new Date(signature.signedAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Please provide a reason for rejecting this contract proposal:</p>
            <Textarea
              placeholder="Explain why you're rejecting this contract..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => rejectMutation.mutate(rejectionReason)}
                disabled={!rejectionReason.trim() || rejectMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {rejectMutation.isPending ? "Rejecting..." : "Reject Contract"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
