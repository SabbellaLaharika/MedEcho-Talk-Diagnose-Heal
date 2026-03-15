import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Calendar, Users, User, Stethoscope, LogOut } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface SidebarProps {
  isOpen: boolean;
}

const AdminSidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { logout } = useData();
  
  const menuItems = [
    { icon: <Home size={20} />, text: 'Dashboard', path: '/admin' },
    { icon: <Calendar size={20} />, text: 'Appointments', path: '/admin/appointments' },
    { icon: <Stethoscope size={20} />, text: 'Doctors', path: '/admin/doctors' },
    { icon: <Users size={20} />, text: 'Departments', path: '/admin/departments' },
    { icon: <User size={20} />, text: 'Patients', path: '/admin/patients' },
  ];

  const linkClasses = "flex items-center gap-2 py-2 px-4 rounded-md transition-colors";
  const activeLinkClasses = "bg-blue-50 text-blue-700";
  const inactiveLinkClasses = "text-gray-600 hover:bg-gray-100";

  return (
    <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} 
      lg:translate-x-0 fixed top-16 left-0 z-20 w-64 h-[calc(100vh-64px)] 
      bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-300 ease-in-out`}
    >
      <div className="p-4">
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
            Admin Portal
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
                {item.icon}
                <span>{item.text}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        
        <div className="border-t border-gray-200 pt-4">
          <button 
            onClick={() => logout()}
            className={`${linkClasses} ${inactiveLinkClasses} w-full text-left`}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;