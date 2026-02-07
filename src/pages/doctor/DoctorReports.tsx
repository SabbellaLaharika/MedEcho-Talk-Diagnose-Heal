import React, { useEffect, useState } from 'react';
import Header from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { Calendar, User } from 'lucide-react';

interface Report {
    id: string;
    disease: string;
    confidence: string;
    symptoms: string;
    history: string;
    createdAt: string;
    patient: {
        name: string;
        age: number;
        gender: string;
    }
}

const DoctorReports: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch all reports (needs new API endpoint or use Admin one?)
        // For now, let's assume we create an endpoint to fetch ALL diagnoses or doctor-specific ones.
        // I will use a hypothetical endpoint `/api/diagnosis/all` which I need to implement OR 
        // rely on `getDiagnosisById` loop? No, that's bad.
        // I should stick to creating the endpoint.

        // Wait, I haven't implemented `getAllDiagnoses` in backend yet!
        // I need to add that to `diagnosisController.js`.

        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/diagnosis/all', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setReports(data);
            }
        } catch (error) {
            console.error("Error fetching reports:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="pt-20 px-4 max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Patient Diagnostics Review</h1>

                {loading ? <p>Loading...</p> : (
                    <div className="space-y-4">
                        {reports.map(report => (
                            <Card key={report.id} className="p-4">
                                <div className="flex justify-between">
                                    <div className="flex gap-4">
                                        <div className="bg-gray-100 p-3 rounded-full h-12 w-12 flex items-center justify-center">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{report.patient?.name || 'Unknown Patient'}</h3>
                                            <p className="text-sm text-gray-500">
                                                {report.patient?.age ? `${report.patient.age} yrs` : 'Age N/A'} • {report.patient?.gender || 'Gender N/A'}
                                            </p>
                                            <div className="mt-2">
                                                <span className="font-semibold text-red-600">{report.disease}</span>
                                                <span className="text-sm text-gray-400 ml-2">({report.confidence})</span>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">Symptoms: {report.symptoms}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="flex items-center text-sm text-gray-500 mb-2 justify-end">
                                            <Calendar size={14} className="mr-1" />
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </div>
                                        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default DoctorReports;
