import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, FileText, Bell, Settings, Bot, Activity } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface SidebarProps {
  isOpen: boolean;
}

const PatientSidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { currentUser, getUserNotifications } = useData();

  const unreadNotifications = currentUser
    ? getUserNotifications(currentUser.id).filter(n => !n.read).length
    : 0;

  const menuItems = [
    { icon: <Home size={20} />, text: 'Home', path: '/patient' },
    { icon: <Bot size={20} />, text: 'AI Assistant', path: '/patient/assistant' },
    { icon: <Calendar size={20} />, text: 'Book Appointment', path: '/patient/book' },
    { icon: <FileText size={20} />, text: 'My Appointments', path: '/patient/appointments' },
    { icon: <Activity size={20} />, text: 'Medical Reports', path: '/patient/reports' },
    {
      icon: <Bell size={20} />,
      text: 'Notifications',
      path: '/patient/notifications',
      badge: unreadNotifications > 0 ? unreadNotifications : undefined
    },
    { icon: <Settings size={20} />, text: 'Settings', path: '/patient/settings' },
  ];

  const linkClasses = "flex items-center justify-between py-2 px-4 rounded-md transition-colors";
  const activeLinkClasses = "bg-blue-50 text-blue-700";
  const inactiveLinkClasses = "text-gray-600 hover:bg-gray-100";

  return (
    <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} 
      lg:translate-x-0 fixed top-16 left-0 z-20 w-64 h-[calc(100vh-64px)] 
      bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-300 ease-in-out`}
    >
      <div className="p-4">
        <div className="mb-6">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-4">
            Patient Portal
          </h2>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `${linkClasses} ${isActive ? activeLinkClasses : inactiveLinkClasses}`
                }
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.text}</span>
                </div>
                {item.badge && (
                  <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium leading-none text-white bg-red-500 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default PatientSidebar;