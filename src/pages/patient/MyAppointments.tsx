import React from 'react';
import { useData } from '../../context/DataContext';
import PageContainer from '../../components/layout/PageContainer';
import AppointmentsList from '../../components/patient/AppointmentsList';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const MyAppointments: React.FC = () => {
  const { currentUser } = useData();
  const navigate = useNavigate();


  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
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
  );
};

export default MyAppointments;