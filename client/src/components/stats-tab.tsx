import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Eye, 
  Heart, 
  MessageCircle, 
  PlayCircle,
  Calendar,
  Music,
  Star,
  Target,
  Award
} from "lucide-react";

interface StatsTabProps {
  profile: any;
  isOwn: boolean;
}

export default function StatsTab({ profile, isOwn }: StatsTabProps) {
  // Fetch analytics data for the artist profile
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: [`/api/profiles/${profile?.id}/analytics`],
    enabled: !!profile?.id,
  });

  // Fetch recent performance metrics
  const { data: recentMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: [`/api/profiles/${profile?.id}/metrics`],
    enabled: !!profile?.id,
  });

  if (analyticsLoading || metricsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  // Mock data for demonstration - in real app this would come from analytics API
  const mockStats = {
    totalPlays: 12543,
    totalLikes: 892,
    totalFollowers: 456,
    profileViews: 3421,
    engagement: 7.2,
    recentGrowth: 15.3,
    topTrack: "Summer Nights",
    monthlyListeners: 2341
  };

  const performanceMetrics = [
    { label: "Total Plays", value: mockStats.totalPlays, icon: PlayCircle, change: "+12.5%", trend: "up" },
    { label: "Profile Views", value: mockStats.profileViews, icon: Eye, change: "+8.2%", trend: "up" },
    { label: "Total Likes", value: mockStats.totalLikes, icon: Heart, change: "+5.7%", trend: "up" },
    { label: "Followers", value: mockStats.totalFollowers, icon: Users, change: "+3.1%", trend: "up" },
  ];

  const engagementData = [
    { metric: "Engagement Rate", value: `${mockStats.engagement}%`, description: "Average engagement across all content" },
    { metric: "Monthly Listeners", value: mockStats.monthlyListeners.toLocaleString(), description: "Unique listeners this month" },
    { metric: "Growth Rate", value: `+${mockStats.recentGrowth}%`, description: "Follower growth in the last 30 days" },
    { metric: "Top Track", value: mockStats.topTrack, description: "Most played track this month" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Performance Stats
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Analytics and performance metrics for {profile.name}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center space-x-1">
          <BarChart3 className="w-3 h-3" />
          <span>Industry Metrics</span>
        </Badge>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {performanceMetrics.map((metric, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {metric.label}
              </CardTitle>
              <metric.icon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metric.value.toLocaleString()}
              </div>
              <div className="flex items-center space-x-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600 font-medium">
                  {metric.change}
                </span>
                <span className="text-xs text-gray-500">vs last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Engagement Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-blue-500" />
            <span>Engagement Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {engagementData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {item.metric}
                  </span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {item.value}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Industry Benchmarks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-purple-500" />
            <span>Industry Benchmarks</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-gray-900 dark:text-white">Above Average</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Engagement rate is 23% higher than similar artists
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-gray-900 dark:text-white">Growth Potential</span>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                High potential for audience expansion in your genre
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Music className="w-4 h-4 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  New track "Summer Nights" gained 234 plays
                </p>
                <p className="text-xs text-gray-500">2 days ago</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Users className="w-4 h-4 text-green-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  15 new followers this week
                </p>
                <p className="text-xs text-gray-500">5 days ago</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <Star className="w-4 h-4 text-yellow-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Featured in "Rising Artists" playlist
                </p>
                <p className="text-xs text-gray-500">1 week ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note for Professional Users */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <BarChart3 className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Professional Analytics
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              These insights are visible to other artists and venues to facilitate professional networking and collaboration opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}