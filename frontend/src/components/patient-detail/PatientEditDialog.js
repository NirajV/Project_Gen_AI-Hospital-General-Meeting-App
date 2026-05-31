import React from 'react';
import {
    Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';

const set = (form, onChange, key) => (e) =>
    onChange({ ...form, [key]: e?.target?.value ?? e });

export const PatientEditDialog = ({ open, onOpenChange, form, onFormChange, onSave, saving }) => {
    const today = new Date().toISOString().split('T')[0];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Patient Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    {/* Basic Information Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-700 border-b pb-2">Basic Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>First Name</Label>
                                <Input value={form.first_name || ''} onChange={set(form, onFormChange, 'first_name')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input value={form.last_name || ''} onChange={set(form, onFormChange, 'last_name')} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>MRN (Medical Record Number)</Label>
                                <Input
                                    value={form.patient_id_number || ''}
                                    onChange={set(form, onFormChange, 'patient_id_number')}
                                    placeholder="e.g., P-12345"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Gender</Label>
                                <Select
                                    value={form.gender || ''}
                                    onValueChange={(value) => onFormChange({ ...form, gender: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date of Birth</Label>
                                <Input
                                    type="date"
                                    value={form.date_of_birth || ''}
                                    onChange={set(form, onFormChange, 'date_of_birth')}
                                    max={today}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input
                                    value={form.phone || ''}
                                    onChange={set(form, onFormChange, 'phone')}
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                value={form.email || ''}
                                onChange={set(form, onFormChange, 'email')}
                                placeholder="patient@email.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Textarea
                                value={form.address || ''}
                                onChange={set(form, onFormChange, 'address')}
                                placeholder="Full address"
                                rows={2}
                            />
                        </div>
                    </div>

                    {/* Medical Information Section */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-slate-700 border-b pb-2">Medical Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input
                                    value={form.department_name || ''}
                                    onChange={set(form, onFormChange, 'department_name')}
                                    placeholder="e.g., Oncology"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Provider Name</Label>
                                <Input
                                    value={form.department_provider_name || ''}
                                    onChange={set(form, onFormChange, 'department_provider_name')}
                                    placeholder="e.g., Dr. Smith"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Primary Diagnosis</Label>
                            <Textarea
                                value={form.primary_diagnosis || ''}
                                onChange={set(form, onFormChange, 'primary_diagnosis')}
                                placeholder="Enter primary diagnosis"
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Allergies</Label>
                            <Textarea
                                value={form.allergies || ''}
                                onChange={set(form, onFormChange, 'allergies')}
                                placeholder="List any known allergies"
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Current Medications</Label>
                            <Textarea
                                value={form.current_medications || ''}
                                onChange={set(form, onFormChange, 'current_medications')}
                                placeholder="List current medications"
                                rows={2}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Additional Notes</Label>
                            <Textarea
                                value={form.notes || ''}
                                onChange={set(form, onFormChange, 'notes')}
                                placeholder="Any additional notes"
                                rows={2}
                            />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={onSave} disabled={saving} data-testid="save-edit-btn">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
