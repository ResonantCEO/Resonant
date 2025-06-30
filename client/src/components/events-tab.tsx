
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Users, Plus, Edit, Eye } from "lucide-react";
import EventCard from "./event-card";

interface EventsTabProps {
  profileId: number;
  profileType: string;
  isOwner: boolean;
}

export default function EventsTab({ profileId, profileType, isOwner }: EventsTabProps) {
  const [activeTab, setActiveTab] = useState("upcoming");

  const { data: events, isLoading } = useQuery({
    queryKey: [`/api/profiles/${profileId}/events`],
  });

  const filterEvents = (events: any[], filter: string) => {
    if (!events) return [];
    
    const now = new Date();
    
    switch (filter) {
      case "upcoming":
        return events.filter(event => 
          new Date(event.eventDate) > now && 
          (event.status === 'published' || event.status === 'draft')
        );
      case "past":
        return events.filter(event => 
          new Date(event.eventDate) <= now || 
          event.status === 'completed'
        );
      case "drafts":
        return events.filter(event => event.status === 'draft');
      default:
        return events;
    }
  };

  const filteredEvents = filterEvents(events, activeTab);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Events</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {profileType === 'artist' ? 'Performances and shows' : 
             profileType === 'venue' ? 'Hosted events' : 'Organized events'}
          </p>
        </div>
        {isOwner && (
          <Button size="sm" className="flex items-center">
            <Plus className="w-4 h-4 mr-1" />
            Create Event
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          {isOwner && <TabsTrigger value="drafts">Drafts</TabsTrigger>}
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} showActions={!isOwner} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Upcoming Events
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {isOwner 
                  ? "Create your first event to get started" 
                  : "No upcoming events scheduled"}
              </p>
              {isOwner && (
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {filteredEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} showActions={false} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Past Events
              </h4>
              <p className="text-gray-600 dark:text-gray-400">
                Past events will appear here after they've occurred.
              </p>
            </div>
          )}
        </TabsContent>

        {isOwner && (
          <TabsContent value="drafts" className="mt-6">
            {filteredEvents.length > 0 ? (
              <div className="space-y-4">
                {filteredEvents.map((event) => (
                  <Card key={event.id} className="border-dashed">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg flex items-center">
                            {event.name}
                            <Badge variant="secondary" className="ml-2">Draft</Badge>
                          </CardTitle>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {event.description}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center text-gray-600 dark:text-gray-400">
                          <Calendar className="w-4 h-4 mr-2" />
                          {new Date(event.eventDate).toLocaleDateString()}
                        </div>
                        {event.eventTime && (
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Clock className="w-4 h-4 mr-2" />
                            {event.eventTime}
                          </div>
                        )}
                        {event.venue && (
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4 mr-2" />
                            {event.venue.name}
                          </div>
                        )}
                        {event.capacity && (
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Users className="w-4 h-4 mr-2" />
                            Capacity: {event.capacity}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Draft Events
                </h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Create and save draft events before publishing them.
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
