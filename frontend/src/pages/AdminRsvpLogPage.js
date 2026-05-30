import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getRsvpLog } from '@/lib/api';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Inbox, CheckCircle2, XCircle, AlertTriangle, MailQuestion } from 'lucide-react';
import { format, parseISO } from 'date-fns';

/**
 * /admin/rsvp-log — surfaces the last N rows of the `processed_rsvp_emails`
 * Mongo collection so an admin can audit the inbound email-RSVP pipeline.
 *
 * Read-only. Restricted to organiser/admin roles (also enforced server-side).
 */

const OUTCOME_META = {
    applied: {
        label: 'Applied',
        Icon: CheckCircle2,
        cls: 'bg-green-50 text-green-700 border-green-200',
    },
    no_match: {
        label: 'No match',
        Icon: AlertTriangle,
        cls: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    parse_failed: {
        label: 'Parse failed',
        Icon: XCircle,
        cls: 'bg-red-50 text-red-700 border-red-200',
    },
    no_calendar: {
        label: 'No calendar part',
        Icon: MailQuestion,
        cls: 'bg-slate-50 text-slate-700 border-slate-200',
    },
};

const STATUS_PILL = {
    accepted: 'bg-green-100 text-green-700',
    declined: 'bg-red-100 text-red-700',
    tentative: 'bg-amber-100 text-amber-700',
    pending: 'bg-slate-100 text-slate-700',
};

export default function AdminRsvpLogPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState({ rows: [], counts: {}, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Server enforces the role check too. We mirror it client-side just to
    // bounce non-admins away from a page they wouldn't have data for anyway.
    const isAuthorized = user?.role === 'admin' || user?.role === 'organizer';

    useEffect(() => {
        if (!user) return;
        if (!isAuthorized) {
            navigate('/dashboard', { replace: true });
            return;
        }
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getRsvpLog(50);
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Failed to load RSVP log.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;
    if (!isAuthorized) return null;

    const { rows = [], counts = {}, total = 0 } = data || {};

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Inbox className="w-6 h-6 text-blue-600" />
                            Inbound RSVP log
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 max-w-2xl">
                            Last 50 iCalendar REPLY emails processed by the IMAP poller.
                            Use this to verify that a clinician's "Yes/No/Maybe" click in
                            Gmail or Outlook actually reached the application.
                        </p>
                    </div>
                    <Button onClick={load} disabled={loading} variant="outline" size="sm" data-testid="rsvp-log-refresh">
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Outcome counts */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <Card>
                        <CardContent className="p-4">
                            <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">Total processed</div>
                            <div className="text-2xl font-bold text-slate-900 mt-1" data-testid="rsvp-log-total">{total}</div>
                        </CardContent>
                    </Card>
                    {Object.entries(OUTCOME_META).map(([key, meta]) => (
                        <Card key={key}>
                            <CardContent className="p-4">
                                <div className="text-xs uppercase tracking-wide text-slate-500 font-semibold">{meta.label}</div>
                                <div className="text-2xl font-bold text-slate-900 mt-1" data-testid={`rsvp-log-count-${key}`}>
                                    {counts[key] || 0}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Error banner */}
                {error && (
                    <div className="p-4 rounded-lg border bg-red-50 border-red-200 text-red-700 text-sm" data-testid="rsvp-log-error">
                        {error}
                    </div>
                )}

                {/* Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recent activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
                        ) : rows.length === 0 ? (
                            <div className="text-center py-10 text-slate-500" data-testid="rsvp-log-empty">
                                <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                                <p className="text-sm">No inbound RSVP replies have been processed yet.</p>
                                <p className="text-xs mt-1 text-slate-400">
                                    Make sure <code className="px-1 py-0.5 bg-slate-100 rounded">RSVP_POLL_ENABLED=true</code> is set
                                    in your backend env, then send a meeting invite to a Gmail account.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm" data-testid="rsvp-log-table">
                                    <thead>
                                        <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                                            <th className="py-2 px-2 font-semibold">When</th>
                                            <th className="py-2 px-2 font-semibold">Attendee</th>
                                            <th className="py-2 px-2 font-semibold">Meeting</th>
                                            <th className="py-2 px-2 font-semibold">Response</th>
                                            <th className="py-2 px-2 font-semibold">Outcome</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((r, idx) => {
                                            const outcomeMeta = OUTCOME_META[r.outcome] || OUTCOME_META.no_calendar;
                                            const { Icon } = outcomeMeta;
                                            const statusCls = STATUS_PILL[r.new_status] || STATUS_PILL.pending;
                                            let when = '—';
                                            try {
                                                when = format(parseISO(r.processed_at), 'MMM d · HH:mm');
                                            } catch (_) { /* ignore parse errors */ }
                                            return (
                                                <tr key={`${r.processed_at}-${idx}`} className="border-b last:border-b-0 hover:bg-slate-50">
                                                    <td className="py-2 px-2 text-slate-700 whitespace-nowrap">{when}</td>
                                                    <td className="py-2 px-2 text-slate-700">{r.attendee_email || <span className="text-slate-400">unknown</span>}</td>
                                                    <td className="py-2 px-2 text-slate-700">
                                                        {r.meeting_title || (
                                                            r.meeting_id
                                                                ? <span className="text-slate-400 text-xs font-mono">{r.meeting_id}</span>
                                                                : <span className="text-slate-400">—</span>
                                                        )}
                                                        {r.meeting_date && (
                                                            <div className="text-xs text-slate-400">{r.meeting_date}</div>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        {r.new_status ? (
                                                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>
                                                                {r.new_status}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <Badge variant="outline" className={`inline-flex items-center gap-1 ${outcomeMeta.cls}`}>
                                                            <Icon className="w-3 h-3" />
                                                            {outcomeMeta.label}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
