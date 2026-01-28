import React from 'react';
import { Users, Calendar, Clock, CheckCircle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Card, CardContent } from '../ui/Card';

const DashboardStats: React.FC = () => {
  const { data } = useData();
  
  // Calculate statistics
  const totalPatients = data.users.filter(user => user.role === 'patient').length;
  const totalDoctors = data.doctors.length;
  const totalAppointments = data.appointments.length;
  
  const pendingAppointments = data.appointments.filter(
    app => app.status === 'pending'
  ).length;
  
  const confirmedAppointments = data.appointments.filter(
    app => app.status === 'confirmed'
  ).length;
  
  const cancelledAppointments = data.appointments.filter(
    app => app.status === 'cancelled'
  ).length;
  
  const completedAppointments = data.appointments.filter(
    app => app.status === 'completed'
  ).length;
  
  // Calculate today's appointments
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = data.appointments.filter(app => app.date === today).length;

  const stats = [
    {
      title: 'Total Patients',
      value: totalPatients,
      icon: <Users className="h-8 w-8 text-blue-500" />,
      color: 'bg-blue-50'
    },
    {
      title: 'Total Doctors',
      value: totalDoctors,
      icon: <Users className="h-8 w-8 text-teal-500" />,
      color: 'bg-teal-50'
    },
    {
      title: 'Today\'s Appointments',
      value: todayAppointments,
      icon: <Calendar className="h-8 w-8 text-indigo-500" />,
      color: 'bg-indigo-50'
    },
    {
      title: 'Pending Appointments',
      value: pendingAppointments,
      icon: <Clock className="h-8 w-8 text-yellow-500" />,
      color: 'bg-yellow-50'
    },
    {
      title: 'Confirmed Appointments',
      value: confirmedAppointments,
      icon: <CheckCircle className="h-8 w-8 text-green-500" />,
      color: 'bg-green-50'
    },
    {
      title: 'Total Appointments',
      value: totalAppointments,
      icon: <Calendar className="h-8 w-8 text-purple-500" />,
      color: 'bg-purple-50'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full mr-4 ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DashboardStats;