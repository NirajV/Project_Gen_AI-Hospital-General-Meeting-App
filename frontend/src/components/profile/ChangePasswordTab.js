import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, KeyRound } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { changePassword } from '@/lib/api';

const EMPTY = { current_password: '', new_password: '', confirm_password: '' };

export default function ChangePasswordTab() {
    const [form, setForm] = useState(EMPTY);
    const [submitting, setSubmitting] = useState(false);

    const onChange = (e) =>
        setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        if (form.new_password.length < 8) {
            toast.error('New password must be at least 8 characters.');
            return;
        }
        if (form.new_password !== form.confirm_password) {
            toast.error('New password and confirmation do not match.');
            return;
        }
        setSubmitting(true);
        try {
            await changePassword({
                current_password: form.current_password,
                new_password: form.new_password,
            });
            toast.success('Password updated successfully.');
            setForm(EMPTY);
        } catch (err) {
            const detail = err?.response?.data?.detail || err.message;
            toast.error(typeof detail === 'string' ? detail : 'Failed to update password.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card data-testid="change-password-card">
            <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                    Choose a strong password (minimum 8 characters).
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="space-y-5 max-w-md">
                    <div className="space-y-2">
                        <Label htmlFor="current_password">Current Password</Label>
                        <Input
                            id="current_password"
                            name="current_password"
                            type="password"
                            value={form.current_password}
                            onChange={onChange}
                            required
                            data-testid="current-password-input"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="new_password">New Password</Label>
                        <Input
                            id="new_password"
                            name="new_password"
                            type="password"
                            value={form.new_password}
                            onChange={onChange}
                            required
                            data-testid="new-password-input"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirm_password">Confirm New Password</Label>
                        <Input
                            id="confirm_password"
                            name="confirm_password"
                            type="password"
                            value={form.confirm_password}
                            onChange={onChange}
                            required
                            data-testid="confirm-password-input"
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={submitting} data-testid="update-password-btn">
                            {submitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating…
                                </>
                            ) : (
                                <>
                                    <KeyRound className="w-4 h-4 mr-2" /> Update Password
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
