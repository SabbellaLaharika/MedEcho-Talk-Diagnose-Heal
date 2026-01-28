import React from 'react';
import { Navigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import RegisterForm from '../components/auth/RegisterForm';
import Header from '../components/layout/Header';

const RegisterPage: React.FC = () => {
  const { currentUser } = useData();

  if (currentUser) {
    // Redirect to appropriate dashboard based on user role
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (currentUser.role === 'patient') {
      return <Navigate to="/patient" replace />;
    } else if (currentUser.role === 'doctor') {
      return <Navigate to="/doctor" replace />;
    } else if (currentUser.role === 'staff') {
      return <Navigate to="/staff" replace />;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-16 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto py-8">
            <h1 className="text-center text-3xl font-bold text-gray-900 mb-8">
              Create an Account
            </h1>
            <RegisterForm />
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;