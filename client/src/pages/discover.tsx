import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, MapPin, Calendar, Users, Star, Bookmark, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Sidebar from "@/components/sidebar";

interface DiscoverItem {
  id: number;
  name: string;
  type: "artist" | "venue" | "event";
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

  // Mock data - replace with actual API call
  const mockData: DiscoverItem[] = [
    {
      id: 1,
      name: "The Electric Collective",
      type: "artist",
      profileImageUrl: "/uploads/artist-1.jpg",
      location: "Los Angeles, CA",
      genre: ["Electronic", "House"],
      rating: 4.8,
      availability: "available",
      description: "High-energy electronic duo specializing in festival performances",
      tags: ["Festival Ready", "Lighting Rig", "International Tours"]
    },
    {
      id: 2,
      name: "Harmony Hall",
      type: "venue",
      profileImageUrl: "/uploads/venue-1.jpg",
      location: "Nashville, TN",
      capacity: 1200,
      rating: 4.6,
      availability: "limited",
      description: "Historic concert hall with premium acoustics",
      tags: ["Premium Audio", "Historic", "Parking Available"]
    },
    {
      id: 3,
      name: "Summer Music Festival 2025",
      type: "event",
      profileImageUrl: "/uploads/event-1.jpg",
      location: "Austin, TX",
      eventDate: "2025-07-15",
      genre: ["Rock", "Indie", "Folk"],
      description: "3-day outdoor festival seeking booking partnerships",
      tags: ["Multi-Day", "Outdoor", "Food Vendors"]
    }
  ];

  const filteredData = mockData.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || item.type === selectedType;
    const matchesLocation = selectedLocation === "all-locations" || !selectedLocation || item.location?.includes(selectedLocation);
    const matchesGenre = selectedGenre === "all-genres" || !selectedGenre || item.genre?.includes(selectedGenre);
    
    return matchesSearch && matchesType && matchesLocation && matchesGenre;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "artist": return "🎤";
      case "venue": return "🏛️";
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

  return (
    <div className="min-h-screen flex bg-neutral-50">
      <Sidebar />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-neutral-200 z-40">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-lg font-bold text-neutral-900">Resonant</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0 pt-16 lg:pt-0">
        <div className="max-w-7xl mx-auto p-6">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Discover</h1>
            <p className="text-neutral-600">Find artists, venues, and events for your next collaboration</p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input
                  placeholder="Search artists, venues, or events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="artist">Artists</SelectItem>
                  <SelectItem value="venue">Venues</SelectItem>
                  <SelectItem value="event">Events</SelectItem>
                </SelectContent>
              </Select>

              {/* Location Filter */}
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-locations">All Locations</SelectItem>
                  <SelectItem value="Los Angeles">Los Angeles, CA</SelectItem>
                  <SelectItem value="Nashville">Nashville, TN</SelectItem>
                  <SelectItem value="Austin">Austin, TX</SelectItem>
                  <SelectItem value="New York">New York, NY</SelectItem>
                </SelectContent>
              </Select>

              {/* Genre Filter */}
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Genre" />
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

              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>

          {/* Featured Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Featured This Week</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredData.slice(0, 3).map((item) => (
                <Card 
                  key={item.id} 
                  className="group hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden"
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <CardContent className="p-0">
                    {/* Enhanced Header with Featured styling */}
                    <div className="h-48 bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 rounded-t-lg relative overflow-hidden border-b border-neutral-100">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-xl bg-white shadow-xl flex items-center justify-center text-3xl">
                          {getTypeIcon(item.type)}
                        </div>
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
                          <Badge key={index} variant="outline" className="text-xs font-medium px-2 py-1 border-indigo-200 text-indigo-700">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Action Button */}
                      <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-bold shadow-lg border-0">
                        <span className="drop-shadow-sm">View Profile</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Results Section */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-900">
                All Results ({filteredData.length})
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
                <Card 
                  key={item.id}
                  className="group hover:shadow-lg transition-all duration-200 cursor-pointer relative"
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <CardContent className="p-0">
                    {/* Enhanced Header */}
                    <div className="h-56 bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-t-lg relative overflow-hidden border-b border-neutral-100">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-2xl bg-white shadow-lg flex items-center justify-center text-4xl">
                          {getTypeIcon(item.type)}
                        </div>
                      </div>
                      
                      {/* Quick Actions - appear on hover */}
                      {hoveredItem === item.id && (
                        <div className="absolute top-4 right-4 flex gap-2">
                          <Button size="sm" variant="secondary" className="h-9 w-9 p-0 shadow-lg">
                            <Bookmark className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="secondary" className="h-9 w-9 p-0 shadow-lg">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Type Badge */}
                      <div className="absolute top-4 left-4">
                        <Badge variant="secondary" className="capitalize font-medium px-3 py-1">
                          {item.type}
                        </Badge>
                      </div>

                      {/* Availability Badge */}
                      {item.availability && (
                        <div className="absolute bottom-4 left-4">
                          <Badge className={`${getAvailabilityColor(item.availability)} font-medium px-3 py-1`}>
                            {item.availability}
                          </Badge>
                        </div>
                      )}

                      {/* Rating Badge */}
                      {item.rating && (
                        <div className="absolute bottom-4 right-4">
                          <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-lg">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold text-neutral-700">{item.rating}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Enhanced Content */}
                    <div className="p-6">
                      <div className="mb-4">
                        <h3 className="font-bold text-xl text-neutral-900 group-hover:text-blue-600 transition-colors mb-2">
                          {item.name}
                        </h3>

                        {/* Location/Date and Capacity */}
                        <div className="space-y-2">
                          {item.type === "event" && item.eventDate ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-blue-500" />
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
                              <MapPin className="h-4 w-4 text-blue-500" />
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
                      <p className="text-sm text-neutral-700 font-medium mb-4 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-6">
                        {item.tags?.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs font-medium px-3 py-1">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <Button variant="outline" size="sm" className="flex-1 font-bold text-neutral-800 border-2 border-neutral-300 hover:bg-neutral-100">
                          View Profile
                        </Button>
                        <Button size="sm" className="flex-1 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
                          <Plus className="h-4 w-4 mr-2" />
                          <span className="drop-shadow-sm">Add to Event</span>
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