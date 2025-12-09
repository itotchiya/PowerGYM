import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children, requireSuperAdmin = false, requireOwner = false }) {
    const { user, userProfile, session, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If gym client but no session (role not selected yet)
    if (userProfile?.role === 'gymclient' && !session) {
        return <Navigate to="/select-role" replace />;
    }

    // Check super admin requirement
    if (requireSuperAdmin && userProfile?.role !== 'superadmin') {
        return <Navigate to="/dashboard" replace />;
    }

    // Check owner requirement
    if (requireOwner && session?.subrole !== 'owner') {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}
