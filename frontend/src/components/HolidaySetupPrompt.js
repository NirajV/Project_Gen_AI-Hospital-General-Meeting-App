import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/sonner';
import { useAuth } from '@/context/AuthContext';

/**
 * HolidaySetupPrompt
 *
 * Fires once per browser session for any authenticated user who hasn't
 * configured a region/country yet. Shows a non-intrusive persistent toast
 * with a "Set now" CTA that deep-links to the Profile → Settings tab
 * where the user can pick country / timezone / language / holidays.
 *
 * Detection:  user.country is empty/null/undefined (first-time setup).
 * Suppression: sessionStorage flag — auto-resets on next browser session,
 *              but won't re-nag the user on every page navigation.
 */
const DISMISS_KEY = 'holiday_setup_prompt_dismissed';

export default function HolidaySetupPrompt() {
    const { user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!user) return;

        const alreadyConfigured = Boolean(user.country);
        const dismissedThisSession =
            typeof window !== 'undefined' &&
            sessionStorage.getItem(DISMISS_KEY) === '1';

        if (alreadyConfigured || dismissedThisSession) return;

        // Small delay so the toast doesn't compete with page-load UI.
        const timer = setTimeout(() => {
            toast('Set your region for localized holidays', {
                description:
                    'Tell us your country, timezone, and language so meeting times and holiday warnings are accurate.',
                duration: Infinity,
                action: {
                    label: 'Set now',
                    onClick: () => {
                        sessionStorage.setItem(DISMISS_KEY, '1');
                        navigate('/settings');
                    },
                },
                cancel: {
                    label: 'Later',
                    onClick: () => sessionStorage.setItem(DISMISS_KEY, '1'),
                },
                onDismiss: () => sessionStorage.setItem(DISMISS_KEY, '1'),
                onAutoClose: () => sessionStorage.setItem(DISMISS_KEY, '1'),
            });
        }, 1200);

        return () => clearTimeout(timer);
    }, [user, navigate]);

    return null;
}
