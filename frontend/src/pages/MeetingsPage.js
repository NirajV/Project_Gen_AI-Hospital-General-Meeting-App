import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getMeetings, respondToInvite } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Layout from '@/components/Layout';
import { 
    Calendar, Plus, Video, MapPin, Users, Clock, ArrowRight,
    CheckCircle2, XCircle, HelpCircle, Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function MeetingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'upcoming');

    useEffect(() => {
        loadMeetings(activeTab);
    }, [activeTab]);

    const loadMeetings = async (filterType) => {
        setLoading(true);
        try {
            const res = await getMeetings({ filter_type: filterType });
            setMeetings(res.data);
        } catch (error) {
            console.error('Failed to load meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (value) => {
        setActiveTab(value);
        setSearchParams({ tab: value });
    };

    const handleRespond = async (meetingId, status) => {
        try {
            await respondToInvite(meetingId, { response_status: status });
            loadMeetings(activeTab);
        } catch (error) {
            console.error('Failed to respond:', error);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
            in_progress: 'bg-green-100 text-green-700 border-green-200',
            completed: 'bg-slate-100 text-slate-600 border-slate-200',
            cancelled: 'bg-red-100 text-red-700 border-red-200'
        };
        return <Badge variant="outline" className={styles[status] || styles.scheduled}>{status?.replace('_', ' ')}</Badge>;
    };

    const getResponseBadge = (status) => {
        const config = {
            accepted: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
            declined: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
            tentative: { icon: HelpCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
            pending: { icon: Clock, color: 'text-slate-600', bg: 'bg-slate-50' }
        };
        const { icon: Icon, color, bg } = config[status] || config.pending;
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${color} ${bg}`}>
                <Icon className="w-3 h-3" />
                {status}
            </span>
        );
    };

    const MeetingCard = ({ meeting, showResponse = false }) => (
        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200 hover:border-primary/30 hover:shadow-sm transition-all bg-white" data-testid={`meeting-item-${meeting.id}`}>
            <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                    {meeting.meeting_type === 'video' ? (
                        <Video className="w-6 h-6 text-primary" />
                    ) : (
                        <MapPin className="w-6 h-6 text-primary" />
                    )}
                </div>
                <div>
                    <h3 className="font-medium text-foreground text-lg">{meeting.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(parseISO(meeting.meeting_date), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {meeting.start_time?.slice(0, 5)}
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {meeting.patient_count || 0} patients
                        </span>
                    </div>
                    {meeting.organizer_name && (
                        <p className="text-xs text-muted-foreground mt-1">Organized by {meeting.organizer_name}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                {showResponse && meeting.response_status && (
                    <div className="flex items-center gap-2">
                        {meeting.response_status === 'pending' ? (
                            <div className="flex gap-2">
                                <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={(e) => { e.preventDefault(); handleRespond(meeting.id, 'accepted'); }} data-testid={`accept-${meeting.id}`}>
                                    <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
                                </Button>
                                <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50" onClick={(e) => { e.preventDefault(); handleRespond(meeting.id, 'tentative'); }} data-testid={`tentative-${meeting.id}`}>
                                    <HelpCircle className="w-4 h-4 mr-1" /> Maybe
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={(e) => { e.preventDefault(); handleRespond(meeting.id, 'declined'); }} data-testid={`decline-${meeting.id}`}>
                                    <XCircle className="w-4 h-4 mr-1" /> Decline
                                </Button>
                            </div>
                        ) : (
                            getResponseBadge(meeting.response_status)
                        )}
                    </div>
                )}
                {getStatusBadge(meeting.status)}
                <Link to={`/meetings/${meeting.id}`}>
                    <Button variant="ghost" size="icon" data-testid={`view-meeting-${meeting.id}`}>
                        <ArrowRight className="w-4 h-4" />
                    </Button>
                </Link>
            </div>
        </div>
    );

    return (
        <Layout>
            <div className="space-y-6" data-testid="meetings-page">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Meetings</h1>
                        <p className="text-muted-foreground mt-1">View and manage your case meetings</p>
                    </div>
                    <Link to="/meetings/new">
                        <Button className="bg-primary hover:bg-primary/90" data-testid="new-meeting-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            New Meeting
                        </Button>
                    </Link>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange}>
                    <TabsList className="bg-slate-100">
                        <TabsTrigger value="upcoming" data-testid="tab-upcoming">Upcoming</TabsTrigger>
                        <TabsTrigger value="my_invites" data-testid="tab-invites">My Invites</TabsTrigger>
                        <TabsTrigger value="past" data-testid="tab-past">Past</TabsTrigger>
                    </TabsList>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <>
                            <TabsContent value="upcoming" className="space-y-3 mt-6">
                                {meetings.length === 0 ? (
                                    <Card className="border-slate-200">
                                        <CardContent className="py-12 text-center">
                                            <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                            <p className="text-muted-foreground">No upcoming meetings</p>
                                            <Link to="/meetings/new">
                                                <Button variant="outline" className="mt-4">Schedule a meeting</Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    meetings.map(meeting => (
                                        <MeetingCard key={meeting.id} meeting={meeting} />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="my_invites" className="space-y-3 mt-6">
                                {meetings.length === 0 ? (
                                    <Card className="border-slate-200">
                                        <CardContent className="py-12 text-center">
                                            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                            <p className="text-muted-foreground">No meeting invitations</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    meetings.map(meeting => (
                                        <MeetingCard key={meeting.id} meeting={meeting} showResponse={true} />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="past" className="space-y-3 mt-6">
                                {meetings.length === 0 ? (
                                    <Card className="border-slate-200">
                                        <CardContent className="py-12 text-center">
                                            <Clock className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                                            <p className="text-muted-foreground">No past meetings</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    meetings.map(meeting => (
                                        <MeetingCard key={meeting.id} meeting={meeting} />
                                    ))
                                )}
                            </TabsContent>
                        </>
                    )}
                </Tabs>
            </div>
        </Layout>
    );
}
