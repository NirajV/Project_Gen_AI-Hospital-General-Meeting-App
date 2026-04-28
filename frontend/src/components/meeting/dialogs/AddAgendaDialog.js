import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Clipboard, Plus, Loader2 } from 'lucide-react';

const EMPTY_AGENDA = {
    patient_id: '',
    mrn: '',
    requested_provider: '',
    diagnosis: '',
    reason_for_discussion: '',
    pathology_required: false,
    radiology_required: false,
    treatment_plan: '',
};

export default function AddAgendaDialog({
    open,
    onOpenChange,
    meetingPatients = [],
    meetingParticipants = [],
    newAgenda,
    setNewAgenda,
    onPatientSelect,
    addingAgenda,
    onAdd,
}) {
    const nonOrganizerParticipants = meetingParticipants.filter((p) => p.role !== 'organizer');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="agenda-dialog">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clipboard className="w-5 h-5 text-primary" /> Add Agenda Item (Patient Case)
                    </DialogTitle>
                    <DialogDescription>
                        Add a new patient case to the meeting agenda with all required medical information
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="agenda-patient">Patient Name *</Label>
                        <Select
                            value={newAgenda.patient_id || ''}
                            onValueChange={onPatientSelect}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a patient" />
                            </SelectTrigger>
                            <SelectContent>
                                {meetingPatients.map((mp) => (
                                    <SelectItem key={mp.patient_id} value={mp.patient_id}>
                                        {mp.first_name} {mp.last_name}
                                        {mp.patient_id_number ? ` (MRN: ${mp.patient_id_number})` : ''}
                                    </SelectItem>
                                ))}
                                {meetingPatients.length === 0 && (
                                    <SelectItem value="no-patients" disabled>
                                        No patients in this meeting
                                    </SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="agenda-mrn">MRN (Medical Record Number) *</Label>
                        <Input
                            id="agenda-mrn"
                            value={newAgenda.mrn}
                            onChange={(e) => setNewAgenda({ ...newAgenda, mrn: e.target.value })}
                            placeholder="e.g., 12345"
                        />
                        <p className="text-xs text-slate-500">Auto-filled if available, otherwise enter manually</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="agenda-provider">Requested Provider *</Label>
                        <Select
                            value={newAgenda.requested_provider}
                            onValueChange={(value) => setNewAgenda({ ...newAgenda, requested_provider: value })}
                        >
                            <SelectTrigger id="agenda-provider">
                                <SelectValue placeholder="Select a provider from meeting participants" />
                            </SelectTrigger>
                            <SelectContent>
                                {nonOrganizerParticipants.length === 0 ? (
                                    <SelectItem value="no-participants" disabled>
                                        No participants in this meeting
                                    </SelectItem>
                                ) : (
                                    nonOrganizerParticipants.map((participant) => (
                                        <SelectItem key={participant.user_id} value={participant.name}>
                                            {participant.name}
                                            {participant.specialty ? ` - ${participant.specialty}` : ''}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">Select from invited doctors/participants</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="agenda-diagnosis">Diagnosis *</Label>
                        <Input
                            id="agenda-diagnosis"
                            value={newAgenda.diagnosis}
                            onChange={(e) => setNewAgenda({ ...newAgenda, diagnosis: e.target.value })}
                            placeholder="e.g., Lung Cancer Stage 2"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="agenda-reason">Reason For Discussion *</Label>
                        <Textarea
                            id="agenda-reason"
                            value={newAgenda.reason_for_discussion}
                            onChange={(e) => setNewAgenda({ ...newAgenda, reason_for_discussion: e.target.value })}
                            placeholder="Brief explanation of why this case needs discussion"
                            rows={3}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200">
                            <Checkbox
                                id="dialog-pathology"
                                checked={newAgenda.pathology_required}
                                onCheckedChange={(checked) => setNewAgenda({ ...newAgenda, pathology_required: checked })}
                            />
                            <Label htmlFor="dialog-pathology" className="text-sm font-medium cursor-pointer">
                                Pathology Review Required *
                            </Label>
                        </div>
                        <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200">
                            <Checkbox
                                id="dialog-radiology"
                                checked={newAgenda.radiology_required}
                                onCheckedChange={(checked) => setNewAgenda({ ...newAgenda, radiology_required: checked })}
                            />
                            <Label htmlFor="dialog-radiology" className="text-sm font-medium cursor-pointer">
                                Radiology Review Required *
                            </Label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="agenda-treatment">Treatment Plan (Optional - can be updated during meeting)</Label>
                        <Textarea
                            id="agenda-treatment"
                            value={newAgenda.treatment_plan}
                            onChange={(e) => setNewAgenda({ ...newAgenda, treatment_plan: e.target.value })}
                            placeholder="Treatment plan notes (can be updated later)"
                            rows={3}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false);
                            setNewAgenda({ ...EMPTY_AGENDA });
                        }}
                    >
                        Cancel
                    </Button>
                    <Button onClick={onAdd} disabled={addingAgenda} data-testid="confirm-add-agenda-btn">
                        {addingAgenda ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4 mr-2" />
                        )}
                        Add Agenda Item
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export { EMPTY_AGENDA };
