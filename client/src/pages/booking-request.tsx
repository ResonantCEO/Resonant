
import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Clock, DollarSign, FileText } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/hooks/useSidebar";

export default function BookingRequest() {
  const { venueId } = useParams<{ venueId: string }>();
  const { user } = useAuth();
  const { isCollapsed } = useSidebar();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    eventDate: "",
    eventTime: "",
    budget: "",
    requirements: "",
    message: ""
  });

  const { data: venue } = useQuery({
    queryKey: [`/api/profiles/${venueId}`],
    enabled: !!venueId,
  });

  const { data: activeProfile } = useQuery({
    queryKey: ["/api/profiles/active"],
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/booking-requests", data);
    },
    onSuccess: () => {
      toast({
        title: "Booking Request Sent",
        description: "Your booking request has been sent to the venue.",
      });
      // Reset form
      setFormData({
        eventDate: "",
        eventTime: "",
        budget: "",
        requirements: "",
        message: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send booking request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!venueId || !activeProfile) {
      toast({
        title: "Error",
        description: "Missing venue or profile information",
        variant: "destructive",
      });
      return;
    }

    createBookingMutation.mutate({
      venueId: parseInt(venueId),
      ...formData
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!venue || !activeProfile) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className={`flex-1 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pt-16 lg:pt-0`}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-neutral-300 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeProfile.type !== 'artist') {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className={`flex-1 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pt-16 lg:pt-0`}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
              <p>Only artists can send booking requests.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className={`flex-1 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pt-16 lg:pt-0`}>
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => window.history.back()}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <h1 className="text-3xl font-bold mb-2">Book {venue.name}</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Send a booking request to {venue.name} for your upcoming event.
            </p>
          </div>

          {/* Venue Info */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 border">
            <div className="flex items-center space-x-4">
              <img
                src={venue.profileImageUrl || "/default-venue.jpg"}
                alt={venue.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <h3 className="font-semibold text-lg">{venue.name}</h3>
                {venue.location && (
                  <p className="text-gray-600 dark:text-gray-400">{venue.location}</p>
                )}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  Venue
                </span>
              </div>
            </div>
          </div>

          {/* Booking Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border">
              <h3 className="text-lg font-semibold mb-4">Event Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label htmlFor="eventDate">Event Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="eventDate"
                      type="date"
                      value={formData.eventDate}
                      onChange={(e) => handleInputChange('eventDate', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="eventTime">Event Time</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="eventTime"
                      type="time"
                      value={formData.eventTime}
                      onChange={(e) => handleInputChange('eventTime', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="budget">Budget (optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="budget"
                    type="number"
                    placeholder="Enter your budget"
                    value={formData.budget}
                    onChange={(e) => handleInputChange('budget', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="mb-4">
                <Label htmlFor="requirements">Requirements (optional)</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Textarea
                    id="requirements"
                    placeholder="Any special requirements (sound equipment, lighting, etc.)"
                    value={formData.requirements}
                    onChange={(e) => handleInputChange('requirements', e.target.value)}
                    className="pl-10 min-h-20"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Tell the venue about your event and why you'd like to book with them..."
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  className="min-h-24"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBookingMutation.isPending || !formData.message.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                {createBookingMutation.isPending ? "Sending..." : "Send Booking Request"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
