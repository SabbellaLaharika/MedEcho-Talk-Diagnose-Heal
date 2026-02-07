import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DataStore, User, Doctor, Appointment, Notification } from '../types';


interface DataContextType {
  data: DataStore;
  currentUser: User | null;
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;
  register: (userData: Omit<User, 'id'>) => Promise<User | null>;
  addDoctor: (doctor: Omit<Doctor, 'id'>) => Promise<Doctor>;
  updateDoctor: (doctor: Doctor) => Promise<Doctor>;
  deleteDoctor: (doctorId: string) => Promise<boolean>;
  createAppointment: (appointment: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<Appointment>;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => Promise<Appointment | null>;
  getAvailableTimeSlots: (doctorId: string, date: string) => string[];
  getDoctorsByDepartment: (departmentId: string) => Doctor[];
  getAppointmentsByUser: (userId: string) => Appointment[];
  getAppointmentsByDoctor: (doctorId: string) => Appointment[];
  getAppointmentsByDepartment: (departmentId: string) => Appointment[];
  addNotification: (userId: string, message: string) => Promise<Notification>;
  markNotificationAsRead: (notificationId: string) => Promise<boolean>;
  getUserNotifications: (userId: string) => Notification[];
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DataStore>({
    users: [],
    doctors: [],
    departments: [],
    appointments: [],
    notifications: []
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [doctorsRes, deptsRes] = await Promise.all([
          fetch('http://localhost:5000/api/doctors'),
          fetch('http://localhost:5000/api/departments')
        ]);

        const doctors = await doctorsRes.json();
        const departments = await deptsRes.json();

        setData(prev => ({ ...prev, doctors, departments }));
      } catch (err) {
        console.error("Error fetching initial data", err);
      }
    };
    fetchData();
  }, []);

  // Check login status
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      // Fetch user specific data
      fetchUserAppointments(token);
    }
  }, []);

  const fetchUserAppointments = async (token: string) => {
    try {
      const res = await fetch('http://localhost:5000/api/appointments/my-appointments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const appointments = await res.json();
        setData(prev => ({ ...prev, appointments }));
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const login = async (email: string, password: string): Promise<User | null> => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (res.ok) {
        const data = await res.json();
        const user = { ...data, token: undefined }; // Remove token from user object
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('token', data.token);

        // Fetch fresh data
        fetchUserAppointments(data.token);
        return user;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const logout = (): void => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    setData(prev => ({ ...prev, appointments: [], notifications: [] }));
  };

  const register = async (userData: Omit<User, 'id'>): Promise<User | null> => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (res.ok) {
        const data = await res.json();
        const user = { ...data, token: undefined };
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        localStorage.setItem('token', data.token);
        return user;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const createAppointment = async (
    appointmentData: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<Appointment> => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:5000/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(appointmentData)
      });

      if (res.ok) {
        const newAppointment = await res.json();
        setData(prev => ({
          ...prev,
          appointments: [...prev.appointments, newAppointment]
        }));
        return newAppointment;
      }
    } catch (error) {
      console.error(error);
    }
    throw new Error("Failed to create appointment");
  };

  // Helper functions - Client side filtering for now (optimization: move to backend)
  const getAvailableTimeSlots = (doctorId: string, date: string): string[] => {
    const doctor = data.doctors.find(d => d.id === doctorId);
    if (!doctor || !doctor.availability) {
      // Fallback availability if not in DB
      // In real app, all doctors should have availability
      return ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
    }

    // Parse JSON availability if it comes as string from DB? 
    // Prisma returns Json type as object usually, but let's be safe.
    let availability = doctor.availability;
    if (typeof availability === 'string') {
      try { availability = JSON.parse(availability); } catch (e) { }
    }

    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const daySchedule = availability[dayOfWeek]; // TS might complain here if types don't match

    if (!daySchedule) return [];

    const { start, end, slotDuration } = daySchedule;
    const slots: string[] = [];

    const startTime = new Date(`${date}T${start}:00`);
    const endTime = new Date(`${date}T${end}:00`);

    // This logic relies on having ALL appointments locally for filtering
    // For now, we only have User's appointments. 
    // Ideally we should fetch "booked slots" from backend for a specific doctor/date.
    // For MVP/Proto, we will just show slots.

    let currentTime = startTime;
    while (currentTime < endTime) {
      const timeString = currentTime.toTimeString().substring(0, 5);
      slots.push(timeString);
      currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
    }

    return slots;
  };

  const getDoctorsByDepartment = (departmentId: string): Doctor[] => {
    return data.doctors.filter(doctor => doctor.departmentId === departmentId);
  };

  const getAppointmentsByUser = (_userId: string): Appointment[] => {
    return data.appointments; // Already filtered by backend for current user
  };

  // Stubs for other functions not yet connected/required for main flow
  const addDoctor = async (_d: any) => _d;
  const updateDoctor = async (_d: any) => _d;
  const deleteDoctor = async (_id: string) => true;
  const updateAppointmentStatus = async (_id: string, _status: any) => null;
  const getAppointmentsByDoctor = (_id: string) => [];
  const getAppointmentsByDepartment = (_id: string) => [];
  const addNotification = async (_uid: string, _msg: string) => ({} as Notification);
  const markNotificationAsRead = async (_id: string) => true;
  const getUserNotifications = (_uid: string) => [];

  const contextValue: DataContextType = {
    data,
    currentUser,
    login,
    logout,
    register,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    createAppointment,
    updateAppointmentStatus,
    getAvailableTimeSlots,
    getDoctorsByDepartment,
    getAppointmentsByUser,
    getAppointmentsByDoctor,
    getAppointmentsByDepartment,
    addNotification,
    markNotificationAsRead,
    getUserNotifications,
  };

  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};