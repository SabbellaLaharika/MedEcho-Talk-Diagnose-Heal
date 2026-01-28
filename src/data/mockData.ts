import { DataStore } from '../types';

// Generate a unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 11);
};

// Initial mock data
export const initialData: DataStore = {
  users: [
    {
      id: 'admin1',
      name: 'Admin User',
      email: 'admin@hospital.com',
      role: 'admin',
    },
    {
      id: 'patient1',
      name: 'John Doe',
      email: 'patient@example.com',
      role: 'patient',
      phone: '555-1234',
    },
  ],
  departments: [
    {
      id: 'dept1',
      name: 'Cardiology',
      description: 'Heart and vascular health specialists',
      imageUrl: 'https://images.pexels.com/photos/7659564/pexels-photo-7659564.jpeg?auto=compress&cs=tinysrgb&w=600',
    },
    {
      id: 'dept2',
      name: 'Neurology',
      description: 'Brain, spine, and nervous system specialists',
      imageUrl: 'https://images.pexels.com/photos/8460332/pexels-photo-8460332.jpeg?auto=compress&cs=tinysrgb&w=600',
    },
    {
      id: 'dept3',
      name: 'Orthopedics',
      description: 'Bone, joint, and muscle specialists',
      imageUrl: 'https://images.pexels.com/photos/7108344/pexels-photo-7108344.jpeg?auto=compress&cs=tinysrgb&w=600',
    },
    {
      id: 'dept4',
      name: 'Pediatrics',
      description: 'Child and adolescent healthcare',
      imageUrl: 'https://images.pexels.com/photos/7089401/pexels-photo-7089401.jpeg?auto=compress&cs=tinysrgb&w=600',
    },
  ],
  doctors: [
    {
      id: 'doc1',
      name: 'Dr. Sarah Johnson',
      departmentId: 'dept1',
      specialization: 'Cardiologist',
      imageUrl: 'https://images.pexels.com/photos/5214958/pexels-photo-5214958.jpeg?auto=compress&cs=tinysrgb&w=600',
      availability: {
        Monday: { start: '09:00', end: '17:00', slotDuration: 30 },
        Tuesday: { start: '09:00', end: '17:00', slotDuration: 30 },
        Wednesday: { start: '09:00', end: '17:00', slotDuration: 30 },
        Thursday: { start: '09:00', end: '17:00', slotDuration: 30 },
        Friday: { start: '09:00', end: '15:00', slotDuration: 30 },
      }
    },
    {
      id: 'doc2',
      name: 'Dr. Michael Chen',
      departmentId: 'dept2',
      specialization: 'Neurologist',
      imageUrl: 'https://images.pexels.com/photos/5452201/pexels-photo-5452201.jpeg?auto=compress&cs=tinysrgb&w=600',
      availability: {
        Monday: { start: '10:00', end: '18:00', slotDuration: 45 },
        Wednesday: { start: '10:00', end: '18:00', slotDuration: 45 },
        Friday: { start: '10:00', end: '18:00', slotDuration: 45 },
      }
    },
    {
      id: 'doc3',
      name: 'Dr. Emily Rodriguez',
      departmentId: 'dept3',
      specialization: 'Orthopedic Surgeon',
      imageUrl: 'https://images.pexels.com/photos/5452293/pexels-photo-5452293.jpeg?auto=compress&cs=tinysrgb&w=600',
      availability: {
        Tuesday: { start: '08:00', end: '16:00', slotDuration: 60 },
        Thursday: { start: '08:00', end: '16:00', slotDuration: 60 },
      }
    },
    {
      id: 'doc4',
      name: 'Dr. James Wilson',
      departmentId: 'dept4',
      specialization: 'Pediatrician',
      imageUrl: 'https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=600',
      availability: {
        Monday: { start: '09:00', end: '17:00', slotDuration: 30 },
        Tuesday: { start: '09:00', end: '17:00', slotDuration: 30 },
        Wednesday: { start: '09:00', end: '17:00', slotDuration: 30 },
        Thursday: { start: '09:00', end: '17:00', slotDuration: 30 },
        Friday: { start: '09:00', end: '15:00', slotDuration: 30 },
      }
    },
  ],
  appointments: [
    {
      id: 'app1',
      patientId: 'patient1',
      doctorId: 'doc1',
      departmentId: 'dept1',
      date: '2025-06-15',
      time: '10:30',
      status: 'confirmed',
      reason: 'Annual checkup',
      createdAt: '2025-06-01T10:00:00Z',
      updatedAt: '2025-06-01T14:30:00Z',
    },
    {
      id: 'app2',
      patientId: 'patient1',
      doctorId: 'doc2',
      departmentId: 'dept2',
      date: '2025-06-18',
      time: '11:00',
      status: 'pending',
      reason: 'Headache consultation',
      createdAt: '2025-06-02T09:15:00Z',
      updatedAt: '2025-06-02T09:15:00Z',
    }
  ],
  notifications: [
    {
      id: 'notif1',
      userId: 'patient1',
      message: 'Your appointment with Dr. Sarah Johnson has been confirmed.',
      read: false,
      createdAt: '2025-06-01T14:30:00Z',
    }
  ]
};

// LocalStorage access
export const STORAGE_KEY = 'hospital_booking_app';

export const loadData = (): DataStore => {
  const storedData = localStorage.getItem(STORAGE_KEY);
  return storedData ? JSON.parse(storedData) : initialData;
};

export const saveData = (data: DataStore): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};