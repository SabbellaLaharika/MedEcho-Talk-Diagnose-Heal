import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Header from '../../components/layout/Header';
import AdminSidebar from '../../components/layout/AdminSidebar';
import PageContainer from '../../components/layout/PageContainer';
import DashboardStats from '../../components/admin/DashboardStats';
import { Card, CardContent } from '../../components/ui/Card';
import { useNavigate } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const { currentUser, data } = useData();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  if (!currentUser || currentUser.role !== 'admin') {
    navigate('/login');
    return null;
  }

  // Get recent appointments (last 5)
  const recentAppointments = [...data.appointments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  
  // Get pending appointments
  const pendingAppointments = data.appointments.filter(app => app.status === 'pending').length;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getPatientName = (patientId: string) => {
    const patient = data.users.find(user => user.id === patientId);
    return patient ? patient.name : 'Unknown Patient';
  };

  const getDoctorName = (doctorId: string) => {
    const doctor = data.doctors.find(doc => doc.id === doctorId);
    return doctor ? doctor.name : 'Unknown Doctor';
  };

  const getStatusBadgeClasses = (status: string) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <AdminSidebar isOpen={isSidebarOpen} />
      
      <div className="lg:pl-64 pt-16">
        <PageContainer
          title="Admin Dashboard"
          subtitle="Overview of hospital operations and statistics"
        >
          <DashboardStats />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Appointments</h2>
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentAppointments.map((appointment) => (
                        <tr key={appointment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(appointment.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getPatientName(appointment.patientId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {getDoctorName(appointment.doctorId)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={getStatusBadgeClasses(appointment.status)}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {recentAppointments.length === 0 && (
                    <p className="text-center py-4 text-gray-500">No recent appointments</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col h-full">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Summary</h2>
                  
                  <div className="space-y-4 flex-grow">
                    <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-sm font-medium text-yellow-800">Pending Approvals</h3>
                          <p className="text-2xl font-bold text-yellow-900">{pendingAppointments}</p>
                        </div>
                        <span className="text-yellow-400">
                          {pendingAppointments > 0 ? '⚠️ Action required' : '✓ All clear'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-blue-800">Total Doctors</h3>
                        <p className="text-2xl font-bold text-blue-900">{data.doctors.length}</p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                        <h3 className="text-sm font-medium text-green-800">Total Patients</h3>
                        <p className="text-2xl font-bold text-green-900">
                          {data.users.filter(user => user.role === 'patient').length}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                      <h3 className="text-sm font-medium text-indigo-800">Departments</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {data.departments.map(dept => (
                          <span 
                            key={dept.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                          >
                            {dept.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      </div>
    </div>
  );
};

export default AdminDashboard;