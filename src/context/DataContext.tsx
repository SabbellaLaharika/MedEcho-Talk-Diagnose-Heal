import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DataStore, User, Department, Doctor, Appointment, Notification } from '../types';
import { loadData, saveData, generateId } from '../data/mockData';

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
  const [data, setData] = useState<DataStore>(loadData());
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    saveData(data);
  }, [data]);

  // Check if user is already logged in from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  // Authentication functions
  const login = async (email: string, password: string): Promise<User | null> => {
    // In a real app, we would validate credentials against backend
    // For mock purposes, we're just checking if the email exists
    const user = data.users.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    }
    return null;
  };

  const logout = (): void => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const register = async (userData: Omit<User, 'id' | 'role'>): Promise<User | null> => {
    // Check if user already exists
    const existingUser = data.users.find(u => u.email === userData.email);
    if (existingUser) {
      return null;
    }

    const newUser: User = {
      ...userData,
      id: generateId()
    };

    setData(prevData => ({
      ...prevData,
      users: [...prevData.users, newUser]
    }));

    return newUser;
  };

  // Doctor management
  const addDoctor = async (doctorData: Omit<Doctor, 'id'>): Promise<Doctor> => {
    const newDoctor: Doctor = {
      ...doctorData,
      id: generateId()
    };

    setData(prevData => ({
      ...prevData,
      doctors: [...prevData.doctors, newDoctor]
    }));

    return newDoctor;
  };

  const updateDoctor = async (doctor: Doctor): Promise<Doctor> => {
    setData(prevData => ({
      ...prevData,
      doctors: prevData.doctors.map(d => d.id === doctor.id ? doctor : d)
    }));
    return doctor;
  };

  const deleteDoctor = async (doctorId: string): Promise<boolean> => {
    setData(prevData => ({
      ...prevData,
      doctors: prevData.doctors.filter(d => d.id !== doctorId)
    }));
    return true;
  };

  // Appointment management
  const createAppointment = async (
    appointmentData: Omit<Appointment, 'id' | 'status' | 'createdAt' | 'updatedAt'>
  ): Promise<Appointment> => {
    const now = new Date().toISOString();
    const newAppointment: Appointment = {
      ...appointmentData,
      id: generateId(),
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    setData(prevData => ({
      ...prevData,
      appointments: [...prevData.appointments, newAppointment]
    }));

    // Create notification for the patient
    await addNotification(
      appointmentData.patientId,
      `Your appointment request has been received and is pending confirmation.`
    );

    return newAppointment;
  };

  const updateAppointmentStatus = async (
    id: string,
    status: Appointment['status']
  ): Promise<Appointment | null> => {
    let updatedAppointment: Appointment | null = null;

    setData(prevData => {
      const appointment = prevData.appointments.find(a => a.id === id);
      if (!appointment) return prevData;

      updatedAppointment = {
        ...appointment,
        status,
        updatedAt: new Date().toISOString()
      };

      return {
        ...prevData,
        appointments: prevData.appointments.map(a => (a.id === id ? updatedAppointment! : a))
      };
    });

    if (updatedAppointment) {
      // Create notification for the patient
      const statusMessage = status === 'confirmed' 
        ? 'Your appointment has been confirmed.'
        : status === 'cancelled' 
          ? 'Your appointment has been cancelled.'
          : status === 'completed' 
            ? 'Your appointment has been marked as completed.'
            : 'Your appointment status has been updated.';
            
      await addNotification(updatedAppointment.patientId, statusMessage);
    }

    return updatedAppointment;
  };

  // Helper functions
  const getAvailableTimeSlots = (doctorId: string, date: string): string[] => {
    const doctor = data.doctors.find(d => d.id === doctorId);
    if (!doctor) return [];

    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const daySchedule = doctor.availability[dayOfWeek];
    
    if (!daySchedule) return [];

    const { start, end, slotDuration } = daySchedule;
    const slots: string[] = [];
    
    const startTime = new Date(`${date}T${start}:00`);
    const endTime = new Date(`${date}T${end}:00`);
    
    // Get all existing appointments for this doctor on this date
    const existingAppointments = data.appointments.filter(
      a => a.doctorId === doctorId && a.date === date && ['confirmed', 'pending'].includes(a.status)
    );
    
    const bookedTimes = new Set(existingAppointments.map(a => a.time));
    
    let currentTime = startTime;
    while (currentTime < endTime) {
      const timeString = currentTime.toTimeString().substring(0, 5);
      if (!bookedTimes.has(timeString)) {
        slots.push(timeString);
      }
      currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
    }
    
    return slots;
  };

  const getDoctorsByDepartment = (departmentId: string): Doctor[] => {
    return data.doctors.filter(doctor => doctor.departmentId === departmentId);
  };

  const getAppointmentsByUser = (userId: string): Appointment[] => {
    return data.appointments.filter(appointment => appointment.patientId === userId);
  };

  const getAppointmentsByDoctor = (doctorId: string): Appointment[] => {
    return data.appointments.filter(appointment => appointment.doctorId === doctorId);
  };

  const getAppointmentsByDepartment = (departmentId: string): Appointment[] => {
    return data.appointments.filter(appointment => appointment.departmentId === departmentId);
  };

  // Notification management
  const addNotification = async (userId: string, message: string): Promise<Notification> => {
    const newNotification: Notification = {
      id: generateId(),
      userId,
      message,
      read: false,
      createdAt: new Date().toISOString()
    };

    setData(prevData => ({
      ...prevData,
      notifications: [...prevData.notifications, newNotification]
    }));

    return newNotification;
  };

  const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
    setData(prevData => ({
      ...prevData,
      notifications: prevData.notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    }));
    return true;
  };

  const getUserNotifications = (userId: string): Notification[] => {
    return data.notifications
      .filter(notification => notification.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

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