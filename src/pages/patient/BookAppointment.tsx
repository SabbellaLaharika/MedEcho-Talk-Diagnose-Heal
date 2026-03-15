import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import PageContainer from '../../components/layout/PageContainer';
import DepartmentList from '../../components/patient/DepartmentList';
import DoctorSelection from '../../components/patient/DoctorSelection';
import AppointmentCalendar from '../../components/patient/AppointmentCalendar';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../../components/ui/Card';

const BookAppointment: React.FC = () => {
  const { departmentId } = useParams<{ departmentId?: string }>();
  const { currentUser, data, createAppointment } = useData();
  const navigate = useNavigate();

  // Form state
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(departmentId || null);
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  // Sync state with URL params
  useEffect(() => {
    if (departmentId) {
      setSelectedDepartment(departmentId);
      setActiveStep(2);
    } else {
      setSelectedDepartment(null);
      setActiveStep(1);
    }
  }, [departmentId]);

  // Reset doctor when department changes
  useEffect(() => {
    setSelectedDoctor(null);
    setSelectedDate(null);
    setSelectedTime(null);
  }, [selectedDepartment]);

  // Reset date and time when doctor changes
  useEffect(() => {
    setSelectedDate(null);
    setSelectedTime(null);
  }, [selectedDoctor]);

  // Reset time when date changes
  useEffect(() => {
    setSelectedTime(null);
  }, [selectedDate]);



  const handleSubmit = async () => {
    if (!currentUser || !selectedDepartment || !selectedDoctor || !selectedDate || !selectedTime) {
      return;
    }

    setIsSubmitting(true);

    try {
      const appointmentData = {
        patientId: currentUser.id,
        doctorId: selectedDoctor,
        departmentId: selectedDepartment,
        date: selectedDate,
        time: selectedTime,
        reason: reason.trim() || 'General consultation',
      };

      await createAppointment(appointmentData);
      navigate('/patient/appointments');
    } catch (error) {
      console.error('Error creating appointment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepContent = () => {
    switch (activeStep) {
      case 1:
        return (
          <div className="pt-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              Select a Department
            </h2>
            <DepartmentList />
          </div>
        );
      case 2:
        if (!selectedDepartment) return null;

        const department = data.departments.find(dept => dept.id === selectedDepartment);

        return (
          <Card>
            <CardHeader>
              <CardTitle>Book an Appointment with {department?.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <DoctorSelection
                  departmentId={selectedDepartment}
                  selectedDoctor={selectedDoctor}
                  onSelectDoctor={setSelectedDoctor}
                />

                {selectedDoctor && (
                  <AppointmentCalendar
                    doctorId={selectedDoctor}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    selectedTime={selectedTime}
                    onSelectTime={setSelectedTime}
                  />
                )}

                {selectedDate && selectedTime && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Appointment Reason</h3>
                    <Input
                      placeholder="Reason for your visit (optional)"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      fullWidth
                    />
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => navigate('/patient/book')}
              >
                Back to Departments
              </Button>
              <Button
                disabled={!selectedDoctor || !selectedDate || !selectedTime}
                isLoading={isSubmitting}
                onClick={handleSubmit}
              >
                Confirm Appointment
              </Button>
            </CardFooter>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <PageContainer
      title="Book an Appointment"
      subtitle="Schedule a consultation with our specialists"
    >
      {getStepContent()}
    </PageContainer>
  );
};

export default BookAppointment;