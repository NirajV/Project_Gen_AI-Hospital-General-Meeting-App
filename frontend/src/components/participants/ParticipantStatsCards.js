import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Briefcase, AlertCircle } from 'lucide-react';

const CARDS = [
    { key: 'total',   label: 'Total Participants', icon: Users,        bg: '#f3edf5', fg: '#68517d' },
    { key: 'doctors', label: 'Doctors',            icon: Briefcase,    bg: '#e8e8f5', fg: '#0b0b30' },
    { key: 'nurses',  label: 'Nurses',             icon: Users,        bg: '#e8f5f0', fg: '#3b6658' },
    { key: 'admins',  label: 'Admins',             icon: AlertCircle,  bg: '#f5f0e8', fg: '#694e20' },
];

export const ParticipantStatsCards = ({ stats }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map(({ key, label, icon: Icon, bg, fg }) => (
            <Card
                key={key}
                className="border-0 shadow-sm hover:shadow-lg transition-all duration-300"
                style={{ backgroundColor: bg }}
                data-testid={`participant-stat-${key}`}
            >
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{label}</p>
                            <p className="text-3xl font-bold mt-1" style={{ color: fg }}>{stats[key]}</p>
                        </div>
                        <Icon className="w-10 h-10" style={{ color: fg, opacity: 0.5 }} />
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
);
