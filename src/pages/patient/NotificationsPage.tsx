import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Header from '../../components/layout/Header';
import PatientSidebar from '../../components/layout/PatientSidebar';
import PageContainer from '../../components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Bell, Check, Trash2 } from 'lucide-react';

const NotificationsPage: React.FC = () => {
  const { currentUser, getUserNotifications, markNotificationAsRead } = useData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  if (!currentUser) {
    return <div>Loading...</div>;
  }

  const notifications = getUserNotifications(currentUser.id);
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    for (const notification of unreadNotifications) {
      await markNotificationAsRead(notification.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      <PatientSidebar isOpen={isSidebarOpen} />
      
      <div className="lg:pl-64 pt-16">
        <PageContainer
          title="Notifications"
          subtitle="Stay updated with your appointment status and important messages"
          actions={
            unreadCount > 0 ? (
              <Button onClick={handleMarkAllAsRead} variant="outline">
                <Check className="h-4 w-4 mr-2" />
                Mark All as Read
              </Button>
            ) : undefined
          }
        >
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {filteredNotifications.length > 0 ? (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <Card 
                  key={notification.id}
                  className={`transition-all duration-200 ${
                    !notification.read 
                      ? 'border-l-4 border-l-blue-500 bg-blue-50' 
                      : 'hover:shadow-md'
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <Bell className={`h-4 w-4 mr-2 ${
                            !notification.read ? 'text-blue-600' : 'text-gray-400'
                          }`} />
                          {!notification.read && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                              New
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(notification.createdAt).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        <p className={`text-sm ${
                          !notification.read ? 'font-medium text-gray-900' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2 ml-4">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </h3>
                <p className="text-gray-500">
                  {filter === 'unread' 
                    ? 'All your notifications have been read.'
                    : 'You\'ll receive notifications about appointment updates and important information here.'
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </PageContainer>
      </div>
    </div>
  );
};

export default NotificationsPage;