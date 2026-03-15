import React, { useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { Card } from '../../components/ui/Card';
import { FileText, Calendar, Activity } from 'lucide-react';

interface Report {
    id: string;
    disease: string;
    confidence: string;
    symptoms: string;
    history: string; // JSON string
    createdAt: string;
}

const MedicalReports: React.FC = () => {
    const { currentUser } = useData();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    useEffect(() => {
        if (currentUser) {
            fetchReports();
        }
    }, [currentUser]);

    const fetchReports = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/diagnosis/my-reports', {
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

    const parseHistory = (jsonStr: string) => {
        try {
            return JSON.parse(jsonStr);
        } catch {
            return {};
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Medical Reports</h1>
                    <p className="text-sm text-gray-500">Your AI-generated diagnosis history</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* List of Reports */}
                <div className="md:col-span-1 space-y-4">
                    {loading ? (
                        <p>Loading reports...</p>
                    ) : reports.length === 0 ? (
                        <Card className="p-6 text-center text-gray-500">
                            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No reports found.</p>
                        </Card>
                    ) : (
                        reports.map(report => (
                            <div
                                key={report.id}
                                onClick={() => setSelectedReport(report)}
                                className={`p-4 bg-white rounded-lg shadow-sm border cursor-pointer hover:border-blue-500 transition-colors ${selectedReport?.id === report.id ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-gray-800">{report.disease}</h3>
                                        <p className="text-xs text-gray-500 flex items-center mt-1">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {new Date(report.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                        {report.confidence}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Report Details */}
                <div className="md:col-span-2">
                    {selectedReport ? (
                        <Card className="p-6 bg-white shadow-md">
                            <div className="border-b pb-4 mb-4 flex justify-between items-center">
                                <h2 className="text-xl font-bold text-blue-600">Diagnosis Report</h2>
                                <span className="text-sm text-gray-400">ID: {selectedReport.id?.substring(0, 8)}</span>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Predicted Condition</h3>
                                    <div className="text-2xl font-bold text-gray-800 flex items-center">
                                        <Activity className="h-6 w-6 mr-2 text-red-500" />
                                        {selectedReport.disease}
                                        <span className="ml-3 text-sm font-normal text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                            Confidence: {selectedReport.confidence}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Reported Symptoms</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedReport.symptoms?.split(',').map((s, i) => (
                                            <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                                                {s.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Patient History (Q&A)</h3>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                        {selectedReport.history && Object.entries(parseHistory(selectedReport.history)).length > 0 ? (
                                            Object.entries(parseHistory(selectedReport.history)).map(([key, value]: [string, any]) => (
                                                <div key={key} className="grid grid-cols-3 gap-4 border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                                    <span className="font-medium text-gray-700 capitalize col-span-1">{key}</span>
                                                    <span className="text-gray-600 col-span-2">{value}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-gray-400 italic">No additional history recorded.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t flex justify-end">
                                    <button
                                        onClick={() => window.print()}
                                        className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition"
                                    >
                                        Print Report
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg p-12">
                            <FileText className="h-16 w-16 mb-4 opacity-20" />
                            <p>Select a report to view details</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MedicalReports;
