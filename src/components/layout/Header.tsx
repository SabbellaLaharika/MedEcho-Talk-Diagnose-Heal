import React from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { NavLink, useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

interface HeaderProps {
  toggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const { currentUser, logout, getUserNotifications } = useData();
  const navigate = useNavigate();

  const notifications = currentUser
    ? getUserNotifications(currentUser.id).filter(n => !n.read)
    : [];

  const hasUnreadNotifications = notifications.length > 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            {toggleSidebar && (
              <button
                onClick={toggleSidebar}
                className="mr-2 text-gray-500 focus:outline-none lg:hidden"
              >
                {isSidebarOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            )}
            <NavLink to="/" className="flex items-center">
              <span className="text-blue-600 font-bold text-xl">MedEcho</span>
            </NavLink>
          </div>

          <div className="flex items-center">
            {currentUser ? (
              <>
                <NavLink
                  to="/notifications"
                  className="relative p-2 text-gray-500 hover:text-gray-700 mr-4"
                >
                  <Bell className="h-5 w-5" />
                  {hasUnreadNotifications && (
                    <span className="absolute top-1 right-1 inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </NavLink>
                <div className="hidden md:block mr-4">
                  <span className="text-sm text-gray-600">Hi, {currentUser.name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                >
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;