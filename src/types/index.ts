export type User = {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'admin' | 'doctor' | 'staff';
  phone?: string;
};

export type Department = {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
};

export type Doctor = {
  id: string;
  name: string;
  departmentId: string;
  specialization: string;
  imageUrl: string;
  availability: {
    [day: string]: {
      start: string;
      end: string;
      slotDuration: number; // in minutes
    };
  };
};

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export type Appointment = {
  id: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  date: string; // ISO date string
  time: string; // HH:MM format
  status: AppointmentStatus;
  reason: string;
  createdAt: string;
  updatedAt: string;
};

export type Notification = {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
};

// Mock data storage interface
export interface DataStore {
  users: User[];
  departments: Department[];
  doctors: Doctor[];
  appointments: Appointment[];
  notifications: Notification[];
}