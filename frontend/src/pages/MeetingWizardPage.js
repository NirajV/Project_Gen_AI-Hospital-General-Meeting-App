import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createMeeting, getUsers, getPatients, createPatient, generateStandaloneTeamsLink } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout';
import { toast } from '@/components/ui/sonner';
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
    const { user: currentUser } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);
    const [patients, setPatients] = useState([]);
    const [participantTab, setParticipantTab] = useState('existing');
    const [patientTab, setPatientTab] = useState('existing');
    const [newInvite, setNewInvite] = useState({ email: '', name: '', specialty: '', role: 'doctor' });
    const [inviting, setInviting] = useState(false);
    const EMPTY_NEW_PATIENT = {
        first_name: '',
        last_name: '',
        patient_id_number: '',
        gender: '',
        date_of_birth: '',
        phone: '',
        email: '',
        address: '',
        department_name: '',
        department_provider_name: '',
        primary_diagnosis: '',
        allergies: '',
        current_medications: '',
        notes: '',
    };
    const [newPatient, setNewPatient] = useState(EMPTY_NEW_PATIENT);
    const [addingPatient, setAddingPatient] = useState(false);
    const [generatingTeamsLink, setGeneratingTeamsLink] = useState(false);

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
        recurrence_end_date: '',
        recurrence_week_of_month: null,
        recurrence_day_of_week: null,
        recurrence_day_of_month: null,
        participant_ids: [],
        patient_ids: [],
        agenda_items: []
    });

    const [newAgendaItem, setNewAgendaItem] = useState({ 
        patient_id: '', 
        mrn: '', 
        requested_provider: '', 
        diagnosis: '', 
        reason_for_discussion: '', 
        pathology_required: false, 
        radiology_required: false, 
        treatment_plan: '' 
    });

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

    const handleGenerateTeamsLink = async () => {
        if (!formData.title || !formData.meeting_date || !formData.start_time || !formData.end_time) {
            toast.error('Enter title, date, start time and end time first.');
            return;
        }
        setGeneratingTeamsLink(true);
        try {
            const res = await generateStandaloneTeamsLink({
                title: formData.title,
                meeting_date: formData.meeting_date,
                start_time: formData.start_time,
                end_time: formData.end_time,
            });
            setFormData((prev) => ({ ...prev, video_link: res.data.teams_join_url }));
            toast.success('Teams meeting link generated.');
        } catch (err) {
            const detail = err?.response?.data?.detail || err.message;
            toast.error(typeof detail === 'string' ? detail : 'Failed to generate Teams link.');
        } finally {
            setGeneratingTeamsLink(false);
        }
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
                    role: newInvite.role || 'doctor'
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
                setNewInvite({ email: '', name: '', specialty: '', role: 'doctor' });
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
                    setNewInvite({ email: '', name: '', specialty: '', role: 'doctor' });
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
            setNewPatient(EMPTY_NEW_PATIENT);
            setPatientTab('existing');
        } catch (error) {
            console.error('Failed to create patient:', error);
        } finally {
            setAddingPatient(false);
        }
    };

    const handleAgendaPatientSelect = (patientId) => {
        const selectedPatient = patients.find(p => p.id === patientId);
        setNewAgendaItem({
            ...newAgendaItem,
            patient_id: patientId,
            mrn: selectedPatient?.patient_id_number || ''
        });
    };

    const addAgendaItem = () => {
        // Validation
        if (!newAgendaItem.patient_id) {
            alert('Please select a patient');
            return;
        }
        if (!newAgendaItem.mrn.trim()) {
            alert('Please enter MRN');
            return;
        }
        if (!newAgendaItem.requested_provider.trim()) {
            alert('Please enter Requested Provider');
            return;
        }
        if (!newAgendaItem.diagnosis.trim()) {
            alert('Please enter Diagnosis');
            return;
        }
        if (!newAgendaItem.reason_for_discussion.trim()) {
            alert('Please enter Reason for Discussion');
            return;
        }
        
        // Check for duplicate patient
        if (formData.agenda_items.some(item => item.patient_id === newAgendaItem.patient_id)) {
            alert('This patient already has an agenda item in this meeting');
            return;
        }
        
        setFormData({
            ...formData,
            agenda_items: [...formData.agenda_items, { ...newAgendaItem, order_index: formData.agenda_items.length }]
        });
        setNewAgendaItem({ 
            patient_id: '', 
            mrn: '', 
            requested_provider: '', 
            diagnosis: '', 
            reason_for_discussion: '', 
            pathology_required: false, 
            radiology_required: false, 
            treatment_plan: '' 
        });
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
                // Basic validation
                if (!formData.title || !formData.meeting_date || !formData.start_time || !formData.end_time) {
                    return false;
                }
                // Validate video link for video/hybrid meetings
                if ((formData.meeting_type === 'video' || formData.meeting_type === 'hybrid') && !formData.video_link) {
                    return false;
                }
                // Validate location for in-person/hybrid meetings
                if ((formData.meeting_type === 'in_person' || formData.meeting_type === 'hybrid') && !formData.location) {
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleSubmit = async () => {
        // Validate recurring meetings
        if (formData.recurrence_type !== 'one_time') {
            if (!formData.recurrence_end_date) {
                alert('Please select an end date for recurring meetings');
                return;
            }
            if (formData.recurrence_end_date <= formData.meeting_date) {
                alert('Recurrence end date must be after the meeting start date');
                return;
            }
            if (formData.recurrence_type === 'weekly' && !formData.recurrence_day_of_week) {
                alert('Please select a day of the week for weekly recurrence');
                return;
            }
            if (formData.recurrence_type === 'monthly' && !formData.recurrence_day_of_month) {
                alert('Please select a day of the month for monthly recurrence');
                return;
            }
            if (formData.recurrence_type === 'monthly_on' && (!formData.recurrence_week_of_month || !formData.recurrence_day_of_week)) {
                alert('Please select both week and day for advanced monthly recurrence');
                return;
            }
        }
        
        setLoading(true);
        try {
            const res = await createMeeting(formData);
            navigate(`/meetings/${res.data.id}`);
        } catch (error) {
            console.error('Failed to create meeting:', error);
            
            // Get the actual error message from backend
            let errorMessage = 'Failed to create meeting. Please try again.';
            
            if (error.response && error.response.data && error.response.data.detail) {
                errorMessage = error.response.data.detail;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
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
                                <Label htmlFor="meeting_date">Meeting Start Date *</Label>
                                <Input
                                    id="meeting_date"
                                    name="meeting_date"
                                    type="date"
                                    value={formData.meeting_date}
                                    onChange={handleChange}
                                    className="h-12 bg-slate-50"
                                    min={new Date().toISOString().split('T')[0]}
                                    max={new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0]}
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
                                        <SelectItem value="monthly_on">Monthly on...</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {formData.recurrence_type === 'monthly_on' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Week of Month</Label>
                                    <Select 
                                        onValueChange={(v) => handleSelectChange('recurrence_week_of_month', v)} 
                                        value={formData.recurrence_week_of_month || ''}
                                    >
                                        <SelectTrigger className="h-12 bg-slate-50" data-testid="week-select">
                                            <SelectValue placeholder="Select week" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="first">First</SelectItem>
                                            <SelectItem value="second">Second</SelectItem>
                                            <SelectItem value="third">Third</SelectItem>
                                            <SelectItem value="fourth">Fourth</SelectItem>
                                            <SelectItem value="last">Last</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Day of Week</Label>
                                    <Select 
                                        onValueChange={(v) => handleSelectChange('recurrence_day_of_week', v)} 
                                        value={formData.recurrence_day_of_week || ''}
                                    >
                                        <SelectTrigger className="h-12 bg-slate-50" data-testid="day-select">
                                            <SelectValue placeholder="Select day" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="monday">Monday</SelectItem>
                                            <SelectItem value="tuesday">Tuesday</SelectItem>
                                            <SelectItem value="wednesday">Wednesday</SelectItem>
                                            <SelectItem value="thursday">Thursday</SelectItem>
                                            <SelectItem value="friday">Friday</SelectItem>
                                            <SelectItem value="saturday">Saturday</SelectItem>
                                            <SelectItem value="sunday">Sunday</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                        {formData.recurrence_type === 'weekly' && (
                            <div className="space-y-2">
                                <Label>Day of Week *</Label>
                                <Select 
                                    onValueChange={(v) => handleSelectChange('recurrence_day_of_week', v)} 
                                    value={formData.recurrence_day_of_week || ''}
                                >
                                    <SelectTrigger className="h-12 bg-slate-50" data-testid="weekly-day-select">
                                        <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monday">Monday</SelectItem>
                                        <SelectItem value="tuesday">Tuesday</SelectItem>
                                        <SelectItem value="wednesday">Wednesday</SelectItem>
                                        <SelectItem value="thursday">Thursday</SelectItem>
                                        <SelectItem value="friday">Friday</SelectItem>
                                        <SelectItem value="saturday">Saturday</SelectItem>
                                        <SelectItem value="sunday">Sunday</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {formData.recurrence_type === 'monthly' && (
                            <div className="space-y-2">
                                <Label>Day of Month *</Label>
                                <Select 
                                    onValueChange={(v) => handleSelectChange('recurrence_day_of_month', parseInt(v))} 
                                    value={formData.recurrence_day_of_month?.toString() || ''}
                                >
                                    <SelectTrigger className="h-12 bg-slate-50" data-testid="monthly-day-select">
                                        <SelectValue placeholder="Select day (1-31)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                            <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        {formData.recurrence_type !== 'one_time' && (
                            <div className="space-y-2">
                                <Label htmlFor="recurrence_end_date">Recurrence End Date *</Label>
                                <Input
                                    id="recurrence_end_date"
                                    name="recurrence_end_date"
                                    type="date"
                                    value={formData.recurrence_end_date}
                                    onChange={handleChange}
                                    min={formData.meeting_date || new Date().toISOString().split('T')[0]}
                                    max={new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().split('T')[0]}
                                    className="h-12 bg-slate-50"
                                    data-testid="recurrence-end-date-input"
                                />
                                <p className="text-xs text-slate-500">When should the recurring meetings stop?</p>
                            </div>
                        )}
                        {(formData.meeting_type === 'video' || formData.meeting_type === 'hybrid') && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="video_link">Meeting Link *</Label>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={handleGenerateTeamsLink}
                                        disabled={generatingTeamsLink}
                                        data-testid="generate-teams-link-wizard-btn"
                                    >
                                        {generatingTeamsLink ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Generating…
                                            </>
                                        ) : (
                                            <>
                                                <Video className="w-4 h-4 mr-2" />
                                                Generate Teams Link
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <Input
                                    id="video_link"
                                    name="video_link"
                                    value={formData.video_link}
                                    onChange={handleChange}
                                    placeholder="https://teams.microsoft.com/... or Zoom link"
                                    className="h-12 bg-slate-50"
                                    data-testid="video-link-input"
                                />
                                <p className="text-xs text-slate-500">
                                    Click <strong>Generate Teams Link</strong> to auto-create one, or paste a Zoom / other video platform link manually.
                                </p>
                            </div>
                        )}
                        {(formData.meeting_type === 'in_person' || formData.meeting_type === 'hybrid') && (
                            <div className="space-y-2">
                                <Label htmlFor="location">Location & Room Details *</Label>
                                <Input
                                    id="location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="e.g., Conference Room A, 3rd Floor, Building 2"
                                    className="h-12 bg-slate-50"
                                    data-testid="location-input"
                                />
                                <p className="text-xs text-slate-500">
                                    Include building name, floor, and room number for easy location
                                </p>
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
                                <div className="space-y-2">
                                    <Label htmlFor="wizard-invite-role">Role *</Label>
                                    <Select
                                        value={newInvite.role}
                                        onValueChange={(value) => setNewInvite({ ...newInvite, role: value })}
                                    >
                                        <SelectTrigger id="wizard-invite-role" className="h-11 bg-slate-50" data-testid="wizard-invite-role">
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="doctor">Doctor</SelectItem>
                                            <SelectItem value="nurse">Nurse</SelectItem>
                                            <SelectItem value="organizer">Organizer</SelectItem>
                                            <SelectItem value="guest">Guest</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    className="w-full"
                                    onClick={handleInviteByEmail}
                                    disabled={inviting || !newInvite.email || !newInvite.name}
                                    data-testid="wizard-send-invite"
                                >
                                    {inviting ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending Invite...</>
                                    ) : (
                                        <><Mail className="w-4 h-4 mr-2" /> Send Invite</>
                                    )}
                                </Button>
                                <p className="text-xs text-muted-foreground text-center">
                                    ⚠️ Note: During meeting creation, participants will be added but credentials won't be emailed yet. After creating the meeting, use "Add Participant" to send them login credentials.
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
                            <div className="space-y-6">
                                <p className="text-muted-foreground">Add a new patient to discuss in this meeting:</p>

                                {/* Basic Information */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                                        Basic Information
                                    </h3>
                                    <div className="space-y-4 border-t pt-4">
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
                                                <Label htmlFor="patient-mrn">MRN (Medical Record Number) *</Label>
                                                <Input
                                                    id="patient-mrn"
                                                    placeholder="MRN123456"
                                                    value={newPatient.patient_id_number}
                                                    onChange={(e) => setNewPatient({ ...newPatient, patient_id_number: e.target.value })}
                                                    className="h-11 bg-slate-50"
                                                    data-testid="wizard-patient-mrn"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="patient-gender">Gender</Label>
                                                <Select
                                                    onValueChange={(v) => setNewPatient({ ...newPatient, gender: v })}
                                                    value={newPatient.gender}
                                                >
                                                    <SelectTrigger className="h-11 bg-slate-50" data-testid="wizard-patient-gender">
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
                                                <Label htmlFor="patient-dob">Date of Birth *</Label>
                                                <Input
                                                    id="patient-dob"
                                                    type="date"
                                                    value={newPatient.date_of_birth}
                                                    onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                                                    className="h-11 bg-slate-50"
                                                    max={new Date().toISOString().split('T')[0]}
                                                    min="1900-01-01"
                                                    data-testid="wizard-patient-dob"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="patient-phone">Phone</Label>
                                                <Input
                                                    id="patient-phone"
                                                    placeholder="+1 (555) 123-4567"
                                                    value={newPatient.phone}
                                                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                                                    className="h-11 bg-slate-50"
                                                    data-testid="wizard-patient-phone"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="patient-email">Email</Label>
                                            <Input
                                                id="patient-email"
                                                type="email"
                                                placeholder="patient@email.com"
                                                value={newPatient.email}
                                                onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                                                className="h-11 bg-slate-50"
                                                data-testid="wizard-patient-email"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="patient-address">Address</Label>
                                            <Textarea
                                                id="patient-address"
                                                placeholder="Full address"
                                                value={newPatient.address}
                                                onChange={(e) => setNewPatient({ ...newPatient, address: e.target.value })}
                                                rows={2}
                                                className="bg-slate-50"
                                                data-testid="wizard-patient-address"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Medical Information */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                                        Medical Information
                                    </h3>
                                    <div className="space-y-4 border-t pt-4">
                                        <div className="grid grid-cols-2 gap-4">
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
                                            <div className="space-y-2">
                                                <Label htmlFor="patient-provider">Provider Name</Label>
                                                <Input
                                                    id="patient-provider"
                                                    placeholder="e.g., Dr. Smith"
                                                    value={newPatient.department_provider_name}
                                                    onChange={(e) => setNewPatient({ ...newPatient, department_provider_name: e.target.value })}
                                                    className="h-11 bg-slate-50"
                                                    data-testid="wizard-patient-provider"
                                                />
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
                                            <Label htmlFor="patient-allergies">Allergies</Label>
                                            <Textarea
                                                id="patient-allergies"
                                                placeholder="List any known allergies"
                                                value={newPatient.allergies}
                                                onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                                                rows={2}
                                                className="bg-slate-50"
                                                data-testid="wizard-patient-allergies"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="patient-medications">Current Medications</Label>
                                            <Textarea
                                                id="patient-medications"
                                                placeholder="List current medications and dosages"
                                                value={newPatient.current_medications}
                                                onChange={(e) => setNewPatient({ ...newPatient, current_medications: e.target.value })}
                                                rows={2}
                                                className="bg-slate-50"
                                                data-testid="wizard-patient-medications"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="patient-notes">Notes</Label>
                                            <Textarea
                                                id="patient-notes"
                                                placeholder="Additional clinical notes"
                                                value={newPatient.notes}
                                                onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                                                rows={3}
                                                className="bg-slate-50"
                                                data-testid="wizard-patient-notes"
                                            />
                                        </div>
                                    </div>
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
                        <p className="text-muted-foreground">Add agenda items (patient cases) for the meeting:</p>
                        
                        {/* Add new agenda item */}
                        <div className="p-5 rounded-lg border-2 border-slate-200 bg-white space-y-4">
                            <h4 className="font-semibold text-slate-900">New Agenda Item</h4>
                            
                            {/* Patient Name */}
                            <div className="space-y-2">
                                <Label htmlFor="agenda_patient">Patient Name *</Label>
                                <Select 
                                    value={newAgendaItem.patient_id || ''} 
                                    onValueChange={handleAgendaPatientSelect}
                                >
                                    <SelectTrigger className="h-11 bg-slate-50" data-testid="agenda-patient-select">
                                        <SelectValue placeholder="Select a patient" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patients.filter(p => formData.patient_ids.includes(p.id)).map((patient) => (
                                            <SelectItem key={patient.id} value={patient.id}>
                                                {patient.first_name} {patient.last_name} 
                                                {patient.patient_id_number ? ` (MRN: ${patient.patient_id_number})` : ''}
                                            </SelectItem>
                                        ))}
                                        {formData.patient_ids.length === 0 && (
                                            <SelectItem value="no-patients" disabled>
                                                No patients selected yet (go to Step 3)
                                            </SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                                {formData.patient_ids.length === 0 && (
                                    <p className="text-xs text-amber-600">💡 Tip: Select patients in Step 3 first</p>
                                )}
                            </div>

                            {/* MRN */}
                            <div className="space-y-2">
                                <Label htmlFor="agenda_mrn">MRN (Medical Record Number) *</Label>
                                <Input
                                    id="agenda_mrn"
                                    value={newAgendaItem.mrn}
                                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, mrn: e.target.value })}
                                    placeholder="e.g., 12345"
                                    className="h-11 bg-slate-50"
                                    data-testid="agenda-mrn-input"
                                />
                                <p className="text-xs text-slate-500">Auto-filled if available, otherwise enter manually</p>
                            </div>

                            {/* Requested Provider — must be a meeting participant (organizer or any selected). */}
                            <div className="space-y-2">
                                <Label htmlFor="agenda_provider">Requested Provider *</Label>
                                {(() => {
                                    const providerCandidates = [];
                                    if (currentUser) {
                                        providerCandidates.push({
                                            id: currentUser.id,
                                            name: currentUser.name,
                                            specialty: currentUser.specialty,
                                            isOrganizer: true,
                                        });
                                    }
                                    formData.participant_ids.forEach((pid) => {
                                        if (currentUser && pid === currentUser.id) return;
                                        const u = users.find((x) => x.id === pid);
                                        if (u) {
                                            providerCandidates.push({
                                                id: u.id,
                                                name: u.name,
                                                specialty: u.specialty,
                                                isOrganizer: false,
                                            });
                                        }
                                    });

                                    if (providerCandidates.length === 0) {
                                        return (
                                            <div
                                                className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
                                                data-testid="wizard-no-providers-hint"
                                            >
                                                Add at least one participant in Step 2 — the Requested Provider must be a meeting participant.
                                            </div>
                                        );
                                    }

                                    return (
                                        <Select
                                            value={newAgendaItem.requested_provider}
                                            onValueChange={(value) => setNewAgendaItem({ ...newAgendaItem, requested_provider: value })}
                                        >
                                            <SelectTrigger
                                                id="agenda_provider"
                                                className="h-11 bg-slate-50"
                                                data-testid="agenda-provider-select"
                                            >
                                                <SelectValue placeholder="Select a participant" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {providerCandidates.map((p) => (
                                                    <SelectItem key={p.id} value={p.name}>
                                                        {p.name}
                                                        {p.specialty ? ` — ${p.specialty}` : ''}
                                                        {p.isOrganizer ? ' (Organizer)' : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    );
                                })()}
                                <p className="text-xs text-slate-500">Pick one of the meeting participants (organizer included).</p>
                            </div>

                            {/* Diagnosis */}
                            <div className="space-y-2">
                                <Label htmlFor="agenda_diagnosis">Diagnosis *</Label>
                                <Input
                                    id="agenda_diagnosis"
                                    value={newAgendaItem.diagnosis}
                                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, diagnosis: e.target.value })}
                                    placeholder="e.g., Lung Cancer Stage 2"
                                    className="h-11 bg-slate-50"
                                    data-testid="agenda-diagnosis-input"
                                />
                            </div>

                            {/* Reason for Discussion */}
                            <div className="space-y-2">
                                <Label htmlFor="agenda_reason">Reason For Discussion *</Label>
                                <Textarea
                                    id="agenda_reason"
                                    value={newAgendaItem.reason_for_discussion}
                                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, reason_for_discussion: e.target.value })}
                                    placeholder="Brief explanation of why this case needs discussion"
                                    className="bg-slate-50"
                                    rows={3}
                                    data-testid="agenda-reason-input"
                                />
                            </div>

                            {/* Checkboxes Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                                    <Checkbox 
                                        id="pathology_required"
                                        checked={newAgendaItem.pathology_required}
                                        onCheckedChange={(checked) => setNewAgendaItem({ ...newAgendaItem, pathology_required: checked })}
                                        data-testid="agenda-pathology-checkbox"
                                    />
                                    <Label htmlFor="pathology_required" className="text-sm font-medium cursor-pointer">
                                        Pathology Review Required *
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                                    <Checkbox 
                                        id="radiology_required"
                                        checked={newAgendaItem.radiology_required}
                                        onCheckedChange={(checked) => setNewAgendaItem({ ...newAgendaItem, radiology_required: checked })}
                                        data-testid="agenda-radiology-checkbox"
                                    />
                                    <Label htmlFor="radiology_required" className="text-sm font-medium cursor-pointer">
                                        Radiology Review Required *
                                    </Label>
                                </div>
                            </div>

                            {/* Treatment Plan (Optional initially) */}
                            <div className="space-y-2">
                                <Label htmlFor="agenda_treatment">Treatment Plan (Optional - can be added/updated during meeting)</Label>
                                <Textarea
                                    id="agenda_treatment"
                                    value={newAgendaItem.treatment_plan}
                                    onChange={(e) => setNewAgendaItem({ ...newAgendaItem, treatment_plan: e.target.value })}
                                    placeholder="Treatment plan notes (can be updated later)"
                                    className="bg-slate-50"
                                    rows={3}
                                    data-testid="agenda-treatment-input"
                                />
                            </div>

                            <Button 
                                onClick={addAgendaItem}
                                className="w-full"
                                data-testid="add-agenda-btn"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Agenda Item
                            </Button>
                        </div>

                        {/* Agenda items list */}
                        {formData.agenda_items.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="font-medium text-slate-900">Added Agenda Items ({formData.agenda_items.length})</h4>
                                {formData.agenda_items.map((item, index) => {
                                    const patient = patients.find(p => p.id === item.patient_id);
                                    return (
                                        <div
                                            key={index}
                                            className="p-4 rounded-lg border border-slate-200 bg-white space-y-2"
                                            data-testid={`agenda-item-${index}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                                                        <p className="font-semibold text-slate-900">
                                                            {patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient'}
                                                        </p>
                                                        <span className="text-sm text-slate-500">MRN: {item.mrn}</span>
                                                    </div>
                                                    <p className="text-sm"><span className="font-medium">Provider:</span> {item.requested_provider}</p>
                                                    <p className="text-sm"><span className="font-medium">Diagnosis:</span> {item.diagnosis}</p>
                                                    <p className="text-sm text-slate-600">{item.reason_for_discussion}</p>
                                                    <div className="flex gap-3 mt-2">
                                                        {item.pathology_required && (
                                                            <Badge variant="secondary" className="text-xs">✓ Pathology Required</Badge>
                                                        )}
                                                        {item.radiology_required && (
                                                            <Badge variant="secondary" className="text-xs">✓ Radiology Required</Badge>
                                                        )}
                                                    </div>
                                                </div>
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
                                    );
                                })}
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
