import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  Music, 
  Ticket,
  Heart,
  Share2,
  ExternalLink
} from "lucide-react";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

interface EventCardProps {
  event: {
    id: number;
    name: string;
    description: string;
    eventDate: string;
    eventTime?: string;
    genre?: string;
    ageRestriction?: string;
    status: string;
    capacity?: number;
    ticketsAvailable: boolean;
    eventImageUrl?: string;
    tags: string[];
    organizer?: {
      id: number;
      name: string;
      profileImageUrl?: string;
      type: string;
    };
    venue?: {
      id: number;
      name: string;
      profileImageUrl?: string;
      location?: string;
    };
    artists?: Array<{
      id: number;
      name: string;
      profileImageUrl?: string;
    }>;
    ticketTypes?: Array<{
      id: number;
      name: string;
      price: number;
      quantity?: number;
      quantitySold: number;
    }>;
  };
  showActions?: boolean;
  onEventClick?: (eventId: number) => void;
}

export default function EventCard({ event, showActions = true, onEventClick }: EventCardProps) {
  const [isInterested, setIsInterested] = useState(false);
  const queryClient = useQueryClient();
  const [isFlipped, setIsFlipped] = useState(false);

  const attendMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/events/${event.id}/attend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update attendance');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast({ title: "Attendance updated", description: "Your interest has been recorded." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getLowestPrice = () => {
    if (!event.ticketTypes || event.ticketTypes.length === 0) return null;
    return Math.min(...event.ticketTypes.map(t => t.price));
  };

  const getAgeRestrictionBadge = () => {
    switch (event.ageRestriction) {
      case 'all_ages':
        return <Badge variant="secondary" className="bg-green-500 text-white font-semibold border-green-600 shadow-sm">All Ages</Badge>;
      case '18+':
        return <Badge variant="secondary" className="bg-orange-500 text-white font-semibold border-orange-600 shadow-sm">18+</Badge>;
      case '21+':
        return <Badge variant="secondary" className="bg-red-500 text-white font-semibold border-red-600 shadow-sm">21+</Badge>;
      default:
        return null;
    }
  };

  const handleInterested = () => {
    const newStatus = isInterested ? 'interested' : 'going';
    setIsInterested(!isInterested);
    attendMutation.mutate(newStatus);
  };

  const handleCardClick = () => {
    setIsFlipped(true);
    if (onEventClick) {
      onEventClick(event.id);
    }
  };

  const lowestPrice = getLowestPrice();

  return (
    <div className="event-card-container relative group w-full perspective-1000">
      <div className={`relative w-full h-full transition-all duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front of card */}
        <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer absolute inset-0 w-full h-full backface-hidden" onClick={handleCardClick}>
          <CardHeader className="pb-3">
            {/* Event Image */}
            {event.eventImageUrl && (
              <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
                <img 
                  src={event.eventImageUrl} 
                  alt={event.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                {event.status === 'published' && (
                  <div className="absolute top-3 right-3">
                    <Badge className="bg-blue-500 text-white">Live</Badge>
                  </div>
                )}
              </div>
            )}

            {/* Event Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  {event.name}
                </h3>
              </div>
              {showActions && (
                <div className="flex space-x-2 ml-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInterested();
                    }}
                    className={isInterested ? "text-red-500 border-red-500" : ""}
                  >
                    <Heart className={`w-4 h-4 ${isInterested ? "fill-current" : ""}`} />
                  </Button>
                  <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Event Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                {formatDate(event.eventDate)}
              </div>

              {event.eventTime && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4 mr-2 text-blue-500" />
                  {event.eventTime}
                </div>
              )}
            </div>

            {/* Genre and Age Restriction */}
            <div className="flex items-center space-x-2">
              {event.genre && (
                <Badge variant="outline" className="flex items-center">
                  <Music className="w-3 h-3 mr-1" />
                  {event.genre}
                </Badge>
              )}
              {getAgeRestrictionBadge()}
            </div>

            {/* Artists */}
            {event.artists && event.artists.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Artists:</span>
                <div className="flex -space-x-2">
                  {event.artists.slice(0, 3).map((artist) => (
                    <Avatar key={artist.id} className="w-6 h-6 border-2 border-white">
                      <AvatarImage src={artist.profileImageUrl} />
                      <AvatarFallback className="text-xs">{artist.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {event.artists.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                      +{event.artists.length - 3}
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {event.artists.map(a => a.name).join(', ')}
                </div>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {event.tags.slice(0, 4).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
                {event.tags.length > 4 && (
                  <Badge variant="secondary" className="text-xs">
                    +{event.tags.length - 4} more
                  </Badge>
                )}
              </div>
            )}

            {/* Ticket Information */}
            {event.ticketTypes && event.ticketTypes.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Ticket Options</h5>
                <div className="space-y-2">
                  {event.ticketTypes.slice(0, 2).map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      <div>
                        <div className="font-medium text-sm">{ticket.name}</div>
                        <div className="text-xs text-gray-500">
                          {ticket.quantity ? `${ticket.quantity - ticket.quantitySold} available` : 'Limited availability'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600 dark:text-green-400">${ticket.price}</div>
                      </div>
                    </div>
                  ))}
                  {event.ticketTypes.length > 2 && (
                    <div className="text-xs text-center text-gray-500">
                      +{event.ticketTypes.length - 2} more options available
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pricing and Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
              <div>
                {lowestPrice && !event.ticketTypes && (
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    From ${lowestPrice}
                  </div>
                )}
                {!event.ticketsAvailable && (
                  <div className="text-sm text-red-500 font-medium">Sold Out</div>
                )}
              </div>

              {showActions && event.ticketsAvailable && (
                <Button 
                  size="sm" 
                  className="flex items-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle ticket purchase
                  }}
                >
                  <Ticket className="w-4 h-4 mr-1" />
                  Get Tickets
                </Button>
              )}
            </div>

            </CardContent>
        </Card>

        {/* Back of card */}
        <Card 
          className="absolute inset-0 w-full h-full backface-hidden hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900" 
          style={{ transform: 'rotateY(180deg)' }}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Event Details
              </h3>
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
              >
                ← Back
              </Button>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              {event.name}
            </h4>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Detailed Event Information */}
            <div className="space-y-3">
              <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                <div>
                  <div className="font-medium">{formatDate(event.eventDate)}</div>
                  {event.eventTime && (
                    <div className="text-xs text-gray-500">at {event.eventTime}</div>
                  )}
                </div>
              </div>

              {event.venue && (
                <div className="flex items-start text-sm text-gray-700 dark:text-gray-300">
                  <MapPin className="w-4 h-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                  <div>
                    <div className="font-medium">{event.venue.name}</div>
                    {event.venue.location && (
                      <div className="text-xs text-gray-500">{event.venue.location}</div>
                    )}
                  </div>
                </div>
              )}

              {event.organizer && (
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <Users className="w-4 h-4 mr-2 text-blue-500" />
                  <div>
                    <span className="font-medium">Organized by:</span> {event.organizer.name}
                  </div>
                </div>
              )}

              {event.capacity && (
                <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                  <Users className="w-4 h-4 mr-2 text-green-500" />
                  <span>Capacity: {event.capacity.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Full Description */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <h5 className="font-medium text-gray-900 dark:text-white mb-2">About This Event</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {event.description}
              </p>
            </div>

            

            {/* Artists */}
            {event.artists && event.artists.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Performing Artists</h5>
                <div className="space-y-2">
                  {event.artists.map((artist) => (
                    <div key={artist.id} className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={artist.profileImageUrl} />
                        <AvatarFallback className="text-xs">{artist.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{artist.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {event.tags && event.tags.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2">Tags</h5>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {showActions && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex space-x-2">
                  {event.ticketsAvailable && (
                    <Button 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEventClick) onEventClick(event.id);
                      }}
                    >
                      <Ticket className="w-4 h-4 mr-1" />
                      Get Tickets
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInterested();
                    }}
                    className={isInterested ? "text-red-500 border-red-500" : ""}
                  >
                    <Heart className={`w-4 h-4 ${isInterested ? "fill-current" : ""}`} />
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}