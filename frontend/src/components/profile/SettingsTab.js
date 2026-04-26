import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save, Globe } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { updateUser } from '@/lib/api';
import { LANGUAGES, COUNTRIES, TIMEZONES } from '@/lib/regionalData';
import HolidaysCard from '@/components/profile/HolidaysCard';

export default function SettingsTab({ user, onUpdated }) {
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        language: user?.language || 'en-US',
        country: user?.country || 'US',
        timezone: user?.timezone || 'America/New_York',
    });

    useEffect(() => {
        if (!user) return;
        setForm({
            language: user.language || 'en-US',
            country: user.country || 'US',
            timezone: user.timezone || 'America/New_York',
        });
    }, [user]);

    const onSubmit = async (e) => {
        e.preventDefault();
        if (!user?.id) return;
        setSaving(true);
        try {
            await updateUser(user.id, {
                language: form.language,
                country: form.country,
                timezone: form.timezone,
            });
            toast.success('Settings saved.');
            onUpdated && (await onUpdated());
        } catch (err) {
            const detail = err?.response?.data?.detail || err.message;
            toast.error(typeof detail === 'string' ? detail : 'Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card data-testid="regional-settings-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" /> Regional Settings
                </CardTitle>
                <CardDescription>
                    Your timezone is used to format meeting invites, reminders, and
                    calendar entries so the times always match your local clock.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={onSubmit} className="space-y-5 max-w-2xl">
                    <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Select
                            value={form.language}
                            onValueChange={(v) => setForm((p) => ({ ...p, language: v }))}
                        >
                            <SelectTrigger id="language" data-testid="language-select">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LANGUAGES.map((l) => (
                                    <SelectItem key={l.code} value={l.code}>
                                        {l.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select
                            value={form.country}
                            onValueChange={(v) => setForm((p) => ({ ...p, country: v }))}
                        >
                            <SelectTrigger id="country" data-testid="country-select">
                                <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                                {COUNTRIES.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="timezone">Timezone</Label>
                        <Select
                            value={form.timezone}
                            onValueChange={(v) => setForm((p) => ({ ...p, timezone: v }))}
                        >
                            <SelectTrigger id="timezone" data-testid="timezone-select">
                                <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                                {TIMEZONES.map((tz) => (
                                    <SelectItem key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Times shown in emails and meeting cards will be converted to this timezone.
                        </p>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={saving} data-testid="save-settings-btn">
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" /> Save Settings
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>

        <HolidaysCard user={user} onUpdated={onUpdated} />
        </div>
    );
}
