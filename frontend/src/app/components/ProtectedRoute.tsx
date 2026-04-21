import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../lib/auth';

/**
 * Wraps protected pages. Redirects to /login if unauthenticated, or to
 * /survey if authenticated but the user hasn't completed account setup.
 */
export function ProtectedRoute({
  children,
  requireProfile = true,
}: {
  children: ReactNode;
  requireProfile?: boolean;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <p className="text-[#7d8aa3] font-mono animate-pulse">AUTHENTICATING…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireProfile && !user.profile_complete && location.pathname !== '/survey') {
    return <Navigate to="/survey" replace />;
  }

  return <>{children}</>;
}
