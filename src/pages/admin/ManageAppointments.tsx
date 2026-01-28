import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import PageContainer from '../../components/layout/PageContainer';
import AppointmentsTable from '../../components/admin/AppointmentsTable';
import { useNavigate } from 'react-router-dom';

const ManageAppointments: React.FC = () => {
  const { currentUser } = useData();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  if (!currentUser || currentUser.role !== 'admin') {
    navigate('/login');
    return null;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <AdminSidebar isOpen={isSidebarOpen} />
      
      <div className="lg:pl-64 pt-16">
        <PageContainer
          title="Manage Appointments"
          subtitle="View and manage all patient appointments"
        >
          <AppointmentsTable />
        </PageContainer>
      </div>
    </div>
  );
};

export default ManageAppointments;