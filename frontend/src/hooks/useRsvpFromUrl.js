import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { respondToInvite } from '@/lib/api';
import { toast } from '@/components/ui/sonner';

const ACTION_TO_STATUS = {
    accept: 'accepted',
    decline: 'declined',
    tentative: 'tentative',
};

const SUCCESS_MESSAGE = {
    accepted: 'You have accepted this meeting invitation.',
    declined: 'You have declined this meeting invitation.',
    tentative: 'Your response has been recorded.',
};

/**
 * Reads `?action=accept|decline|tentative` from the URL (set by Accept/Decline
 * buttons in meeting-invite emails), records the RSVP via the meetings/respond
 * API, toasts confirmation, refetches the meeting, and strips the param from
 * the URL so a refresh doesn't replay the action.
 *
 * No-ops until both `meetingId` and `userId` are non-null.
 */
export function useRsvpFromUrl(meetingId, userId, onResponded) {
    const [searchParams, setSearchParams] = useSearchParams();
    const action = searchParams.get('action');

    useEffect(() => {
        if (!action || !meetingId || !userId) return;
        const responseStatus = ACTION_TO_STATUS[action];
        if (!responseStatus) return;

        let cancelled = false;
        (async () => {
            try {
                await respondToInvite(meetingId, { response_status: responseStatus });
                if (cancelled) return;
                toast.success(SUCCESS_MESSAGE[responseStatus]);
                if (onResponded) await onResponded();
            } catch (err) {
                if (cancelled) return;
                const msg = err?.response?.data?.detail || 'Failed to record your response.';
                toast.error(msg);
            } finally {
                if (!cancelled) {
                    const next = new URLSearchParams(searchParams);
                    next.delete('action');
                    setSearchParams(next, { replace: true });
                }
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meetingId, userId, action]);
}
