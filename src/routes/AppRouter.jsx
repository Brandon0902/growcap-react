import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout.jsx';
import AuthLayout from '../components/layout/AuthLayout.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import SavingsPage from '../features/savings/pages/SavingsPage.jsx';
import InvestmentsPage from '../features/investments/pages/InvestmentsPage.jsx';
import LoansPage from '../features/loans/pages/LoansPage.jsx';
import ProfilePage from '../features/profile/pages/ProfilePage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

function NotFoundPage() {
  return (
    <div className="page">
      <h1>Pagina no encontrada</h1>
      <p>La ruta solicitada no existe o fue movida.</p>
    </div>
  );
}

function AppRouter() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/ahorro" element={<SavingsPage />} />
          <Route path="/inversion" element={<InvestmentsPage />} />
          <Route path="/prestamos" element={<LoansPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}

export default AppRouter;
