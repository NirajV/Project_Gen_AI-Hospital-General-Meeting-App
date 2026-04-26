import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, CalendarDays } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { updateUser, getDefaultHolidays } from '@/lib/api';

export default function HolidaysCard({ user, onUpdated }) {
    const [defaults, setDefaults] = useState([]);
    const [loadingDefaults, setLoadingDefaults] = useState(false);
    const [enforced, setEnforced] = useState(user?.holiday_enforcement_enabled !== false);
    const [enabledNames, setEnabledNames] = useState(
        new Set(user?.enabled_default_holidays || [])
    );
    const [customHolidays, setCustomHolidays] = useState(user?.custom_holidays || []);
    const [newCustom, setNewCustom] = useState({ name: '', date: '', recurring: false });
    const [saving, setSaving] = useState(false);

    const country = user?.country || 'US';

    useEffect(() => {
        let cancelled = false;
        if (!country) return;
        setLoadingDefaults(true);
        getDefaultHolidays(country)
            .then((res) => {
                if (cancelled) return;
                setDefaults(res.data.holidays || []);
            })
            .catch(() => !cancelled && setDefaults([]))
            .finally(() => !cancelled && setLoadingDefaults(false));
        return () => {
            cancelled = true;
        };
    }, [country]);

    useEffect(() => {
        setEnforced(user?.holiday_enforcement_enabled !== false);
        setEnabledNames(new Set(user?.enabled_default_holidays || []));
        setCustomHolidays(user?.custom_holidays || []);
    }, [user?.id, user?.holiday_enforcement_enabled, user?.enabled_default_holidays, user?.custom_holidays]);

    const toggleHoliday = (name) => {
        setEnabledNames((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const addCustom = () => {
        if (!newCustom.name.trim() || !newCustom.date) {
            toast.error('Provide both a name and a date.');
            return;
        }
        setCustomHolidays((prev) => [
            ...prev,
            { name: newCustom.name.trim(), date: newCustom.date, recurring: !!newCustom.recurring },
        ]);
        setNewCustom({ name: '', date: '', recurring: false });
    };

    const removeCustom = (idx) =>
        setCustomHolidays((prev) => prev.filter((_, i) => i !== idx));

    const onSave = async () => {
        if (!user?.id) return;
        setSaving(true);
        try {
            await updateUser(user.id, {
                holiday_enforcement_enabled: enforced,
                enabled_default_holidays: Array.from(enabledNames),
                custom_holidays: customHolidays,
            });
            toast.success('Holiday preferences saved.');
            onUpdated && (await onUpdated());
        } catch (err) {
            const detail = err?.response?.data?.detail || err.message;
            toast.error(typeof detail === 'string' ? detail : 'Failed to save holidays.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card data-testid="holidays-card">
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <CalendarDays className="w-5 h-5" /> Holidays
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Block meeting scheduling on holidays you observe. Updates use your
                            country setting ({country}) and any custom dates you add below.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Label htmlFor="enforce-toggle" className="text-sm">
                            {enforced ? 'Enforcement on' : 'Enforcement off'}
                        </Label>
                        <Switch
                            id="enforce-toggle"
                            checked={enforced}
                            onCheckedChange={setEnforced}
                            data-testid="holiday-enforce-toggle"
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Default holidays for the country */}
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                        Default Holidays ({country})
                    </h3>
                    {loadingDefaults ? (
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                        </p>
                    ) : defaults.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No default holidays available for this country.
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {defaults.map((h) => {
                                const checked = enabledNames.has(h.name);
                                return (
                                    <label
                                        key={h.name}
                                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                                            checked
                                                ? 'border-primary/40 bg-primary/5'
                                                : 'border-slate-200 hover:bg-slate-50'
                                        }`}
                                        data-testid={`holiday-row-${h.name}`}
                                    >
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={() => toggleHoliday(h.name)}
                                            data-testid={`holiday-checkbox-${h.name}`}
                                        />
                                        <span className="flex-1 text-sm">{h.name}</span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Add custom holiday */}
                <div className="border-t pt-5">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                        Add Custom Holiday
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="custom-name">Name</Label>
                            <Input
                                id="custom-name"
                                value={newCustom.name}
                                onChange={(e) =>
                                    setNewCustom((p) => ({ ...p, name: e.target.value }))
                                }
                                placeholder="e.g., Hospital Foundation Day"
                                data-testid="custom-holiday-name"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="custom-date">Date</Label>
                            <Input
                                id="custom-date"
                                type="date"
                                value={newCustom.date}
                                onChange={(e) =>
                                    setNewCustom((p) => ({ ...p, date: e.target.value }))
                                }
                                data-testid="custom-holiday-date"
                            />
                        </div>
                        <div className="flex items-end gap-3">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox
                                    checked={newCustom.recurring}
                                    onCheckedChange={(v) =>
                                        setNewCustom((p) => ({ ...p, recurring: !!v }))
                                    }
                                    data-testid="custom-holiday-recurring"
                                />
                                Repeat yearly
                            </label>
                            <Button
                                type="button"
                                onClick={addCustom}
                                variant="outline"
                                data-testid="custom-holiday-add"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Add
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Existing custom holidays */}
                {customHolidays.length > 0 && (
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">
                            Saved Custom Holidays
                        </h3>
                        <div className="space-y-2">
                            {customHolidays.map((ch, idx) => (
                                <div
                                    key={`${ch.name}-${ch.date}-${idx}`}
                                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50"
                                    data-testid={`custom-holiday-${idx}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium">{ch.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {ch.date}
                                        </span>
                                        {ch.recurring && (
                                            <Badge variant="secondary" className="text-xs">
                                                Yearly
                                            </Badge>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeCustom(idx)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        data-testid={`custom-holiday-remove-${idx}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex justify-end pt-2 border-t">
                    <Button onClick={onSave} disabled={saving} data-testid="save-holidays-btn">
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
                            </>
                        ) : (
                            'Save Holiday Preferences'
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
