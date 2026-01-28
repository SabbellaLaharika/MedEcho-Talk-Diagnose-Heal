import React from 'react';
import { useData } from '../../context/DataContext';
import { Appointment } from '../../types';
import { Card, CardContent } from '../ui/Card';
import Button from '../ui/Button';

interface AppointmentsListProps {
  patientId: string;
}

const AppointmentsList: React.FC<AppointmentsListProps> = ({ patientId }) => {
  const { data, updateAppointmentStatus } = useData();
  const appointments = data.appointments.filter(
    (appointment) => appointment.patientId === patientId
  );

  // Sort appointments by date (newest first)
  const sortedAppointments = [...appointments].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateB.getTime() - dateA.getTime();
  });

  // Group appointments by status
  const upcomingAppointments = sortedAppointments.filter(
    (app) => app.status === 'confirmed' && new Date(`${app.date}T${app.time}`) > new Date()
  );
  
  const pendingAppointments = sortedAppointments.filter(
    (app) => app.status === 'pending'
  );
  
  const pastAppointments = sortedAppointments.filter(
    (app) => 
      app.status === 'completed' || 
      (app.status === 'confirmed' && new Date(`${app.date}T${app.time}`) < new Date())
  );
  
  const cancelledAppointments = sortedAppointments.filter(
    (app) => app.status === 'cancelled'
  );

  const getDoctorName = (doctorId: string) => {
    const doctor = data.doctors.find((doc) => doc.id === doctorId);
    return doctor ? doctor.name : 'Unknown Doctor';
  };

  const getDepartmentName = (departmentId: string) => {
    const department = data.departments.find((dept) => dept.id === departmentId);
    return department ? department.name : 'Unknown Department';
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    await updateAppointmentStatus(appointmentId, 'cancelled');
  };

  const getStatusBadgeClasses = (status: Appointment['status']) => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case 'confirmed':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'completed':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const appointmentDate = new Date(`${appointment.date}T${appointment.time}`);
    const isPast = appointmentDate < new Date();
    
    return (
      <Card key={appointment.id} className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center mb-2">
                <span className={getStatusBadgeClasses(appointment.status)}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </span>
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-sm text-gray-600">
                  {getDepartmentName(appointment.departmentId)}
                </span>
              </div>
              
              <h4 className="text-lg font-medium text-gray-900 mb-1">
                {getDoctorName(appointment.doctorId)}
              </h4>
              
              <p className="text-sm text-gray-600 mb-3">
                {new Date(appointment.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}{' '}
                at {appointment.time}
              </p>
              
              <p className="text-sm text-gray-700 font-medium">
                Reason: <span className="font-normal">{appointment.reason}</span>
              </p>
            </div>
            
            {(appointment.status === 'confirmed' && !isPast) && (
              <div className="mt-4 md:mt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelAppointment(appointment.id)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderAppointmentSection = (
    title: string,
    appointments: Appointment[],
    emptyMessage: string
  ) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      {appointments.length > 0 ? (
        appointments.map(renderAppointmentCard)
      ) : (
        <p className="text-gray-500">{emptyMessage}</p>
      )}
    </div>
  );

  return (
    <div>
      {renderAppointmentSection(
        'Pending Appointments',
        pendingAppointments,
        'No pending appointments'
      )}
      
      {renderAppointmentSection(
        'Upcoming Appointments',
        upcomingAppointments,
        'No upcoming appointments'
      )}
      
      {renderAppointmentSection(
        'Past Appointments',
        pastAppointments,
        'No past appointments'
      )}
      
      {renderAppointmentSection(
        'Cancelled Appointments',
        cancelledAppointments,
        'No cancelled appointments'
      )}
    </div>
  );
};

export default AppointmentsList;