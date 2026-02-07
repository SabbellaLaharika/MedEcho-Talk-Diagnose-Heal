import React, { useState } from 'react';
import Header from './Header';
import PatientSidebar from './PatientSidebar';
import { Outlet } from 'react-router-dom';

const PatientLayout: React.FC = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
            <PatientSidebar isOpen={isSidebarOpen} />

            {/* Main Content Area */}
            {/* Added left padding for sidebar space on large screens and top padding for header */}
            <div className="lg:pl-64 pt-16 transition-all duration-300">
                <Outlet />
            </div>
        </div>
    );
};

export default PatientLayout;
