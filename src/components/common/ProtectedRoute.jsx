import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, roles, redirectTo = '/login' }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    const homeByRole = {
      admin: '/admin/dashboard',
      organizer: '/organizer/dashboard',
      attendee: '/attendee/dashboard',
    };
    const fallback = homeByRole[user?.role] || '/';
    return <Navigate to={fallback} replace />;
  }

  return children;
}
