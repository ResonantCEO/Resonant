import { useState } from "react";
import { Search, Filter, MapPin, Calendar, Users, Music, Building, Star, Heart, Plus, MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface DiscoveryItem {
  id: string;
  name: string;
  type: "artist" | "venue" | "event";
  location: string;
  genre?: string;
  capacity?: number;
  rating: number;
  price?: string;
  availability: "available" | "booking_soon" | "unavailable";
  image: string;
  tags: string[];
  description: string;
  contactInfo?: string;
}

// Sample data - in production, this would come from your API
const sampleItems: DiscoveryItem[] = [
  {
    id: "1",
    name: "Luna Symphony Orchestra",
    type: "artist",
    location: "San Francisco, CA",
    genre: "Classical",
    rating: 4.8,
    price: "$2,500 - $5,000",
    availability: "available",
    image: "/api/placeholder/320/200",
    tags: ["Orchestra", "Wedding", "Corporate"],
    description: "Award-winning 25-piece orchestra specializing in classical and contemporary arrangements.",
    contactInfo: "booking@lunasymphony.com"
  },
  {
    id: "2",
    name: "Metropolitan Conference Center",
    type: "venue",
    location: "New York, NY",
    capacity: 500,
    rating: 4.6,
    price: "$3,000 - $8,000",
    availability: "available",
    image: "/api/placeholder/320/200",
    tags: ["Corporate", "Conference", "Gala"],
    description: "Modern conference center with state-of-the-art AV equipment and flexible layouts.",
    contactInfo: "events@metroconf.com"
  },
  {
    id: "3",
    name: "TechCon 2025",
    type: "event",
    location: "Austin, TX",
    genre: "Technology",
    rating: 4.9,
    availability: "booking_soon",
    image: "/api/placeholder/320/200",
    tags: ["Tech", "Networking", "Innovation"],
    description: "Annual technology conference featuring industry leaders and emerging technologies.",
    contactInfo: "partnerships@techcon.com"
  }
];

export default function Discovery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { toast } = useToast();

  const filteredItems = sampleItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || item.type === selectedType;
    const matchesLocation = selectedLocation === "all" || item.location.includes(selectedLocation);
    const matchesGenre = selectedGenre === "all" || item.genre === selectedGenre;
    const matchesAvailability = selectedAvailability === "all" || item.availability === selectedAvailability;

    return matchesSearch && matchesType && matchesLocation && matchesGenre && matchesAvailability;
  });

  const handleSave = (item: DiscoveryItem) => {
    toast({
      title: "Saved to Favorites",
      description: `${item.name} has been added to your saved items.`,
    });
  };

  const handleInvite = (item: DiscoveryItem) => {
    toast({
      title: "Invitation Sent",
      description: `Invitation sent to ${item.name}.`,
    });
  };

  const handleAddToEvent = (item: DiscoveryItem) => {
    toast({
      title: "Added to Event",
      description: `${item.name} has been added to your event planning list.`,
    });
  };

  const handleContact = (item: DiscoveryItem) => {
    if (item.contactInfo) {
      window.open(`mailto:${item.contactInfo}`, '_blank');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "artist": return <Music className="h-4 w-4" />;
      case "venue": return <Building className="h-4 w-4" />;
      case "event": return <Calendar className="h-4 w-4" />;
      default: return null;
    }
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "available": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "booking_soon": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "unavailable": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Discovery</h1>
          <p className="text-muted-foreground">
            Find artists, venues, and events for your next professional gathering
          </p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Main Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search artists, venues, events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Row */}
              <div className="flex flex-wrap gap-4">
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="artist">Artists</SelectItem>
                    <SelectItem value="venue">Venues</SelectItem>
                    <SelectItem value="event">Events</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="San Francisco">San Francisco</SelectItem>
                    <SelectItem value="New York">New York</SelectItem>
                    <SelectItem value="Austin">Austin</SelectItem>
                    <SelectItem value="Los Angeles">Los Angeles</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Genre" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genres</SelectItem>
                    <SelectItem value="Classical">Classical</SelectItem>
                    <SelectItem value="Jazz">Jazz</SelectItem>
                    <SelectItem value="Technology">Technology</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedAvailability} onValueChange={setSelectedAvailability}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Availability" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="booking_soon">Booking Soon</SelectItem>
                    <SelectItem value="unavailable">Unavailable</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Featured Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <h2 className="text-xl font-semibold">Featured & Recommended</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.slice(0, 3).map((item) => (
              <Card 
                key={item.id} 
                className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <CardHeader className="p-0">
                  <div className="relative">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className={getAvailabilityColor(item.availability)}>
                        {item.availability.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        {getTypeIcon(item.type)}
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {item.location}
                    </div>
                    {item.capacity && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Capacity: {item.capacity}
                      </div>
                    )}
                    {item.genre && (
                      <div className="text-sm text-muted-foreground">
                        Genre: {item.genre}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-4 w-4 ${i < Math.floor(item.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">{item.rating}</span>
                  </div>

                  {item.price && (
                    <div className="text-sm font-medium text-primary">
                      {item.price}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Quick Preview on Hover */}
                  {hoveredItem === item.id && (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm rounded-lg p-4 space-y-3 border">
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSave(item)}>
                          <Heart className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleInvite(item)}>
                          <MessageCircle className="h-4 w-4 mr-1" />
                          Invite
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {/* Navigate to profile */}}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Profile
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => handleAddToEvent(item)}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* All Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              All Results ({filteredItems.length})
            </h2>
            <Select defaultValue="relevance">
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="location">Location</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className="group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
              >
                <CardHeader className="p-0">
                  <div className="relative">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-full h-40 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge className={getAvailabilityColor(item.availability)} className="text-xs">
                        {item.availability.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                        {getTypeIcon(item.type)}
                        {item.type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  <h3 className="font-semibold text-sm">{item.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {item.location}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3 w-3 ${i < Math.floor(item.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                        />
                      ))}
                    </div>
                    <span className="text-xs font-medium">{item.rating}</span>
                  </div>

                  {item.price && (
                    <div className="text-xs font-medium text-primary">
                      {item.price}
                    </div>
                  )}

                  <div className="flex gap-1 pt-1">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 text-xs h-7"
                      onClick={() => {/* Navigate to profile */}}
                    >
                      View
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1 text-xs h-7"
                      onClick={() => handleAddToEvent(item)}
                    >
                      Add
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="px-2 h-7"
                      onClick={() => handleSave(item)}
                    >
                      <Heart className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Load More */}
        {filteredItems.length > 12 && (
          <div className="flex justify-center pt-6">
            <Button variant="outline">
              Load More Results
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}