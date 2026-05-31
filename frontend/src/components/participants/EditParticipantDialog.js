import React from 'react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Briefcase, AlertCircle, Save, Loader2 } from 'lucide-react';

export const EditParticipantDialog = ({
    open,
    onOpenChange,
    participant,
    email,
    specialty,
    onEmailChange,
    onSpecialtyChange,
    onSubmit,
    updating,
}) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Participant Details</DialogTitle>
                <DialogDescription>
                    Update email address and department/specialty for {participant?.name}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="edit-email">Email Address *</Label>
                    <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <Input
                            id="edit-email"
                            type="email"
                            placeholder="email@hospital.com"
                            value={email}
                            onChange={(e) => onEmailChange(e.target.value)}
                            required
                            data-testid="edit-participant-email"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="edit-specialty">Department / Specialty</Label>
                    <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <Input
                            id="edit-specialty"
                            type="text"
                            placeholder="e.g., Cardiology, Oncology"
                            value={specialty}
                            onChange={(e) => onSpecialtyChange(e.target.value)}
                            data-testid="edit-participant-specialty"
                        />
                    </div>
                </div>
                <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                            <strong>Note:</strong> Email updates will be reflected immediately.
                            The participant will need to use the new email for future logins.
                        </div>
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button
                    onClick={onSubmit}
                    disabled={!email || updating}
                    data-testid="edit-participant-submit"
                >
                    {updating ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
                    ) : (
                        <><Save className="w-4 h-4 mr-2" /> Update Participant</>
                    )}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
);
