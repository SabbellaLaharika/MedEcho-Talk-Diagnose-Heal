import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Patient Pages
import PatientLayout from './components/layout/PatientLayout';
import PatientDashboard from './pages/patient/PatientDashboard';
import BookAppointment from './pages/patient/BookAppointment';
import MyAppointments from './pages/patient/MyAppointments';
import NotificationsPage from './pages/patient/NotificationsPage';
import SettingsPage from './pages/patient/SettingsPage';
import AssistantPage from './pages/AssistantPage';
import MedicalReports from './pages/patient/MedicalReports';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageAppointments from './pages/admin/ManageAppointments';
import ManageDoctors from './pages/admin/ManageDoctors';

// Doctor Pages
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorReports from './pages/doctor/DoctorReports';

interface ProtectedRouteProps {
  element: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, allowedRoles }) => {
  const { currentUser } = useData();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    // Redirect to appropriate dashboard based on role
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (currentUser.role === 'patient') {
      return <Navigate to="/patient" replace />;
    } else if (currentUser.role === 'doctor') {
      return <Navigate to="/doctor" replace />;
    } else if (currentUser.role === 'staff') {
      return <Navigate to="/staff" replace />;
    } else {
      return <Navigate to="/" replace />;
    }
  }

  return <>{element}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Patient Routes */}
      {/* Patient Routes are now wrapped in PatientLayout */}
      <Route element={<ProtectedRoute element={<React.Fragment><PatientLayout /></React.Fragment>} allowedRoles={['patient']} />}>
        <Route path="/patient" element={<PatientDashboard />} />
        <Route path="/patient/assistant" element={<AssistantPage />} />
        <Route path="/patient/book" element={<BookAppointment />} />
        <Route path="/patient/book/:departmentId" element={<BookAppointment />} />
        <Route path="/patient/appointments" element={<MyAppointments />} />
        <Route path="/patient/notifications" element={<NotificationsPage />} />
        <Route path="/patient/settings" element={<SettingsPage />} />
        <Route path="/patient/reports" element={<MedicalReports />} />
      </Route>

      {/* Doctor Routes */}
      <Route
        path="/doctor"
        element={<ProtectedRoute element={<DoctorDashboard />} allowedRoles={['doctor']} />}
      />
      <Route
        path="/doctor/reports"
        element={<ProtectedRoute element={<DoctorReports />} allowedRoles={['doctor']} />}
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={<ProtectedRoute element={<AdminDashboard />} allowedRoles={['admin']} />}
      />
      <Route
        path="/admin/appointments"
        element={<ProtectedRoute element={<ManageAppointments />} allowedRoles={['admin']} />}
      />
      <Route
        path="/admin/doctors"
        element={<ProtectedRoute element={<ManageDoctors />} allowedRoles={['admin']} />}
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <DataProvider>
      <Router>
        <AppRoutes />
      </Router>
    </DataProvider>
  );
}

export default App;