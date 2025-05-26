import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Music, Building, Users, MapPin, Eye, EyeOff, Globe, X, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProfileModal({ open, onOpenChange }: CreateProfileModalProps) {
  const { toast } = useToast();
  const [profileType, setProfileType] = useState<string>("audience");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState<string>("public");

  const profileTypes = [
    {
      value: "audience",
      label: "Audience Member",
      icon: Users,
      description: "Discover music, connect with friends, and engage with the community",
      color: "bg-blue-500",
      borderColor: "border-blue-200",
      bgColor: "bg-blue-50"
    },
    {
      value: "artist",
      label: "Artist",
      icon: Music,
      description: "Share your music, build your fanbase, and connect with other artists",
      color: "bg-purple-500",
      borderColor: "border-purple-200",
      bgColor: "bg-purple-50"
    },
    {
      value: "venue",
      label: "Venue",
      icon: Building,
      description: "Promote events, connect with artists, and build your venue community",
      color: "bg-green-500",
      borderColor: "border-green-200",
      bgColor: "bg-green-50"
    }
  ];

  const visibilityOptions = [
    { value: "public", label: "Public", icon: Globe, description: "Anyone can see this profile" },
    { value: "friends", label: "Friends Only", icon: Users, description: "Only friends can see this profile" },
    { value: "private", label: "Private", icon: EyeOff, description: "Only you can see this profile" }
  ];

  const createProfileMutation = useMutation({
    mutationFn: async (data: { 
      type: string; 
      name: string; 
      bio: string; 
      location: string; 
      visibility: string; 
    }) => {
      return await apiRequest("POST", "/api/profiles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/active"] });
      toast({
        title: "Profile Created Successfully!",
        description: `Your ${profileTypes.find(t => t.value === profileType)?.label} profile has been created.`,
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Profile",
        description: error.message || "Please try again or contact support if the issue persists.",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setProfileType("audience");
    setName("");
    setBio("");
    setLocation("");
    setVisibility("public");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileType || !name.trim()) {
      toast({
        title: "Missing Required Information",
        description: "Please enter a profile name and select a profile type.",
        variant: "destructive",
      });
      return;
    }

    if (name.trim().length < 2) {
      toast({
        title: "Name Too Short",
        description: "Profile name must be at least 2 characters long.",
        variant: "destructive",
      });
      return;
    }

    createProfileMutation.mutate({
      type: profileType,
      name: name.trim(),
      bio: bio.trim(),
      location: location.trim(),
      visibility: visibility,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Create New Profile</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">
              Profile Type
            </Label>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <Music className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900">Audience Member</p>
                  <p className="text-sm text-neutral-600">Your primary profile for discovering music and connecting with friends</p>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">Start with your audience profile. You can create artist and venue profiles later!</p>
            </div>
          </div>

          <div>
            <Label htmlFor="name" className="text-sm font-medium text-neutral-700 mb-2 block">
              Profile Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter profile name"
              className="w-full"
              required
            />
          </div>

          <div>
            <Label htmlFor="bio" className="text-sm font-medium text-neutral-700 mb-2 block">
              Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about this profile..."
              rows={3}
              className="w-full resize-none"
            />
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              disabled={createProfileMutation.isPending}
            >
              {createProfileMutation.isPending ? "Creating..." : "Create Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
