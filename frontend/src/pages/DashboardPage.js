import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats, getMeetings } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/Layout';
import { 
    Calendar, Users, UserPlus, Clock, Plus, Video, MapPin,
    ArrowRight, CheckCircle2, XCircle, HelpCircle
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns';

export default function DashboardPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [upcomingMeetings, setUpcomingMeetings] = useState([]);
    const [loading, setLoading] = useState(true);

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

    const formatMeetingDate = (dateStr) => {
        const date = parseISO(dateStr);
        if (isToday(date)) return 'Today';
        if (isTomorrow(date)) return 'Tomorrow';
        if (isThisWeek(date)) return format(date, 'EEEE');
        return format(date, 'MMM d, yyyy');
    };

    const getStatusBadge = (status) => {
        const styles = {
            scheduled: 'bg-blue-100 text-blue-700',
            in_progress: 'bg-green-100 text-green-700',
            completed: 'bg-slate-100 text-slate-700',
            cancelled: 'bg-red-100 text-red-700'
        };
        return <Badge className={styles[status] || styles.scheduled}>{status.replace('_', ' ')}</Badge>;
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
                        <Button className="bg-primary hover:bg-primary/90" data-testid="new-meeting-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            New Meeting
                        </Button>
                    </Link>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card className="border-slate-200" data-testid="stat-upcoming">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Upcoming Meetings</p>
                                    <p className="text-3xl font-display font-bold text-foreground mt-1">
                                        {stats?.upcoming_meetings || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Calendar className="w-6 h-6 text-primary" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200" data-testid="stat-week">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">This Week</p>
                                    <p className="text-3xl font-display font-bold text-foreground mt-1">
                                        {stats?.meetings_this_week || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-accent" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200" data-testid="stat-invites">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Pending Invites</p>
                                    <p className="text-3xl font-display font-bold text-foreground mt-1">
                                        {stats?.pending_invites || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                                    <UserPlus className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200" data-testid="stat-patients">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Total Patients</p>
                                    <p className="text-3xl font-display font-bold text-foreground mt-1">
                                        {stats?.total_patients || 0}
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-purple-600" />
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
                            <div className="space-y-3">
                                {upcomingMeetings.map((meeting, idx) => (
                                    <Link 
                                        key={meeting.id} 
                                        to={`/meetings/${meeting.id}`}
                                        className="block"
                                        data-testid={`meeting-card-${idx}`}
                                    >
                                        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-primary/30 hover:bg-slate-50 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    {meeting.meeting_type === 'video' ? (
                                                        <Video className="w-5 h-5 text-primary" />
                                                    ) : (
                                                        <MapPin className="w-5 h-5 text-primary" />
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-foreground">{meeting.title}</h3>
                                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
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
                                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
