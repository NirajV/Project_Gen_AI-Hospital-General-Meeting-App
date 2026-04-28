import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, Users, Mail, Plus, Loader2 } from 'lucide-react';

export default function AddParticipantDialog({
    open,
    onOpenChange,
    inviteTab,
    setInviteTab,
    newInvite,
    setNewInvite,
    availableUsers = [],
    addingParticipant,
    onAddUser,
    inviting,
    onInviteByEmail,
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg" data-testid="participant-dialog">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" /> Add Participants
                    </DialogTitle>
                    <DialogDescription>
                        Select existing doctors or invite someone new
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 border-b pb-3">
                    <Button
                        variant={inviteTab === 'existing' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInviteTab('existing')}
                        data-testid="tab-existing"
                    >
                        <Users className="w-4 h-4 mr-2" /> Existing Doctors
                    </Button>
                    <Button
                        variant={inviteTab === 'invite' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setInviteTab('invite')}
                        data-testid="tab-invite-new"
                    >
                        <Mail className="w-4 h-4 mr-2" /> Invite by Email
                    </Button>
                </div>

                {inviteTab === 'existing' ? (
                    <div className="max-h-72 overflow-y-auto space-y-2">
                        {availableUsers.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>All available doctors are already participants</p>
                                <Button
                                    variant="link"
                                    className="mt-2"
                                    onClick={() => setInviteTab('invite')}
                                >
                                    Invite someone new instead
                                </Button>
                            </div>
                        ) : (
                            availableUsers.map((availableUser, idx) => (
                                <div
                                    key={availableUser.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary/30 hover:bg-slate-50 transition-all"
                                    data-testid={`available-user-${idx}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="w-10 h-10">
                                            <AvatarImage src={availableUser.picture} />
                                            <AvatarFallback className="bg-primary/10 text-primary">
                                                {availableUser.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{availableUser.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {availableUser.specialty || availableUser.email}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => onAddUser(availableUser.id)}
                                        disabled={addingParticipant}
                                        data-testid={`add-user-${idx}`}
                                    >
                                        {addingParticipant ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="w-4 h-4 mr-1" /> Add
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="invite-email">Email Address *</Label>
                            <Input
                                id="invite-email"
                                type="email"
                                placeholder="doctor@hospital.com"
                                value={newInvite.email}
                                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                                data-testid="invite-email-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invite-name">Full Name *</Label>
                            <Input
                                id="invite-name"
                                placeholder="Dr. John Smith"
                                value={newInvite.name}
                                onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                                data-testid="invite-name-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invite-specialty">Specialty (Optional)</Label>
                            <Input
                                id="invite-specialty"
                                placeholder="e.g., Oncology, Cardiology"
                                value={newInvite.specialty}
                                onChange={(e) => setNewInvite({ ...newInvite, specialty: e.target.value })}
                                data-testid="invite-specialty-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invite-role">Role *</Label>
                            <Select
                                value={newInvite.role}
                                onValueChange={(value) => setNewInvite({ ...newInvite, role: value })}
                            >
                                <SelectTrigger id="invite-role" data-testid="invite-role-select">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="doctor">Doctor</SelectItem>
                                    <SelectItem value="nurse">Nurse</SelectItem>
                                    <SelectItem value="organizer">Organizer</SelectItem>
                                    <SelectItem value="guest">Guest</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button
                            className="w-full"
                            onClick={onInviteByEmail}
                            disabled={inviting || !newInvite.email || !newInvite.name}
                            data-testid="send-invite-btn"
                        >
                            {inviting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending Invite...</>
                            ) : (
                                <><Mail className="w-4 h-4 mr-2" /> Send Invite</>
                            )}
                        </Button>
                        <p className="text-xs text-muted-foreground text-center">
                            An account will be created and login credentials will be emailed to the invited person.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="participant-done-btn">
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
