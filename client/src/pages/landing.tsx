import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Music, Building, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">SocialConnect</h1>
          <p className="text-xl text-gray-600 mb-8">
            Connect as an audience member, artist, or venue. Build your layered social presence.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <Users className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Audience Member</h3>
              <p className="text-gray-600">
                Your primary profile for discovering music, connecting with friends, and engaging with the community.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <Music className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Artist Profile</h3>
              <p className="text-gray-600">
                Showcase your music, connect with fans, and promote your performances with dedicated artist tools.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <Building className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Venue Profile</h3>
              <p className="text-gray-600">
                Promote your venue, list upcoming events, and connect with artists and music lovers.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Card className="inline-block">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Ready to Connect?</h2>
              <p className="text-gray-600 mb-6">
                Join our community and create your layered social music experience.
              </p>
              <Button 
                onClick={() => window.location.href = '/api/login'}
                size="lg"
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg"
              >
                Get Started
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
