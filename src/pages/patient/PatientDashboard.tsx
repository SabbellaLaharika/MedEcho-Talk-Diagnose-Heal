import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Header from '../../components/layout/Header';
import PatientSidebar from '../../components/layout/PatientSidebar';
import PageContainer from '../../components/layout/PageContainer';
import { Card, CardContent } from '../../components/ui/Card';
import { Calendar, Clock, Check, X } from 'lucide-react';
import Button from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const PatientDashboard: React.FC = () => {
  const { currentUser, data, getUserNotifications, markNotificationAsRead } = useData();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  if (!currentUser) {
    return <div>Loading...</div>;
  }

  // Get patient appointments
  const appointments = data.appointments.filter(
    appointment => appointment.patientId === currentUser.id
  );
  
  // Filter upcoming appointments (confirmed status and future date)
  const upcomingAppointments = appointments.filter(app => {
    if (app.status !== 'confirmed') return false;
    
    const appointmentDate = new Date(`${app.date}T${app.time}`);
    return appointmentDate > new Date();
  });
  
  // Get latest upcoming appointment
  const nextAppointment = upcomingAppointments.sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`);
    const dateB = new Date(`${b.date}T${b.time}`);
    return dateA.getTime() - dateB.getTime();
  })[0];
  
  // Get counts
  const pendingCount = appointments.filter(app => app.status === 'pending').length;
  const confirmedCount = upcomingAppointments.length;
  const completedCount = appointments.filter(app => app.status === 'completed').length;
  const cancelledCount = appointments.filter(app => app.status === 'cancelled').length;
  
  // Get notifications
  const notifications = getUserNotifications(currentUser.id);
  const unreadNotifications = notifications.filter(n => !n.read);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getDoctorName = (doctorId: string) => {
    const doctor = data.doctors.find(doc => doc.id === doctorId);
    return doctor ? doctor.name : 'Unknown Doctor';
  };

  const getDepartmentName = (departmentId: string) => {
    const department = data.departments.find(dept => dept.id === departmentId);
    return department ? department.name : 'Unknown Department';
  };

  const handleReadNotification = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <PatientSidebar isOpen={isSidebarOpen} />
      
      <div className="lg:pl-64 pt-16">
        <PageContainer
          title={`Welcome, ${currentUser.name}`}
          subtitle="Manage your appointments and health information"
        >
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-indigo-50 border border-indigo-100">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 rounded-md bg-indigo-500 mr-4">
                      <Clock className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-indigo-600">Pending</p>
                      <p className="text-2xl font-bold text-indigo-900">{pendingCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50 border border-green-100">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 rounded-md bg-green-500 mr-4">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-600">Upcoming</p>
                      <p className="text-2xl font-bold text-green-900">{confirmedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-blue-50 border border-blue-100">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 rounded-md bg-blue-500 mr-4">
                      <Check className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-600">Completed</p>
                      <p className="text-2xl font-bold text-blue-900">{completedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-red-50 border border-red-100">
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="p-2 rounded-md bg-red-500 mr-4">
                      <X className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-600">Cancelled</p>
                      <p className="text-2xl font-bold text-red-900">{cancelledCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Next Appointment</h2>
                  
                  {nextAppointment ? (
                    <div className="bg-white rounded-lg">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm text-blue-600 mb-1">
                            {getDepartmentName(nextAppointment.departmentId)}
                          </p>
                          <h3 className="text-lg font-medium text-gray-900 mb-1">
                            {getDoctorName(nextAppointment.doctorId)}
                          </h3>
                          <p className="text-gray-600">
                            {new Date(nextAppointment.date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}{' '}
                            at {nextAppointment.time}
                          </p>
                          <p className="mt-2 text-gray-700">
                            Reason: {nextAppointment.reason}
                          </p>
                        </div>
                        
                        <div className="mt-4 md:mt-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/patient/appointments')}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 mb-4">No upcoming appointments</p>
                      <Button
                        onClick={() => navigate('/patient/book')}
                      >
                        Book an Appointment
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Recent Notifications</h2>
                    {unreadNotifications.length > 0 && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {unreadNotifications.length} unread
                      </span>
                    )}
                  </div>
                  
                  {notifications.length > 0 ? (
                    <div className="space-y-3">
                      {notifications.slice(0, 5).map((notification) => (
                        <div 
                          key={notification.id}
                          className={`p-3 rounded-md ${!notification.read ? 'bg-blue-50' : 'bg-gray-50'}`}
                        >
                          <div className="flex justify-between">
                            <p className={`text-sm ${!notification.read ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
                              {notification.message}
                            </p>
                            {!notification.read && (
                              <button
                                onClick={() => handleReadNotification(notification.id)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      ))}
                      
                      {notifications.length > 5 && (
                        <div className="text-center pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/patient/notifications')}
                          >
                            View all notifications
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-600 text-center py-4">No notifications</p>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Quick Actions</h2>
                  <div className="space-y-2">
                    <Button
                      className="w-full justify-start"
                      onClick={() => navigate('/patient/book')}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Book New Appointment
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate('/patient/appointments')}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      View All Appointments
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="mt-6">
                <CardContent className="p-5">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Departments</h2>
                  <div className="space-y-3">
                    {data.departments.map((department) => (
                      <div 
                        key={department.id}
                        className="flex items-center p-3 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => navigate(`/patient/book/${department.id}`)}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden mr-3 flex-shrink-0">
                          <img 
                            src={department.imageUrl} 
                            alt={department.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{department.name}</h3>
                          <p className="text-sm text-gray-600">{department.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </PageContainer>
      </div>
    </div>
  );
};

export default PatientDashboard;