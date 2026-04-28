import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Upload } from 'lucide-react';

export default function UploadFileDialog({
    open,
    onOpenChange,
    meetingPatients = [],
    filePatientId,
    setFilePatientId,
    fileType,
    setFileType,
    selectedFile,
    setSelectedFile,
    uploading,
    onUpload,
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-testid="upload-dialog">
                <DialogHeader>
                    <DialogTitle>Upload File</DialogTitle>
                    <DialogDescription>Upload a document for this meeting</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>Patient (Optional)</Label>
                        <Select
                            value={filePatientId || 'none'}
                            onValueChange={(v) => setFilePatientId(v === 'none' ? '' : v)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Link to a patient (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None - General file</SelectItem>
                                {meetingPatients.map((patient) => (
                                    <SelectItem key={patient.patient_id} value={patient.patient_id}>
                                        {patient.first_name} {patient.last_name}
                                        {patient.patient_id_number ? ` (MRN: ${patient.patient_id_number})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">Link this file to a specific patient for better organization</p>
                    </div>
                    <div className="space-y-2">
                        <Label>File Type</Label>
                        <select
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            value={fileType}
                            onChange={(e) => setFileType(e.target.value)}
                            data-testid="file-type-select"
                        >
                            <option value="radiology">Radiology Report</option>
                            <option value="lab">Lab Report</option>
                            <option value="consult_note">Consultation Note</option>
                            <option value="specialist_note">Specialist Note</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <Label>Select File</Label>
                        <Input
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                            data-testid="file-input"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="upload-cancel-btn">
                        Cancel
                    </Button>
                    <Button onClick={onUpload} disabled={!selectedFile || uploading} data-testid="confirm-upload-btn">
                        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        Upload
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
