import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../features/auth/hooks/useAuth.js';
import IdleTimeoutModal from '../features/auth/components/IdleTimeoutModal.jsx';

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="loading">Validando sesion...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return (
    <>
      <IdleTimeoutModal />
      <Outlet />
    </>
  );
}

export default ProtectedRoute;
