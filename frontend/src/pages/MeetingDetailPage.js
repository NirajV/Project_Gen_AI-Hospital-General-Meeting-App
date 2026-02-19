import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getMeeting, updateMeeting, deleteMeeting, uploadFile, deleteFile, createDecision, updateAgendaItem, getFileUrl, getUsers, addParticipant, removeParticipant } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
import { 
    ArrowLeft, Calendar, Clock, Video, MapPin, Users, User, FileText,
    CheckCircle2, XCircle, HelpCircle, Play, Upload, Trash2, Download,
    Plus, ExternalLink, Loader2, AlertCircle, Clipboard, UserPlus
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
    const [participantDialog, setParticipantDialog] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileType, setFileType] = useState('other');
    const [allUsers, setAllUsers] = useState([]);
    const [addingParticipant, setAddingParticipant] = useState(false);
    const [newDecision, setNewDecision] = useState({
        title: '', description: '', action_plan: '', follow_up_date: '', priority: 'medium'
    });

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

    const handleStatusChange = async (newStatus) => {
        try {
            await updateMeeting(id, { status: newStatus });
            loadMeeting();
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('file_type', fileType);
            await uploadFile(id, formData);
            loadMeeting();
            setUploadDialog(false);
            setSelectedFile(null);
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
            loadMeeting();
            // Refresh user list to update UI
            const res = await getUsers();
            setAllUsers(res.data);
        } catch (error) {
            console.error('Failed to add participant:', error);
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
                    <div>
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
                            <span className="flex items-center gap-1">
                                {meeting.meeting_type === 'video' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                {meeting.meeting_type?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {meeting.video_link && (
                            <Button variant="outline" asChild data-testid="join-btn">
                                <a href={meeting.video_link} target="_blank" rel="noopener noreferrer">
                                    <Video className="w-4 h-4 mr-2" /> Join Meeting
                                </a>
                            </Button>
                        )}
                        {isOrganizer && meeting.status === 'scheduled' && (
                            <Button className="bg-accent hover:bg-accent/90" onClick={() => handleStatusChange('in_progress')} data-testid="start-btn">
                                <Play className="w-4 h-4 mr-2" /> Start Meeting
                            </Button>
                        )}
                        {isOrganizer && meeting.status === 'in_progress' && (
                            <Button variant="outline" onClick={() => handleStatusChange('completed')} data-testid="complete-btn">
                                <CheckCircle2 className="w-4 h-4 mr-2" /> Complete
                            </Button>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-slate-100">
                        <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                        <TabsTrigger value="patients" data-testid="tab-patients">Patients ({meeting.patients?.length || 0})</TabsTrigger>
                        <TabsTrigger value="agenda" data-testid="tab-agenda">Agenda ({meeting.agenda?.length || 0})</TabsTrigger>
                        <TabsTrigger value="files" data-testid="tab-files">Files ({meeting.files?.length || 0})</TabsTrigger>
                        <TabsTrigger value="decisions" data-testid="tab-decisions">Decisions ({meeting.decisions?.length || 0})</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border-slate-200">
                                    <CardHeader>
                                        <CardTitle>Meeting Details</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {meeting.description && (
                                            <div>
                                                <Label className="text-muted-foreground">Description</Label>
                                                <p className="mt-1">{meeting.description}</p>
                                            </div>
                                        )}
                                        {meeting.location && (
                                            <div>
                                                <Label className="text-muted-foreground">Location</Label>
                                                <p className="mt-1">{meeting.location}</p>
                                            </div>
                                        )}
                                        {meeting.video_link && (
                                            <div>
                                                <Label className="text-muted-foreground">Video Link</Label>
                                                <a href={meeting.video_link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-1 text-primary hover:underline">
                                                    {meeting.video_link.slice(0, 50)}... <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>
                                        )}
                                        <div className="flex gap-4">
                                            <div>
                                                <Label className="text-muted-foreground">Recurrence</Label>
                                                <p className="mt-1 capitalize">{meeting.recurrence_type?.replace('_', ' ')}</p>
                                            </div>
                                            <div>
                                                <Label className="text-muted-foreground">Duration</Label>
                                                <p className="mt-1">{meeting.duration_minutes} minutes</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-4">
                                    <Card className="border-slate-200">
                                        <CardContent className="pt-6 text-center">
                                            <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                                            <p className="text-2xl font-display font-bold">{meeting.participants?.length || 0}</p>
                                            <p className="text-sm text-muted-foreground">Participants</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-slate-200">
                                        <CardContent className="pt-6 text-center">
                                            <User className="w-8 h-8 mx-auto mb-2 text-accent" />
                                            <p className="text-2xl font-display font-bold">{meeting.patients?.length || 0}</p>
                                            <p className="text-sm text-muted-foreground">Patients</p>
                                        </CardContent>
                                    </Card>
                                    <Card className="border-slate-200">
                                        <CardContent className="pt-6 text-center">
                                            <FileText className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                                            <p className="text-2xl font-display font-bold">{meeting.files?.length || 0}</p>
                                            <p className="text-sm text-muted-foreground">Files</p>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* Participants Sidebar */}
                            <Card className="border-slate-200">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <Users className="w-5 h-5" /> Participants
                                        </CardTitle>
                                        {isOrganizer && meeting.status !== 'completed' && (
                                            <Button variant="outline" size="sm" onClick={openParticipantDialog} data-testid="add-participant-btn">
                                                <UserPlus className="w-4 h-4 mr-1" /> Add
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {/* Organizer */}
                                    <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="w-8 h-8">
                                                <AvatarImage src={meeting.organizer?.picture} />
                                                <AvatarFallback className="text-xs bg-primary text-white">
                                                    {meeting.organizer?.name?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{meeting.organizer?.name}</p>
                                                <p className="text-xs text-muted-foreground">Organizer</p>
                                            </div>
                                        </div>
                                    </div>
                                    {meeting.participants?.filter(p => p.role !== 'organizer').map((participant, idx) => (
                                        <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 group" data-testid={`participant-${idx}`}>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="w-8 h-8">
                                                    <AvatarImage src={participant.picture} />
                                                    <AvatarFallback className="text-xs">{participant.name?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium">{participant.name}</p>
                                                    <p className="text-xs text-muted-foreground">{participant.specialty || participant.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {getResponseBadge(participant.response_status)}
                                                {isOrganizer && meeting.status !== 'completed' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="w-6 h-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleRemoveParticipant(participant.user_id)}
                                                        data-testid={`remove-participant-${idx}`}
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Patients Tab */}
                    <TabsContent value="patients" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {meeting.patients?.length === 0 ? (
                                <Card className="border-slate-200 col-span-2">
                                    <CardContent className="py-12 text-center">
                                        <User className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <p className="text-muted-foreground">No patients added to this meeting</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                meeting.patients?.map((mp, idx) => (
                                    <Card key={mp.id} className="border-slate-200" data-testid={`meeting-patient-${idx}`}>
                                        <CardContent className="pt-6">
                                            <div className="flex items-start gap-4">
                                                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                                                    <User className="w-6 h-6 text-accent" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-medium">{mp.first_name} {mp.last_name}</h3>
                                                        <Badge variant="outline" className="text-xs capitalize">{mp.status?.replace('_', ' ')}</Badge>
                                                    </div>
                                                    {mp.patient_id_number && <p className="text-xs text-muted-foreground">ID: {mp.patient_id_number}</p>}
                                                    {mp.primary_diagnosis && <p className="text-sm mt-2">{mp.primary_diagnosis}</p>}
                                                    {mp.clinical_question && (
                                                        <div className="mt-3 p-2 rounded bg-slate-50">
                                                            <p className="text-xs text-muted-foreground">Clinical Question</p>
                                                            <p className="text-sm">{mp.clinical_question}</p>
                                                        </div>
                                                    )}
                                                    <Link to={`/patients/${mp.patient_id}`}>
                                                        <Button variant="ghost" size="sm" className="mt-2">
                                                            View Full Profile
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* Agenda Tab */}
                    <TabsContent value="agenda" className="mt-6">
                        <Card className="border-slate-200">
                            <CardContent className="pt-6">
                                {meeting.agenda?.length === 0 ? (
                                    <div className="text-center py-8">
                                        <Clipboard className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                        <p className="text-muted-foreground">No agenda items</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {meeting.agenda?.map((item, idx) => (
                                            <div key={item.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                                                item.is_completed ? 'bg-green-50 border-green-200' : 'border-slate-200'
                                            }`} data-testid={`agenda-item-${idx}`}>
                                                <div className="flex items-center gap-4">
                                                    <Checkbox
                                                        checked={item.is_completed}
                                                        onCheckedChange={() => handleAgendaToggle(item.id, item.is_completed)}
                                                        disabled={meeting.status === 'completed'}
                                                    />
                                                    <div>
                                                        <p className={`font-medium ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                                            {item.title}
                                                        </p>
                                                        {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                                                        {item.assigned_to_name && <p className="text-xs text-muted-foreground mt-1">Assigned to: {item.assigned_to_name}</p>}
                                                    </div>
                                                </div>
                                                <Badge variant="outline">{item.estimated_duration_minutes} min</Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Files Tab */}
                    <TabsContent value="files" className="mt-6">
                        <div className="flex justify-end mb-4">
                            <Button onClick={() => setUploadDialog(true)} className="bg-primary hover:bg-primary/90" data-testid="upload-file-btn">
                                <Upload className="w-4 h-4 mr-2" /> Upload File
                            </Button>
                        </div>
                        {meeting.files?.length === 0 ? (
                            <Card className="border-slate-200">
                                <CardContent className="py-12 text-center">
                                    <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                    <p className="text-muted-foreground">No files uploaded yet</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {meeting.files?.map((file, idx) => (
                                    <Card key={file.id} className="border-slate-200" data-testid={`file-${idx}`}>
                                        <CardContent className="pt-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl">{getFileIcon(file.file_type)}</span>
                                                    <div>
                                                        <p className="font-medium text-sm truncate max-w-[150px]">{file.original_name}</p>
                                                        <p className="text-xs text-muted-foreground capitalize">{file.file_type?.replace('_', ' ')}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">By {file.uploader_name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <a href={getFileUrl(file.id)} target="_blank" rel="noopener noreferrer">
                                                            <Download className="w-4 h-4" />
                                                        </a>
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id)} className="text-destructive">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    {/* Decisions Tab */}
                    <TabsContent value="decisions" className="mt-6">
                        <div className="flex justify-end mb-4">
                            <Button onClick={() => setDecisionDialog(true)} className="bg-primary hover:bg-primary/90" data-testid="add-decision-btn">
                                <Plus className="w-4 h-4 mr-2" /> Add Decision
                            </Button>
                        </div>
                        {meeting.decisions?.length === 0 ? (
                            <Card className="border-slate-200">
                                <CardContent className="py-12 text-center">
                                    <Clipboard className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                    <p className="text-muted-foreground">No decisions recorded yet</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {meeting.decisions?.map((decision, idx) => (
                                    <Card key={decision.id} className="border-slate-200" data-testid={`decision-${idx}`}>
                                        <CardContent className="pt-6">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-medium">{decision.title}</h3>
                                                        <Badge variant="outline" className={`text-xs ${
                                                            decision.priority === 'high' || decision.priority === 'urgent' ? 'border-red-300 text-red-700' :
                                                            decision.priority === 'medium' ? 'border-orange-300 text-orange-700' : ''
                                                        }`}>{decision.priority}</Badge>
                                                    </div>
                                                    {decision.description && <p className="text-sm text-muted-foreground mt-1">{decision.description}</p>}
                                                    {decision.action_plan && (
                                                        <div className="mt-3 p-3 rounded bg-slate-50">
                                                            <p className="text-xs font-medium text-muted-foreground">Action Plan</p>
                                                            <p className="text-sm mt-1">{decision.action_plan}</p>
                                                        </div>
                                                    )}
                                                    {decision.follow_up_date && (
                                                        <p className="text-xs text-muted-foreground mt-2">Follow-up: {format(parseISO(decision.follow_up_date), 'MMM d, yyyy')}</p>
                                                    )}
                                                </div>
                                                <Badge className={decision.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}>
                                                    {decision.status}
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Delete Meeting Button (Organizer only) */}
                {isOrganizer && (
                    <div className="pt-8 border-t">
                        <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteDialog(true)} data-testid="delete-meeting-btn">
                            <Trash2 className="w-4 h-4 mr-2" /> Cancel Meeting
                        </Button>
                    </div>
                )}
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
                                />
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
            <Dialog open={participantDialog} onOpenChange={setParticipantDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-primary" /> Add Participants
                        </DialogTitle>
                        <DialogDescription>
                            Select doctors to invite to this meeting
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                        {getAvailableUsers().length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p>All available doctors are already participants</p>
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
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setParticipantDialog(false)}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
