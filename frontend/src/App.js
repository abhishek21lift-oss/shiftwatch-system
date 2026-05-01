import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/globals.css';

// Pages
import LoginPage     from './components/auth/LoginPage';
import AppLayout     from './components/AppLayout';
import Dashboard     from './components/dashboard/Dashboard';
import EmployeesPage from './components/employees/EmployeesPage';
import AttendancePage from './components/attendance/AttendancePage';
import MyAttendance  from './components/attendance/MyAttendance';
import ReportsPage   from './components/reports/ReportsPage';
import MyReport      from './components/reports/MyReport';
import ShiftConfig   from './components/admin/ShiftConfig';

function PrivateRoute({ children, adminOnly }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/my-attendance" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/dashboard' : '/my-attendance'} /> : <LoginPage />} />

      <Route element={<PrivateRoute><AppLayout /></PrivateRoute>}>
        {/* Admin routes */}
        <Route path="/dashboard"    element={<PrivateRoute adminOnly><Dashboard /></PrivateRoute>} />
        <Route path="/employees"    element={<PrivateRoute adminOnly><EmployeesPage /></PrivateRoute>} />
        <Route path="/attendance"   element={<PrivateRoute adminOnly><AttendancePage /></PrivateRoute>} />
        <Route path="/reports"      element={<PrivateRoute adminOnly><ReportsPage /></PrivateRoute>} />
        <Route path="/shift-config" element={<PrivateRoute adminOnly><ShiftConfig /></PrivateRoute>} />

        {/* Employee routes */}
        <Route path="/my-attendance" element={<MyAttendance />} />
        <Route path="/my-report"     element={<MyReport />} />
      </Route>

      <Route path="*" element={<Navigate to={user ? (user.role === 'admin' ? '/dashboard' : '/my-attendance') : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
