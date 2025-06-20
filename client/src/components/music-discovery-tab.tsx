
import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Music,
  Search,
  MapPin,
  Users,
  Heart,
  Play,
  Headphones,
  TrendingUp,
  Calendar,
  Star,
  Filter,
  Volume2,
  Disc,
  Radio,
  Album,
  Mic2,
  UserPlus,
  ExternalLink,
  Clock,
  BarChart3,
  Globe
} from "lucide-react";

interface MusicDiscoveryTabProps {
  profile: any;
  isOwn: boolean;
  followedArtists: any[];
}

export default function MusicDiscoveryTab({ profile, isOwn, followedArtists }: MusicDiscoveryTabProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");

  // Fetch music discovery data
  const { data: recentlyPlayedTracks = [] } = useQuery({
    queryKey: [`/api/profiles/${profile.id}/recently-played`],
    enabled: !!profile?.id,
  });

  const { data: favoriteGenres = [] } = useQuery({
    queryKey: [`/api/profiles/${profile.id}/favorite-genres`],
    enabled: !!profile?.id,
  });

  const { data: listeningStats = {} } = useQuery({
    queryKey: [`/api/profiles/${profile.id}/listening-stats`],
    enabled: !!profile?.id,
  });

  const { data: discoveredArtists = [] } = useQuery({
    queryKey: [`/api/profiles/${profile.id}/discovered-artists`],
    enabled: !!profile?.id,
  });

  const { data: musicRecommendations = [] } = useQuery({
    queryKey: [`/api/profiles/${profile.id}/recommendations`],
    enabled: !!profile?.id,
  });

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: [`/api/profiles/${profile.id}/upcoming-events`],
    enabled: !!profile?.id,
  });

  const { data: recentReviews = [] } = useQuery({
    queryKey: [`/api/profiles/${profile.id}/recent-reviews`],
    enabled: !!profile?.id,
  });

  // Mock data for demonstration (replace with real API calls)
  const mockRecentlyPlayed = [
    {
      id: 1,
      title: "Midnight City",
      artist: "M83",
      album: "Hurry Up, We're Dreaming",
      genre: "Electronic",
      duration: "4:03",
      playedAt: "2 hours ago",
      coverUrl: "/api/placeholder/80/80"
    },
    {
      id: 2,
      title: "Somebody That I Used to Know",
      artist: "Gotye",
      album: "Making Mirrors",
      genre: "Alternative",
      duration: "4:04",
      playedAt: "5 hours ago",
      coverUrl: "/api/placeholder/80/80"
    },
    {
      id: 3,
      title: "Feel It Still",
      artist: "Portugal. The Man",
      album: "Woodstock",
      genre: "Alternative Rock",
      duration: "2:43",
      playedAt: "1 day ago",
      coverUrl: "/api/placeholder/80/80"
    }
  ];

  const mockFavoriteGenres = [
    { name: "Alternative Rock", percentage: 35, color: "bg-blue-500" },
    { name: "Electronic", percentage: 28, color: "bg-purple-500" },
    { name: "Indie Pop", percentage: 20, color: "bg-green-500" },
    { name: "Jazz", percentage: 12, color: "bg-yellow-500" },
    { name: "Classical", percentage: 5, color: "bg-red-500" }
  ];

  const mockListeningStats = {
    totalMinutes: 15420,
    songsPlayed: 2841,
    artistsDiscovered: 127,
    genresExplored: 23,
    averageSessionLength: "45 min",
    favoriteTimeToListen: "Evening (8-10 PM)"
  };

  const mockRecommendations = [
    {
      id: 1,
      type: "artist",
      title: "Similar to your taste",
      items: [
        { name: "Tame Impala", genre: "Psychedelic Pop", similarity: "92%", imageUrl: "/api/placeholder/60/60" },
        { name: "MGMT", genre: "Psychedelic Rock", similarity: "89%", imageUrl: "/api/placeholder/60/60" },
        { name: "Foster the People", genre: "Indie Pop", similarity: "85%", imageUrl: "/api/placeholder/60/60" }
      ]
    },
    {
      id: 2,
      type: "playlist",
      title: "Trending in your area",
      items: [
        { name: "Chill Indie Vibes", tracks: 45, followers: "12.3K", imageUrl: "/api/placeholder/60/60" },
        { name: "Electronic Dreams", tracks: 32, followers: "8.7K", imageUrl: "/api/placeholder/60/60" },
        { name: "Alternative Hits", tracks: 67, followers: "15.2K", imageUrl: "/api/placeholder/60/60" }
      ]
    }
  ];

  const mockUpcomingEvents = [
    {
      id: 1,
      artistName: "The National",
      venue: "Red Rocks Amphitheatre",
      date: "2024-08-15",
      time: "8:00 PM",
      ticketsAvailable: true,
      price: "$65-120",
      distance: "12 miles",
      imageUrl: "/api/placeholder/80/80"
    },
    {
      id: 2,
      artistName: "Bon Iver",
      venue: "The Fillmore",
      date: "2024-08-22",
      time: "7:30 PM",
      ticketsAvailable: true,
      price: "$45-85",
      distance: "8 miles",
      imageUrl: "/api/placeholder/80/80"
    }
  ];

  const mockRecentReviews = [
    {
      id: 1,
      albumTitle: "Simulation Theory",
      artistName: "Muse",
      rating: 4.5,
      reviewText: "A return to form with incredible production and thought-provoking themes about technology and reality.",
      reviewDate: "3 days ago",
      likes: 12,
      coverUrl: "/api/placeholder/60/60"
    },
    {
      id: 2,
      albumTitle: "When We All Fall Asleep, Where Do We Go?",
      artistName: "Billie Eilish",
      rating: 4.0,
      reviewText: "Dark, atmospheric, and surprisingly mature. Billie's unique sound creates an immersive listening experience.",
      reviewDate: "1 week ago",
      likes: 8,
      coverUrl: "/api/placeholder/60/60"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-center">
          <Headphones className="w-8 h-8 mr-3 text-blue-500" />
          Music Discovery Journey
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {isOwn 
            ? "Track your musical exploration, discover new artists, and share your music journey with friends"
            : `Explore ${profile.name}'s musical taste and discover new music through their journey`
          }
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="listening">Listening</TabsTrigger>
          <TabsTrigger value="artists">Artists</TabsTrigger>
          <TabsTrigger value="recommendations">Discover</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Music className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(mockListeningStats.totalMinutes / 60)}h
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">This Month</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Disc className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mockListeningStats.songsPlayed}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Songs Played</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mockListeningStats.artistsDiscovered}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Artists Found</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Album className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mockListeningStats.genresExplored}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Genres</div>
              </CardContent>
            </Card>
          </div>

          {/* Favorite Genres */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-500" />
                Favorite Genres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockFavoriteGenres.map((genre, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-16 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {genre.name}
                    </div>
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`${genre.color} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${genre.percentage}%` }}
                      />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 w-12">
                      {genre.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recently Played */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="w-5 h-5 mr-2 text-green-500" />
                Recently Played
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockRecentlyPlayed.map((track) => (
                  <div key={track.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      <Play className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {track.title}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {track.artist} • {track.album}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {track.genre}
                    </Badge>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {track.playedAt}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Listening Habits Tab */}
        <TabsContent value="listening" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Volume2 className="w-5 h-5 mr-2 text-blue-500" />
                Listening Patterns
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Listening Habits</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Average Session</span>
                      <span className="font-medium">{mockListeningStats.averageSessionLength}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Favorite Time</span>
                      <span className="font-medium">{mockListeningStats.favoriteTimeToListen}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Total Hours</span>
                      <span className="font-medium">{Math.floor(mockListeningStats.totalMinutes / 60)}h</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Discovery Rate</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">New Artists/Month</span>
                      <span className="font-medium text-green-600">+12</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Genre Exploration</span>
                      <span className="font-medium text-blue-600">High</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Repeat Rate</span>
                      <span className="font-medium">65%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mood-Based Listening */}
          <Card>
            <CardHeader>
              <CardTitle>Music Moods & Contexts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { mood: "Energetic", percentage: 40, color: "bg-red-500", icon: "⚡" },
                  { mood: "Chill", percentage: 35, color: "bg-blue-500", icon: "🌊" },
                  { mood: "Focus", percentage: 15, color: "bg-green-500", icon: "🎯" },
                  { mood: "Nostalgic", percentage: 10, color: "bg-purple-500", icon: "🌅" }
                ].map((mood, index) => (
                  <div key={index} className="text-center p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="text-2xl mb-2">{mood.icon}</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{mood.mood}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{mood.percentage}%</div>
                    <div className={`mt-2 h-2 ${mood.color} rounded-full mx-auto`} style={{ width: `${mood.percentage}%` }} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Artists Tab */}
        <TabsContent value="artists" className="space-y-6">
          {/* Followed Artists */}
          {followedArtists.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-red-500" />
                  Following ({followedArtists.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {followedArtists.map((artist: any) => (
                    <div 
                      key={artist.id}
                      className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => setLocation(`/profile/${artist.id}`)}
                    >
                      <div className="flex items-center space-x-3 mb-3">
                        <Avatar className="w-12 h-12 ring-2 ring-pink-200 dark:ring-pink-800">
                          <AvatarImage src={artist.profileImageUrl} alt={artist.name} />
                          <AvatarFallback className="bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300">
                            {artist.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {artist.name}
                          </p>
                          {artist.genre && (
                            <p className="text-xs text-pink-600 dark:text-pink-400 font-medium">
                              {artist.genre}
                            </p>
                          )}
                        </div>
                      </div>
                      {artist.bio && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          {artist.bio}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recently Discovered Artists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-500" />
                Recently Discovered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: "Phoebe Bridgers", genre: "Indie Folk", discovered: "2 days ago", imageUrl: "/api/placeholder/60/60" },
                  { name: "Japanese Breakfast", genre: "Indie Rock", discovered: "5 days ago", imageUrl: "/api/placeholder/60/60" },
                  { name: "Clairo", genre: "Bedroom Pop", discovered: "1 week ago", imageUrl: "/api/placeholder/60/60" }
                ].map((artist, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                      <Mic2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {artist.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {artist.genre}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400">
                        {artist.discovered}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <UserPlus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {mockRecommendations.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Radio className="w-5 h-5 mr-2 text-purple-500" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        {section.type === 'artist' ? (
                          <Mic2 className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <Album className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {section.type === 'artist' ? item.genre : `${item.tracks} tracks`}
                        </div>
                        {section.type === 'artist' && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            {item.similarity} match
                          </div>
                        )}
                        {section.type === 'playlist' && (
                          <div className="text-xs text-blue-600 dark:text-blue-400">
                            {item.followers} followers
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="outline">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-blue-500" />
                Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockUpcomingEvents.map((event) => (
                  <div key={event.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <Music className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {event.artistName}
                          </h4>
                          <Badge variant={event.ticketsAvailable ? "default" : "secondary"}>
                            {event.ticketsAvailable ? "Available" : "Sold Out"}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-2" />
                            {event.venue} • {event.distance}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(event.date).toLocaleDateString()} at {event.time}
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {event.price}
                            </span>
                            <Button size="sm">
                              View Tickets
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2 text-yellow-500" />
                Recent Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockRecentReviews.map((review) => (
                  <div key={review.id} className="border-b border-gray-200 dark:border-gray-700 pb-6 last:border-b-0">
                    <div className="flex items-start space-x-4">
                      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                        <Album className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {review.albumTitle}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              by {review.artistName}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < Math.floor(review.rating)
                                      ? "text-yellow-400 fill-current"
                                      : "text-gray-300 dark:text-gray-600"
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {review.rating}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-3">
                          {review.reviewText}
                        </p>
                        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                          <span>{review.reviewDate}</span>
                          <div className="flex items-center space-x-2">
                            <Heart className="w-4 h-4" />
                            <span>{review.likes} likes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isOwn && (
            <Card>
              <CardHeader>
                <CardTitle>Write a Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Album className="w-12 h-12 mx-auto mb-4" />
                  <p>Review functionality coming soon...</p>
                  <p className="text-sm">Share your thoughts about albums and tracks you've been listening to</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
