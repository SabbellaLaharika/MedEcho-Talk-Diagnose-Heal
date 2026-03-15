import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { Card, CardContent } from '../ui/Card';

const DepartmentList: React.FC = () => {
  const { data } = useData();
  const navigate = useNavigate();
  const { departments } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {departments.map((department) => (
        <Card 
          key={department.id}
          className="overflow-hidden transform transition-transform duration-300 hover:scale-105 cursor-pointer"
          onClick={() => navigate(`/patient/book/${department.id}`)}
        >
          <div className="h-40 overflow-hidden">
            <img 
              src={department.imageUrl} 
              alt={department.name} 
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
            />
          </div>
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg text-gray-800 mb-2">{department.name}</h3>
            <p className="text-gray-600 text-sm">{department.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DepartmentList;