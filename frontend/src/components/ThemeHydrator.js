import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

/**
 * Bridges AuthContext → ThemeContext. Mount once at the top of the routed
 * app. When the user logs in (or `checkAuth` rehydrates them on page load),
 * we copy their saved `theme_preference` into the ThemeContext so the
 * palette they last picked is restored.
 */
export default function ThemeHydrator() {
    const { user } = useAuth();
    const { hydrateFromUser } = useTheme();

    useEffect(() => {
        if (user) hydrateFromUser(user);
    }, [user, hydrateFromUser]);

    return null;
}
