import { User, Appointment, MedicalReport } from '../types';
import api from './api';

const KEYS = {
  CURRENT_USER: 'medecho_session'
};

export const dbService = {
  init: () => {
    // No init needed for API, potentially check session
  },

  auth: {
    register: async (user: User, password?: string): Promise<User> => {
      // Send password with user data
      const payload = { ...user, password: password || '123456' };
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(data)); // Save { token, user }
      return data.user;
    },
    login: async (email: string, password?: string): Promise<User> => {
      // For now, sending email as password for simplicity in existing mock flow
      // In real app, we need password field in UI
      // Use provided password or default to '123456' for demo accounts
      const defaultPassword = '123456';
      const { data } = await api.post('/auth/login', { email, password: password || defaultPassword });
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(data)); // Save { token, user }
      return data.user;
    },
    updateUser: async (updatedUser: User): Promise<User> => {
      const { data } = await api.put(`/users/${updatedUser.id}`, updatedUser);
      // We might need to handle token persistence if valid, or just update user part
      // For simplicity, let's assume update returns User. 
      // Current session handling might need logic to merge, but let's stick to simple first.
      const currentSession = JSON.parse(localStorage.getItem(KEYS.CURRENT_USER) || '{}');
      const newSession = { ...currentSession, user: data };
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(newSession));
      return data;
    },
    logout: () => {
      localStorage.removeItem(KEYS.CURRENT_USER);
    },
    getCurrentUser: (): User | null => {
      const data = localStorage.getItem(KEYS.CURRENT_USER);
      return data ? JSON.parse(data).user : null;
    }
  },

  appointments: {
    getAll: async (): Promise<Appointment[]> => {
      const user = dbService.auth.getCurrentUser();
      if (!user) return [];
      const { data } = await api.get(`/appointments/${user.id}?role=${user.role}`);
      return data;
    },
    create: async (apt: Appointment): Promise<Appointment> => {
      const { data } = await api.post('/appointments', apt);
      return data;
    },
    update: async (updatedApt: Appointment): Promise<Appointment> => {
      const { data } = await api.put(`/appointments/${updatedApt.id}`, updatedApt);
      return data;
    },
    delete: async (id: string): Promise<void> => {
      await api.delete(`/appointments/${id}`);
    }
  },

  reports: {
    getAll: async (): Promise<MedicalReport[]> => {
      const user = dbService.auth.getCurrentUser();
      if (!user) return [];

      if (user.role === 'PATIENT') {
        const { data } = await api.get(`/reports/patient/${user.id}`);
        return data;
      }

      // TODO: Implement getDoctorReports in backend
      return [];
    },
    create: async (report: MedicalReport): Promise<MedicalReport> => {
      const { data } = await api.post('/reports', report);
      return data;
    }
  },

  users: {
    getDoctors: async (): Promise<User[]> => {
      const { data } = await api.get('/users/doctors/list');
      return data;
    }
  }
};
