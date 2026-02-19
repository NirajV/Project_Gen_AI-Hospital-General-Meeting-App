import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Activity, Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    // If passed from AuthCallback, skip loading state
    if (location.state?.user) {
        return children;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <Activity className="w-12 h-12 text-primary mb-4" />
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
}
