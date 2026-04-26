import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { submitFeedback } from '@/lib/api';

const EMPTY = {
    feedback_type: 'feature_request',
    subject: '',
    message: '',
};

export default function FeedbackTab() {
    const [form, setForm] = useState(EMPTY);
    const [submitting, setSubmitting] = useState(false);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!form.subject.trim() || !form.message.trim()) {
            toast.error('Subject and message are required.');
            return;
        }
        setSubmitting(true);
        try {
            await submitFeedback(form);
            toast.success('Feedback submitted. Thank you!');
            setForm(EMPTY);
        } catch (err) {
            const detail = err?.response?.data?.detail || err.message;
            toast.error(typeof detail === 'string' ? detail : 'Failed to submit feedback.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card data-testid="feedback-card">
            <CardHeader>
                <CardTitle>Send Feedback</CardTitle>
                <CardDescription>
                    Found a bug? Have an idea? Tell us — we read every message.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
                    <div className="space-y-2">
                        <Label htmlFor="feedback_type">Type</Label>
                        <Select
                            value={form.feedback_type}
                            onValueChange={(v) =>
                                setForm((p) => ({ ...p, feedback_type: v }))
                            }
                        >
                            <SelectTrigger id="feedback_type" data-testid="feedback-type-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="feature_request">Feature Request</SelectItem>
                                <SelectItem value="bug_report">Bug Report</SelectItem>
                                <SelectItem value="general_feedback">General Feedback</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                            id="subject"
                            value={form.subject}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, subject: e.target.value }))
                            }
                            required
                            placeholder="Short summary"
                            data-testid="feedback-subject-input"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                            id="message"
                            value={form.message}
                            onChange={(e) =>
                                setForm((p) => ({ ...p, message: e.target.value }))
                            }
                            required
                            rows={6}
                            placeholder="Describe what you'd like to share…"
                            data-testid="feedback-message-input"
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={submitting} data-testid="submit-feedback-btn">
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" /> Submit Feedback
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
