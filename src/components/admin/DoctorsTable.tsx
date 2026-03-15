import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Button from '../ui/Button';
import { Edit, Trash2 } from 'lucide-react';

interface DoctorsTableProps {
  onEdit: (doctorId: string) => void;
}

const DoctorsTable: React.FC<DoctorsTableProps> = ({ onEdit }) => {
  const { data, deleteDoctor } = useData();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  const doctors = data.doctors;
  
  const handleDelete = async (doctorId: string) => {
    if (confirm('Are you sure you want to delete this doctor? This action cannot be undone.')) {
      setIsDeleting(doctorId);
      try {
        await deleteDoctor(doctorId);
      } catch (error) {
        console.error('Error deleting doctor:', error);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const getDepartmentName = (departmentId: string) => {
    const department = data.departments.find(dept => dept.id === departmentId);
    return department ? department.name : 'Unknown Department';
  };
  
  const getAvailabilityDays = (availability: Record<string, any>) => {
    return Object.keys(availability).join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Doctor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Department
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Specialization
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Availability
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {doctors.length > 0 ? (
            doctors.map((doctor) => (
              <tr key={doctor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <img 
                        className="h-10 w-10 rounded-full object-cover" 
                        src={doctor.imageUrl} 
                        alt={doctor.name} 
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{doctor.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {getDepartmentName(doctor.departmentId)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {doctor.specialization}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getAvailabilityDays(doctor.availability)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(doctor.id)}
                    className="mr-2"
                  >
                    <Edit size={16} className="mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doctor.id)}
                    isLoading={isDeleting === doctor.id}
                    disabled={isDeleting !== null}
                    className="text-red-600 hover:text-red-900 hover:bg-red-50"
                  >
                    <Trash2 size={16} className="mr-1" />
                    Delete
                  </Button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                No doctors found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DoctorsTable;