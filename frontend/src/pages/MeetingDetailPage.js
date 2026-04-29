import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getMeeting, updateMeeting, deleteMeeting, uploadFile, deleteFile, createDecision, updateAgendaItem, getUsers, addParticipant, removeParticipant, addPatientToMeeting, addAgendaItem, getPatients, removePatientFromMeeting, deleteAgendaItem, deleteDecision, updateTreatmentPlan, approvePatientAddition } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout';
import FilesTab from '@/components/meeting/FilesTab';
import DecisionsTab from '@/components/meeting/DecisionsTab';
import OverviewTab from '@/components/meeting/OverviewTab';
import PatientsTab from '@/components/meeting/PatientsTab';
import AgendaTab from '@/components/meeting/AgendaTab';
import UploadFileDialog from '@/components/meeting/dialogs/UploadFileDialog';
import DecisionDialog from '@/components/meeting/dialogs/DecisionDialog';
import DeleteMeetingDialog from '@/components/meeting/dialogs/DeleteMeetingDialog';
import AddParticipantDialog from '@/components/meeting/dialogs/AddParticipantDialog';
import AddPatientDialog, { EMPTY_PATIENT } from '@/components/meeting/dialogs/AddPatientDialog';
import AddAgendaDialog, { EMPTY_AGENDA } from '@/components/meeting/dialogs/AddAgendaDialog';
import EditDateTimeDialog from '@/components/meeting/dialogs/EditDateTimeDialog';
import { isTreatmentPlanEditable, getRemainingEditDays } from '@/lib/treatmentPlanUtils';
import { toast } from '@/components/ui/sonner';
import { 
    ArrowLeft, Calendar, Clock, Video, MapPin, FileText,
    CheckCircle2, XCircle, HelpCircle, Play, Trash2,
    Loader2, Edit
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function MeetingDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [uploadDialog, setUploadDialog] = useState(false);
    const [decisionDialog, setDecisionDialog] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [participantDialog, setParticipantDialog] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileType, setFileType] = useState('other');
    const [filePatientId, setFilePatientId] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [addingParticipant, setAddingParticipant] = useState(false);
    const [inviteTab, setInviteTab] = useState('existing');
    const [newInvite, setNewInvite] = useState({ email: '', name: '', specialty: '', role: 'doctor' });
    const [inviting, setInviting] = useState(false);
    const [generatingTeamsLink, setGeneratingTeamsLink] = useState(false);
    const [newDecision, setNewDecision] = useState({
        title: '', 
        description: '', 
        action_plan: '', 
        follow_up_date: '', 
        priority: 'medium',
        patient_id: '',
        meeting_patient_id: ''
    });
    const [patientDialog, setPatientDialog] = useState(false);
    const [patientTab, setPatientTab] = useState('existing'); // Tab state for patient dialog
    const [newPatient, setNewPatient] = useState({ 
        first_name: '', 
        last_name: '', 
        mrn: '', 
        gender: '',
        date_of_birth: '', 
        phone: '',
        email: '',
        address: '',
        department_name: '',
        department_provider_name: '',
        diagnosis: '',
        allergies: '',
        current_medications: '',
        notes: ''
    });
    const [creatingPatient, setCreatingPatient] = useState(false);
    const [agendaDialog, setAgendaDialog] = useState(false);
    const [allPatients, setAllPatients] = useState([]);
    const [selectedPatients, setSelectedPatients] = useState([]);
    const [addingPatients, setAddingPatients] = useState(false);
    const [newAgenda, setNewAgenda] = useState({
        patient_id: '',
        mrn: '',
        requested_provider: '',
        diagnosis: '',
        reason_for_discussion: '',
        pathology_required: false,
        radiology_required: false,
        treatment_plan: ''
    });
    const [editingTreatmentPlan, setEditingTreatmentPlan] = useState({});
    const [treatmentPlanText, setTreatmentPlanText] = useState({});
    const [addingAgenda, setAddingAgenda] = useState(false);
    
    // State for Edit Date/Time Dialog
    const [showEditDateTimeDialog, setShowEditDateTimeDialog] = useState(false);
    const [editedDate, setEditedDate] = useState('');
    const [editedStartTime, setEditedStartTime] = useState('');
    const [editedEndTime, setEditedEndTime] = useState('');
    const [isUpdatingDateTime, setIsUpdatingDateTime] = useState(false);

    useEffect(() => {
        loadMeeting();
    }, [id]);

    const loadMeeting = async () => {
        try {
            const res = await getMeeting(id);
            setMeeting(res.data);
        } catch (error) {
            console.error('Failed to load meeting:', error);
            navigate('/meetings');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteMeeting(id);
            navigate('/meetings');
        } catch (error) {
            console.error('Failed to delete meeting:', error);
        }
    };

    const handleGenerateSummary = async () => {
        setGeneratingSummary(true);
        try {
            const API_URL = process.env.REACT_APP_BACKEND_URL;
            const token = localStorage.getItem('auth_token');
            
            const response = await fetch(`${API_URL}/api/meetings/${id}/summary`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate summary');
            }
            
            // Get the PDF blob
            const blob = await response.blob();
            
            // Get filename from response header or create default
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = `Summary_${meeting.title.replace(/\s+/g, '_')}_${meeting.meeting_date}_${meeting.start_time?.slice(0, 5).replace(':', '-')}.pdf`;
            
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }
            
            // Create a download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
        } catch (error) {
            console.error('Failed to generate summary:', error);
            alert('Failed to generate meeting summary. Please try again.');
        } finally {
            setGeneratingSummary(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await updateMeeting(id, { status: newStatus });
            loadMeeting();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };
    
    const openEditDateTimeDialog = () => {
        setEditedDate(meeting.meeting_date);
        setEditedStartTime(meeting.start_time?.slice(0, 5) || '');
        setEditedEndTime(meeting.end_time?.slice(0, 5) || '');
        setShowEditDateTimeDialog(true);
    };
    
    const handleDateTimeUpdate = async () => {
        if (!editedDate || !editedStartTime) {
            alert('Please provide both date and start time');
            return;
        }
        
        setIsUpdatingDateTime(true);
        try {
            await updateMeeting(id, {
                meeting_date: editedDate,
                start_time: editedStartTime,
                end_time: editedEndTime || editedStartTime
            });
            await loadMeeting();
            setShowEditDateTimeDialog(false);
            alert('Meeting date/time updated successfully! Participants have been notified.');
        } catch (error) {
            console.error('Failed to update date/time:', error);
            alert('Failed to update meeting date/time');
        } finally {
            setIsUpdatingDateTime(false);
        }
    };

    const handleGenerateTeamsLink = async () => {
        setGeneratingTeamsLink(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/meetings/${id}/generate-teams-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to generate Teams link');
            }
            
            const data = await response.json();
            await loadMeeting(); // Reload to get updated Teams link
            alert('Teams meeting link generated successfully!');
        } catch (error) {
            console.error('Failed to generate Teams link:', error);
            alert('Failed to generate Teams meeting link. Please try again.');
        } finally {
            setGeneratingTeamsLink(false);
        }
    };


    const handleFileUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('file_type', fileType);
            if (filePatientId) {
                formData.append('patient_id', filePatientId);
            }
            await uploadFile(id, formData);
            loadMeeting();
            setUploadDialog(false);
            setSelectedFile(null);
            setFilePatientId('');
        } catch (error) {
            console.error('Failed to upload file:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteFile = async (fileId) => {
        try {
            await deleteFile(fileId);
            loadMeeting();
        } catch (error) {
            console.error('Failed to delete file:', error);
        }
    };

    const handleCreateDecision = async () => {
        try {
            await createDecision(id, newDecision);
            loadMeeting();
            setDecisionDialog(false);
            setNewDecision({ title: '', description: '', action_plan: '', follow_up_date: '', priority: 'medium' });
        } catch (error) {
            console.error('Failed to create decision:', error);
        }
    };

    const loadAllPatients = async () => {
        try {
            const res = await getPatients();
            setAllPatients(res.data);
        } catch (error) {
            console.error('Failed to load patients:', error);
        }
    };

    const handleAddPatients = async () => {
        if (selectedPatients.length === 0) return;
        setAddingPatients(true);
        try {
            for (const patientId of selectedPatients) {
                await addPatientToMeeting(id, { patient_id: patientId });
            }
            loadMeeting();
            setPatientDialog(false);
            setSelectedPatients([]);
        } catch (error) {
            console.error('Failed to add patients:', error);
        } finally {
            setAddingPatients(false);
        }
    };

    const handleCreateAndAddPatient = async () => {
        if (!newPatient.first_name || !newPatient.last_name || !newPatient.mrn || !newPatient.date_of_birth) {
            alert('Please fill in all required fields');
            return;
        }

        setCreatingPatient(true);
        try {
            // Map frontend field names to backend schema
            const patientPayload = {
                first_name: newPatient.first_name,
                last_name: newPatient.last_name,
                patient_id_number: newPatient.mrn,  // Frontend uses 'mrn', backend expects 'patient_id_number'
                gender: newPatient.gender,
                date_of_birth: newPatient.date_of_birth,
                phone: newPatient.phone,
                email: newPatient.email,
                address: newPatient.address,
                department_name: newPatient.department_name,
                department_provider_name: newPatient.department_provider_name,
                primary_diagnosis: newPatient.diagnosis,
                allergies: newPatient.allergies,
                current_medications: newPatient.current_medications,
                notes: newPatient.notes
            };

            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/patients`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(patientPayload)
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to create patient');

            await addPatientToMeeting(id, { patient_id: data.id });
            await loadMeeting();
            await loadAllPatients();

            setNewPatient({ 
                first_name: '', 
                last_name: '', 
                mrn: '', 
                gender: '',
                date_of_birth: '', 
                phone: '',
                email: '',
                address: '',
                department_name: '',
                department_provider_name: '',
                diagnosis: '',
                allergies: '',
                current_medications: '',
                notes: ''
            });
            setPatientTab('existing');
            setPatientDialog(false);
            alert(`✅ Patient "${newPatient.first_name} ${newPatient.last_name}" created and added!`);
        } catch (error) {
            console.error('Failed to create patient:', error);
            alert('Failed to create patient: ' + error.message);
        } finally {
            setCreatingPatient(false);
        }
    };

    const handleAddAgenda = async () => {
        // Validation
        if (!newAgenda.patient_id) {
            alert('Please select a patient');
            return;
        }
        if (!newAgenda.mrn.trim()) {
            alert('Please enter MRN');
            return;
        }
        if (!newAgenda.requested_provider.trim()) {
            alert('Please enter Requested Provider');
            return;
        }
        if (!newAgenda.diagnosis.trim()) {
            alert('Please enter Diagnosis');
            return;
        }
        if (!newAgenda.reason_for_discussion.trim()) {
            alert('Please enter Reason for Discussion');
            return;
        }
        
        setAddingAgenda(true);
        try {
            await addAgendaItem(id, newAgenda);
            loadMeeting();
            setAgendaDialog(false);
            setNewAgenda({
                patient_id: '',
                mrn: '',
                requested_provider: '',
                diagnosis: '',
                reason_for_discussion: '',
                pathology_required: false,
                radiology_required: false,
                treatment_plan: ''
            });
        } catch (error) {
            console.error('Failed to add agenda item:', error);
            alert(error.response?.data?.detail || 'Failed to add agenda item');
        } finally {
            setAddingAgenda(false);
        }
    };

    const handleAgendaPatientSelect = (patientId) => {
        // Find patient in meeting.patients array (not allPatients)
        const selectedPatient = meeting?.patients?.find(p => p.patient_id === patientId);
        setNewAgenda({
            ...newAgenda,
            patient_id: patientId,
            mrn: selectedPatient?.patient_id_number || '',
            requested_provider: selectedPatient?.department_provider_name || ''
        });
    };

    const handleUpdateTreatmentPlan = async (itemId) => {
        try {
            await updateTreatmentPlan(id, itemId, treatmentPlanText[itemId]);
            await loadMeeting();
            setEditingTreatmentPlan({ ...editingTreatmentPlan, [itemId]: false });
        } catch (error) {
            console.error('Failed to update treatment plan:', error);
            alert('Failed to update treatment plan');
        }
    };

    const handleRemovePatient = async (patientId) => {
        if (!window.confirm('Remove this patient from the meeting?')) return;
        try {
            await removePatientFromMeeting(id, patientId);
            loadMeeting();
        } catch (error) {
            console.error('Failed to remove patient:', error);
        }
    };

    const handleApprovePatient = async (patientId) => {
        try {
            await approvePatientAddition(id, patientId);
            toast.success('Patient approved successfully');
            loadMeeting();
        } catch (error) {
            console.error('Failed to approve patient:', error);
            toast.error('Failed to approve patient');
        }
    };

    const handleDeleteAgenda = async (itemId) => {
        if (!window.confirm('Delete this agenda item?')) return;
        try {
            await deleteAgendaItem(id, itemId);
            loadMeeting();
        } catch (error) {
            console.error('Failed to delete agenda item:', error);
        }
    };

    const handleDeleteDecision = async (decisionId) => {
        if (!window.confirm('Delete this decision? This action cannot be undone.')) return;
        try {
            await deleteDecision(id, decisionId);
            loadMeeting();
        } catch (error) {
            console.error('Failed to delete decision:', error);
        }
    };


    const handleAgendaToggle = async (itemId, isCompleted) => {
        try {
            await updateAgendaItem(id, itemId, { is_completed: !isCompleted });
            loadMeeting();
        } catch (error) {
            console.error('Failed to update agenda item:', error);
        }
    };

    const openParticipantDialog = async () => {
        try {
            const res = await getUsers();
            setAllUsers(res.data);
            setParticipantDialog(true);
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    };

    const handleAddParticipant = async (userId) => {
        setAddingParticipant(true);
        try {
            await addParticipant(id, { user_id: userId, role: 'attendee' });
            await loadMeeting();
            // Refresh user list to update UI
            const res = await getUsers();
            setAllUsers(res.data);
            alert('✅ Participant added successfully!');
        } catch (error) {
            console.error('Failed to add participant:', error);
            alert('Failed to add participant: ' + (error.response?.data?.detail || error.message));
        } finally {
            setAddingParticipant(false);
        }
    };

    const handleRemoveParticipant = async (userId) => {
        try {
            await removeParticipant(id, userId);
            loadMeeting();
        } catch (error) {
            console.error('Failed to remove participant:', error);
        }
    };

    const handleInviteByEmail = async () => {
        if (!newInvite.email || !newInvite.name) {
            alert('Please enter both email and name');
            return;
        }
        
        setInviting(true);
        try {
            // First create the user account, then add as participant
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newInvite.email,
                    name: newInvite.name,  // Backend expects 'name', not 'full_name'
                    specialty: newInvite.specialty,
                    role: newInvite.role || 'doctor',
                    meeting_id: id  // Pass meeting_id to trigger account setup email
                })
            });
            
            // Parse response once - handle potential JSON parse errors
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                throw new Error('Failed to parse server response. Please try again.');
            }
            
            if (!response.ok) {
                // Handle error responses
                throw new Error(data.detail || data.message || 'Failed to create user account');
            }
            
            // Success - add the new user as participant
            try {
                await addParticipant(id, { user_id: data.user.id, role: 'attendee' });
                await loadMeeting();
                setNewInvite({ email: '', name: '', specialty: '', role: 'doctor' });
                setInviteTab('existing');
                // Refresh user list
                const res = await getUsers();
                setAllUsers(res.data);
                alert(`✅ Successfully invited ${newInvite.name}!\nAccount setup email sent to: ${newInvite.email}\nThey can login and access the meeting details.`);
            } catch (addError) {
                throw new Error('User created but failed to add to meeting: ' + (addError.response?.data?.detail || addError.message));
            }
        } catch (error) {
            console.error('Failed to invite by email:', error);
            const errorMessage = error.message || 'Unknown error occurred';
            
            if (errorMessage.includes('already exists') || errorMessage.includes('already registered')) {
                alert('This email is already registered. Please use "Existing Doctors" tab to add them.');
            } else {
                alert('Failed to send invite: ' + errorMessage);
            }
        } finally {
            setInviting(false);
        }
    };

    const getAvailableUsers = () => {
        const participantIds = meeting?.participants?.map(p => p.user_id) || [];
        return allUsers.filter(u => !participantIds.includes(u.id));
    };

    const getStatusBadge = (status) => {
        const styles = {
            scheduled: 'bg-blue-100 text-blue-700',
            in_progress: 'bg-green-100 text-green-700',
            completed: 'bg-slate-100 text-slate-600',
            cancelled: 'bg-red-100 text-red-700'
        };
        return <Badge className={styles[status] || styles.scheduled}>{status?.replace('_', ' ')}</Badge>;
    };

    const getResponseBadge = (status) => {
        const config = {
            accepted: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            declined: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
            tentative: { icon: HelpCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
            pending: { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' }
        };
        const { icon: Icon, color, bg } = config[status] || config.pending;
        return <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${color} ${bg}`}><Icon className="w-3 h-3" />{status}</span>;
    };

    const getFileIcon = (type) => {
        const icons = { radiology: '🩻', lab: '🧪', consult_note: '📋', specialist_note: '📝', other: '📄' };
        return icons[type] || '📄';
    };

    const isOrganizer = meeting?.organizer_id === user?.id;
    // Any meeting participant — or the organizer — can start/complete the meeting.
    // Rationale: the organizer may not always attend; any clinician on the
    // case who is in the Teams call should be able to mark it completed when
    // the call ends.
    const userParticipant = meeting?.participants?.find((p) => p.user_id === user?.id);
    const canControlMeeting = isOrganizer || Boolean(userParticipant);

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    if (!meeting) return null;

    return (
        <Layout>
            <div className="space-y-6" data-testid="meeting-detail">
                <Button variant="ghost" onClick={() => navigate('/meetings')} className="mb-2" data-testid="back-btn">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Meetings
                </Button>

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
                                {meeting.title}
                            </h1>
                            {getStatusBadge(meeting.status)}
                        </div>
                        <div className="flex items-center gap-4 text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(parseISO(meeting.meeting_date), 'EEEE, MMMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {meeting.start_time?.slice(0, 5)} - {meeting.end_time?.slice(0, 5)}
                            </span>
                            {isOrganizer && meeting.status === 'scheduled' && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={openEditDateTimeDialog}
                                    className="h-7 text-xs"
                                >
                                    <Edit className="w-3 h-3 mr-1" />
                                    Edit Time
                                </Button>
                            )}
                            <span className="flex items-center gap-1">
                                {meeting.meeting_type === 'video' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                {meeting.meeting_type?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {/* Single Join button — prefers Teams link over manual video link */}
                        {(meeting.teams_join_url || meeting.video_link) && (
                            <Button
                                variant="default"
                                asChild
                                className="bg-[#464EB8] hover:bg-[#464EB8]/90"
                                data-testid="join-meeting-btn"
                            >
                                <a
                                    href={meeting.teams_join_url || meeting.video_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Video className="w-4 h-4 mr-2" />
                                    {meeting.teams_join_url ? 'Join Teams Meeting' : 'Join Meeting'}
                                </a>
                            </Button>
                        )}
                        {/* Generate Teams Link — only when no link exists yet and meeting isn't completed */}
                        {!meeting.teams_join_url && !meeting.video_link && meeting.status !== 'completed' && (
                            <Button
                                variant="outline"
                                onClick={handleGenerateTeamsLink}
                                disabled={generatingTeamsLink}
                                data-testid="generate-teams-btn"
                            >
                                {generatingTeamsLink ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...
                                    </>
                                ) : (
                                    <>
                                        <Video className="w-4 h-4 mr-2" /> Generate Teams Link
                                    </>
                                )}
                            </Button>
                        )}
                        {canControlMeeting && meeting.status === 'scheduled' && (
                            <Button className="bg-accent hover:bg-accent/90" onClick={() => handleStatusChange('in_progress')} data-testid="start-btn">
                                <Play className="w-4 h-4 mr-2" /> Start Meeting
                            </Button>
                        )}
                        {canControlMeeting && meeting.status === 'in_progress' && (
                            <Button variant="outline" onClick={() => handleStatusChange('completed')} data-testid="complete-btn">
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-transparent border-0 p-0 gap-2">
                        <TabsTrigger 
                            value="overview" 
                            data-testid="tab-overview"
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={{
                                backgroundColor: activeTab === 'overview' ? '#0b0b30' : '#e8e8f5',
                                color: activeTab === 'overview' ? '#ffffff' : '#0b0b30',
                            }}
                        >
                            Overview
                        </TabsTrigger>
                        <TabsTrigger 
                            value="patients" 
                            data-testid="tab-patients"
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={{
                                backgroundColor: activeTab === 'patients' ? '#694e20' : '#f5f0e8',
                                color: activeTab === 'patients' ? '#ffffff' : '#694e20',
                            }}
                        >
                            Patients ({meeting.patients?.length || 0})
                            {isOrganizer && meeting.patients?.some(p => p.approval_status === 'pending') && (
                                <Badge className="ml-2 bg-amber-500 text-white text-xs">
                                    {meeting.patients.filter(p => p.approval_status === 'pending').length} Pending
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger 
                            value="agenda" 
                            data-testid="tab-agenda"
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={{
                                backgroundColor: activeTab === 'agenda' ? '#3b6658' : '#e8f5f0',
                                color: activeTab === 'agenda' ? '#ffffff' : '#3b6658',
                            }}
                        >
                            Agenda ({meeting.agenda?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger 
                            value="files" 
                            data-testid="tab-files"
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={{
                                backgroundColor: activeTab === 'files' ? '#68517d' : '#f3edf5',
                                color: activeTab === 'files' ? '#ffffff' : '#68517d',
                            }}
                        >
                            Files ({meeting.files?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger 
                            value="decisions" 
                            data-testid="tab-decisions"
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={{
                                backgroundColor: activeTab === 'decisions' ? '#3b6658' : '#e8f5f0',
                                color: activeTab === 'decisions' ? '#ffffff' : '#3b6658',
                            }}
                        >
                            Decisions ({meeting.decisions?.length || 0})
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="mt-6">
                        <OverviewTab
                            meeting={meeting}
                            isOrganizer={isOrganizer}
                            onAddParticipantClick={openParticipantDialog}
                            onRemoveParticipant={handleRemoveParticipant}
                            getResponseBadge={getResponseBadge}
                        />
                    </TabsContent>

                    {/* Patients Tab */}
                    <TabsContent value="patients" className="mt-6">
                        <PatientsTab
                            meeting={meeting}
                            isOrganizer={isOrganizer}
                            onAddPatientClick={() => { loadAllPatients(); setPatientDialog(true); }}
                            onRemovePatient={handleRemovePatient}
                            onApprovePatient={handleApprovePatient}
                        />
                    </TabsContent>

                    {/* Agenda Tab */}
                    <TabsContent value="agenda" className="mt-6">
                        <AgendaTab
                            meeting={meeting}
                            isOrganizer={isOrganizer}
                            onAddClick={() => setAgendaDialog(true)}
                            onDeleteAgenda={handleDeleteAgenda}
                            editingTreatmentPlan={editingTreatmentPlan}
                            setEditingTreatmentPlan={setEditingTreatmentPlan}
                            treatmentPlanText={treatmentPlanText}
                            setTreatmentPlanText={setTreatmentPlanText}
                            onSaveTreatmentPlan={handleUpdateTreatmentPlan}
                        />
                    </TabsContent>

                    {/* Files Tab */}
                    <TabsContent value="files" className="mt-6">
                        <FilesTab
                            meeting={meeting}
                            onUploadClick={() => setUploadDialog(true)}
                            onDeleteFile={handleDeleteFile}
                            getFileIcon={getFileIcon}
                        />
                    </TabsContent>

                    {/* Decisions Tab */}
                    <TabsContent value="decisions" className="mt-6">
                        <DecisionsTab
                            meeting={meeting}
                            isOrganizer={isOrganizer}
                            onAddClick={() => setDecisionDialog(true)}
                            onDeleteDecision={handleDeleteDecision}
                        />
                    </TabsContent>
                </Tabs>

                {/* Action Buttons Section */}
                <div className="pt-8 border-t space-y-4">
                    {/* Generate Summary Button - Available to all participants */}
                    <Button 
                        variant="outline" 
                        className="w-full sm:w-auto font-semibold transition-all duration-200 border-2"
                        style={{ 
                            backgroundColor: '#e8f5f0', 
                            borderColor: '#3b6658',
                            color: '#3b6658'
                        }}
                        onClick={handleGenerateSummary}
                        disabled={generatingSummary}
                        data-testid="generate-summary-btn"
                    >
                        {generatingSummary ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating PDF...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4 mr-2" />
                                Generate Meeting Summary (PDF)
                            </>
                        )}
                    </Button>

                    {/* Delete Meeting Button (Organizer only) */}
                    {isOrganizer && (
                        <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 w-full sm:w-auto" onClick={() => setDeleteDialog(true)} data-testid="delete-meeting-btn">
                            <Trash2 className="w-4 h-4 mr-2" /> Cancel Meeting
                        </Button>
                    )}
                </div>
            </div>

            <UploadFileDialog
                open={uploadDialog}
                onOpenChange={setUploadDialog}
                meetingPatients={meeting?.patients || []}
                filePatientId={filePatientId}
                setFilePatientId={setFilePatientId}
                fileType={fileType}
                setFileType={setFileType}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                uploading={uploading}
                onUpload={handleFileUpload}
            />

            <DecisionDialog
                open={decisionDialog}
                onOpenChange={setDecisionDialog}
                meetingPatients={meeting?.patients || []}
                newDecision={newDecision}
                setNewDecision={setNewDecision}
                onCreate={handleCreateDecision}
            />

            <DeleteMeetingDialog
                open={deleteDialog}
                onOpenChange={setDeleteDialog}
                onConfirm={handleDelete}
            />

            <AddParticipantDialog
                open={participantDialog}
                onOpenChange={(open) => {
                    setParticipantDialog(open);
                    if (!open) {
                        setInviteTab('existing');
                        setNewInvite({ email: '', name: '', specialty: '', role: 'doctor' });
                    }
                }}
                inviteTab={inviteTab}
                setInviteTab={setInviteTab}
                newInvite={newInvite}
                setNewInvite={setNewInvite}
                availableUsers={getAvailableUsers()}
                addingParticipant={addingParticipant}
                onAddUser={handleAddParticipant}
                inviting={inviting}
                onInviteByEmail={handleInviteByEmail}
            />

            <AddPatientDialog
                open={patientDialog}
                onOpenChange={(open) => {
                    setPatientDialog(open);
                    if (!open) {
                        setPatientTab('existing');
                        setNewPatient({ ...EMPTY_PATIENT });
                        setSelectedPatients([]);
                    }
                }}
                patientTab={patientTab}
                setPatientTab={setPatientTab}
                allPatients={allPatients}
                meetingPatients={meeting?.patients || []}
                selectedPatients={selectedPatients}
                setSelectedPatients={setSelectedPatients}
                addingPatients={addingPatients}
                onAddPatients={handleAddPatients}
                newPatient={newPatient}
                setNewPatient={setNewPatient}
                creatingPatient={creatingPatient}
                onCreateAndAdd={handleCreateAndAddPatient}
            />

            <AddAgendaDialog
                open={agendaDialog}
                onOpenChange={setAgendaDialog}
                meetingPatients={meeting?.patients || []}
                meetingParticipants={meeting?.participants || []}
                newAgenda={newAgenda}
                setNewAgenda={setNewAgenda}
                onPatientSelect={handleAgendaPatientSelect}
                addingAgenda={addingAgenda}
                onAdd={handleAddAgenda}
                onAddParticipantClick={() => {
                    setAgendaDialog(false);
                    openParticipantDialog();
                }}
            />

            <EditDateTimeDialog
                open={showEditDateTimeDialog}
                onOpenChange={setShowEditDateTimeDialog}
                editedDate={editedDate}
                setEditedDate={setEditedDate}
                editedStartTime={editedStartTime}
                setEditedStartTime={setEditedStartTime}
                editedEndTime={editedEndTime}
                setEditedEndTime={setEditedEndTime}
                isUpdatingDateTime={isUpdatingDateTime}
                onUpdate={handleDateTimeUpdate}
            />
        </Layout>
    );
}
