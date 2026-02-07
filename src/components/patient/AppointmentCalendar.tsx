import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useData } from '../../context/DataContext';

interface AppointmentCalendarProps {
  doctorId: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  selectedTime: string | null;
}

const AppointmentCalendar: React.FC<AppointmentCalendarProps> = ({
  doctorId,
  selectedDate,
  onSelectDate,
  onSelectTime,
  selectedTime,
}) => {
  const { data, getAvailableTimeSlots } = useData();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);

  // Get the doctor to check availability
  const doctor = data.doctors.find(doc => doc.id === doctorId);

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const firstDayIndex = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Add empty cells for days before first day of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(date);
    }

    return days;
  };

  // Format date as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Check if a date is in the past
  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  // Check if a date is available for the doctor (has any availability that day)
  const isDateAvailable = (date: Date): boolean => {
    if (!doctor) return false;
    if (isPastDate(date)) return false;

    // Fallback: If no availability defined, assume available (weekdays only maybe? let's say all days for simplicity matching DataContext)
    if (!doctor.availability) return true;

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    return Boolean(doctor.availability && doctor.availability[dayName]);
  };

  // Load available time slots when date is selected
  useEffect(() => {
    if (selectedDate && doctorId) {
      const slots = getAvailableTimeSlots(doctorId, selectedDate);
      setAvailableTimeSlots(slots);
    } else {
      setAvailableTimeSlots([]);
    }
  }, [selectedDate, doctorId, getAvailableTimeSlots]);

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const days = generateCalendarDays();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-800">Select Date & Time</h3>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Calendar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button
            onClick={handlePreviousMonth}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h4 className="font-medium text-gray-700">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-10"></div>;
              }

              const dateString = formatDate(day);
              const isAvailable = isDateAvailable(day);
              const isSelected = selectedDate === dateString;

              return (
                <button
                  key={dateString}
                  onClick={() => isAvailable && onSelectDate(dateString)}
                  className={`h-10 rounded-full flex items-center justify-center transition-colors
                    ${isSelected ? 'bg-blue-500 text-white' : ''}
                    ${isAvailable && !isSelected ? 'hover:bg-blue-100' : ''}
                    ${!isAvailable ? 'text-gray-300 cursor-not-allowed' : ''}
                  `}
                  disabled={!isAvailable}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Time slot selection */}
      {selectedDate && availableTimeSlots.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Available Time Slots
          </h4>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {availableTimeSlots.map((time) => (
              <button
                key={time}
                onClick={() => onSelectTime(time)}
                className={`py-2 px-3 text-sm rounded-md transition-colors
                  ${selectedTime === time
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }
                `}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedDate && availableTimeSlots.length === 0 && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-700">
            No available time slots for the selected date. Please choose another date.
          </p>
        </div>
      )}
    </div>
  );
};

export default AppointmentCalendar;