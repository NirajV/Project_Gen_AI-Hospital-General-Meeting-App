import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Activity, Loader2 } from 'lucide-react';

export default function AuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const { processOAuthSession } = useAuth();
    const hasProcessed = useRef(false);

    useEffect(() => {
        // Prevent double execution in StrictMode
        if (hasProcessed.current) return;
        hasProcessed.current = true;

        const processAuth = async () => {
            try {
                // Extract session_id from URL fragment
                const hash = location.hash;
                const sessionId = hash.split('session_id=')[1]?.split('&')[0];

                if (sessionId) {
                    await processOAuthSession(sessionId);
                    // Clear the hash from URL
                    window.history.replaceState(null, '', window.location.pathname);
                    navigate('/dashboard', { replace: true });
                } else {
                    navigate('/login', { replace: true });
                }
            } catch (error) {
                console.error('OAuth processing failed:', error);
                navigate('/login', { replace: true });
            }
        };

        processAuth();
    }, [location.hash, navigate, processOAuthSession]);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center" data-testid="auth-callback">
            <Activity className="w-12 h-12 text-primary mb-4 animate-pulse" />
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="mt-4 text-muted-foreground">Completing sign in...</p>
        </div>
    );
}
