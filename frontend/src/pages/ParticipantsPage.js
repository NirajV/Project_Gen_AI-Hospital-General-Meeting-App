import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getUsers, updateUser } from '@/lib/api';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserPlus, Loader2 } from 'lucide-react';
import { ParticipantStatsCards } from '@/components/participants/ParticipantStatsCards';
import { ParticipantSearchFilter } from '@/components/participants/ParticipantSearchFilter';
import { ParticipantCard } from '@/components/participants/ParticipantCard';
import { CreateParticipantDialog } from '@/components/participants/CreateParticipantDialog';
import { EditParticipantDialog } from '@/components/participants/EditParticipantDialog';

export default function ParticipantsPage() {
    const { user } = useAuth();
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    // Create dialog state
    const [createDialog, setCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newParticipant, setNewParticipant] = useState({ ...CreateParticipantDialog.DEFAULT_FORM });

    // Inline role-edit state
    const [editingRole, setEditingRole] = useState(null);
    const [updatingRole, setUpdatingRole] = useState(false);

    // Edit dialog state
    const [editDialog, setEditDialog] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editedEmail, setEditedEmail] = useState('');
    const [editedSpecialty, setEditedSpecialty] = useState('');
    const [updatingUser, setUpdatingUser] = useState(false);

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
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify(newParticipant),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to create participant');

            await loadParticipants();
            setNewParticipant({ ...CreateParticipantDialog.DEFAULT_FORM });
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
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                },
                body: JSON.stringify({ role: newRole }),
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
            await updateUser(editingUser.id, { email: editedEmail, specialty: editedSpecialty });
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

    // ---------- Derived data ----------
    const filteredParticipants = participants.filter((p) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
            q === '' ||
            p.name?.toLowerCase().includes(q) ||
            p.email?.toLowerCase().includes(q) ||
            p.specialty?.toLowerCase().includes(q);
        const matchesRole = filterRole === 'all' || p.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const roles = ['all', ...new Set(participants.map((p) => p.role).filter(Boolean))];

    const stats = {
        total: participants.length,
        doctors: participants.filter((p) => p.role === 'doctor').length,
        nurses: participants.filter((p) => p.role === 'nurse').length,
        admins: participants.filter((p) => p.role === 'admin' || p.role === 'organizer').length,
    };

    return (
        <Layout>
            <div className="space-y-6" data-testid="participants-page">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight flex items-center gap-3">
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
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#523d61')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#68517d')}
                        data-testid="add-participant-page-btn"
                    >
                        <UserPlus className="w-4 h-4" />
                        Create Participant
                    </Button>
                </div>

                <ParticipantStatsCards stats={stats} />

                <Card>
                    <ParticipantSearchFilter
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        filterRole={filterRole}
                        onFilterChange={setFilterRole}
                        roles={roles}
                    />
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
                                {filteredParticipants.map((participant, idx) => (
                                    <ParticipantCard
                                        key={participant.id}
                                        participant={participant}
                                        index={idx}
                                        isOrganizer={isOrganizer}
                                        editingRoleId={editingRole}
                                        onStartRoleEdit={setEditingRole}
                                        onCancelRoleEdit={() => setEditingRole(null)}
                                        onRoleChange={handleUpdateRole}
                                        updatingRole={updatingRole}
                                        onOpenEditDialog={openEditDialog}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {!loading && filteredParticipants.length > 0 && (
                    <p className="text-sm text-muted-foreground text-center">
                        Showing {filteredParticipants.length} of {participants.length} participants
                    </p>
                )}

                <CreateParticipantDialog
                    open={createDialog}
                    onOpenChange={setCreateDialog}
                    formValue={newParticipant}
                    onFormChange={setNewParticipant}
                    onSubmit={handleCreateParticipant}
                    creating={creating}
                />

                <EditParticipantDialog
                    open={editDialog}
                    onOpenChange={setEditDialog}
                    participant={editingUser}
                    email={editedEmail}
                    specialty={editedSpecialty}
                    onEmailChange={setEditedEmail}
                    onSpecialtyChange={setEditedSpecialty}
                    onSubmit={handleUpdateUser}
                    updating={updatingUser}
                />
            </div>
        </Layout>
    );
}
