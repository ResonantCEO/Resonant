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
        <Card className="group hover:shadow-lg transition-all duration-200 cursor-pointer absolute inset-0 w-full h-full backface-hidden flex flex-col" onClick={handleCardClick}>
          <CardHeader className="pb-3 flex-shrink-0">
            {/* Event Image */}
            {event.eventImageUrl && (
              <div className="relative w-full h-40 mb-3 rounded-lg overflow-hidden">
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
                <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-2">
                  {event.name}
                </h3>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col space-y-3">
            <div className="flex-1 space-y-3">
              {/* Event Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
                  <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
                    {event.artists.map(a => a.name).join(', ')}
                  </div>
                </div>
              )}
            </div>

            {/* Ticket Information */}
            {event.ticketTypes && event.ticketTypes.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">Ticket Options</h5>
                <div 
                  className="h-16 overflow-y-auto space-y-2 scrollbar-hide hover:scrollbar-show cursor-grab active:cursor-grabbing"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                  }}
                  onMouseDown={(e) => {
                    const startY = e.pageY - e.currentTarget.offsetTop;
                    const scrollTop = e.currentTarget.scrollTop;
                    
                    const handleMouseMove = (e: MouseEvent) => {
                      const y = e.pageY - e.currentTarget.offsetTop;
                      e.currentTarget.scrollTop = scrollTop - (y - startY);
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                >
                  <style jsx>{`
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                    .scrollbar-hide {
                      -ms-overflow-style: none;
                      scrollbar-width: none;
                    }
                  `}</style>
                  {event.ticketTypes.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded min-h-[56px] select-none">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{ticket.name}</div>
                        <div className="text-xs text-gray-500">
                          {ticket.quantity ? `${ticket.quantity - ticket.quantitySold} available` : 'Limited availability'}
                        </div>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        <div className="font-bold text-green-600 dark:text-green-400">${ticket.price}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {event.ticketTypes.length > 1 && (
                  <div className="text-xs text-center text-gray-500 mt-1">
                    Drag to see all {event.ticketTypes.length} options
                  </div>
                )}
              </div>
            )}

            {/* Pricing Info */}
            {(lowestPrice && !event.ticketTypes) || !event.ticketsAvailable ? (
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
                {lowestPrice && !event.ticketTypes && (
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    From ${lowestPrice}
                  </div>
                )}
                {!event.ticketsAvailable && (
                  <div className="text-sm text-red-500 font-medium">Sold Out</div>
                )}
              </div>
            ) : null}

            {/* Action Buttons */}
            {showActions && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-auto">
                <div className="flex space-x-2">
                  {event.ticketsAvailable && (
                    <Button 
                      size="sm"
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
                  <Button 
                    size="sm"
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

        {/* Back of card */}
        <Card 
          className="absolute inset-0 w-full h-full backface-hidden hover:shadow-lg transition-all duration-200 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-900 flex flex-col cursor-pointer" 
          style={{ transform: 'rotateY(180deg)' }}
          onClick={() => setIsFlipped(false)}
        >
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2 flex-1">
                {event.name}
              </h3>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col space-y-3 overflow-y-auto">
            <div className="flex-1 space-y-3">
              {/* Detailed Event Information */}
              <div className="space-y-2">
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
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={event.venue.profileImageUrl} />
                        <AvatarFallback className="text-xs">{event.venue.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-700 dark:text-gray-300 truncate text-sm">{event.venue.name}</div>
                        {event.venue.location && (
                          <div className="text-xs text-gray-500 truncate">{event.venue.location}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {event.organizer && (
                  <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <Users className="w-4 h-4 mr-2 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">Organized by:</span> <span className="truncate">{event.organizer.name}</span>
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
                <h5 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">About This Event</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-4">
                  {event.description}
                </p>
              </div>

              {/* Artists */}
              {event.artists && event.artists.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2 text-sm">Performing Artists</h5>
                  <div className="space-y-2 max-h-24 overflow-y-auto">
                    {event.artists.map((artist) => (
                      <div key={artist.id} className="flex items-center space-x-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={artist.profileImageUrl} />
                          <AvatarFallback className="text-xs">{artist.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{artist.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {showActions && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-auto flex-shrink-0">
                <div className="flex space-x-2">
                  {event.ticketsAvailable && (
                    <Button 
                      size="sm"
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
                  <Button 
                    size="sm"
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