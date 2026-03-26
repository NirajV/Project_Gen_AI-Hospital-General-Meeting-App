import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPatient, updatePatient, getFileUrl } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import Layout from '@/components/Layout';
import { 
    ArrowLeft, User, Calendar, Building, FileText, Phone, Mail, MapPin,
    Heart, Pill, AlertTriangle, Edit, Save, Loader2, Video, Clock, Download
} from 'lucide-react';
import { format, parseISO, differenceInYears } from 'date-fns';

export default function PatientDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editDialog, setEditDialog] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [saving, setSaving] = useState(false);
    const [editForm, setEditForm] = useState({});

    useEffect(() => {
        loadPatient();
    }, [id]);

    const loadPatient = async () => {
        try {
            const res = await getPatient(id);
            setPatient(res.data);
            setEditForm(res.data);
        } catch (error) {
            console.error('Failed to load patient:', error);
            navigate('/patients');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = async () => {
        setSaving(true);
        try {
            await updatePatient(id, editForm);
            loadPatient();
            setEditDialog(false);
        } catch (error) {
            console.error('Failed to update patient:', error);
        } finally {
            setSaving(false);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        return differenceInYears(new Date(), parseISO(dob));
    };

    const getFileIcon = (type) => {
        const icons = { radiology: '🩻', lab: '🧪', consult_note: '📋', specialist_note: '📝', other: '📄' };
        return icons[type] || '📄';
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
            </Layout>
        );
    }

    if (!patient) return null;

    return (
        <Layout>
            <div className="space-y-6" data-testid="patient-detail">
                <Button variant="ghost" onClick={() => navigate('/patients')} className="mb-2" data-testid="back-btn">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Patients
                </Button>

                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
                                {patient.first_name} {patient.last_name}
                            </h1>
                            <div className="flex items-center gap-4 mt-1 text-muted-foreground">
                                {patient.patient_id_number && <span>ID: {patient.patient_id_number}</span>}
                                <span>{calculateAge(patient.date_of_birth)} years old</span>
                                {patient.gender && <Badge variant="outline" className="capitalize">{patient.gender}</Badge>}
                            </div>
                        </div>
                    </div>
                    <Button variant="outline" onClick={() => setEditDialog(true)} data-testid="edit-btn">
                        <Edit className="w-4 h-4 mr-2" /> Edit Profile
                    </Button>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-transparent border-0 p-0 gap-2">
                        <TabsTrigger 
                            value="overview" 
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={{
                                backgroundColor: activeTab === 'overview' ? '#694e20' : '#f5f0e8',
                                color: activeTab === 'overview' ? '#ffffff' : '#694e20',
                            }}
                        >
                            Overview
                        </TabsTrigger>
                        <TabsTrigger 
                            value="meetings" 
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={{
                                backgroundColor: activeTab === 'meetings' ? '#3b6658' : '#e8f5f0',
                                color: activeTab === 'meetings' ? '#ffffff' : '#3b6658',
                            }}
                        >
                            Meetings ({patient.meetings?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger 
                            value="files" 
                            className="data-[state=active]:shadow-md transition-all duration-200 font-semibold"
                            style={{
                                backgroundColor: activeTab === 'files' ? '#68517d' : '#f3edf5',
                                color: activeTab === 'files' ? '#ffffff' : '#68517d',
                            }}
                        >
                            Files ({patient.files?.length || 0})
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Contact Info - Teal */}
                            <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#e8f5f0' }}>
                                <CardHeader>
                                    <CardTitle className="text-lg" style={{ color: '#3b6658' }}>Contact Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {patient.phone && (
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-4 h-4" style={{ color: '#3b6658' }} />
                                            <span style={{ color: '#3b6658' }}>{patient.phone}</span>
                                        </div>
                                    )}
                                    {patient.email && (
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-4 h-4" style={{ color: '#3b6658' }} />
                                            <span style={{ color: '#3b6658' }}>{patient.email}</span>
                                        </div>
                                    )}
                                    {patient.address && (
                                        <div className="flex items-start gap-3">
                                            <MapPin className="w-4 h-4 mt-1" style={{ color: '#3b6658' }} />
                                            <span style={{ color: '#3b6658' }}>{patient.address}</span>
                                        </div>
                                    )}
                                    {patient.date_of_birth && (
                                        <div className="flex items-center gap-3">
                                            <Calendar className="w-4 h-4" style={{ color: '#3b6658' }} />
                                            <span style={{ color: '#3b6658' }}>{format(parseISO(patient.date_of_birth), 'MMMM d, yyyy')}</span>
                                        </div>
                                    )}
                                    {!patient.phone && !patient.email && !patient.address && (
                                        <p className="text-sm" style={{ color: '#3b6658', opacity: 0.7 }}>No contact information</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Department Info - Amber */}
                            <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#f5f0e8' }}>
                                <CardHeader>
                                    <CardTitle className="text-lg" style={{ color: '#694e20' }}>Department</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {patient.department_name && (
                                        <div className="flex items-center gap-3">
                                            <Building className="w-4 h-4" style={{ color: '#694e20' }} />
                                            <span style={{ color: '#694e20' }}>{patient.department_name}</span>
                                        </div>
                                    )}
                                    {patient.department_provider_name && (
                                        <div className="flex items-center gap-3">
                                            <User className="w-4 h-4" style={{ color: '#694e20' }} />
                                            <span style={{ color: '#694e20' }}>{patient.department_provider_name}</span>
                                        </div>
                                    )}
                                    {!patient.department_name && !patient.department_provider_name && (
                                        <p className="text-sm" style={{ color: '#694e20', opacity: 0.7 }}>No department assigned</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Quick Stats - Purple */}
                            <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#f3edf5' }}>
                                <CardHeader>
                                    <CardTitle className="text-lg" style={{ color: '#68517d' }}>Quick Stats</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#68517d20' }}>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" style={{ color: '#68517d' }} />
                                            <span className="text-sm font-semibold" style={{ color: '#68517d' }}>Meetings</span>
                                        </div>
                                        <span className="text-lg font-bold" style={{ color: '#68517d' }}>{patient.meetings?.length || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#68517d20' }}>
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4" style={{ color: '#68517d' }} />
                                            <span className="text-sm font-semibold" style={{ color: '#68517d' }}>Documents</span>
                                        </div>
                                        <span className="text-lg font-bold" style={{ color: '#68517d' }}>{patient.files?.length || 0}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Medical Info - Full Width - Blue */}
                            <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 lg:col-span-3" style={{ backgroundColor: '#e8e8f5' }}>
                                <CardHeader>
                                    <CardTitle className="text-lg" style={{ color: '#0b0b30' }}>Medical Information</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Heart className="w-4 h-4 text-red-500" />
                                                <Label style={{ color: '#0b0b30', opacity: 0.7 }}>Primary Diagnosis</Label>
                                            </div>
                                            <p className="text-sm font-semibold" style={{ color: '#0b0b30' }}>{patient.primary_diagnosis || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <AlertTriangle className="w-4 h-4 text-orange-500" />
                                                <Label style={{ color: '#0b0b30', opacity: 0.7 }}>Allergies</Label>
                                            </div>
                                            <p className="text-sm font-semibold" style={{ color: '#0b0b30' }}>{patient.allergies || 'None recorded'}</p>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <Pill className="w-4 h-4 text-blue-500" />
                                                <Label style={{ color: '#0b0b30', opacity: 0.7 }}>Current Medications</Label>
                                            </div>
                                            <p className="text-sm font-semibold" style={{ color: '#0b0b30' }}>{patient.current_medications || 'None recorded'}</p>
                                        </div>
                                    </div>
                                    {patient.notes && (
                                        <div className="mt-6 pt-6" style={{ borderTop: '1px solid #0b0b3030' }}>
                                            <Label style={{ color: '#0b0b30', opacity: 0.7 }}>Additional Notes</Label>
                                            <p className="text-sm mt-2" style={{ color: '#0b0b30' }}>{patient.notes}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Meetings Tab */}
                    <TabsContent value="meetings" className="mt-6">
                        {patient.meetings?.length === 0 ? (
                            <Card className="border-slate-200">
                                <CardContent className="py-12 text-center">
                                    <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                    <p className="text-muted-foreground">No meetings found for this patient</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-8 p-4 bg-white">
                                {patient.meetings?.map((meeting, idx) => {
                                    // Rotating colors for meeting cards
                                    const cardColors = [
                                        { light: '#e8f5f0', dark: '#3b6658' }, // Teal
                                        { light: '#f5f0e8', dark: '#694e20' }, // Amber
                                        { light: '#f3edf5', dark: '#68517d' }, // Purple
                                        { light: '#e8e8f5', dark: '#0b0b30' }, // Blue
                                    ];
                                    const colors = cardColors[idx % cardColors.length];
                                    
                                    return (
                                        <Link key={meeting.id} to={`/meetings/${meeting.id}`}>
                                            <div className="flex items-center justify-between p-4 rounded-lg border-0 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.01] transition-all duration-300 bg-white" style={{ backgroundColor: colors.light }} data-testid={`patient-meeting-${idx}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: colors.dark }}>
                                                        {meeting.meeting_type === 'video' ? (
                                                            <Video className="w-5 h-5 text-white" />
                                                        ) : (
                                                            <MapPin className="w-5 h-5 text-white" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold" style={{ color: colors.dark }}>{meeting.title}</h3>
                                                        <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: colors.dark, opacity: 0.7 }}>
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {format(parseISO(meeting.meeting_date), 'MMM d, yyyy')}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3.5 h-3.5" />
                                                                {meeting.start_time?.slice(0, 5)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {meeting.case_status && (
                                                        <Badge variant="outline" className="capitalize" style={{ borderColor: colors.dark, color: colors.dark }}>{meeting.case_status.replace('_', ' ')}</Badge>
                                                    )}
                                                    <Badge className={meeting.status === 'completed' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}>
                                                        {meeting.status}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>

                    {/* Files Tab */}
                    <TabsContent value="files" className="mt-6">
                        {patient.files?.length === 0 ? (
                            <Card className="border-slate-200">
                                <CardContent className="py-12 text-center">
                                    <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                    <p className="text-muted-foreground">No files uploaded for this patient</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                {patient.files?.map((file, idx) => {
                                    // Rotating colors for file cards
                                    const cardColors = [
                                        { light: '#e8f5f0', dark: '#3b6658' }, // Teal
                                        { light: '#f5f0e8', dark: '#694e20' }, // Amber
                                        { light: '#f3edf5', dark: '#68517d' }, // Purple
                                        { light: '#e8e8f5', dark: '#0b0b30' }, // Blue
                                    ];
                                    const colors = cardColors[idx % cardColors.length];
                                    
                                    return (
                                        <Card key={file.id} className="border-0 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 bg-white" style={{ backgroundColor: colors.light }} data-testid={`patient-file-${idx}`}>
                                            <CardContent className="pt-6">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex items-start gap-3">
                                                        <span className="text-2xl">{getFileIcon(file.file_type)}</span>
                                                        <div>
                                                            <p className="font-semibold text-sm truncate max-w-[150px]" style={{ color: colors.dark }}>{file.original_name}</p>
                                                            <p className="text-xs capitalize" style={{ color: colors.dark, opacity: 0.7 }}>{file.file_type?.replace('_', ' ')}</p>
                                                            {file.created_at && (
                                                                <p className="text-xs mt-1" style={{ color: colors.dark, opacity: 0.7 }}>
                                                                    {format(parseISO(file.created_at), 'MMM d, yyyy')}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="icon" asChild>
                                                        <a href={getFileUrl(file.id)} target="_blank" rel="noopener noreferrer">
                                                            <Download className="w-4 h-4" style={{ color: colors.dark }} />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editDialog} onOpenChange={setEditDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Patient Profile</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>First Name</Label>
                                <Input
                                    value={editForm.first_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Last Name</Label>
                                <Input
                                    value={editForm.last_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input
                                    value={editForm.phone || ''}
                                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={editForm.email || ''}
                                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input
                                    value={editForm.department_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, department_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Provider Name</Label>
                                <Input
                                    value={editForm.department_provider_name || ''}
                                    onChange={(e) => setEditForm({ ...editForm, department_provider_name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Primary Diagnosis</Label>
                            <Textarea
                                value={editForm.primary_diagnosis || ''}
                                onChange={(e) => setEditForm({ ...editForm, primary_diagnosis: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Allergies</Label>
                            <Textarea
                                value={editForm.allergies || ''}
                                onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Current Medications</Label>
                            <Textarea
                                value={editForm.current_medications || ''}
                                onChange={(e) => setEditForm({ ...editForm, current_medications: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={editForm.notes || ''}
                                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialog(false)}>Cancel</Button>
                        <Button onClick={handleEdit} disabled={saving} data-testid="save-edit-btn">
                            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}
