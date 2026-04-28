import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getMeeting, updateMeeting, deleteMeeting, uploadFile, deleteFile, createDecision, updateAgendaItem, getFileUrl, getUsers, addParticipant, removeParticipant, addPatientToMeeting, addAgendaItem, getPatients, removePatientFromMeeting, deleteAgendaItem, deleteDecision, updateTreatmentPlan, approvePatientAddition } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import Layout from '@/components/Layout';
import FilesTab from '@/components/meeting/FilesTab';
import DecisionsTab from '@/components/meeting/DecisionsTab';
import OverviewTab from '@/components/meeting/OverviewTab';
import PatientsTab from '@/components/meeting/PatientsTab';
import AgendaTab from '@/components/meeting/AgendaTab';
import { isTreatmentPlanEditable, getRemainingEditDays } from '@/lib/treatmentPlanUtils';
import { toast } from '@/components/ui/sonner';
import { 
    ArrowLeft, Calendar, Clock, Video, MapPin, Users, User, FileText,
    CheckCircle2, XCircle, HelpCircle, Play, Upload, Trash2, Download,
    Plus, ExternalLink, Loader2, AlertCircle, Clipboard, UserPlus, Mail, Edit, Check
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
    // Any accepted participant — or the organizer — can start/complete the meeting.
    // Rationale: organizer may not attend every session.
    const userParticipant = meeting?.participants?.find((p) => p.user_id === user?.id);
    const canControlMeeting =
        isOrganizer ||
        userParticipant?.response_status === 'accepted' ||
        userParticipant?.role === 'organizer';

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

            {/* Upload Dialog */}
            <Dialog open={uploadDialog} onOpenChange={setUploadDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload File</DialogTitle>
                        <DialogDescription>Upload a document for this meeting</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Patient (Optional)</Label>
                            <Select value={filePatientId || 'none'} onValueChange={(v) => setFilePatientId(v === 'none' ? '' : v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Link to a patient (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None - General file</SelectItem>
                                    {meeting?.patients?.map((patient) => (
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
                            <Input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} data-testid="file-input" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setUploadDialog(false)}>Cancel</Button>
                        <Button onClick={handleFileUpload} disabled={!selectedFile || uploading} data-testid="confirm-upload-btn">
                            {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Upload
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Decision Dialog */}
            <Dialog open={decisionDialog} onOpenChange={setDecisionDialog}>
                <DialogContent>
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
                                    {meeting?.patients?.map((patient) => (
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
                                />
                                <p className="text-xs text-slate-500">Must be a future date</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDecisionDialog(false)}>Cancel</Button>
                        <Button onClick={handleCreateDecision} disabled={!newDecision.title} data-testid="confirm-decision-btn">
                            <Plus className="w-4 h-4 mr-2" /> Add Decision
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" /> Cancel Meeting
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to cancel this meeting? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialog(false)}>Keep Meeting</Button>
                        <Button variant="destructive" onClick={handleDelete} data-testid="confirm-delete-btn">
                            Cancel Meeting
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Participant Dialog */}
            <Dialog open={participantDialog} onOpenChange={(open) => {
                setParticipantDialog(open);
                if (!open) {
                    setInviteTab('existing');
                    setNewInvite({ email: '', name: '', specialty: '', role: 'doctor' });
                }
            }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" /> Add Participants
                        </DialogTitle>
                        <DialogDescription>
                            Select existing doctors or invite someone new
                        </DialogDescription>
                    </DialogHeader>
                    
                    {/* Tab buttons */}
                    <div className="flex gap-2 border-b pb-3">
                        <Button
                            variant={inviteTab === 'existing' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setInviteTab('existing')}
                            data-testid="tab-existing"
                        >
                            <Users className="w-4 h-4 mr-2" /> Existing Doctors
                        </Button>
                        <Button
                            variant={inviteTab === 'invite' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setInviteTab('invite')}
                            data-testid="tab-invite-new"
                        >
                            <Mail className="w-4 h-4 mr-2" /> Invite by Email
                        </Button>
                    </div>

                    {inviteTab === 'existing' ? (
                        <div className="max-h-72 overflow-y-auto space-y-2">
                            {getAvailableUsers().length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>All available doctors are already participants</p>
                                    <Button 
                                        variant="link" 
                                        className="mt-2"
                                        onClick={() => setInviteTab('invite')}
                                    >
                                        Invite someone new instead
                                    </Button>
                                </div>
                            ) : (
                                getAvailableUsers().map((availableUser, idx) => (
                                    <div
                                        key={availableUser.id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary/30 hover:bg-slate-50 transition-all"
                                        data-testid={`available-user-${idx}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-10 h-10">
                                                <AvatarImage src={availableUser.picture} />
                                                <AvatarFallback className="bg-primary/10 text-primary">
                                                    {availableUser.name?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{availableUser.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {availableUser.specialty || availableUser.email}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddParticipant(availableUser.id)}
                                            disabled={addingParticipant}
                                            data-testid={`add-user-${idx}`}
                                        >
                                            {addingParticipant ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4 mr-1" /> Add
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="invite-email">Email Address *</Label>
                                <Input
                                    id="invite-email"
                                    type="email"
                                    placeholder="doctor@hospital.com"
                                    value={newInvite.email}
                                    onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
                                    data-testid="invite-email-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-name">Full Name *</Label>
                                <Input
                                    id="invite-name"
                                    placeholder="Dr. John Smith"
                                    value={newInvite.name}
                                    onChange={(e) => setNewInvite({ ...newInvite, name: e.target.value })}
                                    data-testid="invite-name-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-specialty">Specialty (Optional)</Label>
                                <Input
                                    id="invite-specialty"
                                    placeholder="e.g., Oncology, Cardiology"
                                    value={newInvite.specialty}
                                    onChange={(e) => setNewInvite({ ...newInvite, specialty: e.target.value })}
                                    data-testid="invite-specialty-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="invite-role">Role *</Label>
                                <Select
                                    value={newInvite.role}
                                    onValueChange={(value) => setNewInvite({ ...newInvite, role: value })}
                                >
                                    <SelectTrigger id="invite-role" data-testid="invite-role-select">
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
                                data-testid="send-invite-btn"
                            >
                                {inviting ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending Invite...</>
                                ) : (
                                    <><Mail className="w-4 h-4 mr-2" /> Send Invite</>
                                )}
                            </Button>
                            <p className="text-xs text-muted-foreground text-center">
                                An account will be created and login credentials will be emailed to the invited person.
                            </p>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setParticipantDialog(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Patient Dialog */}
            <Dialog open={patientDialog} onOpenChange={(open) => {
                setPatientDialog(open);
                if (!open) {
                    setPatientTab('existing');
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
                    setSelectedPatients([]);
                }
            }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" /> Add Patients to Meeting
                        </DialogTitle>
                        <DialogDescription>
                            Select existing patients or create a new patient
                        </DialogDescription>
                    </DialogHeader>
                    
                    {/* Tab Buttons */}
                    <div className="flex gap-2 border-b pb-3">
                        <Button
                            variant={patientTab === 'existing' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPatientTab('existing')}
                        >
                            <Users className="w-4 h-4 mr-2" /> Existing Patients
                        </Button>
                        <Button
                            variant={patientTab === 'create' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPatientTab('create')}
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
                                    allPatients
                                        .filter(p => !meeting?.patients?.some(mp => mp.patient_id === p.id))
                                        .map((patient) => (
                                            <div
                                                key={patient.id}
                                                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-primary/30 hover:bg-slate-50 cursor-pointer"
                                                onClick={() => {
                                                    const isSelected = selectedPatients.includes(patient.id);
                                                    if (isSelected) {
                                                        setSelectedPatients(selectedPatients.filter(id => id !== patient.id));
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
                                                                setSelectedPatients(selectedPatients.filter(id => id !== patient.id));
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
                            {allPatients.filter(p => !meeting?.patients?.some(mp => mp.patient_id === p.id)).length > 0 && selectedPatients.length === 0 && (
                                <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    💡 Click on a patient row or checkbox to select patients to add
                                </div>
                            )}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => {
                                    setPatientDialog(false);
                                    setSelectedPatients([]);
                                }}>
                                    Cancel
                                </Button>
                                <Button 
                                    onClick={handleAddPatients}
                                    disabled={selectedPatients.length === 0 || addingPatients}
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
                            {/* Basic Information Section */}
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

                            {/* Medical Information Section */}
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
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleCreateAndAddPatient}
                                    disabled={!newPatient.first_name || !newPatient.last_name || !newPatient.mrn || !newPatient.date_of_birth || creatingPatient}
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

            {/* Add Agenda Item Dialog */}
            <Dialog open={agendaDialog} onOpenChange={setAgendaDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clipboard className="w-5 h-5 text-primary" /> Add Agenda Item (Patient Case)
                        </DialogTitle>
                        <DialogDescription>
                            Add a new patient case to the meeting agenda with all required medical information
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {/* Patient Name */}
                        <div className="space-y-2">
                            <Label htmlFor="agenda-patient">Patient Name *</Label>
                            <Select 
                                value={newAgenda.patient_id || ''} 
                                onValueChange={handleAgendaPatientSelect}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a patient" />
                                </SelectTrigger>
                                <SelectContent>
                                    {meeting?.patients?.map((mp) => (
                                        <SelectItem key={mp.patient_id} value={mp.patient_id}>
                                            {mp.first_name} {mp.last_name} 
                                            {mp.patient_id_number ? ` (MRN: ${mp.patient_id_number})` : ''}
                                        </SelectItem>
                                    ))}
                                    {(!meeting?.patients || meeting.patients.length === 0) && (
                                        <SelectItem value="no-patients" disabled>
                                            No patients in this meeting
                                        </SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* MRN */}
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

                        {/* Requested Provider */}
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
                                    {meeting?.participants?.filter(p => p.role !== 'organizer').length === 0 ? (
                                        <SelectItem value="no-participants" disabled>
                                            No participants in this meeting
                                        </SelectItem>
                                    ) : (
                                        meeting?.participants?.filter(p => p.role !== 'organizer').map((participant) => (
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

                        {/* Diagnosis */}
                        <div className="space-y-2">
                            <Label htmlFor="agenda-diagnosis">Diagnosis *</Label>
                            <Input
                                id="agenda-diagnosis"
                                value={newAgenda.diagnosis}
                                onChange={(e) => setNewAgenda({ ...newAgenda, diagnosis: e.target.value })}
                                placeholder="e.g., Lung Cancer Stage 2"
                            />
                        </div>

                        {/* Reason for Discussion */}
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

                        {/* Checkboxes Row */}
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

                        {/* Treatment Plan (Optional) */}
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
                        <Button variant="outline" onClick={() => {
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
                        }}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleAddAgenda}
                            disabled={addingAgenda}
                        >
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
            
            {/* Edit Date/Time Dialog */}
            <Dialog open={showEditDateTimeDialog} onOpenChange={setShowEditDateTimeDialog}>
                <DialogContent>
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
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-end-time">End Time</Label>
                                <Input
                                    id="edit-end-time"
                                    type="time"
                                    value={editedEndTime}
                                    onChange={(e) => setEditedEndTime(e.target.value)}
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
                        <Button variant="outline" onClick={() => setShowEditDateTimeDialog(false)}>
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleDateTimeUpdate}
                            disabled={isUpdatingDateTime || !editedDate || !editedStartTime}
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
        </Layout>
    );
}
