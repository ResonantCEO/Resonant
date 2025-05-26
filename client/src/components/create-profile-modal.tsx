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
import { Music, Building, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProfileModal({ open, onOpenChange }: CreateProfileModalProps) {
  const { toast } = useToast();
  const [profileType, setProfileType] = useState<string>("artist");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const createProfileMutation = useMutation({
    mutationFn: async (data: { type: string; name: string; bio: string }) => {
      return await apiRequest("POST", "/api/profiles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles/active"] });
      toast({
        title: "Profile Created",
        description: "Your new profile has been created successfully.",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create profile",
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    setProfileType("artist");
    setName("");
    setBio("");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileType || !name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createProfileMutation.mutate({
      type: profileType,
      name: name.trim(),
      bio: bio.trim(),
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
            <Label className="text-sm font-medium text-neutral-700 mb-3 block">
              Profile Type *
            </Label>
            <RadioGroup value={profileType} onValueChange={setProfileType} className="space-y-3">
              <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                profileType === "artist" 
                  ? "bg-green-50 border-green-500" 
                  : "bg-white border-neutral-200 hover:border-green-300"
              }`}>
                <RadioGroupItem value="artist" id="artist" />
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="artist" className="font-medium text-neutral-900 cursor-pointer">
                      Artist Profile
                    </Label>
                    <p className="text-sm text-neutral-600">Showcase your music, connect with fans, and promote your performances</p>
                  </div>
                </div>
              </div>
              
              <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                profileType === "venue" 
                  ? "bg-red-50 border-red-500" 
                  : "bg-white border-neutral-200 hover:border-red-300"
              }`}>
                <RadioGroupItem value="venue" id="venue" />
                <div className="flex items-center space-x-3 flex-1">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="venue" className="font-medium text-neutral-900 cursor-pointer">
                      Venue Profile
                    </Label>
                    <p className="text-sm text-neutral-600">Promote your venue, list upcoming events, and connect with artists</p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="name" className="text-sm font-medium text-neutral-700 mb-2 block">
              Profile Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={profileType === "artist" ? "Enter artist name or band name" : "Enter venue name"}
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
              placeholder={profileType === "artist" 
                ? "Tell us about your music, style, and what makes you unique..." 
                : "Describe your venue, capacity, location, and what events you host..."
              }
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
              className={`flex-1 text-white ${
                profileType === "artist" 
                  ? "bg-green-500 hover:bg-green-600" 
                  : "bg-red-500 hover:bg-red-600"
              }`}
              disabled={createProfileMutation.isPending}
            >
              {createProfileMutation.isPending 
                ? "Creating..." 
                : `Create ${profileType === "artist" ? "Artist" : "Venue"} Profile`
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
