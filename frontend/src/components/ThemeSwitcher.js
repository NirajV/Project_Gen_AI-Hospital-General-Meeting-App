import React, { useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { updateThemePreference } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

/**
 * Compact palette picker for the header. Lives next to the user menu so
 * every page surface gets a one-click way to change the theme.
 *
 * - Updates ThemeContext immediately (optimistic — feels instant).
 * - Fires `PUT /api/users/me/theme` in the background so the choice
 *   follows the user across devices. Failures roll back + toast.
 */
export default function ThemeSwitcher() {
    const { theme, themes, setTheme } = useTheme();
    const { user } = useAuth();
    const [busy, setBusy] = useState(false);

    const pick = async (id) => {
        if (id === theme || busy) return;
        const previous = theme;
        setTheme(id);
        if (!user) return;             // anonymous → localStorage only
        setBusy(true);
        try {
            await updateThemePreference(id);
        } catch (err) {
            setTheme(previous);        // rollback on failure
            toast.error(err?.response?.data?.detail || 'Could not save your theme.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    data-testid="theme-switcher-trigger"
                    aria-label="Change theme"
                >
                    <Palette className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel>Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {themes.map((t) => {
                    const isActive = t.id === theme;
                    return (
                        <DropdownMenuItem
                            key={t.id}
                            onClick={() => pick(t.id)}
                            className="cursor-pointer flex items-center justify-between gap-2"
                            data-testid={`theme-option-${t.id}`}
                            disabled={busy && !isActive}
                        >
                            <span className="flex items-center gap-2">
                                <span className="text-base leading-none">{t.emoji}</span>
                                <span>{t.name}</span>
                            </span>
                            {isActive && <Check className="h-4 w-4 text-primary" />}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
