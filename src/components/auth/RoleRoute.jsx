import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

const RoleRoute = ({ role = 'admin', children }) => {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      {user?.role === role ? children || <Outlet /> : <Navigate to="/" replace />}
    </ProtectedRoute>
  );
};

export default RoleRoute;
