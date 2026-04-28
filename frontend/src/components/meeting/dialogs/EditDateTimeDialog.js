import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Loader2, AlertCircle } from 'lucide-react';

export default function EditDateTimeDialog({
    open,
    onOpenChange,
    editedDate,
    setEditedDate,
    editedStartTime,
    setEditedStartTime,
    editedEndTime,
    setEditedEndTime,
    isUpdatingDateTime,
    onUpdate,
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-testid="edit-datetime-dialog">
                <DialogHeader>
                    <DialogTitle>Edit Meeting Date & Time</DialogTitle>
                    <DialogDescription>
                        Update the meeting schedule. All participants will be notified of the change.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-date">Meeting Date *</Label>
                        <Input
                            id="edit-date"
                            type="date"
                            value={editedDate}
                            onChange={(e) => setEditedDate(e.target.value)}
                            required
                            data-testid="edit-date-input"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-start-time">Start Time *</Label>
                            <Input
                                id="edit-start-time"
                                type="time"
                                value={editedStartTime}
                                onChange={(e) => setEditedStartTime(e.target.value)}
                                required
                                data-testid="edit-start-time-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-end-time">End Time</Label>
                            <Input
                                id="edit-end-time"
                                type="time"
                                value={editedEndTime}
                                onChange={(e) => setEditedEndTime(e.target.value)}
                                data-testid="edit-end-time-input"
                            />
                        </div>
                    </div>
                    <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <div>
                                <strong>Note:</strong> All accepted participants will receive an email notification about this schedule change.
                            </div>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="edit-datetime-cancel-btn">
                        Cancel
                    </Button>
                    <Button
                        onClick={onUpdate}
                        disabled={isUpdatingDateTime || !editedDate || !editedStartTime}
                        data-testid="confirm-update-datetime-btn"
                    >
                        {isUpdatingDateTime ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <Clock className="w-4 h-4 mr-2" />
                                Update Date & Time
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
