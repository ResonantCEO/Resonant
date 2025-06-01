import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Music, 
  Users, 
  Globe, 
  Download, 
  Edit, 
  Save, 
  X, 
  Plus, 
  ExternalLink,
  Calendar,
  MapPin,
  Award,
  Star,
  Instagram,
  MessageCircle
} from "lucide-react";

interface EPKTabProps {
  profile: any;
  isOwn: boolean;
}

export default function EPKTab({ profile, isOwn }: EPKTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    bio: profile?.bio || "",
    genre: profile?.genre || "",
    hometown: profile?.hometown || "",
    influences: profile?.influences || "",
    achievements: profile?.achievements || "",
    pressQuotes: profile?.pressQuotes || "",
    technicalRequirements: profile?.technicalRequirements || "",
    bookingInfo: profile?.bookingInfo || "",
    socialLinks: profile?.socialLinks || []
  });

  // Fetch EPK-specific data
  const { data: epkData, isLoading } = useQuery({
    queryKey: [`/api/profiles/${profile?.id}/epk`],
    enabled: !!profile?.id,
  });

  const updateEPKMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", `/api/profiles/${profile.id}/epk`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}/epk`] });
      queryClient.invalidateQueries({ queryKey: [`/api/profiles/${profile.id}`] });
      setIsEditing(false);
      toast({
        title: "EPK Updated",
        description: "Your Electronic Press Kit has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update EPK",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateEPKMutation.mutate(editData);
  };

  const handleCancel = () => {
    setEditData({
      bio: profile?.bio || "",
      genre: profile?.genre || "",
      hometown: profile?.hometown || "",
      influences: profile?.influences || "",
      achievements: profile?.achievements || "",
      pressQuotes: profile?.pressQuotes || "",
      technicalRequirements: profile?.technicalRequirements || "",
      bookingInfo: profile?.bookingInfo || "",
      socialLinks: profile?.socialLinks || []
    });
    setIsEditing(false);
  };

  const addSocialLink = () => {
    setEditData(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: "", url: "" }]
    }));
  };

  const updateSocialLink = (index: number, field: string, value: string) => {
    setEditData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const removeSocialLink = (index: number) => {
    setEditData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index)
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Artist Profile Header */}
      <div className="relative h-96 rounded-xl overflow-hidden bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        {/* Background Image */}
        {profile?.coverImageUrl && (
          <img 
            src={profile.coverImageUrl} 
            alt="Artist background" 
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>

        {/* Content */}
        <div className="relative h-full flex items-end p-8">
          <div className="flex items-end space-x-6 w-full">
            {/* Album/Artist Images */}
            <div className="flex space-x-3 mb-4">
              <div className="w-20 h-20 bg-gray-300 rounded-lg overflow-hidden shadow-lg">
                {profile?.profileImageUrl ? (
                  <img src={profile.profileImageUrl} alt="Album cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400"></div>
                )}
              </div>
              <div className="w-16 h-16 bg-gray-300 rounded-lg overflow-hidden shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-orange-400 to-red-500"></div>
              </div>
              <div className="w-12 h-12 bg-gray-300 rounded-lg overflow-hidden shadow-lg">
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500"></div>
              </div>
            </div>

            {/* Artist Info */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white mb-2">{profile?.name || "Artist Name"}</h1>

              {/* Rating */}
              <div className="flex items-center space-x-2 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                ))}
              </div>

              {/* Location and Genre */}
              <div className="flex items-center space-x-4 text-white/80 mb-4">
                <div className="flex items-center space-x-1">
                  <MapPin className="w-4 h-4" />
                  <span>{profile?.hometown || "Location"}</span>
                </div>
                <div className="text-sm">
                  {profile?.genre || "Genre"}
                </div>
              </div>

              {/* Description */}
              <p className="text-white/90 text-sm mb-4 max-w-md">
                {profile?.bio || "Front Range folkadelic-rock featuring soulful harmonies"}
              </p>

              {/* Social Media Icons */}
              <div className="flex space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-pink-700 transition-colors">
                  <Instagram className="w-5 h-5 text-white" />
                </div>
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-yellow-600 transition-colors">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-800 transition-colors">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-500 transition-colors">
                  <Globe className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            {/* Edit Button */}
            {isOwn && (
              <div className="flex space-x-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSave} size="sm" className="bg-white text-black hover:bg-gray-100">
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </Button>
                    <Button onClick={handleCancel} variant="outline" size="sm" className="text-white border-white hover:bg-white hover:text-black">
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="text-white border-white hover:bg-white hover:text-black">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit EPK
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Artist Bio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Artist Biography
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editData.bio}
                onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Write a compelling artist biography..."
                className="min-h-32"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                {profile?.bio || "No biography available"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Music className="w-5 h-5 mr-2" />
              Artist Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Genre
              </Label>
              {isEditing ? (
                <Input
                  value={editData.genre}
                  onChange={(e) => setEditData(prev => ({ ...prev, genre: e.target.value }))}
                  placeholder="e.g., Indie Rock, Electronic, Jazz"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {profile?.genre || "Not specified"}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4 inline mr-1" />
                Hometown
              </Label>
              {isEditing ? (
                <Input
                  value={editData.hometown}
                  onChange={(e) => setEditData(prev => ({ ...prev, hometown: e.target.value }))}
                  placeholder="City, State/Country"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {profile?.hometown || "Not specified"}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Musical Influences
              </Label>
              {isEditing ? (
                <Textarea
                  value={editData.influences}
                  onChange={(e) => setEditData(prev => ({ ...prev, influences: e.target.value }))}
                  placeholder="List your key musical influences..."
                  className="min-h-20"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {profile?.influences || "Not specified"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Achievements & Awards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="w-5 h-5 mr-2" />
              Achievements & Awards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editData.achievements}
                onChange={(e) => setEditData(prev => ({ ...prev, achievements: e.target.value }))}
                placeholder="List notable achievements, awards, chart positions, etc..."
                className="min-h-24"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                {profile?.achievements || "No achievements listed"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Press Quotes */}
        <Card>
          <CardHeader>
            <CardTitle>Press & Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editData.pressQuotes}
                onChange={(e) => setEditData(prev => ({ ...prev, pressQuotes: e.target.value }))}
                placeholder="Add press quotes and review excerpts..."
                className="min-h-24"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300 italic">
                {profile?.pressQuotes || "No press quotes available"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Technical Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Technical Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editData.technicalRequirements}
                onChange={(e) => setEditData(prev => ({ ...prev, technicalRequirements: e.target.value }))}
                placeholder="List stage plot, sound requirements, etc..."
                className="min-h-24"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                {profile?.technicalRequirements || "No technical requirements specified"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Booking Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Booking Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Textarea
                value={editData.bookingInfo}
                onChange={(e) => setEditData(prev => ({ ...prev, bookingInfo: e.target.value }))}
                placeholder="Contact information, rates, availability..."
                className="min-h-24"
              />
            ) : (
              <p className="text-gray-700 dark:text-gray-300">
                {profile?.bookingInfo || "Contact for booking information"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Social Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <ExternalLink className="w-5 h-5 mr-2" />
              Social Media & Links
            </span>
            {isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={addSocialLink}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Link
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-3">
              {editData.socialLinks.map((link, index) => (
                <div key={index} className="flex space-x-2">
                  <Input
                    placeholder="Platform"
                    value={link.platform}
                    onChange={(e) => updateSocialLink(index, "platform", e.target.value)}
                    className="w-32"
                  />
                  <Input
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => updateSocialLink(index, "url", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeSocialLink(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile?.socialLinks?.length > 0 ? (
                profile.socialLinks.map((link, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1">
                    <ExternalLink className="w-3 h-3 mr-1" />
                    {link.platform}
                  </Badge>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No social links added</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Events Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Upcoming Events
              </span>
              {isOwn && (
                <Button variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Event
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sample upcoming events - replace with real data */}
              <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Summer Music Festival</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Central Park, New York
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      July 15, 2024 • 8:00 PM
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      Headliner
                    </Badge>
                  </div>
                  {isOwn && (
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">The Blue Note</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Greenwich Village, NYC
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      August 3, 2024 • 9:30 PM
                    </p>
                    <Badge variant="outline" className="mt-2">
                      Supporting Act
                    </Badge>
                  </div>
                  {isOwn && (
                    <Button variant="ghost" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Empty state for no upcoming events */}
              {false && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming events</p>
                  {isOwn && (
                    <p className="text-sm">Add your first event to get started</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Past Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Past Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Sample past events - replace with real data */}
              <div className="border rounded-lg p-4 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Spring Showcase</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Brooklyn Bowl, Brooklyn
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      March 20, 2024
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">
                        Headliner
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        • 500 attendees
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Jazz & Wine Night</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Smalls Jazz Club, NYC
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      February 14, 2024
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        Featured Artist
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        • 150 attendees
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 opacity-75">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">Winter Session</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Mercury Lounge, NYC
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      January 8, 2024
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        Opening Act
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        • 200 attendees
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Empty state for no past events */}
              {false && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No past events</p>
                  <p className="text-sm">Event history will appear here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Media Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Media Assets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Media assets feature coming soon</p>
            <p className="text-sm">Upload photos, music samples, and press materials</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}