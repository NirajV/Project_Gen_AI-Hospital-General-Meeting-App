import React from 'react';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, AlertCircle, Loader2 } from 'lucide-react';

const DEFAULT_FORM = {
    name: '', email: '', specialty: '', phone: '', role: 'doctor', password: 'TempPass123!',
};

export const CreateParticipantDialog = ({
    open,
    onOpenChange,
    formValue,
    onFormChange,
    onSubmit,
    creating,
}) => {
    const handleClose = () => {
        onOpenChange(false);
        onFormChange({ ...DEFAULT_FORM });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-primary" />
                        Create New Participant
                    </DialogTitle>
                    <DialogDescription>
                        Add a new staff member to the hospital system
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                            id="name"
                            placeholder="Dr. John Smith"
                            value={formValue.name}
                            onChange={(e) => onFormChange({ ...formValue, name: e.target.value })}
                            data-testid="create-participant-name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="john.smith@hospital.com"
                            value={formValue.email}
                            onChange={(e) => onFormChange({ ...formValue, email: e.target.value })}
                            data-testid="create-participant-email"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Role *</Label>
                        <Select
                            value={formValue.role}
                            onValueChange={(value) => onFormChange({ ...formValue, role: value })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="doctor">Doctor</SelectItem>
                                <SelectItem value="nurse">Nurse</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="organizer">Organizer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="specialty">Specialty</Label>
                        <Input
                            id="specialty"
                            placeholder="Cardiology, Oncology, etc."
                            value={formValue.specialty}
                            onChange={(e) => onFormChange({ ...formValue, specialty: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            placeholder="+1 (555) 123-4567"
                            value={formValue.phone}
                            onChange={(e) => onFormChange({ ...formValue, phone: e.target.value })}
                        />
                    </div>

                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Default password will be: <strong>TempPass123!</strong></span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>Cancel</Button>
                    <Button
                        onClick={onSubmit}
                        disabled={!formValue.name || !formValue.email || creating}
                        data-testid="create-participant-submit"
                    >
                        {creating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                        ) : (
                            <><UserPlus className="w-4 h-4 mr-2" /> Create Participant</>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

CreateParticipantDialog.DEFAULT_FORM = DEFAULT_FORM;
