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
  const [profileType, setProfileType] = useState<string>("audience");
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
    setProfileType("audience");
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
