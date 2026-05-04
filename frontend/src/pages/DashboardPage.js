import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, getMeetings, updateParticipantResponse } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout';
import { 
    Calendar, Users, UserPlus, Clock, Plus, CalendarPlus, Video, MapPin,
    ArrowRight, CheckCircle2, XCircle, HelpCircle, Check, X, Minus
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [upcomingMeetings, setUpcomingMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatingResponse, setUpdatingResponse] = useState({});

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [statsRes, meetingsRes] = await Promise.all([
                getDashboardStats(),
                getMeetings({ filter_type: 'upcoming' })
            ]);
            setStats(statsRes.data);
            setUpcomingMeetings(meetingsRes.data.slice(0, 5));
        } catch (error) {
            console.error('Failed to load dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResponseUpdate = async (meetingId, responseStatus, e) => {
        e.preventDefault();
        e.stopPropagation();
        
        setUpdatingResponse({ ...updatingResponse, [meetingId]: true });
        try {
            await updateParticipantResponse(meetingId, user.id, responseStatus);
            await loadDashboard();
        } catch (error) {
            console.error('Failed to update response:', error);
            alert('Failed to update response');
        } finally {
            setUpdatingResponse({ ...updatingResponse, [meetingId]: false });
        }
    };

    const formatMeetingDate = (dateStr) => {
        const date = parseISO(dateStr);
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        if (isThisWeek(date)) return format(date, 'EEEE');
        return format(date, 'MMM d, yyyy');
    };

    const getStatusBadge = (status) => {
        const styles = {
            scheduled: 'status-badge bg-blue-100 text-blue-800',
            in_progress: 'status-badge bg-emerald-100 text-emerald-800',
            completed: 'status-completed',
            cancelled: 'status-declined',
            pending: 'status-pending',
            accepted: 'status-accepted',
            declined: 'status-declined'
        };
        return <Badge className={styles[status] || 'status-badge bg-slate-100 text-slate-700'}>
            {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
        </Badge>;
    };

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-pulse text-muted-foreground">Loading dashboard...</div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-8" data-testid="dashboard">
                {/* Welcome Section */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">
                            Welcome back, {user?.name?.split(' ')[0] || 'Doctor'}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {format(new Date(), 'EEEE, MMMM d, yyyy')}
                        </p>
                    </div>
                    <Link to="/meetings/new">
                        <Button
                            className="gap-2 shadow-md hover:shadow-lg transition-all duration-200 font-semibold"
                            style={{ backgroundColor: '#3b6658', color: '#ffffff' }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2f5246'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b6658'}
                            data-testid="new-meeting-btn"
                        >
                            <CalendarPlus className="w-4 h-4" />
                            New Meeting
                        </Button>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#e8e8f5' }} data-testid="stat-upcoming">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Upcoming Meetings</p>
                                    <p className="text-3xl font-display font-bold mt-1" style={{ color: '#0b0b30' }}>
                                        {stats?.upcoming_meetings || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#0b0b30', opacity: 0.9 }}>
                                    <Calendar className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#e8f5f0' }} data-testid="stat-week">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">This Week</p>
                                    <p className="text-3xl font-display font-bold mt-1" style={{ color: '#3b6658' }}>
                                        {stats?.meetings_this_week || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#3b6658', opacity: 0.9 }}>
                                    <Clock className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#f5f0e8' }} data-testid="stat-invites">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Pending Invites</p>
                                    <p className="text-3xl font-display font-bold mt-1" style={{ color: '#694e20' }}>
                                        {stats?.pending_invites || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#694e20', opacity: 0.9 }}>
                                    <UserPlus className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm hover:shadow-lg transition-all duration-300" style={{ backgroundColor: '#f3edf5' }} data-testid="stat-patients">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                                    <p className="text-3xl font-display font-bold mt-1" style={{ color: '#68517d' }}>
                                        {stats?.total_patients || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#68517d', opacity: 0.9 }}>
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Upcoming Meetings */}
                <Card className="border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-display">Upcoming Meetings</CardTitle>
                        <Link to="/meetings">
                            <Button variant="ghost" size="sm" className="text-primary" data-testid="view-all-meetings">
                                View All <ArrowRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {upcomingMeetings.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No upcoming meetings scheduled</p>
                                <Link to="/meetings/new">
                                    <Button variant="outline" className="mt-4" data-testid="schedule-meeting-empty">
                                        Schedule your first meeting
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-4 p-2">
                                {upcomingMeetings.map((meeting, idx) => {
                                    const isOrganizer = meeting.organizer_id === user.id;
                                    const myParticipation = meeting.participants?.find(p => p.user_id === user.id);
                                    const myResponse = myParticipation?.response_status;
                                    
                                    // Rotating colors for meeting cards
                                    const cardColors = [
                                        { light: '#e8f5f0', dark: '#3b6658', hover: '#2d5047' }, // Meetings color
                                        { light: '#f5f0e8', dark: '#694e20', hover: '#523c19' }, // Patients color
                                        { light: '#f3edf5', dark: '#68517d', hover: '#523d61' }, // Participants color
                                        { light: '#e8e8f5', dark: '#0b0b30', hover: '#070725' }, // Dashboard color
                                    ];
                                    const colors = cardColors[idx % cardColors.length];
                                    
                                    return (
                                        <div
                                            key={meeting.id}
                                            className="p-4 rounded-lg border-0 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300 group bg-white"
                                            style={{ backgroundColor: colors.light }}
                                            data-testid={`meeting-card-${idx}`}
                                        >
                                            <Link 
                                                to={`/meetings/${meeting.id}`}
                                                className="block"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div 
                                                            className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300"
                                                            style={{ backgroundColor: colors.dark }}
                                                        >
                                                            {meeting.meeting_type === 'video' ? (
                                                                <Video className="w-5 h-5 text-white" />
                                                            ) : (
                                                                <MapPin className="w-5 h-5 text-white" />
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h3 className="font-semibold text-foreground group-hover:text-slate-900 transition-colors">{meeting.title}</h3>
                                                            <div className="flex items-center gap-3 mt-1 text-sm" style={{ color: colors.dark }}>
                                                                <span>{formatMeetingDate(meeting.meeting_date)}</span>
                                                                <span>•</span>
                                                                <span>{meeting.start_time?.slice(0, 5)}</span>
                                                                <span>•</span>
                                                                <span>{meeting.patient_count || 0} patients</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {getStatusBadge(meeting.status)}
                                                        <ArrowRight className="w-4 h-4" style={{ color: colors.dark }} />
                                                    </div>
                                                </div>
                                            </Link>
                                            
                                            {/* Response Section - Only show for participants, not organizers */}
                                            {!isOrganizer && meeting.status !== 'completed' && (
                                                <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${colors.dark}40` }}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs mr-1" style={{ color: colors.dark }}>
                                                            {myResponse && myResponse !== 'pending' ? 'Change:' : 'Respond:'}
                                                        </span>
                                                        <Button
                                                            size="sm"
                                                            variant={myResponse === 'accepted' ? 'default' : 'outline'}
                                                            className={`h-7 text-xs ${
                                                                myResponse === 'accepted' 
                                                                    ? 'bg-green-600 hover:bg-green-700 text-white border-green-600' 
                                                                    : 'hover:bg-slate-50'
                                                            }`}
                                                            onClick={(e) => handleResponseUpdate(meeting.id, 'accepted', e)}
                                                            disabled={updatingResponse[meeting.id]}
                                                        >
                                                            <Check className="w-3 h-3 mr-1" />
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={myResponse === 'maybe' ? 'default' : 'outline'}
                                                            className={`h-7 text-xs ${
                                                                myResponse === 'maybe' 
                                                                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500' 
                                                                    : 'hover:bg-slate-50'
                                                            }`}
                                                            onClick={(e) => handleResponseUpdate(meeting.id, 'maybe', e)}
                                                            disabled={updatingResponse[meeting.id]}
                                                        >
                                                            <Minus className="w-3 h-3 mr-1" />
                                                            Maybe
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant={myResponse === 'declined' ? 'default' : 'outline'}
                                                            className={`h-7 text-xs ${
                                                                myResponse === 'declined' 
                                                                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-600' 
                                                                    : 'hover:bg-slate-50'
                                                            }`}
                                                            onClick={(e) => handleResponseUpdate(meeting.id, 'declined', e)}
                                                            disabled={updatingResponse[meeting.id]}
                                                        >
                                                            <X className="w-3 h-3 mr-1" />
                                                            Decline
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
