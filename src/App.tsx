import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import type { UserRole } from './types';

import PublicCustomerPage from './pages/PublicCustomerPage';
import CustomerLayout from './layouts/customer/CustomerLayout';
import AppointmentPage from './pages/customer/Appointment';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ReceptionPage from './pages/ReceptionPage';
import QueuePage from './pages/QueuePage';
import DispatchPage from './pages/DispatchPage';
import DoctorPage from './pages/DoctorPage';
import LabPage from './pages/LabPage';
import VisitTrackingPage from './pages/VisitTrackingPage';
import MonitoringPage from './pages/MonitoringPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ForbiddenPage from './pages/ForbiddenPage';
import PaymentPage from './pages/PaymentPage';

const ROLE_DEFAULT_PATH: Record<UserRole, string> = {
  ADMIN: '/dashboard',
  RECEPTIONIST: '/reception',
  COORDINATOR: '/queue',
  DOCTOR: '/doctor',
  LAB_STAFF: '/lab',
  MANAGER: '/monitoring',
};

function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm font-semibold text-gray-500">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
}

function RootRedirect() {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm font-semibold text-gray-500">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user) return <Navigate to={ROLE_DEFAULT_PATH[user.role]} replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicCustomerPage />} />
        <Route path="/customer" element={<PublicCustomerPage />} />
        <Route
          path="/appointment"
          element={
            <CustomerLayout>
              <AppointmentPage />
            </CustomerLayout>
          }
        />
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'COORDINATOR']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reception"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RECEPTIONIST', 'COORDINATOR']}>
              <ReceptionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/queue"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'COORDINATOR', 'RECEPTIONIST']}>
              <QueuePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dispatch"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'COORDINATOR', 'RECEPTIONIST']}>
              <DispatchPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/doctor"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'DOCTOR']}>
              <DoctorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/lab"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'LAB_STAFF']}>
              <LabPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visit-tracking"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'COORDINATOR', 'MANAGER']}>
              <VisitTrackingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitoring"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'COORDINATOR']}>
              <MonitoringPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/forbidden"
          element={
            <ProtectedRoute>
              <ForbiddenPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
