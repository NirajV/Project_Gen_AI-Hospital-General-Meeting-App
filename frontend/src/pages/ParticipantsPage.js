import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getUsers, updateUser } from '@/lib/api';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { 
    Users, Search, Mail, Phone, Briefcase, UserPlus, 
    Calendar, AlertCircle, Loader2, Edit2, Save, X
} from 'lucide-react';

export default function ParticipantsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [createDialog, setCreateDialog] = useState(false);
    const [editingRole, setEditingRole] = useState(null);
    const [editDialog, setEditDialog] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editedEmail, setEditedEmail] = useState('');
    const [editedSpecialty, setEditedSpecialty] = useState('');
    const [updatingUser, setUpdatingUser] = useState(false);
    const [newParticipant, setNewParticipant] = useState({
        name: '',
        email: '',
        specialty: '',
        phone: '',
        role: 'doctor',
        password: 'TempPass123!'
    });
    const [creating, setCreating] = useState(false);
    const [updatingRole, setUpdatingRole] = useState(false);

    const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

    useEffect(() => {
        loadParticipants();
    }, []);

    const loadParticipants = async () => {
        setLoading(true);
        try {
            const response = await getUsers();
            setParticipants(response.data || []);
        } catch (error) {
            console.error('Failed to load participants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateParticipant = async () => {
        if (!newParticipant.name || !newParticipant.email) {
            alert('Please fill in name and email');
            return;
        }

        setCreating(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify(newParticipant)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to create participant');
            }

            await loadParticipants();
            setNewParticipant({ name: '', email: '', specialty: '', phone: '', role: 'doctor', password: 'TempPass123!' });
            setCreateDialog(false);
            alert(`✅ Participant "${newParticipant.name}" created successfully!\nEmail: ${newParticipant.email}\nTemporary password: TempPass123!`);
        } catch (error) {
            console.error('Failed to create participant:', error);
            if (error.message.includes('already exists')) {
                alert('This email is already registered.');
            } else {
                alert('Failed to create participant: ' + error.message);
            }
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateRole = async (participantId, newRole) => {
        setUpdatingRole(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/users/${participantId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({ role: newRole })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to update role');
            }

            await loadParticipants();
            setEditingRole(null);
            alert('✅ Role updated successfully!');
        } catch (error) {
            console.error('Failed to update role:', error);
            alert('Failed to update role: ' + error.message);
        } finally {
            setUpdatingRole(false);
        }
    };

    const openEditDialog = (participant) => {
        setEditingUser(participant);
        setEditedEmail(participant.email);
        setEditedSpecialty(participant.specialty || '');
        setEditDialog(true);
    };

    const handleUpdateUser = async () => {
        if (!editedEmail) {
            alert('Email is required');
            return;
        }

        setUpdatingUser(true);
        try {
            await updateUser(editingUser.id, {
                email: editedEmail,
                specialty: editedSpecialty
            });

            await loadParticipants();
            setEditDialog(false);
            setEditingUser(null);
            alert(`✅ Participant "${editingUser.name}" updated successfully!`);
        } catch (error) {
            console.error('Failed to update participant:', error);
            const errorMsg = error.response?.data?.detail || error.message;
            if (errorMsg.includes('Email already in use')) {
                alert('This email is already registered to another user.');
            } else {
                alert('Failed to update participant: ' + errorMsg);
            }
        } finally {
            setUpdatingUser(false);
        }
    };

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DR';
    };

    const getRoleBadgeColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin':
            case 'organizer':
                return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'doctor':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'nurse':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    // Filter participants based on search and role
    const filteredParticipants = participants.filter(participant => {
        const matchesSearch = searchQuery === '' || 
            participant.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            participant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            participant.specialty?.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesRole = filterRole === 'all' || participant.role === filterRole;
        
        return matchesSearch && matchesRole;
    });

    // Get unique roles for filter
    const roles = ['all', ...new Set(participants.map(p => p.role).filter(Boolean))];

    // Statistics
    const stats = {
        total: participants.length,
        doctors: participants.filter(p => p.role === 'doctor').length,
        nurses: participants.filter(p => p.role === 'nurse').length,
        admins: participants.filter(p => p.role === 'admin' || p.role === 'organizer').length,
    };

    return (
        <Layout>
            <div className="space-y-6" data-testid="participants-page">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-slate-900 flex items-center gap-3">
                            <Users className="w-8 h-8 text-primary" />
                            Participants
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Manage hospital staff and meeting participants
                        </p>
                    </div>
                    <Button 
                        onClick={() => setCreateDialog(true)} 
                        className="gap-2 shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                        style={{ backgroundColor: '#68517d', color: '#ffffff' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#523d61'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#68517d'}
                        data-testid="add-participant-page-btn"
                    >
                        <UserPlus className="w-4 h-4" />
                        Create Participant
                    </Button>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#f3edf5' }}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Participants</p>
                                    <p className="text-3xl font-bold mt-1" style={{ color: '#68517d' }}>{stats.total}</p>
                                </div>
                                <Users className="w-10 h-10" style={{ color: '#68517d', opacity: 0.5 }} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#e8e8f5' }}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Doctors</p>
                                    <p className="text-3xl font-bold mt-1" style={{ color: '#0b0b30' }}>{stats.doctors}</p>
                                </div>
                                <Briefcase className="w-10 h-10" style={{ color: '#0b0b30', opacity: 0.5 }} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#e8f5f0' }}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Nurses</p>
                                    <p className="text-3xl font-bold mt-1" style={{ color: '#3b6658' }}>{stats.nurses}</p>
                                </div>
                                <Users className="w-10 h-10" style={{ color: '#3b6658', opacity: 0.5 }} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#f5f0e8' }}>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Admins</p>
                                    <p className="text-3xl font-bold mt-1" style={{ color: '#694e20' }}>{stats.admins}</p>
                                </div>
                                <AlertCircle className="w-10 h-10" style={{ color: '#694e20', opacity: 0.5 }} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filter */}
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search by name, email, or specialty..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            <div className="flex gap-2">
                                {roles.map((role) => (
                                    <Button
                                        key={role}
                                        size="sm"
                                        variant={filterRole === role ? 'default' : 'outline'}
                                        onClick={() => setFilterRole(role)}
                                        className="capitalize"
                                    >
                                        {role}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            </div>
                        ) : filteredParticipants.length === 0 ? (
                            <div className="text-center py-12">
                                <Users className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                                <p className="text-muted-foreground">
                                    {searchQuery || filterRole !== 'all' 
                                        ? 'No participants found matching your filters' 
                                        : 'No participants available'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
                                {filteredParticipants.map((participant, idx) => {
                                    // Rotating colors for participant cards (same as Dashboard)
                                    const cardColors = [
                                        { light: '#e8f5f0', dark: '#3b6658', hover: '#2d5047' }, // Meetings color
                                        { light: '#f5f0e8', dark: '#694e20', hover: '#523c19' }, // Patients color
                                        { light: '#f3edf5', dark: '#68517d', hover: '#523d61' }, // Participants color
                                        { light: '#e8e8f5', dark: '#0b0b30', hover: '#070725' }, // Dashboard color
                                    ];
                                    const colors = cardColors[idx % cardColors.length];
                                    
                                    return (
                                        <div
                                            key={participant.id}
                                            className="p-4 rounded-lg border-0 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 group bg-white"
                                            style={{ backgroundColor: colors.light }}
                                        >
                                            <div className="flex items-start gap-3">
                                                <Avatar className="w-12 h-12" style={{ backgroundColor: colors.dark }}>
                                                    <AvatarFallback className="font-semibold text-white" style={{ backgroundColor: colors.dark }}>
                                                        {getInitials(participant.name)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        <h3 className="font-semibold truncate group-hover:text-slate-900 transition-colors" style={{ color: colors.dark }}>
                                                            {participant.name}
                                                        </h3>
                                                    {isOrganizer && editingRole === participant.id ? (
                                                        <div className="flex items-center gap-1">
                                                            <Select
                                                                value={participant.role}
                                                                onValueChange={(value) => handleUpdateRole(participant.id, value)}
                                                                disabled={updatingRole}
                                                            >
                                                                <SelectTrigger className="h-7 text-xs w-28">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="doctor">Doctor</SelectItem>
                                                                    <SelectItem value="nurse">Nurse</SelectItem>
                                                                    <SelectItem value="admin">Admin</SelectItem>
                                                                    <SelectItem value="organizer">Organizer</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 w-7 p-0"
                                                                onClick={() => setEditingRole(null)}
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1">
                                                            <Badge 
                                                                variant="outline" 
                                                                className={`text-xs capitalize ${getRoleBadgeColor(participant.role)}`}
                                                            >
                                                                {participant.role || 'Staff'}
                                                            </Badge>
                                                            {isOrganizer && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-6 w-6 p-0 hover:bg-primary/10"
                                                                    onClick={() => setEditingRole(participant.id)}
                                                                    title="Change role"
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {participant.specialty && (
                                                    <div className="flex items-center gap-1 mt-1 text-sm" style={{ color: colors.dark, opacity: 0.8 }}>
                                                        <Briefcase className="w-3 h-3" />
                                                        <span className="truncate">{participant.specialty}</span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-1 mt-1 text-sm" style={{ color: colors.dark, opacity: 0.8 }}>
                                                    <Mail className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{participant.email}</span>
                                                    {isOrganizer && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-5 w-5 p-0 ml-auto hover:bg-slate-200"
                                                            onClick={() => openEditDialog(participant)}
                                                            title="Edit email and department"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                                
                                                {participant.phone && (
                                                    <div className="flex items-center gap-1 mt-1 text-sm" style={{ color: colors.dark, opacity: 0.8 }}>
                                                        <Phone className="w-3 h-3" />
                                                        <span>{participant.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results Count */}
                {!loading && filteredParticipants.length > 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                        Showing {filteredParticipants.length} of {participants.length} participants
                    </p>
                )}

                {/* Create Participant Dialog */}
                <Dialog open={createDialog} onOpenChange={setCreateDialog}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-primary" />
                                Create New Participant
                            </DialogTitle>
                            <DialogDescription>
                                Add a new staff member to the hospital system
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name *</Label>
                                <Input
                                    id="name"
                                    placeholder="Dr. John Smith"
                                    value={newParticipant.name}
                                    onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john.smith@hospital.com"
                                    value={newParticipant.email}
                                    onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Role *</Label>
                                <Select
                                    value={newParticipant.role}
                                    onValueChange={(value) => setNewParticipant({ ...newParticipant, role: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="doctor">Doctor</SelectItem>
                                        <SelectItem value="nurse">Nurse</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                        <SelectItem value="organizer">Organizer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="specialty">Specialty</Label>
                                <Input
                                    id="specialty"
                                    placeholder="Cardiology, Oncology, etc."
                                    value={newParticipant.specialty}
                                    onChange={(e) => setNewParticipant({ ...newParticipant, specialty: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <Input
                                    id="phone"
                                    placeholder="+1 (555) 123-4567"
                                    value={newParticipant.phone}
                                    onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
                                />
                            </div>

                            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>Default password will be: <strong>TempPass123!</strong></span>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCreateDialog(false);
                                    setNewParticipant({ name: '', email: '', specialty: '', phone: '', role: 'doctor', password: 'TempPass123!' });
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateParticipant}
                                disabled={!newParticipant.name || !newParticipant.email || creating}
                            >
                                {creating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                                ) : (
                                    <><UserPlus className="w-4 h-4 mr-2" /> Create Participant</>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Edit User Dialog */}
                <Dialog open={editDialog} onOpenChange={setEditDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Participant Details</DialogTitle>
                            <DialogDescription>
                                Update email address and department/specialty for {editingUser?.name}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-email">Email Address *</Label>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="edit-email"
                                        type="email"
                                        placeholder="email@hospital.com"
                                        value={editedEmail}
                                        onChange={(e) => setEditedEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-specialty">Department / Specialty</Label>
                                <div className="flex items-center gap-2">
                                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                                    <Input
                                        id="edit-specialty"
                                        type="text"
                                        placeholder="e.g., Cardiology, Oncology"
                                        value={editedSpecialty}
                                        onChange={(e) => setEditedSpecialty(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <strong>Note:</strong> Email updates will be reflected immediately. 
                                        The participant will need to use the new email for future logins.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setEditDialog(false);
                                    setEditingUser(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdateUser}
                                disabled={!editedEmail || updatingUser}
                            >
                                {updatingUser ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Update Participant
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
