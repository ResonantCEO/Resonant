import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Search, Filter, MapPin, Calendar, Users, Star, Bookmark, MessageSquare, Plus, ChevronDown, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "@/hooks/useAuth";
import EventCard from "@/components/event-card";

interface DiscoverItem {
  id: number;
  name: string;
  type: "artist" | "venue" | "audience" | "event";
  profileImageUrl?: string;
  location?: string;
  genre?: string[];
  capacity?: number;
  rating?: number;
  availability?: "available" | "limited" | "booked";
  eventDate?: string;
  description?: string;
  tags?: string[];
}

export default function Discover() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "artist" | "venue" | "event">("all");
  const [selectedLocation, setSelectedLocation] = useState("all-locations");
  const [selectedGenre, setSelectedGenre] = useState("all-genres");
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { isCollapsed } = useSidebar();
  const [, setLocation] = useLocation();
  const [navigatingToProfile, setNavigatingToProfile] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("events");

  const handleViewProfile = (profileId: number) => {
    setNavigatingToProfile(profileId);
    setLocation(`/profile/${profileId}`);
  };

  // Fetch discover data from API
  const { data: discoverData = [], isLoading, refetch } = useQuery({
    queryKey: ['discover', searchQuery, selectedType, selectedLocation, selectedGenre],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (searchQuery) {
        params.append('q', searchQuery);
      }
      if (selectedType !== 'all') {
        params.append('type', selectedType);
      }
      if (selectedLocation !== 'all-locations') {
        params.append('location', selectedLocation);
      }
      if (selectedGenre !== 'all-genres') {
        params.append('genre', selectedGenre);
      }

      const endpoint = searchQuery ? '/api/profiles/search' : '/api/discover';
      const response = await fetch(`${endpoint}?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch discover data');
      }

      return response.json();
    },
    staleTime: 30000, // 30 seconds
  });

  // Transform API data to match interface
  const filteredData: DiscoverItem[] = discoverData.map((profile: any) => ({
    id: profile.id,
    name: profile.name,
    type: profile.type as "artist" | "venue" | "audience",
    profileImageUrl: profile.profileImageUrl,
    location: profile.location,
    description: profile.bio,
    // Add default values for missing fields
    genre: [], // Will be added when genre support is implemented
    rating: undefined,
    availability: "available" as const,
    tags: [],
  }));

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      refetch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedType, selectedLocation, selectedGenre, refetch]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "artist": return "🎤";
      case "venue": return "🏛️";
      case "audience": return "👤";
      case "event": return "🎪";
      default: return "📋";
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "available": return "bg-green-100 text-green-700";
      case "limited": return "bg-yellow-100 text-yellow-700";
      case "booked": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // Mock event data for placeholder cards
  const mockEventsData = [
    {
      id: 1,
      name: "Summer Music Festival 2024",
      description: "Join us for an unforgettable night of live music featuring top local and national artists. Experience the magic of summer with food trucks, craft beer, and amazing performances under the stars.",
      eventDate: "2024-07-15T19:00:00.000Z",
      eventTime: "7:00 PM",
      genre: "Pop/Rock",
      ageRestriction: "all_ages",
      status: "published",
      capacity: 5000,
      ticketsAvailable: true,
      eventImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop",
      tags: ["festival", "outdoor", "live-music", "summer"],
      organizer: {
        id: 1,
        name: "City Events Co.",
        profileImageUrl: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=100&h=100&fit=crop",
        type: "organizer"
      },
      venue: {
        id: 1,
        name: "Central Park Amphitheater",
        profileImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=100&h=100&fit=crop",
        location: "Downtown, NY"
      },
      artists: [
        {
          id: 1,
          name: "The Electric Waves",
          profileImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=50&h=50&fit=crop"
        },
        {
          id: 2,
          name: "Sunset Riders",
          profileImageUrl: "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=50&h=50&fit=crop"
        }
      ],
      ticketTypes: [
        {
          id: 1,
          name: "General Admission",
          price: 45,
          quantity: 2500,
          quantitySold: 1200
        },
        {
          id: 2,
          name: "VIP Package",
          price: 125,
          quantity: 500,
          quantitySold: 350
        }
      ]
    },
    {
      id: 2,
      name: "Jazz in the Park",
      description: "Intimate evening of smooth jazz with renowned local musicians. Bring a blanket and enjoy cocktails and light bites while listening to soulful melodies.",
      eventDate: "2024-07-20T20:00:00.000Z",
      eventTime: "8:00 PM",
      genre: "Jazz",
      ageRestriction: "21+",
      status: "published",
      capacity: 300,
      ticketsAvailable: true,
      eventImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop",
      tags: ["jazz", "intimate", "cocktails", "evening"],
      organizer: {
        id: 2,
        name: "Jazz Society",
        profileImageUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&h=100&fit=crop",
        type: "organizer"
      },
      venue: {
        id: 2,
        name: "Riverside Gardens",
        profileImageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=100&h=100&fit=crop",
        location: "Riverside District"
      },
      artists: [
        {
          id: 3,
          name: "Sarah Mitchell Quartet",
          profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616c638d50c?w=50&h=50&fit=crop"
        }
      ],
      ticketTypes: [
        {
          id: 3,
          name: "Standard",
          price: 35,
          quantity: 300,
          quantitySold: 85
        }
      ]
    },
    {
      id: 3,
      name: "Electronic Dance Night",
      description: "Get ready to dance the night away with the hottest DJs in the city. State-of-the-art sound system and lighting will create an unforgettable experience.",
      eventDate: "2024-07-25T22:00:00.000Z",
      eventTime: "10:00 PM",
      genre: "Electronic/EDM",
      ageRestriction: "18+",
      status: "published",
      capacity: 1500,
      ticketsAvailable: true,
      eventImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=800&h=400&fit=crop",
      tags: ["edm", "dance", "nightlife", "dj"],
      organizer: {
        id: 3,
        name: "Nightlife Productions",
        profileImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=100&h=100&fit=crop",
        type: "organizer"
      },
      venue: {
        id: 3,
        name: "The Underground",
        profileImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=100&h=100&fit=crop",
        location: "Metro District"
      },
      artists: [
        {
          id: 4,
          name: "DJ Pulse",
          profileImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=50&h=50&fit=crop"
        },
        {
          id: 5,
          name: "Bass Drop",
          profileImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=50&h=50&fit=crop"
        }
      ],
      ticketTypes: [
        {
          id: 4,
          name: "Early Bird",
          price: 25,
          quantity: 500,
          quantitySold: 500
        },
        {
          id: 5,
          name: "General Admission",
          price: 40,
          quantity: 1000,
          quantitySold: 600
        }
      ]
    },
    {
      id: 4,
      name: "Acoustic Sunday Sessions",
      description: "Relax and unwind with beautiful acoustic performances in our cozy venue. Perfect for a Sunday afternoon with coffee and light snacks available.",
      eventDate: "2024-07-28T15:00:00.000Z",
      eventTime: "3:00 PM",
      genre: "Acoustic/Folk",
      ageRestriction: "all_ages",
      status: "published",
      capacity: 150,
      ticketsAvailable: true,
      eventImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop",
      tags: ["acoustic", "sunday", "coffee", "intimate"],
      organizer: {
        id: 4,
        name: "Coffeehouse Concerts",
        profileImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop",
        type: "organizer"
      },
      venue: {
        id: 4,
        name: "The Bean Counter Café",
        profileImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop",
        location: "Arts Quarter"
      },
      artists: [
        {
          id: 6,
          name: "Emma Stone & Guitar",
          profileImageUrl: "https://images.unsplash.com/photo-1494790108755-2616c638d50c?w=50&h=50&fit=crop"
        }
      ],
      ticketTypes: [
        {
          id: 6,
          name: "General Seating",
          price: 15,
          quantity: 150,
          quantitySold: 45
        }
      ]
    },
    {
      id: 5,
      name: "Rock Revival Concert",
      description: "Classic rock tribute bands perform your favorite hits from the 70s, 80s, and 90s. Sing along to the greatest rock anthems of all time!",
      eventDate: "2024-08-02T19:30:00.000Z",
      eventTime: "7:30 PM",
      genre: "Rock/Classic Rock",
      ageRestriction: "all_ages",
      status: "published",
      capacity: 800,
      ticketsAvailable: false,
      eventImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop",
      tags: ["rock", "tribute", "classic", "sold-out"],
      organizer: {
        id: 5,
        name: "Rock Revival Productions",
        profileImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop",
        type: "organizer"
      },
      venue: {
        id: 5,
        name: "The Rock House",
        profileImageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop",
        location: "Music District"
      },
      artists: [
        {
          id: 7,
          name: "LedEppelin (Tribute)",
          profileImageUrl: "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=50&h=50&fit=crop"
        },
        {
          id: 8,
          name: "The Rolling Scones",
          profileImageUrl: "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?w=50&h=50&fit=crop"
        }
      ],
      ticketTypes: [
        {
          id: 7,
          name: "General Admission",
          price: 55,
          quantity: 800,
          quantitySold: 800
        }
      ]
    },
    {
      id: 6,
      name: "Hip-Hop Showcase",
      description: "Discover the next generation of hip-hop talent at our monthly showcase. Local artists compete for prizes and recognition in this high-energy event.",
      eventDate: "2024-08-10T21:00:00.000Z",
      eventTime: "9:00 PM",
      genre: "Hip-Hop/Rap",
      ageRestriction: "18+",
      status: "published",
      capacity: 400,
      ticketsAvailable: true,
      eventImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=800&h=400&fit=crop",
      tags: ["hip-hop", "showcase", "competition", "local"],
      organizer: {
        id: 6,
        name: "Urban Beats Collective",
        profileImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=100&h=100&fit=crop",
        type: "organizer"
      },
      venue: {
        id: 6,
        name: "The Cipher Club",
        profileImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=100&h=100&fit=crop",
        location: "Urban District"
      },
      artists: [
        {
          id: 9,
          name: "MC Flow",
          profileImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=50&h=50&fit=crop"
        },
        {
          id: 10,
          name: "Beats by Nova",
          profileImageUrl: "https://images.unsplash.com/photo-1571266028243-c4e5d0e3d0c0?w=50&h=50&fit=crop"
        }
      ],
      ticketTypes: [
        {
          id: 8,
          name: "Standard Entry",
          price: 20,
          quantity: 400,
          quantitySold: 120
        }
      ]
    }
  ];

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events", { search: searchTerm, limit: 20, offset: 0 }],
    enabled: activeTab === "events",
  });

  // Use mock data if API data is not available or empty
  const displayEventsData = eventsData && eventsData.length > 0 ? eventsData : mockEventsData;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-neutral-900 dark:to-neutral-800">
      <Sidebar />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-white/20 dark:border-neutral-700/30 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <img src="/resonant-logo.png" alt="Resonant" className="h-8 block dark:hidden" />
            <img src="/resonant-logo-white.png" alt="Resonant" className="h-8 hidden dark:block" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'} pt-16 lg:pt-0`}>
        <div className="container mx-auto px-4 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Compass className="w-8 h-8 mr-3 text-blue-500" />
                  Discover
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Explore artists, venues, events, and music in your area
                </p>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search artists, venues, events, or genres..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="artist">Artists</SelectItem>
                  <SelectItem value="venue">Venues</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="nearby">Nearby</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:grid-cols-2">
              <TabsTrigger value="events" className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Events
              </TabsTrigger>
              <TabsTrigger value="profiles" className="flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Profiles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="mt-6">
              {eventsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardHeader>
                        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg mb-4"></div>
                        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : displayEventsData && displayEventsData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {displayEventsData
                    .filter((event: any) => {
                      if (!searchTerm) return true;
                      return event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             event.genre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             event.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
                    })
                    .map((event: any) => (
                    <EventCard 
                      key={event.id} 
                      event={event}
                      onEventClick={(eventId) => {
                        // Handle event click - could navigate to event details
                        console.log("Event clicked:", eventId);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Events Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting your search or check back later for new events.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="profiles" className="mt-6">
              {/* Featured Section */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-neutral-900 mb-6">Featured This Week</h2>

                {/* Featured Artists */}
                {filteredData.filter(item => item.type === "artist").length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-blue-500 mr-3"></span>
                      Featured Artists
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {filteredData.filter(item => item.type === "artist").slice(0, 3).map((item) => (
                        <Card
                          key={item.id}
                          className="group hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <CardContent className="p-0">
                            {/* Enhanced Header with Featured styling */}
                            <div className="h-48 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-t-lg relative overflow-hidden border-b border-neutral-100">
                              <div className="absolute inset-0">
                                {item.profileImageUrl ? (
                                  <img
                                    src={item.profileImageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-6xl bg-white">
                                    {getTypeIcon(item.type)}
                                  </div>
                                )}
                              </div>

                              {/* Quick Actions - appear on hover */}
                              {hoveredItem === item.id && (
                                <div className="absolute top-4 right-4 flex gap-2">
                                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0 shadow-lg">
                                    <Bookmark className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0 shadow-lg">
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}



                              {/* Rating Badge */}
                              {item.rating && (
                                <div className="absolute bottom-4 right-4">
                                  <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="text-sm font-bold text-neutral-800">{item.rating}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Enhanced Content */}
                            <div className="p-5">
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-lg text-neutral-900 group-hover:text-indigo-600 transition-colors">
                                    {item.name}
                                  </h3>
                                  <Badge className="bg-white text-purple-600 font-bold border-0 shadow-lg text-sm">
                                    {getTypeIcon(item.type)} {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                  </Badge>
                                </div>

                                {/* Location/Date and Capacity */}
                                <div className="space-y-2">
                                  {item.type === "event" && item.eventDate ? (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-indigo-500" />
                                      <span className="text-sm font-medium text-neutral-700">
                                        {new Date(item.eventDate).toLocaleDateString('en-US', {
                                          weekday: 'short',
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-indigo-500" />
                                      <span className="text-sm font-medium text-neutral-700">{item.location}</span>
                                    </div>
                                  )}

                                  {item.capacity && (
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-green-500" />
                                      <span className="text-sm font-medium text-neutral-700">{item.capacity.toLocaleString()} capacity</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-sm text-neutral-600 mb-4 leading-relaxed line-clamp-2">
                                {item.description}
                              </p>

                              {/* Tags */}
                              <div className="flex flex-wrap gap-2 mb-5">
                                {item.tags?.slice(0, 2).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs font-medium px-2 py-1 border-indigo-300 bg-indigo-500 text-white">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>

                              {/* Action Button */}
                              <Button
                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold shadow-lg border-0"
                                onClick={() => handleViewProfile(item.id)}
                                disabled={navigatingToProfile === item.id}
                              >
                                {navigatingToProfile === item.id ? (
                                  <div className="flex items-center">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    <span className="drop-shadow-sm">Loading...</span>
                                  </div>
                                ) : (
                                  <span className="drop-shadow-sm">View Profile</span>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Featured Venues */}
                {filteredData.filter(item => item.type === "venue").length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-green-500 mr-3"></span>
                      Featured Venues
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {filteredData.filter(item => item.type === "venue").slice(0, 3).map((item) => (
                        <Card
                          key={item.id}
                          className="group hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <CardContent className="p-0">
                            {/* Enhanced Header with Featured styling */}
                            <div className="h-48 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-t-lg relative overflow-hidden border-b border-neutral-100">
                              <div className="absolute inset-0">
                                {item.profileImageUrl ? (
                                  <img
                                    src={item.profileImageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-6xl bg-white">
                                    {getTypeIcon(item.type)}
                                  </div>
                                )}
                              </div>

                              {/* Quick Actions - appear on hover */}
                              {hoveredItem === item.id && (
                                <div className="absolute top-4 right-4 flex gap-2">
                                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0 shadow-lg">
                                    <Bookmark className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0 shadow-lg">
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}



                              {/* Rating Badge */}
                              {item.rating && (
                                <div className="absolute bottom-4 right-4">
                                  <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg">
                                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                    <span className="text-sm font-bold text-neutral-800">{item.rating}</span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Enhanced Content */}
                            <div className="p-5">
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-lg text-neutral-900 group-hover:text-green-600 transition-colors">
                                    {item.name}
                                  </h3>
                                  <Badge className="bg-white text-purple-600 font-bold border-0 shadow-lg text-sm">
                                    {getTypeIcon(item.type)} {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                  </Badge>
                                </div>

                                {/* Location/Date and Capacity */}
                                <div className="space-y-2">
                                  {item.type === "event" && item.eventDate ? (
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-green-500" />
                                      <span className="text-sm font-medium text-neutral-700">
                                        {new Date(item.eventDate).toLocaleDateString('en-US', {
                                          weekday: 'short',
                                          year: 'numeric',
                                          month: 'short',
                                          day: 'numeric'
                                        })}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <MapPin className="h-4 w-4 text-green-500" />
                                      <span className="text-sm font-medium text-neutral-700">{item.location}</span>
                                    </div>
                                  )}

                                  {item.capacity && (
                                    <div className="flex items-center gap-2">
                                      <Users className="h-4 w-4 text-emerald-500" />
                                      <span className="text-sm font-medium text-neutral-700">{item.capacity.toLocaleString()} capacity</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-sm text-neutral-600 mb-4 leading-relaxed line-clamp-2">
                                {item.description}
                              </p>

                              {/* Tags */}
                              <div className="flex flex-wrap gap-2 mb-5">
                                {item.tags?.slice(0, 2).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs font-medium px-2 py-1 border-green-300 bg-green-500 text-white">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>

                              {/* Action Button */}
                              <Button
                                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold shadow-lg border-0"
                                onClick={() => handleViewProfile(item.id)}
                                disabled={navigatingToProfile === item.id}
                              >
                                {navigatingToProfile === item.id ? (
                                  <div className="flex items-center">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    <span className="drop-shadow-sm">Loading...</span>
                                  </div>
                                ) : (
                                  <span className="drop-shadow-sm">View Profile</span>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Featured Audience Members */}
                {filteredData.filter(item => item.type === "audience").length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-neutral-800 mb-4 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-orange-500 mr-3"></span>
                      Featured Audience Members
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {filteredData.filter(item => item.type === "audience").slice(0, 3).map((item) => (
                        <Card
                          key={item.id}
                          className="group hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
                          onMouseEnter={() => setHoveredItem(item.id)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <CardContent className="p-0">
                            {/* Enhanced Header with Featured styling */}
                            <div className="h-48 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-t-lg relative overflow-hidden border-b border-neutral-100">
                              <div className="absolute inset-0">
                                {item.profileImageUrl ? (
                                  <img
                                    src={item.profileImageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-6xl bg-white">
                                    {getTypeIcon(item.type)}
                                  </div>
                                )}
                              </div>

                              {/* Quick Actions - appear on hover */}
                              {hoveredItem === item.id && (
                                <div className="absolute top-4 right-4 flex gap-2">
                                  <Button size="sm" variant="secondary" className="h-8 w-8 p-0 shadow-lg">
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}


                            </div>

                            {/* Enhanced Content */}
                            <div className="p-5">
                              <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h3 className="font-bold text-lg text-neutral-900 group-hover:text-orange-600 transition-colors">
                                    {item.name}
                                  </h3>
                                  <Badge className="bg-white text-purple-600 font-bold border-0 shadow-lg text-sm">
                                    {getTypeIcon(item.type)} {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                  </Badge>
                                </div>

                                {/* Location */}
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-orange-500" />
                                    <span className="text-sm font-medium text-neutral-700">{item.location}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-sm text-neutral-600 mb-4 leading-relaxed line-clamp-2">
                                {item.description}
                              </p>

                              {/* Action Button */}
                              <Button
                                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold shadow-lg border-0"
                                onClick={() => handleViewProfile(item.id)}
                                disabled={navigatingToProfile === item.id}
                              >
                                {navigatingToProfile === item.id ? (
                                  <div className="flex items-center">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                    <span className="drop-shadow-sm">Loading...</span>
                                  </div>
                                ) : (
                                  <span className="drop-shadow-sm">View Profile</span>
                                )}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Results Section */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-neutral-900">
                    {isLoading ? "Loading..." : `All Results (${filteredData.length})`}
                  </h2>
                  <Select defaultValue="relevance">
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Sort by Relevance</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="availability">Availability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredData.map((item) => (
                    <div key={item.id} className="group hover:shadow-xl transition-all duration-300 border-0 overflow-hidden rounded-lg">
                      <div className="relative">
                        {/* Cover Image */}
                        <div className="aspect-video bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 relative overflow-hidden">
                          {item.profileImageUrl && (
                            <img
                              src={item.profileImageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="p-3 sm:p-4 md:p-6 bg-[#2a2e35] text-white">
                          {/* Header with Name and Location */}
                          <div className="mb-3 sm:mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-base font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                                {item.name}
                              </h3>
                              <Badge className="bg-white text-purple-600 font-bold border-0 shadow-lg text-xs sm:text-sm">
                                {getTypeIcon(item.type)} {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                              </Badge>
                            </div>
                            {item.location && (
                              <p className="text-xs text-gray-300 flex items-center">
                                📍 {item.location}
                              </p>
                            )}
                            {item.genre && (
                              <p className="text-xs text-orange-400 font-medium mt-1">
                                🎵 {item.genre}
                              </p>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-xs text-gray-300 mb-3 sm:mb-4 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-5">
                            {item.tags?.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs font-medium px-1.5 sm:px-2 py-1 border-orange-400 bg-orange-500 text-white">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Action Button */}
                          <Button
                            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold shadow-lg border-0 text-sm sm:text-base py-2 sm:py-2.5"
                            onClick={() => handleViewProfile(item.id)}
                            disabled={navigatingToProfile === item.id}
                          >
                            {navigatingToProfile === item.id ? (
                              <div className="flex items-center">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                <span className="drop-shadow-sm">Loading...</span>
                              </div>
                            ) : (
                              <span className="drop-shadow-sm">View Profile</span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More */}
                {filteredData.length > 0 && (
                  <div className="flex justify-center mt-8">
                    <Button variant="outline">
                      Load More Results
                    </Button>
                  </div>
                )}

                {/* Empty State */}
                {filteredData.length === 0 && (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">🔍</div>
                    <h3 className="text-lg font-semibold text-neutral-900 mb-2">No results found</h3>
                    <p className="text-neutral-600">Try adjusting your search criteria or filters</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}