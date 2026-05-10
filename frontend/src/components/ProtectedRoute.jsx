import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !user.isAdmin) {
    return <Navigate to="/driver" replace />;
  }

  return children;
}
