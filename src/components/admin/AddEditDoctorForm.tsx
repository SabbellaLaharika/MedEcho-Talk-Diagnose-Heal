import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Doctor } from '../../types';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../ui/Card';

interface AddEditDoctorFormProps {
  doctorId?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const daysOfWeek = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

const AddEditDoctorForm: React.FC<AddEditDoctorFormProps> = ({
  doctorId,
  onCancel,
  onSuccess,
}) => {
  const { data, addDoctor, updateDoctor } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
    specialization: '',
    imageUrl: '',
    availability: {} as Doctor['availability']
  });
  
  // Initialize with existing doctor data if editing
  useEffect(() => {
    if (doctorId) {
      const doctor = data.doctors.find(d => d.id === doctorId);
      if (doctor) {
        setFormData({
          name: doctor.name,
          departmentId: doctor.departmentId,
          specialization: doctor.specialization,
          imageUrl: doctor.imageUrl,
          availability: { ...doctor.availability }
        });
      }
    }
  }, [doctorId, data.doctors]);
  
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  
  // Update selected days when availability changes
  useEffect(() => {
    setSelectedDays(Object.keys(formData.availability));
  }, [formData.availability]);
  
  const handleDaySelection = (day: string) => {
    if (selectedDays.includes(day)) {
      // Remove day and its schedule
      setSelectedDays(selectedDays.filter(d => d !== day));
      
      const newAvailability = { ...formData.availability };
      delete newAvailability[day];
      
      setFormData({
        ...formData,
        availability: newAvailability
      });
    } else {
      // Add day with default schedule
      setSelectedDays([...selectedDays, day]);
      
      setFormData({
        ...formData,
        availability: {
          ...formData.availability,
          [day]: { start: '09:00', end: '17:00', slotDuration: 30 }
        }
      });
    }
  };
  
  const handleAvailabilityChange = (day: string, field: string, value: string | number) => {
    setFormData({
      ...formData,
      availability: {
        ...formData.availability,
        [day]: {
          ...formData.availability[day],
          [field]: field === 'slotDuration' ? Number(value) : value
        }
      }
    });
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const validateForm = () => {
    if (!formData.name.trim()) return false;
    if (!formData.departmentId) return false;
    if (!formData.specialization.trim()) return false;
    if (!formData.imageUrl.trim()) return false;
    if (Object.keys(formData.availability).length === 0) return false;
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      setError('Please fill out all required fields');
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (doctorId) {
        // Update existing doctor
        await updateDoctor({
          id: doctorId,
          ...formData
        });
      } else {
        // Add new doctor
        await addDoctor(formData);
      }
      
      onSuccess();
    } catch (err) {
      console.error('Error saving doctor:', err);
      setError('An error occurred while saving');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{doctorId ? 'Edit Doctor' : 'Add New Doctor'}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Doctor Name"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              fullWidth
              required
            />
            
            <Select
              label="Department"
              id="departmentId"
              name="departmentId"
              value={formData.departmentId}
              onChange={handleChange}
              options={data.departments.map(dept => ({
                value: dept.id,
                label: dept.name
              }))}
              fullWidth
              required
            />
            
            <Input
              label="Specialization"
              id="specialization"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              fullWidth
              required
            />
            
            <Input
              label="Profile Image URL"
              id="imageUrl"
              name="imageUrl"
              value={formData.imageUrl}
              onChange={handleChange}
              fullWidth
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Availability
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                {daysOfWeek.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleDaySelection(day)}
                    className={`py-2 px-3 text-sm rounded-md transition-colors ${
                      selectedDays.includes(day)
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              
              {selectedDays.length > 0 && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-700">Schedule for Selected Days</h4>
                  {selectedDays.map(day => (
                    <div key={day} className="p-3 bg-gray-50 rounded-md">
                      <h5 className="font-medium text-gray-700 mb-2">{day}</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Start Time
                          </label>
                          <input
                            type="time"
                            value={formData.availability[day].start}
                            onChange={(e) => 
                              handleAvailabilityChange(day, 'start', e.target.value)
                            }
                            className="block w-full rounded-md border border-gray-300 shadow-sm text-sm p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            End Time
                          </label>
                          <input
                            type="time"
                            value={formData.availability[day].end}
                            onChange={(e) => 
                              handleAvailabilityChange(day, 'end', e.target.value)
                            }
                            className="block w-full rounded-md border border-gray-300 shadow-sm text-sm p-2"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">
                            Slot Duration (minutes)
                          </label>
                          <select
                            value={formData.availability[day].slotDuration}
                            onChange={(e) => 
                              handleAvailabilityChange(day, 'slotDuration', e.target.value)
                            }
                            className="block w-full rounded-md border border-gray-300 shadow-sm text-sm p-2"
                          >
                            <option value="15">15 minutes</option>
                            <option value="30">30 minutes</option>
                            <option value="45">45 minutes</option>
                            <option value="60">60 minutes</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} onClick={handleSubmit}>
          {doctorId ? 'Update Doctor' : 'Add Doctor'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddEditDoctorForm;