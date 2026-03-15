import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Header from '../../components/layout/Header';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../../components/ui/Card';
import { Activity, Calendar } from 'lucide-react';

const DoctorDashboard: React.FC = () => {
    const { currentUser } = useData();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (!currentUser || currentUser.role !== 'doctor') {
        return <div>Loading...</div>; // Or redirect
    }

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />

            <main className="pt-20 px-4 max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
                    <p className="text-gray-600">Welcome Dr. {currentUser.name}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="bg-blue-50 border-blue-200 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/doctor/reports')}>
                        <CardContent className="p-6 flex items-center">
                            <div className="p-3 bg-blue-500 rounded-full text-white mr-4">
                                <Activity size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-blue-900">Patient Reports</h2>
                                <p className="text-blue-700">View AI Diagnoses</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-200 cursor-pointer hover:shadow-md transition">
                        <CardContent className="p-6 flex items-center">
                            <div className="p-3 bg-green-500 rounded-full text-white mr-4">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-green-900">Appointments</h2>
                                <p className="text-green-700">Manage Schedule</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h2 className="text-xl font-semibold mb-4">Quick actions</h2>
                    <p className="text-gray-500">Select a card above to get started.</p>
                </div>
            </main>
        </div>
    );
};

export default DoctorDashboard;
