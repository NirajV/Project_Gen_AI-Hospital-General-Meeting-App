import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { updateUser } from '@/lib/api';

// Best-effort split of a single "name" field into first/last for legacy users.
const splitName = (full = '') => {
    const parts = full.trim().split(/\s+/);
    if (parts.length <= 1) return { first: parts[0] || '', last: '' };
    return { first: parts[0], last: parts.slice(1).join(' ') };
};

export default function ProfileInformationTab({ user, onUpdated }) {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(() => {
        const fallback = splitName(user?.name || '');
        return {
            first_name: user?.first_name || fallback.first,
            last_name: user?.last_name || fallback.last,
            email: user?.email || '',
            organization: user?.organization || '',
        };
    });

    useEffect(() => {
        if (!user) return;
        const fallback = splitName(user.name || '');
        setForm({
            first_name: user.first_name || fallback.first,
            last_name: user.last_name || fallback.last,
            email: user.email || '',
            organization: user.organization || '',
        });
    }, [user]);

    const onChange = (e) =>
        setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!user?.id) return;
        setSaving(true);
        try {
            await updateUser(user.id, {
                first_name: form.first_name.trim(),
                last_name: form.last_name.trim(),
                email: form.email.trim(),
                organization: form.organization.trim(),
            });
            toast.success('Profile updated.');
            onUpdated && (await onUpdated());
        } catch (err) {
            const detail = err?.response?.data?.detail || err.message;
            toast.error(typeof detail === 'string' ? detail : 'Failed to save profile.');
        } finally {
            setSaving(false);
        }
    };

    const username = user?.email || '—';

    return (
        <Card data-testid="profile-information-card">
            <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                    Update your personal details. Your username cannot be changed.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <Label htmlFor="first_name">First Name</Label>
                            <Input
                                id="first_name"
                                name="first_name"
                                value={form.first_name}
                                onChange={onChange}
                                placeholder="Niraj"
                                data-testid="first-name-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_name">Last Name</Label>
                            <Input
                                id="last_name"
                                name="last_name"
                                value={form.last_name}
                                onChange={onChange}
                                placeholder="Vishwakarma"
                                data-testid="last-name-input"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            value={form.email}
                            onChange={onChange}
                            placeholder="you@example.com"
                            data-testid="email-input"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="organization">Organization</Label>
                        <Input
                            id="organization"
                            name="organization"
                            value={form.organization}
                            onChange={onChange}
                            placeholder="Hospital / Clinic name"
                            data-testid="organization-input"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={username}
                            disabled
                            className="bg-slate-100"
                            data-testid="username-input"
                        />
                        <p className="text-xs text-muted-foreground">
                            Username cannot be changed.
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={saving} data-testid="save-profile-btn">
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" /> Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
