import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Patient Pages
import PatientDashboard from './pages/patient/PatientDashboard';
import BookAppointment from './pages/patient/BookAppointment';
import MyAppointments from './pages/patient/MyAppointments';
import NotificationsPage from './pages/patient/NotificationsPage';
import SettingsPage from './pages/patient/SettingsPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageAppointments from './pages/admin/ManageAppointments';
import ManageDoctors from './pages/admin/ManageDoctors';

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
      return <Navigate to="/" replace />;
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
      <Route 
        path="/patient" 
        element={<ProtectedRoute element={<PatientDashboard />} allowedRoles={['patient']} />} 
      />
      <Route 
        path="/patient/book" 
        element={<ProtectedRoute element={<BookAppointment />} allowedRoles={['patient']} />} 
      />
      <Route 
        path="/patient/book/:departmentId" 
        element={<ProtectedRoute element={<BookAppointment />} allowedRoles={['patient']} />} 
      />
      <Route 
        path="/patient/appointments" 
        element={<ProtectedRoute element={<MyAppointments />} allowedRoles={['patient']} />} 
      />
      <Route 
        path="/patient/notifications" 
        element={<ProtectedRoute element={<NotificationsPage />} allowedRoles={['patient']} />} 
      />
      <Route 
        path="/patient/settings" 
        element={<ProtectedRoute element={<SettingsPage />} allowedRoles={['patient']} />} 
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