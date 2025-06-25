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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Music, Building, X, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";

interface CreateProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateProfileModal({ open, onOpenChange }: CreateProfileModalProps) {
  const { toast } = useToast();
  const [profileType, setProfileType] = useState<string>("artist");
  const [name, setName] = useState("");
  const [zipcode, setZipcode] = useState("");
  const [address, setAddress] = useState("");
  
  const { result: zipcodeResult, isLoading: zipcodeLoading, error: zipcodeError } = useZipcodeLookup(zipcode);

  const createProfileMutation = useMutation({
    mutationFn: async (data: { type: string; name: string; location: string }) => {
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
    setZipcode("");
    setAddress("");
    onOpenChange(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!profileType || !name.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate location based on profile type
    let location = "";
    if (profileType === "artist") {
      if (!zipcode.trim() || zipcode.length !== 5) {
        toast({
          title: "Error",
          description: "Please enter a valid 5-digit zip code",
          variant: "destructive",
        });
        return;
      }
      if (zipcodeError) {
        toast({
          title: "Error",
          description: "Invalid zip code. Please enter a valid zip code.",
          variant: "destructive",
        });
        return;
      }
      if (!zipcodeResult) {
        toast({
          title: "Error",
          description: "Unable to find location for the provided zip code",
          variant: "destructive",
        });
        return;
      }
      location = zipcodeResult.formatted;
    } else if (profileType === "venue") {
      if (!address.trim()) {
        toast({
          title: "Error",
          description: "Please enter a physical address for the venue",
          variant: "destructive",
        });
        return;
      }
      location = address.trim();
    }

    createProfileMutation.mutate({
      type: profileType,
      name: name.trim(),
      location,
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
              {profileType === "artist" ? "Artist Name" : "Venue Name"} *
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
            <Label className="text-sm font-medium text-neutral-700 mb-2 block flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location *
            </Label>
            
            {profileType === "artist" ? (
              <div className="space-y-2">
                <Input
                  id="zipcode"
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="Enter your zip code (e.g., 12345)"
                  className="w-full"
                  maxLength={5}
                  required
                />
                {zipcodeLoading && zipcode.length === 5 && (
                  <p className="text-sm text-blue-600">Looking up location...</p>
                )}
                {zipcodeResult && (
                  <p className="text-sm text-green-600">
                    📍 {zipcodeResult.formatted}
                  </p>
                )}
                {zipcodeError && zipcode.length === 5 && (
                  <p className="text-sm text-red-600">
                    ❌ {zipcodeError}
                  </p>
                )}
              </div>
            ) : (
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter full venue address (e.g., 123 Main St, City, State 12345)"
                className="w-full"
                required
              />
            )}
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
