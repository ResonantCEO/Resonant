import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, UserPlus, Settings, Mail, Crown, Shield, User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProfileMember {
  membership: {
    id: number;
    role: string;
    permissions: string[];
    status: string;
    joinedAt: string;
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    profileImageUrl?: string;
  };
}

interface ProfileInvitation {
  id: number;
  invitedEmail: string;
  role: string;
  permissions: string[];
  status: string;
  createdAt: string;
  expiresAt: string;
}

interface ProfileManagementProps {
  profileId: number;
  profileType: string;
  isOwner: boolean;
  canManageMembers: boolean;
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
  member: "bg-gray-100 text-black border-gray-300",
};

const PERMISSIONS = [
  { value: "manage_profile", label: "Manage Profile" },
  { value: "manage_posts", label: "Manage Posts" },
  { value: "manage_events", label: "Manage Events" },
  { value: "manage_bookings", label: "Manage Bookings" },
  { value: "view_analytics", label: "View Analytics" },
  { value: "moderate_content", label: "Moderate Content" },
];

export default function ProfileManagement({ profileId, profileType, isOwner, canManageMembers }: ProfileManagementProps) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [invitePermissions, setInvitePermissions] = useState<string[]>([]);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch profile members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['/api/profiles', profileId, 'members'],
    enabled: canManageMembers,
  });

  // Fetch profile invitations
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['/api/profiles', profileId, 'invitations'],
    enabled: canManageMembers,
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: { invitedEmail: string; role: string; permissions: string[] }) => {
      return apiRequest(`/api/profiles/${profileId}/invite`, "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        description: "The user has been invited to join this profile.",
      });
      setInviteEmail("");
      setInviteRole("member");
      setInvitePermissions([]);
      setIsInviteModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/profiles', profileId, 'invitations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitation",
        variant: "destructive",
      });
    },
  });

  // Update member role mutation
  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, role, permissions }: { memberId: number; role: string; permissions: string[] }) => {
      return apiRequest(`/api/profile-memberships/${memberId}`, "PATCH", { role, permissions });
    },
    onSuccess: () => {
      toast({
        title: "Member updated",
        description: "Member role and permissions have been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles', profileId, 'members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update member",
        variant: "destructive",
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return apiRequest(`/api/profile-memberships/${memberId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Member removed",
        description: "Member has been removed from the profile.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/profiles', profileId, 'members'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const handleInviteSubmit = () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    inviteUserMutation.mutate({
      invitedEmail: inviteEmail,
      role: inviteRole,
      permissions: invitePermissions,
    });
  };

  const handlePermissionToggle = (permission: string) => {
    setInvitePermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  if (!canManageMembers) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Profile Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">You don't have permission to manage this profile.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Profile Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="members" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
            <TabsTrigger value="invitations">Invitations ({invitations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Current Members</h3>
              <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogTrigger asChild>
                  <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <UserPlus className="h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite New Member</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          {isOwner && <SelectItem value="admin">Admin</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Permissions</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {PERMISSIONS.map((permission) => (
                          <label key={permission.value} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={invitePermissions.includes(permission.value)}
                              onChange={() => handlePermissionToggle(permission.value)}
                              className="rounded"
                            />
                            <span className="text-sm">{permission.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleInviteSubmit}
                        disabled={inviteUserMutation.isPending}
                      >
                        {inviteUserMutation.isPending ? "Sending..." : "Send Invitation"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {membersLoading ? (
              <div>Loading members...</div>
            ) : (
              <div className="space-y-3">
                {members.map((member: any) => {
                  const role = member?.membership?.role || member?.role || "member";
                  const RoleIcon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || User;
                  return (
                    <div key={member?.membership?.id || member?.id || Math.random()} className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        {member?.user?.profileImageUrl ? (
                          <img
                            src={member?.user?.profileImageUrl}
                            alt={`${member?.user?.firstName || ''} ${member?.user?.lastName || ''}`}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white">{member?.user?.firstName || ''} {member?.user?.lastName || ''}</p>
                          <p className="text-sm text-gray-300">{member?.user?.email || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`flex items-center gap-1 ${ROLE_COLORS[role as keyof typeof ROLE_COLORS] || ROLE_COLORS.member}`}>
                          <RoleIcon className="h-3 w-3" />
                          {role}
                        </Badge>
                        {role !== "owner" && isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeMemberMutation.mutate(member?.membership?.id || member?.id)}
                            disabled={removeMemberMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="space-y-4">
            <h3 className="text-lg font-semibold">Pending Invitations</h3>
            {invitationsLoading ? (
              <div>Loading invitations...</div>
            ) : invitations.length === 0 ? (
              <p className="text-gray-600">No pending invitations</p>
            ) : (
              <div className="space-y-3">
                {invitations.map((invitation: ProfileInvitation) => (
                  <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <div>
                        <p className="font-medium">{invitation.invitedEmail}</p>
                        <p className="text-sm text-gray-600">
                          Invited {new Date(invitation.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge className={ROLE_COLORS[invitation.role as keyof typeof ROLE_COLORS]}>
                      {invitation.role}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}