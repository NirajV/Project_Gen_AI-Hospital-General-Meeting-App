import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMeeting, getUsers, getPatients, createPatient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout';
import { 
    ArrowLeft, ArrowRight, Calendar, Users, User, FileText,
    Video, MapPin, Loader2, Check, X, Plus, Trash2, Mail, UserPlus
} from 'lucide-react';

const STEPS = [
    { id: 1, title: 'Meeting Info', icon: Calendar },
    { id: 2, title: 'Participants', icon: Users },
    { id: 3, title: 'Patients', icon: User },
    { id: 4, title: 'Agenda', icon: FileText },
];

export default function MeetingWizardPage() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [patients, setPatients] = useState([]);
    const [participantTab, setParticipantTab] = useState('existing');
    const [patientTab, setPatientTab] = useState('existing');
    const [newInvite, setNewInvite] = useState({ email: '', name: '', specialty: '' });
    const [inviting, setInviting] = useState(false);
    const [newPatient, setNewPatient] = useState({ 
        first_name: '', 
        last_name: '', 
        date_of_birth: '', 
        gender: '',
        primary_diagnosis: '', 
        department_name: '' 
    });
    const [addingPatient, setAddingPatient] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        meeting_date: '',
        start_time: '09:00',
        end_time: '10:00',
        meeting_type: 'video',
        location: '',
        video_link: '',
        recurrence_type: 'one_time',
        participant_ids: [],
        patient_ids: [],
        agenda_items: []
    });

    const [newAgendaItem, setNewAgendaItem] = useState({ title: '', description: '', estimated_duration_minutes: 15 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersRes, patientsRes] = await Promise.all([
                getUsers(),
                getPatients({})
            ]);
            setUsers(usersRes.data);
            setPatients(patientsRes.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name, value) => {
        setFormData({ ...formData, [name]: value });
    };

    const toggleParticipant = (userId) => {
        const ids = formData.participant_ids.includes(userId)
            ? formData.participant_ids.filter(id => id !== userId)
            : [...formData.participant_ids, userId];
        setFormData({ ...formData, participant_ids: ids });
    };

    const handleInviteByEmail = async () => {
        if (!newInvite.email || !newInvite.name) return;
        setInviting(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newInvite.email,
                    name: newInvite.name,
                    specialty: newInvite.specialty,
                    password: 'TempPass123!'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                // Add the new user to the list and select them
                setUsers(prev => [...prev, data.user]);
                setFormData(prev => ({
                    ...prev,
                    participant_ids: [...prev.participant_ids, data.user.id]
                }));
                setNewInvite({ email: '', name: '', specialty: '' });
                setParticipantTab('existing');
            } else {
                const error = await response.json();
                if (error.detail === 'Email already registered') {
                    // User exists, find them in the list and select them
                    const existingUser = users.find(u => u.email === newInvite.email);
                    if (existingUser && !formData.participant_ids.includes(existingUser.id)) {
                        setFormData(prev => ({
                            ...prev,
                            participant_ids: [...prev.participant_ids, existingUser.id]
                        }));
                    }
                    setNewInvite({ email: '', name: '', specialty: '' });
                    setParticipantTab('existing');
                }
            }
        } catch (error) {
            console.error('Failed to invite user:', error);
        } finally {
            setInviting(false);
        }
    };

    const togglePatient = (patientId) => {
        const ids = formData.patient_ids.includes(patientId)
            ? formData.patient_ids.filter(id => id !== patientId)
            : [...formData.patient_ids, patientId];
        setFormData({ ...formData, patient_ids: ids });
    };

    const handleAddNewPatient = async () => {
        if (!newPatient.first_name || !newPatient.last_name) return;
        setAddingPatient(true);
        try {
            const response = await createPatient(newPatient);
            const createdPatient = response.data;
            // Add the new patient to the list and select them
            setPatients(prev => [...prev, createdPatient]);
            setFormData(prev => ({
                ...prev,
                patient_ids: [...prev.patient_ids, createdPatient.id]
            }));
            setNewPatient({ 
                first_name: '', 
                last_name: '', 
                date_of_birth: '', 
                gender: '',
                primary_diagnosis: '', 
                department_name: '' 
            });
            setPatientTab('existing');
        } catch (error) {
            console.error('Failed to create patient:', error);
        } finally {
            setAddingPatient(false);
        }
    };

    const addAgendaItem = () => {
        if (!newAgendaItem.title.trim()) return;
        setFormData({
            ...formData,
            agenda_items: [...formData.agenda_items, { ...newAgendaItem, order_index: formData.agenda_items.length }]
        });
        setNewAgendaItem({ title: '', description: '', estimated_duration_minutes: 15 });
    };

    const removeAgendaItem = (index) => {
        setFormData({
            ...formData,
            agenda_items: formData.agenda_items.filter((_, i) => i !== index)
        });
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return formData.title && formData.meeting_date && formData.start_time && formData.end_time;
            default:
                return true;
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await createMeeting(formData);
            navigate(`/meetings/${res.data.id}`);
        } catch (error) {
            console.error('Failed to create meeting:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-6" data-testid="step-1">
                        <div className="space-y-2">
                            <Label htmlFor="title">Meeting Title *</Label>
                            <Input
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g., Tumor Board - Lung Cases"
                                className="h-12 bg-slate-50"
                                data-testid="title-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Brief description of the meeting purpose"
                                className="bg-slate-50"
                                data-testid="description-input"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="meeting_date">Date *</Label>
                                <Input
                                    id="meeting_date"
                                    name="meeting_date"
                                    type="date"
                                    value={formData.meeting_date}
                                    onChange={handleChange}
                                    className="h-12 bg-slate-50"
                                    data-testid="date-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="start_time">Start Time *</Label>
                                <Input
                                    id="start_time"
                                    name="start_time"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={handleChange}
                                    className="h-12 bg-slate-50"
                                    data-testid="start-time-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_time">End Time *</Label>
                                <Input
                                    id="end_time"
                                    name="end_time"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={handleChange}
                                    className="h-12 bg-slate-50"
                                    data-testid="end-time-input"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Meeting Type</Label>
                                <Select onValueChange={(v) => handleSelectChange('meeting_type', v)} value={formData.meeting_type}>
                                    <SelectTrigger className="h-12 bg-slate-50" data-testid="type-select">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="video"><div className="flex items-center gap-2"><Video className="w-4 h-4" /> Video Call</div></SelectItem>
                                        <SelectItem value="in_person"><div className="flex items-center gap-2"><MapPin className="w-4 h-4" /> In-Person</div></SelectItem>
                                        <SelectItem value="hybrid"><div className="flex items-center gap-2"><Users className="w-4 h-4" /> Hybrid</div></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Recurrence</Label>
                                <Select onValueChange={(v) => handleSelectChange('recurrence_type', v)} value={formData.recurrence_type}>
                                    <SelectTrigger className="h-12 bg-slate-50" data-testid="recurrence-select">
                                        <SelectValue placeholder="Select recurrence" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="one_time">One Time</SelectItem>
                                        <SelectItem value="daily">Daily</SelectItem>
                                        <SelectItem value="weekly">Weekly</SelectItem>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {(formData.meeting_type === 'video' || formData.meeting_type === 'hybrid') && (
                            <div className="space-y-2">
                                <Label htmlFor="video_link">Teams/Video Link</Label>
                                <Input
                                    id="video_link"
                                    name="video_link"
                                    value={formData.video_link}
                                    onChange={handleChange}
                                    placeholder="https://teams.microsoft.com/..."
                                    className="h-12 bg-slate-50"
                                    data-testid="video-link-input"
                                />
                            </div>
                        )}
                        {(formData.meeting_type === 'in_person' || formData.meeting_type === 'hybrid') && (
                            <div className="space-y-2">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="e.g., Conference Room A, Building 2"
                                    className="h-12 bg-slate-50"
                                    data-testid="location-input"
                                />
                            </div>
                        )}
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6" data-testid="step-2">
                        {/* Tab buttons */}
                        <div className="flex gap-2 border-b pb-3">
                            <Button
                                variant={participantTab === 'existing' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setParticipantTab('existing')}
                                data-testid="wizard-tab-existing"
                            >
                                <Users className="w-4 h-4 mr-2" /> Existing Doctors
                            </Button>
                            <Button
                                variant={participantTab === 'invite' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setParticipantTab('invite')}
                                data-testid="wizard-tab-invite"
                            >
                                <Mail className="w-4 h-4 mr-2" /> Invite by Email
                            </Button>
                        </div>

                        {participantTab === 'existing' ? (
                            <>
                                <p className="text-muted-foreground">Select doctors to invite to this meeting:</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                                    {users.map((user, idx) => (
                                        <div
                                            key={user.id}
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                formData.participant_ids.includes(user.id)
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                            onClick={() => toggleParticipant(user.id)}
                                            data-testid={`participant-${idx}`}
                                        >
                                            <Checkbox
                                                checked={formData.participant_ids.includes(user.id)}
                                                onCheckedChange={() => toggleParticipant(user.id)}
                                            />
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{user.name}</p>
                                                <p className="text-sm text-muted-foreground">{user.specialty || user.email}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {users.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                        <p>No doctors available yet</p>
                                        <Button 
                                            variant="link" 
                                            className="mt-2"
                                            onClick={() => setParticipantTab('invite')}
                                        >
                                            Invite someone by email
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="max-w-md space-y-4">
                                <p className="text-muted-foreground">Invite a new doctor to join this meeting:</p>
                                <div className="space-y-2">
                                    <Label htmlFor="wizard-invite-email">Email Address *</Label>
                                    <Input
                                        id="wizard-invite-email"
                                        type="email"
                                        placeholder="doctor@hospital.com"
                                        value={newInvite.email}
                                        onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                                        className="h-11 bg-slate-50"
                                        data-testid="wizard-invite-email"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wizard-invite-name">Full Name *</Label>
                                    <Input
                                        id="wizard-invite-name"
                                        placeholder="Dr. John Smith"
                                        value={newInvite.name}
                                        onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                                        className="h-11 bg-slate-50"
                                        data-testid="wizard-invite-name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wizard-invite-specialty">Specialty (Optional)</Label>
                                    <Input
                                        id="wizard-invite-specialty"
                                        placeholder="e.g., Oncology, Cardiology"
                                        value={newInvite.specialty}
                                        onChange={(e) => setNewInvite({ ...newInvite, specialty: e.target.value })}
                                        className="h-11 bg-slate-50"
                                        data-testid="wizard-invite-specialty"
                                    />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleInviteByEmail}
                                    disabled={inviting || !newInvite.email || !newInvite.name}
                                    data-testid="wizard-send-invite"
                                >
                                    {inviting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
                                    ) : (
                                        <><UserPlus className="w-4 h-4 mr-2" /> Add & Invite</>
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground text-center">
                                    An account will be created and they'll be added as a participant.
                                </p>
                            </div>
                        )}

                        {formData.participant_ids.length > 0 && (
                            <div className="pt-4 border-t">
                                <p className="text-sm font-medium mb-2">Selected Participants ({formData.participant_ids.length})</p>
                                <div className="flex flex-wrap gap-2">
                                    {formData.participant_ids.map(id => {
                                        const participant = users.find(u => u.id === id);
                                        return participant ? (
                                            <Badge key={id} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                                                {participant.name}
                                                <X 
                                                    className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive" 
                                                    onClick={() => toggleParticipant(id)}
                                                />
                                            </Badge>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6" data-testid="step-3">
                        {/* Tab buttons */}
                        <div className="flex gap-2 border-b pb-3">
                            <Button
                                variant={patientTab === 'existing' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setPatientTab('existing')}
                                data-testid="wizard-patient-tab-existing"
                            >
                                <Users className="w-4 h-4 mr-2" /> Existing Patients
                            </Button>
                            <Button
                                variant={patientTab === 'new' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setPatientTab('new')}
                                data-testid="wizard-patient-tab-new"
                            >
                                <UserPlus className="w-4 h-4 mr-2" /> Add New Patient
                            </Button>
                        </div>

                        {patientTab === 'existing' ? (
                            <>
                                <p className="text-muted-foreground">Select patients to discuss in this meeting:</p>
                                {patients.length === 0 ? (
                                    <div className="text-center py-8">
                                        <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <p className="text-muted-foreground">No patients available</p>
                                        <Button 
                                            variant="link" 
                                            className="mt-2"
                                            onClick={() => setPatientTab('new')}
                                        >
                                            Add a new patient
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                                        {patients.map((patient, idx) => (
                                            <div
                                                key={patient.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                                    formData.patient_ids.includes(patient.id)
                                                        ? 'border-primary bg-primary/5'
                                                        : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                                onClick={() => togglePatient(patient.id)}
                                                data-testid={`patient-select-${idx}`}
                                            >
                                                <Checkbox
                                                    checked={formData.patient_ids.includes(patient.id)}
                                                    onCheckedChange={() => togglePatient(patient.id)}
                                                />
                                                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-accent" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">
                                                        {patient.first_name} {patient.last_name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {patient.primary_diagnosis || patient.department_name || 'No diagnosis'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="max-w-md space-y-4">
                                <p className="text-muted-foreground">Add a new patient to discuss in this meeting:</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="patient-first-name">First Name *</Label>
                                        <Input
                                            id="patient-first-name"
                                            placeholder="John"
                                            value={newPatient.first_name}
                                            onChange={(e) => setNewPatient({ ...newPatient, first_name: e.target.value })}
                                            className="h-11 bg-slate-50"
                                            data-testid="wizard-patient-first-name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="patient-last-name">Last Name *</Label>
                                        <Input
                                            id="patient-last-name"
                                            placeholder="Doe"
                                            value={newPatient.last_name}
                                            onChange={(e) => setNewPatient({ ...newPatient, last_name: e.target.value })}
                                            className="h-11 bg-slate-50"
                                            data-testid="wizard-patient-last-name"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="patient-dob">Date of Birth</Label>
                                        <Input
                                            id="patient-dob"
                                            type="date"
                                            value={newPatient.date_of_birth}
                                            onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                                            className="h-11 bg-slate-50"
                                            data-testid="wizard-patient-dob"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="patient-gender">Gender</Label>
                                        <Select 
                                            onValueChange={(v) => setNewPatient({ ...newPatient, gender: v })} 
                                            value={newPatient.gender}
                                        >
                                            <SelectTrigger className="h-11 bg-slate-50" data-testid="wizard-patient-gender">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="male">Male</SelectItem>
                                                <SelectItem value="female">Female</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="patient-diagnosis">Primary Diagnosis</Label>
                                    <Input
                                        id="patient-diagnosis"
                                        placeholder="e.g., Lung Cancer Stage II"
                                        value={newPatient.primary_diagnosis}
                                        onChange={(e) => setNewPatient({ ...newPatient, primary_diagnosis: e.target.value })}
                                        className="h-11 bg-slate-50"
                                        data-testid="wizard-patient-diagnosis"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="patient-department">Department</Label>
                                    <Input
                                        id="patient-department"
                                        placeholder="e.g., Oncology"
                                        value={newPatient.department_name}
                                        onChange={(e) => setNewPatient({ ...newPatient, department_name: e.target.value })}
                                        className="h-11 bg-slate-50"
                                        data-testid="wizard-patient-department"
                                    />
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleAddNewPatient}
                                    disabled={addingPatient || !newPatient.first_name || !newPatient.last_name}
                                    data-testid="wizard-add-patient"
                                >
                                    {addingPatient ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
                                    ) : (
                                        <><UserPlus className="w-4 h-4 mr-2" /> Add Patient</>
                                    )}
                                </Button>
                            </div>
                        )}

                        {formData.patient_ids.length > 0 && (
                            <div className="pt-4 border-t">
                                <p className="text-sm font-medium mb-2">Selected Patients ({formData.patient_ids.length})</p>
                                <div className="flex flex-wrap gap-2">
                                    {formData.patient_ids.map(id => {
                                        const patient = patients.find(p => p.id === id);
                                        return patient ? (
                                            <Badge key={id} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                                                {patient.first_name} {patient.last_name}
                                                <X 
                                                    className="w-3 h-3 ml-1 cursor-pointer hover:text-destructive" 
                                                    onClick={() => togglePatient(id)}
                                                />
                                            </Badge>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6" data-testid="step-4">
                        <p className="text-muted-foreground">Add agenda items for the meeting:</p>
                        
                        {/* Add new agenda item */}
                        <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="agenda_title">Agenda Item Title</Label>
                                    <Input
                                        id="agenda_title"
                                        value={newAgendaItem.title}
                                        onChange={(e) => setNewAgendaItem({ ...newAgendaItem, title: e.target.value })}
                                        placeholder="e.g., Diagnosis Discussion"
                                        className="h-11 bg-white"
                                        data-testid="agenda-title-input"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duration">Duration (min)</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={newAgendaItem.estimated_duration_minutes}
                                        onChange={(e) => setNewAgendaItem({ ...newAgendaItem, estimated_duration_minutes: parseInt(e.target.value) || 15 })}
                                        className="h-11 bg-white"
                                        data-testid="agenda-duration-input"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="agenda_desc">Description (optional)</Label>
                                <Textarea
                                    id="agenda_desc"
                                    value={newAgendaItem.description}
                                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, description: e.target.value })}
                                    placeholder="Brief description of this agenda item"
                                    className="bg-white"
                                    rows={2}
                                    data-testid="agenda-desc-input"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addAgendaItem}
                                disabled={!newAgendaItem.title.trim()}
                                data-testid="add-agenda-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" /> Add Item
                            </Button>
                        </div>

                        {/* Agenda items list */}
                        {formData.agenda_items.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="font-medium">Agenda Items ({formData.agenda_items.length})</h4>
                                {formData.agenda_items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white"
                                        data-testid={`agenda-item-${index}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                                            <div>
                                                <p className="font-medium">{item.title}</p>
                                                {item.description && (
                                                    <p className="text-sm text-muted-foreground">{item.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary">{item.estimated_duration_minutes} min</Badge>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeAgendaItem(index)}
                                                className="text-muted-foreground hover:text-destructive"
                                                data-testid={`remove-agenda-${index}`}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <Layout>
            <div className="max-w-3xl mx-auto" data-testid="meeting-wizard">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/meetings')}
                    className="mb-6"
                    data-testid="back-btn"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Meetings
                </Button>

                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.id;
                            const isCompleted = currentStep > step.id;
                            return (
                                <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center gap-2">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                                isCompleted
                                                    ? 'bg-accent text-accent-foreground'
                                                    : isActive
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-slate-100 text-muted-foreground'
                                            }`}
                                        >
                                            {isCompleted ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                        </div>
                                        <span className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                                            {step.title}
                                        </span>
                                    </div>
                                    {index < STEPS.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-2 ${currentStep > step.id ? 'bg-accent' : 'bg-slate-200'}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                <Card className="border-slate-200">
                    <CardHeader>
                        <CardTitle className="text-2xl font-display">
                            Step {currentStep}: {STEPS[currentStep - 1].title}
                        </CardTitle>
                        <CardDescription>
                            {currentStep === 1 && 'Enter basic meeting information'}
                            {currentStep === 2 && 'Select doctors to participate'}
                            {currentStep === 3 && 'Choose patients to discuss'}
                            {currentStep === 4 && 'Define the meeting agenda'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {renderStep()}

                        <div className="flex justify-between mt-8 pt-6 border-t">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentStep(currentStep - 1)}
                                disabled={currentStep === 1}
                                data-testid="prev-btn"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                            </Button>
                            {currentStep < 4 ? (
                                <Button
                                    onClick={() => setCurrentStep(currentStep + 1)}
                                    disabled={!canProceed()}
                                    className="bg-primary hover:bg-primary/90"
                                    data-testid="next-btn"
                                >
                                    Next <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={loading || !canProceed()}
                                    className="bg-accent hover:bg-accent/90"
                                    data-testid="create-meeting-btn"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                                    ) : (
                                        <><Check className="w-4 h-4 mr-2" /> Create Meeting</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
