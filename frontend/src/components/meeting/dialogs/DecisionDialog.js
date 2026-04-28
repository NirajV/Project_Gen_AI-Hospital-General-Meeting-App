import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';

export default function DecisionDialog({
    open,
    onOpenChange,
    meetingPatients = [],
    newDecision,
    setNewDecision,
    onCreate,
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-testid="decision-dialog">
                <DialogHeader>
                    <DialogTitle>Log Decision</DialogTitle>
                    <DialogDescription>Record a decision or action item from this meeting</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Patient (Optional)</Label>
                        <Select
                            value={newDecision.meeting_patient_id || 'none'}
                            onValueChange={(v) => {
                                const patientId = v === 'none' ? '' : v;
                                setNewDecision({ ...newDecision, meeting_patient_id: patientId, patient_id: patientId });
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Link to a patient (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None - General decision</SelectItem>
                                {meetingPatients.map((patient) => (
                                    <SelectItem key={patient.patient_id} value={patient.patient_id}>
                                        {patient.first_name} {patient.last_name}
                                        {patient.patient_id_number ? ` (MRN: ${patient.patient_id_number})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">Link this decision to a specific patient for better organization</p>
                    </div>
                    <div className="space-y-2">
                        <Label>Title *</Label>
                        <Input
                            value={newDecision.title}
                            onChange={(e) => setNewDecision({ ...newDecision, title: e.target.value })}
                            placeholder="Decision title"
                            data-testid="decision-title-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            value={newDecision.description}
                            onChange={(e) => setNewDecision({ ...newDecision, description: e.target.value })}
                            placeholder="Brief description"
                            data-testid="decision-desc-input"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Action Plan</Label>
                        <Textarea
                            value={newDecision.action_plan}
                            onChange={(e) => setNewDecision({ ...newDecision, action_plan: e.target.value })}
                            placeholder="Next steps or action items"
                            data-testid="decision-action-input"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                value={newDecision.priority}
                                onChange={(e) => setNewDecision({ ...newDecision, priority: e.target.value })}
                                data-testid="decision-priority-select"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Follow-up Date</Label>
                            <Input
                                type="date"
                                value={newDecision.follow_up_date}
                                onChange={(e) => setNewDecision({ ...newDecision, follow_up_date: e.target.value })}
                                min={new Date().toISOString().split('T')[0]}
                                max={new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0]}
                                data-testid="decision-followup-input"
                            />
                            <p className="text-xs text-slate-500">Must be a future date</p>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="decision-cancel-btn">
                        Cancel
                    </Button>
                    <Button onClick={onCreate} disabled={!newDecision.title} data-testid="confirm-decision-btn">
                        <Plus className="w-4 h-4 mr-2" /> Add Decision
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
