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
import { User, Users, Plus, Loader2, AlertCircle } from 'lucide-react';

const EMPTY_PATIENT = {
    first_name: '', last_name: '', mrn: '', gender: '', date_of_birth: '',
    phone: '', email: '', address: '', department_name: '', department_provider_name: '',
    diagnosis: '', allergies: '', current_medications: '', notes: '',
};

export default function AddPatientDialog({
    open,
    onOpenChange,
    patientTab,
    setPatientTab,
    allPatients = [],
    meetingPatients = [],
    selectedPatients,
    setSelectedPatients,
    addingPatients,
    onAddPatients,
    newPatient,
    setNewPatient,
    creatingPatient,
    onCreateAndAdd,
}) {
    const resetNewPatient = () => setNewPatient({ ...EMPTY_PATIENT });
    const availablePatients = allPatients.filter(
        (p) => !meetingPatients.some((mp) => mp.patient_id === p.id)
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" data-testid="patient-dialog">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" /> Add Patients to Meeting
                    </DialogTitle>
                    <DialogDescription>
                        Select existing patients or create a new patient
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 border-b pb-3">
                    <Button
                        variant={patientTab === 'existing' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPatientTab('existing')}
                        data-testid="patient-tab-existing"
                    >
                        <Users className="w-4 h-4 mr-2" /> Existing Patients
                    </Button>
                    <Button
                        variant={patientTab === 'create' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPatientTab('create')}
                        data-testid="patient-tab-create"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Create New Patient
                    </Button>
                </div>

                {patientTab === 'existing' ? (
                    <>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {allPatients.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No patients available</p>
                                    <Button
                                        variant="link"
                                        className="mt-2"
                                        onClick={() => setPatientTab('create')}
                                    >
                                        Create a new patient instead
                                    </Button>
                                </div>
                            ) : (
                                availablePatients.map((patient) => (
                                    <div
                                        key={patient.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary/30 hover:bg-slate-50 cursor-pointer"
                                        onClick={() => {
                                            const isSelected = selectedPatients.includes(patient.id);
                                            if (isSelected) {
                                                setSelectedPatients(selectedPatients.filter((pid) => pid !== patient.id));
                                            } else {
                                                setSelectedPatients([...selectedPatients, patient.id]);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Checkbox
                                                checked={selectedPatients.includes(patient.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setSelectedPatients([...selectedPatients, patient.id]);
                                                    } else {
                                                        setSelectedPatients(selectedPatients.filter((pid) => pid !== patient.id));
                                                    }
                                                }}
                                            />
                                            <div>
                                                <p className="font-medium">{patient.first_name} {patient.last_name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {patient.primary_diagnosis || patient.patient_id_number}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        {availablePatients.length > 0 && selectedPatients.length === 0 && (
                            <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                💡 Click on a patient row or checkbox to select patients to add
                            </div>
                        )}
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    onOpenChange(false);
                                    setSelectedPatients([]);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={onAddPatients}
                                disabled={selectedPatients.length === 0 || addingPatients}
                                data-testid="add-selected-patients-btn"
                            >
                                {addingPatients ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Plus className="w-4 h-4 mr-2" />
                                )}
                                {selectedPatients.length > 0 ? `Add (${selectedPatients.length})` : 'Select patients'}
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <div className="space-y-4">
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-700 border-b pb-2">Basic Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>First Name *</Label>
                                    <Input
                                        placeholder="John"
                                        value={newPatient.first_name}
                                        onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Name *</Label>
                                    <Input
                                        placeholder="Doe"
                                        value={newPatient.last_name}
                                        onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>MRN (Medical Record Number) *</Label>
                                    <Input
                                        placeholder="MRN123456"
                                        value={newPatient.mrn}
                                        onChange={(e) => setNewPatient({ ...newPatient, mrn: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Gender</Label>
                                    <Select
                                        value={newPatient.gender}
                                        onValueChange={(value) => setNewPatient({ ...newPatient, gender: value })}
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
                                    <Label>Date of Birth *</Label>
                                    <Input
                                        type="date"
                                        max={new Date().toISOString().split('T')[0]}
                                        value={newPatient.date_of_birth}
                                        onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                        placeholder="+1 (555) 123-4567"
                                        value={newPatient.phone}
                                        onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    placeholder="patient@email.com"
                                    value={newPatient.email}
                                    onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Address</Label>
                                <Textarea
                                    placeholder="Full address"
                                    value={newPatient.address}
                                    onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-slate-700 border-b pb-2">Medical Information</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Department</Label>
                                    <Input
                                        placeholder="e.g., Oncology"
                                        value={newPatient.department_name}
                                        onChange={(e) => setNewPatient({ ...newPatient, department_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Provider Name</Label>
                                    <Input
                                        placeholder="e.g., Dr. Smith"
                                        value={newPatient.department_provider_name}
                                        onChange={(e) => setNewPatient({ ...newPatient, department_provider_name: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Primary Diagnosis</Label>
                                <Textarea
                                    placeholder="Enter primary diagnosis"
                                    value={newPatient.diagnosis}
                                    onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Allergies</Label>
                                <Textarea
                                    placeholder="List any known allergies"
                                    value={newPatient.allergies}
                                    onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Current Medications</Label>
                                <Textarea
                                    placeholder="List current medications"
                                    value={newPatient.current_medications}
                                    onChange={(e) => setNewPatient({ ...newPatient, current_medications: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Additional Notes</Label>
                                <Textarea
                                    placeholder="Any additional notes"
                                    value={newPatient.notes}
                                    onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                            <AlertCircle className="w-4 h-4" />
                            <span>Patient will be created in the system and added to this meeting</span>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    resetNewPatient();
                                    setPatientTab('existing');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={onCreateAndAdd}
                                disabled={
                                    !newPatient.first_name ||
                                    !newPatient.last_name ||
                                    !newPatient.mrn ||
                                    !newPatient.date_of_birth ||
                                    creatingPatient
                                }
                                data-testid="create-add-patient-btn"
                            >
                                {creatingPatient ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                                ) : (
                                    <><Plus className="w-4 h-4 mr-2" /> Create & Add</>
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export { EMPTY_PATIENT };
