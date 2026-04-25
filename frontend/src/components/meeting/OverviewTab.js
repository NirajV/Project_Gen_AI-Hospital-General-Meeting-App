import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, User, FileText, ExternalLink, UserPlus, XCircle } from 'lucide-react';
import { colorAt } from '@/lib/meetingColors';

export default function OverviewTab({
    meeting,
    isOrganizer,
    onAddParticipantClick,
    onRemoveParticipant,
    getResponseBadge,
}) {
    const participants = meeting?.participants || [];
    const additionalParticipants = participants.filter((p) => p.role !== 'organizer');
    const canAddParticipant = meeting?.status !== 'completed';
    const canRemoveParticipant = isOrganizer && meeting?.status !== 'completed';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card
                    className="border-0 shadow-sm hover:shadow-lg transition-all duration-300"
                    style={{ backgroundColor: '#e8e8f5' }}
                >
                    <CardHeader>
                        <CardTitle style={{ color: '#0b0b30' }}>Meeting Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {meeting.description && (
                            <div>
                                <Label className="text-muted-foreground">Description</Label>
                                <p className="mt-1" style={{ color: '#0b0b30' }}>
                                    {meeting.description}
                                </p>
                            </div>
                        )}
                        {meeting.location && (
                            <div>
                                <Label className="text-muted-foreground">Location</Label>
                                <p className="mt-1" style={{ color: '#0b0b30' }}>
                                    {meeting.location}
                                </p>
                            </div>
                        )}
                        {meeting.video_link && (
                            <div>
                                <Label className="text-muted-foreground">Video Link</Label>
                                <a
                                    href={meeting.video_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 mt-1 hover:underline"
                                    style={{ color: '#0b0b30' }}
                                >
                                    {meeting.video_link.slice(0, 50)}...{' '}
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        )}
                        <div className="flex gap-4">
                            <div>
                                <Label className="text-muted-foreground">Recurrence</Label>
                                <p className="mt-1 capitalize" style={{ color: '#0b0b30' }}>
                                    {meeting.recurrence_type?.replace('_', ' ')}
                                </p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Duration</Label>
                                <p className="mt-1" style={{ color: '#0b0b30' }}>
                                    {meeting.duration_minutes} minutes
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="border-slate-200">
                        <CardContent className="pt-6 text-center">
                            <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                            <p className="text-2xl font-display font-bold">
                                {meeting.participants?.length || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">Participants</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                        <CardContent className="pt-6 text-center">
                            <User className="w-8 h-8 mx-auto mb-2 text-accent" />
                            <p className="text-2xl font-display font-bold">
                                {meeting.patients?.length || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">Patients</p>
                        </CardContent>
                    </Card>
                    <Card className="border-slate-200">
                        <CardContent className="pt-6 text-center">
                            <FileText className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                            <p className="text-2xl font-display font-bold">
                                {meeting.files?.length || 0}
                            </p>
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
                        {canAddParticipant && (
                            <Button
                                variant="default"
                                size="sm"
                                onClick={onAddParticipantClick}
                                data-testid="add-participant-btn"
                                className="bg-primary hover:bg-primary/90"
                            >
                                <UserPlus className="w-4 h-4 mr-1" /> Add Participant
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

                    {additionalParticipants.map((participant, idx) => {
                        const colors = colorAt(idx);

                        return (
                            <div
                                key={participant.id}
                                className="flex items-center justify-between p-3 rounded-lg group transition-all duration-200 hover:shadow-sm"
                                style={{ backgroundColor: colors.light }}
                                data-testid={`participant-${idx}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Avatar
                                        className="w-8 h-8"
                                        style={{ backgroundColor: colors.dark }}
                                    >
                                        <AvatarImage src={participant.picture} />
                                        <AvatarFallback
                                            className="text-xs text-white"
                                            style={{ backgroundColor: colors.dark }}
                                        >
                                            {participant.name?.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p
                                            className="text-sm font-semibold"
                                            style={{ color: colors.dark }}
                                        >
                                            {participant.name}
                                        </p>
                                        <p
                                            className="text-xs"
                                            style={{ color: colors.dark, opacity: 0.7 }}
                                        >
                                            {participant.specialty || participant.email}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {getResponseBadge(participant.response_status)}
                                    {canRemoveParticipant && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="w-6 h-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                            onClick={() =>
                                                onRemoveParticipant(participant.user_id)
                                            }
                                            data-testid={`remove-participant-${idx}`}
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </CardContent>
            </Card>
        </div>
    );
}
