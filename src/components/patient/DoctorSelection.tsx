import React from 'react';
import { useData } from '../../context/DataContext';
import { Doctor } from '../../types';
import { Card, CardContent } from '../ui/Card';

interface DoctorSelectionProps {
  departmentId: string;
  selectedDoctor: string | null;
  onSelectDoctor: (doctorId: string) => void;
}

const DoctorSelection: React.FC<DoctorSelectionProps> = ({
  departmentId,
  selectedDoctor,
  onSelectDoctor,
}) => {
  const { getDoctorsByDepartment } = useData();
  const doctors = getDoctorsByDepartment(departmentId);

  if (doctors.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">No doctors available in this department.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-800 mb-4">Select Doctor</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {doctors.map((doctor: Doctor) => (
          <Card
            key={doctor.id}
            className={`cursor-pointer transform transition-all duration-200 ${
              selectedDoctor === doctor.id
                ? 'ring-2 ring-blue-500 shadow-md scale-[1.02]'
                : 'hover:shadow-md hover:scale-[1.01]'
            }`}
            onClick={() => onSelectDoctor(doctor.id)}
          >
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="flex-shrink-0">
                <img
                  src={doctor.imageUrl}
                  alt={doctor.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-md font-medium text-gray-900 truncate">
                  {doctor.name}
                </h4>
                <p className="text-sm text-gray-500 truncate">{doctor.specialization}</p>
                <div className="mt-1 text-xs text-gray-600">
                  {Object.keys(doctor.availability).length > 0 ? (
                    <p>Available on: {Object.keys(doctor.availability).join(', ')}</p>
                  ) : (
                    <p>No availability information</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DoctorSelection;