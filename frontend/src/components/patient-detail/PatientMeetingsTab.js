import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, MapPin } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PATIENT_CARD_COLORS } from './patientDetailUtils';

export const PatientMeetingsTab = ({ meetings }) => {
    if (!meetings || meetings.length === 0) {
        return (
            <Card className="border-slate-200">
                <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No meetings found for this patient</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-8 p-4 bg-white">
            {meetings.map((meeting, idx) => {
                const colors = PATIENT_CARD_COLORS[idx % PATIENT_CARD_COLORS.length];
                return (
                    <Link key={meeting.id} to={`/meetings/${meeting.id}`}>
                        <div
                            className="flex items-center justify-between p-4 rounded-lg border-0 shadow-sm hover:shadow-2xl hover:-translate-y-2 hover:scale-[1.01] transition-all duration-300 bg-white"
                            style={{ backgroundColor: colors.light }}
                            data-testid={`patient-meeting-${idx}`}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                                    style={{ backgroundColor: colors.dark }}
                                >
                                    {meeting.meeting_type === 'video' ? (
                                        <Video className="w-5 h-5 text-white" />
                                    ) : (
                                        <MapPin className="w-5 h-5 text-white" />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold" style={{ color: colors.dark }}>
                                        {meeting.title}
                                    </h3>
                                    <div
                                        className="flex items-center gap-3 mt-1 text-sm"
                                        style={{ color: colors.dark, opacity: 0.7 }}
                                    >
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
                                    <Badge
                                        variant="outline"
                                        className="capitalize"
                                        style={{ borderColor: colors.dark, color: colors.dark }}
                                    >
                                        {meeting.case_status.replace('_', ' ')}
                                    </Badge>
                                )}
                                <Badge
                                    className={
                                        meeting.status === 'completed'
                                            ? 'bg-slate-100 text-slate-600'
                                            : 'bg-blue-100 text-blue-700'
                                    }
                                >
                                    {meeting.status}
                                </Badge>
                            </div>
                        </div>
                    </Link>
                );
            })}
        </div>
    );
};
