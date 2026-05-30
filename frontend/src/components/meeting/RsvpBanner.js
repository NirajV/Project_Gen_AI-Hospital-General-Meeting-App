import React, { useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { respondToInvite } from '@/lib/api';

/**
 * RsvpBanner — shows the current participant's RSVP status for a meeting
 * with one-click controls to change it. Persists across page refreshes
 * (unlike the toast that fires from `useRsvpFromUrl`).
 *
 * Hidden for:
 *   - The organizer (their participant row is always `accepted` by design)
 *   - Users who aren't on the participant list
 *   - Meetings that are already `completed` or `cancelled`
 */
const STATUS_META = {
    accepted: {
        label: 'Accepted',
        verb: 'accepted',
        Icon: CheckCircle2,
        ring: 'ring-green-200',
        bg: 'bg-green-50',
        text: 'text-green-900',
        accent: 'text-green-700',
    },
    declined: {
        label: 'Declined',
        verb: 'declined',
        Icon: XCircle,
        ring: 'ring-red-200',
        bg: 'bg-red-50',
        text: 'text-red-900',
        accent: 'text-red-700',
    },
    tentative: {
        label: 'Tentative',
        verb: 'marked tentative',
        Icon: HelpCircle,
        ring: 'ring-amber-200',
        bg: 'bg-amber-50',
        text: 'text-amber-900',
        accent: 'text-amber-700',
    },
    pending: {
        label: 'Awaiting your response',
        verb: 'pending',
        Icon: HelpCircle,
        ring: 'ring-blue-200',
        bg: 'bg-blue-50',
        text: 'text-blue-900',
        accent: 'text-blue-700',
    },
};

export default function RsvpBanner({ meeting, currentUserId, onResponded }) {
    const [busyStatus, setBusyStatus] = useState(null);

    if (!meeting || !currentUserId) return null;

    // Organizer doesn't RSVP to their own meeting.
    if (meeting.organizer_id === currentUserId) return null;

    // No banner for meetings that have already happened.
    if (meeting.status === 'completed' || meeting.status === 'cancelled') return null;

    const participant = meeting.participants?.find((p) => p.user_id === currentUserId);
    if (!participant) return null;

    const status = participant.response_status || 'pending';
    const meta = STATUS_META[status] || STATUS_META.pending;
    const { Icon } = meta;

    const send = async (next) => {
        if (next === status || busyStatus) return;
        setBusyStatus(next);
        try {
            await respondToInvite(meeting.id, { response_status: next });
            toast.success(`You have ${STATUS_META[next].verb} this meeting.`);
            if (onResponded) await onResponded();
        } catch (err) {
            const msg = err?.response?.data?.detail || 'Failed to update your response.';
            toast.error(msg);
        } finally {
            setBusyStatus(null);
        }
    };

    const buttonOptions = [
        { key: 'accepted', label: 'Accept' },
        { key: 'tentative', label: 'Tentative' },
        { key: 'declined', label: 'Decline' },
    ];

    return (
        <div
            className={`rounded-lg border ${meta.bg} ${meta.ring} ring-1 p-4 flex flex-col sm:flex-row sm:items-center gap-3`}
            data-testid="rsvp-banner"
        >
            <div className="flex items-start gap-3 flex-1">
                <Icon className={`w-5 h-5 mt-0.5 ${meta.accent}`} />
                <div>
                    <div className={`text-sm font-semibold ${meta.text}`} data-testid="rsvp-banner-status">
                        {status === 'pending'
                            ? 'Awaiting your response'
                            : `Your response: ${meta.label}`}
                    </div>
                    <div className={`text-xs ${meta.accent} mt-0.5`}>
                        {status === 'pending'
                            ? 'Let the organiser know if you can join.'
                            : 'Need to change it? Pick a different option to the right.'}
                    </div>
                </div>
            </div>
            <div className="flex gap-2 flex-wrap">
                {buttonOptions.map(({ key, label }) => {
                    const isCurrent = key === status;
                    const isBusy = busyStatus === key;
                    return (
                        <Button
                            key={key}
                            size="sm"
                            variant={isCurrent ? 'default' : 'outline'}
                            disabled={isCurrent || Boolean(busyStatus)}
                            onClick={() => send(key)}
                            data-testid={`rsvp-banner-${key}`}
                            className="min-w-[92px]"
                        >
                            {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                label
                            )}
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}
