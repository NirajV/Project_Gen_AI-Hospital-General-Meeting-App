/**
 * Browser locale detection utilities for onboarding pre-fill.
 *
 * These never throw — a missing/invalid value just returns null so the
 * caller can fall back to the existing hard-coded defaults.
 */

import { COUNTRIES, TIMEZONES } from '@/lib/regionalData';

/** IANA timezone string from the browser (e.g. "America/Los_Angeles"). */
export function detectBrowserTimezone() {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return typeof tz === 'string' && tz ? tz : null;
    } catch (_e) {
        return null;
    }
}

/**
 * ISO-3166 alpha-2 country code from `navigator.language`.
 *
 * Examples:
 *   "en-US"   -> "US"
 *   "hi-IN"   -> "IN"
 *   "fr-CA"   -> "CA"
 *   "de"      -> null (no region)
 */
export function detectBrowserCountry() {
    try {
        const langs = navigator.languages && navigator.languages.length
            ? navigator.languages
            : [navigator.language];
        for (const raw of langs) {
            if (!raw) continue;
            // Split "en-US" / "fr-CA" / "zh-Hant-TW"; take the last two-letter subtag.
            const parts = String(raw).split('-');
            for (let i = parts.length - 1; i > 0; i--) {
                const p = parts[i];
                if (/^[A-Za-z]{2}$/.test(p)) return p.toUpperCase();
            }
        }
        return null;
    } catch (_e) {
        return null;
    }
}

/**
 * Pick sensible onboarding defaults from the browser, but only fall back
 * to the hard-coded defaults when detection fails OR the detected value
 * isn't in our supported list (so we never seed an unselectable option).
 */
export function pickLocaleDefaults({ fallbackCountry = 'US', fallbackTimezone = 'America/New_York' } = {}) {
    const detectedTz = detectBrowserTimezone();
    const detectedCountry = detectBrowserCountry();

    const tz = detectedTz && TIMEZONES.some((t) => t.value === detectedTz)
        ? detectedTz
        : fallbackTimezone;
    const country = detectedCountry && COUNTRIES.some((c) => c.code === detectedCountry)
        ? detectedCountry
        : fallbackCountry;

    return { country, timezone: tz };
}
