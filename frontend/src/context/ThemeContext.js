import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

/**
 * ThemeContext — owns the user-selected colour palette + typography for the
 * whole React app.
 *
 * - Reads the saved theme from `localStorage('biomedmeet:theme')` on mount.
 * - Writes the chosen theme to `<html data-theme="...">`, which cascades the
 *   shadcn HSL variables defined in `index.css`.
 * - Optionally syncs with `user.theme_preference` on the backend when
 *   `syncToServer()` is invoked (called by the picker).
 *
 * Default theme: 'default' — same as the original BioMedMeet look.
 */

export const THEMES = [
    { id: 'default',  name: 'BioMedMeet (default)', emoji: '🟢' },
    { id: 'ocean',    name: 'Ocean Breeze',         emoji: '🌊' },
    { id: 'carbon',   name: 'Carbon',               emoji: '⚡' },
    { id: 'sage',     name: 'Sage Clinic',          emoji: '🌿' },
    { id: 'sunrise',  name: 'Sunrise',              emoji: '🌅' },
    { id: 'lavender', name: 'Lavender Med',         emoji: '💜' },
];

const VALID_IDS = THEMES.map(t => t.id);
const STORAGE_KEY = 'biomedmeet:theme';
const DEFAULT_THEME = 'default';

function applyToDocument(themeId) {
    const html = document.documentElement;
    if (themeId && themeId !== 'default') {
        html.setAttribute('data-theme', themeId);
    } else {
        html.removeAttribute('data-theme');
    }
}

function loadInitialTheme() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && VALID_IDS.includes(saved)) return saved;
    } catch (_) { /* localStorage unavailable */ }
    return DEFAULT_THEME;
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(loadInitialTheme);

    // Apply on mount + whenever the theme changes.
    useEffect(() => {
        applyToDocument(theme);
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (_) { /* ignore */ }
    }, [theme]);

    const setTheme = useCallback((next) => {
        if (!VALID_IDS.includes(next)) return;
        setThemeState(next);
    }, []);

    /**
     * Hydrate from a logged-in user's saved preference. Called by AuthContext
     * after a successful login / checkAuth. Falls back to the stored local
     * value if the user record doesn't carry one yet.
     */
    const hydrateFromUser = useCallback((user) => {
        const pref = user?.theme_preference;
        if (pref && VALID_IDS.includes(pref) && pref !== theme) {
            setThemeState(pref);
        }
    }, [theme]);

    const value = useMemo(() => ({
        theme,
        themes: THEMES,
        setTheme,
        hydrateFromUser,
    }), [theme, setTheme, hydrateFromUser]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}
