import React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

export default function DeleteMeetingDialog({ open, onOpenChange, onConfirm }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-testid="delete-meeting-dialog">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-destructive" /> Cancel Meeting
                    </DialogTitle>
                    <DialogDescription>
                        Are you sure you want to cancel this meeting? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="keep-meeting-btn">
                        Keep Meeting
                    </Button>
                    <Button variant="destructive" onClick={onConfirm} data-testid="confirm-delete-btn">
                        Cancel Meeting
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
