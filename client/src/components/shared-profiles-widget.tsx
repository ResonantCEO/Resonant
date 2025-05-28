import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Crown, Shield, Settings, User, Music, MapPin } from "lucide-react";
import { Link } from "wouter";

interface ProfileMembership {
  membership: {
    id: number;
    role: string;
    permissions: string[];
    status: string;
    joinedAt: string;
  };
  profile: {
    id: number;
    type: string;
    name: string;
    profileImageUrl?: string;
    location?: string;
  };
}

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  manager: Settings,
  member: User,
};

const ROLE_COLORS = {
  owner: "bg-yellow-100 text-yellow-800 border-yellow-300",
  admin: "bg-red-100 text-red-800 border-red-300",
  manager: "bg-blue-100 text-blue-800 border-blue-300",
  member: "bg-gray-100 text-gray-800 border-gray-300",
};

const TYPE_ICONS = {
  artist: Music,
  venue: MapPin,
  audience: User,
};

export default function SharedProfilesWidget() {
  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['/api/user/memberships'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Shared Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const sharedProfiles = memberships.filter((membership: ProfileMembership) => 
    membership.profile.type === "artist" || membership.profile.type === "venue"
  );

  if (sharedProfiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Shared Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No shared profiles</h3>
            <p className="text-gray-600 mb-4">
              You're not a member of any artist or venue profiles yet.
            </p>
            <Button asChild>
              <Link href="/discover">Discover Artists & Venues</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Shared Profiles ({sharedProfiles.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sharedProfiles.map((membership: ProfileMembership) => {
            const RoleIcon = ROLE_ICONS[membership.membership.role as keyof typeof ROLE_ICONS] || User;
            const TypeIcon = TYPE_ICONS[membership.profile.type as keyof typeof TYPE_ICONS] || User;
            
            return (
              <Link 
                key={membership.membership.id} 
                href={`/profile/${membership.profile.id}`}
                className="block"
              >
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    {membership.profile.profileImageUrl ? (
                      <img
                        src={membership.profile.profileImageUrl}
                        alt={membership.profile.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <TypeIcon className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{membership.profile.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <TypeIcon className="h-3 w-3" />
                        <span className="capitalize">{membership.profile.type}</span>
                        {membership.profile.location && (
                          <>
                            <span>•</span>
                            <span>{membership.profile.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`flex items-center gap-1 ${ROLE_COLORS[membership.membership.role as keyof typeof ROLE_COLORS]}`}>
                      <RoleIcon className="h-3 w-3" />
                      {membership.membership.role}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Joined {new Date(membership.membership.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/discover">
              Discover More Profiles
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}