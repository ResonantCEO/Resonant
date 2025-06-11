import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Search, Filter, MapPin, Calendar, Users, Star, Bookmark, MessageSquare, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Sidebar from "@/components/sidebar";
import { useSidebar } from "@/hooks/useSidebar";

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

  const handleViewProfile = (profileId: number) => {
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

  const getProfileTypeColor = (type: string) => {
    switch (type) {
      case "artist":
        return "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800";
      case "venue":
        return "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700";
      default:
        return "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800";
    }
  };

  return (
    <div className="min-h-screen flex bg-neutral-50">
      <Sidebar />

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-40">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-neutral-900">Resonant</h1>
        </div>
      </div>

      {/* Main Content - Responsive to sidebar state */}
      <div className={`flex-1 pt-16 lg:pt-0 transition-all duration-300 ${isCollapsed ? 'lg:ml-16' : 'lg:ml-80'}`}>
        <div className="max-w-7xl mx-auto p-6">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Discover</h1>
            <p className="text-neutral-600">Find artists, venues, and events for your next collaboration</p>
          </div>

          {/* Compact Search and Filters */}
          <div className="bg-white rounded-lg border border-neutral-200 p-4 mb-8">
            <div className="flex gap-3 items-center">

              {/* Main Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search artists, venues, or events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              {/* Filters Dropdown */}
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="h-11 px-4 flex items-center gap-2 min-w-[120px] relative"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filters</span>
                    <ChevronDown className="h-4 w-4" />
                    {/* Active filter indicator */}
                    {(selectedType !== "all" || selectedLocation !== "all-locations" || selectedGenre !== "all-genres") && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-neutral-700 mb-2 block">Type</label>
                      <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="artist">Artists</SelectItem>
                          <SelectItem value="venue">Venues</SelectItem>
                          <SelectItem value="audience">Audience Members</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-700 mb-2 block">Location</label>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-locations">All Locations</SelectItem>
                          <SelectItem value="Los Angeles">Los Angeles, CA</SelectItem>
                          <SelectItem value="Nashville">Nashville, TN</SelectItem>
                          <SelectItem value="Austin">Austin, TX</SelectItem>
                          <SelectItem value="New York">New York, NY</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-neutral-700 mb-2 block">Genre</label>
                      <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Genres" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-genres">All Genres</SelectItem>
                          <SelectItem value="Electronic">Electronic</SelectItem>
                          <SelectItem value="Rock">Rock</SelectItem>
                          <SelectItem value="Jazz">Jazz</SelectItem>
                          <SelectItem value="Folk">Folk</SelectItem>
                          <SelectItem value="Hip Hop">Hip Hop</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedType("all");
                          setSelectedLocation("all-locations");
                          setSelectedGenre("all-genres");
                        }}
                      >
                        Clear All
                      </Button>
                      <Button 
                        size="sm" 
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        onClick={() => setFiltersOpen(false)}
                      >
                        Apply
                      </Button>
                    </div>
                  </PopoverContent>
              </Popover>

              {/* Quick Sort */}
              <Select defaultValue="relevance">
                <SelectTrigger className="h-11 w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="rating">Top Rated</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="availability">Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active Filters Display */}
            {(selectedType !== "all" || selectedLocation !== "all-locations" || selectedGenre !== "all-genres") && (
              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-neutral-200">
                <span className="text-sm text-neutral-500 font-medium">Active filters:</span>
                {selectedType !== "all" && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                    Type: {selectedType}
                    <button 
                      className="ml-2 hover:text-red-600 font-bold"
                      onClick={() => setSelectedType("all")}
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {selectedLocation !== "all-locations" && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                    Location: {selectedLocation}
                    <button 
                      className="ml-2 hover:text-red-600 font-bold"
                      onClick={() => setSelectedLocation("all-locations")}
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {selectedGenre !== "all-genres" && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                    Genre: {selectedGenre}
                    <button 
                      className="ml-2 hover:text-red-600 font-bold"
                      onClick={() => setSelectedGenre("all-genres")}
                    >
                      ×
                    </button>
                  </Badge>
                )}
              </div>
            )}
          </div>

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

                      {/* Featured Badge - more prominent */}
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold px-3 py-1 shadow-lg">
                          ⭐ Featured
                        </Badge>
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-4 right-1/2 transform translate-x-1/2">
                        <Badge variant="secondary" className="capitalize font-medium px-3 py-1 bg-white/90 backdrop-blur-sm">
                          {item.type}
                        </Badge>
                      </div>

                      {/* Availability Badge */}
                      {item.availability && (
                        <div className="absolute bottom-4 left-4">
                          <Badge className={`${getAvailabilityColor(item.availability)} font-medium px-3 py-1 shadow-lg`}>
                            {item.availability}
                          </Badge>
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
                        <h3 className="font-bold text-lg text-neutral-900 group-hover:text-indigo-600 transition-colors mb-2">
                          {item.name}
                        </h3>

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
                      >
                        <span className="drop-shadow-sm">View Profile</span>
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

                          {/* Featured Badge - more prominent */}
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold px-3 py-1 shadow-lg">
                              ⭐ Featured
                            </Badge>
                          </div>

                          {/* Type Badge */}
                          <div className="absolute top-4 right-1/2 transform translate-x-1/2">
                            <Badge variant="secondary" className="capitalize font-medium px-3 py-1 bg-white/90 backdrop-blur-sm">
                              {item.type}
                            </Badge>
                          </div>

                          {/* Availability Badge */}
                          {item.availability && (
                            <div className="absolute bottom-4 left-4">
                              <Badge className={`${getAvailabilityColor(item.availability)} font-medium px-3 py-1 shadow-lg`}>
                                {item.availability}
                              </Badge>
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
                            <h3 className="font-bold text-lg text-neutral-900 group-hover:text-green-600 transition-colors mb-2">
                              {item.name}
                            </h3>

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
                          >
                            <span className="drop-shadow-sm">View Profile</span>
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

                          {/* Featured Badge - more prominent */}
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold px-3 py-1 shadow-lg">
                              ⭐ Featured
                            </Badge>
                          </div>

                          {/* Type Badge */}
                           {/* Profile Type Badge - Top Left */}
                          <div className="absolute top-3 left-3 z-10">
                            <Badge className={`${getProfileTypeColor(item.type)} text-white text-sm font-bold px-4 py-2 shadow-lg border-2 border-white/20 backdrop-blur-sm`}>
                              {item.type === 'artist' ? '🎵 Artist' : item.type === 'venue' ? '🏛️ Venue' : '👤 Audience'}
                            </Badge>
                          </div>
                        </div>

                        {/* Enhanced Content */}
                        <div className="p-5">
                          <div className="mb-4">
                            <h3 className="font-bold text-lg text-neutral-900 group-hover:text-orange-600 transition-colors mb-2">
                              {item.name}
                            </h3>

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
                          >
                            <span className="drop-shadow-sm">View Profile</span>
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
                  <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-white to-gray-50 overflow-hidden">
                    <CardContent className="p-0">
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
                          <div className="absolute inset-0 bg-black bg-opacity-20"></div>

                           {/* Profile Type Badge - Top Left */}
                          <div className="absolute top-3 left-3 z-10">
                            <Badge className={`${getProfileTypeColor(item.type)} text-white text-sm font-bold px-4 py-2 shadow-lg border-2 border-white/20 backdrop-blur-sm`}>
                              {item.type === 'artist' ? '🎵 Artist' : item.type === 'venue' ? '🏛️ Venue' : '👤 Audience'}
                            </Badge>
                          </div>

                          {/* Availability Badge */}
                          <div className="absolute top-2 sm:top-3 right-2 sm:right-3">
                            <Badge className={`${getAvailabilityColor(item.availability)} font-bold border-0 shadow-lg text-xs sm:text-sm`}>
                              {item.availability}
                            </Badge>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-3 sm:p-4 md:p-6">
                          {/* Header with Name and Location */}
                          <div className="mb-3 sm:mb-4">
                            <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors line-clamp-1">
                              {item.name}
                            </h3>
                            {item.location && (
                              <p className="text-xs text-gray-500 flex items-center">
                                📍 {item.location}
                              </p>
                            )}
                            {item.genre && (
                              <p className="text-xs text-purple-600 font-medium mt-1">
                                🎵 {item.genre}
                              </p>
                            )}
                          </div>

                          {/* Description */}
                          <p className="text-xs text-neutral-600 mb-3 sm:mb-4 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-5">
                            {item.tags?.slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs font-medium px-1.5 sm:px-2 py-1 border-purple-300 bg-purple-500 text-white">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Action Button */}
                          <Button 
                            className="w-full bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white font-bold shadow-lg border-0 text-sm sm:text-base py-2 sm:py-2.5"
                            onClick={() => handleViewProfile(item.id)}
                          >
                            <span className="drop-shadow-sm">View Profile</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
        </div>
      </div>
    </div>
  );
}