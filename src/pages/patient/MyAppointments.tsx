import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Header from '../../components/layout/Header';
import PatientSidebar from '../../components/layout/PatientSidebar';
import PageContainer from '../../components/layout/PageContainer';
import AppointmentsList from '../../components/patient/AppointmentsList';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const MyAppointments: React.FC = () => {
  const { currentUser } = useData();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  if (!currentUser) {
    return <div>Loading...</div>;
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <PatientSidebar isOpen={isSidebarOpen} />
      
      <div className="lg:pl-64 pt-16">
        <PageContainer
          title="My Appointments"
          subtitle="View and manage your healthcare appointments"
          actions={
            <Button onClick={() => navigate('/patient/book')}>
              Book New Appointment
            </Button>
          }
        >
          <AppointmentsList patientId={currentUser.id} />
        </PageContainer>
      </div>
    </div>
  );
};

export default MyAppointments;