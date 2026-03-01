import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getUsers } from '@/lib/api';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
    Users, Search, Mail, Phone, Briefcase, UserPlus, 
    Calendar, AlertCircle, Loader2
} from 'lucide-react';

export default function ParticipantsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('all');

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

    const getInitials = (name) => {
        return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'DR';
    };

    const getRoleBadgeColor = (role) => {
        switch (role?.toLowerCase()) {
            case 'admin':
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
        admins: participants.filter(p => p.role === 'admin').length,
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
                    <Button onClick={() => navigate('/meetings/new')} className="gap-2">
                        <UserPlus className="w-4 h-4" />
                        Invite to Meeting
                    </Button>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Participants</p>
                                    <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
                                </div>
                                <Users className="w-10 h-10 text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Doctors</p>
                                    <p className="text-3xl font-bold text-blue-600 mt-1">{stats.doctors}</p>
                                </div>
                                <Briefcase className="w-10 h-10 text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Nurses</p>
                                    <p className="text-3xl font-bold text-green-600 mt-1">{stats.nurses}</p>
                                </div>
                                <Users className="w-10 h-10 text-green-400" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Admins</p>
                                    <p className="text-3xl font-bold text-purple-600 mt-1">{stats.admins}</p>
                                </div>
                                <AlertCircle className="w-10 h-10 text-purple-400" />
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredParticipants.map((participant) => (
                                    <div
                                        key={participant.id}
                                        className="p-4 rounded-lg border border-slate-200 hover:border-primary/30 hover:bg-slate-50 transition-all"
                                    >
                                        <div className="flex items-start gap-3">
                                            <Avatar className="w-12 h-12">
                                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                                    {getInitials(participant.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="font-semibold text-slate-900 truncate">
                                                        {participant.name}
                                                    </h3>
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`text-xs capitalize ${getRoleBadgeColor(participant.role)}`}
                                                    >
                                                        {participant.role || 'Staff'}
                                                    </Badge>
                                                </div>
                                                
                                                {participant.specialty && (
                                                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                                        <Briefcase className="w-3 h-3" />
                                                        <span className="truncate">{participant.specialty}</span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                                    <Mail className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{participant.email}</span>
                                                </div>
                                                
                                                {participant.phone && (
                                                    <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                                        <Phone className="w-3 h-3" />
                                                        <span>{participant.phone}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
            </div>
        </Layout>
    );
}
