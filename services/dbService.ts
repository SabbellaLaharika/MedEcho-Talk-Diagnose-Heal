import { User, Appointment, MedicalReport } from '../types';
import api from './api';

const KEYS = {
  CURRENT_USER: 'medecho_session'
};

// Helper function to safely map report data
const mapBackendReportToFrontend = (report: any): MedicalReport => {
  try {
    // Ensure diagnosis is a valid string
    const diagnosis = String(report.diagnosis || 'Pending diagnosis').trim();

    return {
      id: String(report.id || ''),
      patientId: String(report.patientId || ''),
      doctorId: report.doctorId || null,
      date: report.createdAt
        ? new Date(report.createdAt).toISOString().split('T')[0]
        : (report.date || new Date().toISOString().split('T')[0]),
      doctorName: String(report.doctor?.name || report.doctorName || 'MedEcho AI').trim(),
      summary: String(report.summary || 'No summary available').trim(),
      diagnosis: diagnosis, // Ensure it's a valid string
      prescription: Array.isArray(report.precautions) ? report.precautions : (Array.isArray(report.prescription) ? report.prescription : []),
      aiConfidence: Number(report.confidenceScore) || 0,
      vitals: report.vitals || {},
      symptoms: (() => {
        const baseSymptoms = Array.isArray(report.symptoms) ? report.symptoms : [];
        if (baseSymptoms.length > 0) return baseSymptoms;
        
        // If empty, try to derive from history
        const history = typeof report.history === 'object' && report.history !== null ? report.history : {};
        const derived = Object.keys(history).filter(k => 
          ['gastric', 'fever', 'cough', 'headache', 'pain', 'fatigue', 'nausea'].some(term => k.toLowerCase().includes(term))
        );
        return derived;
      })(),
      history: (() => {
        if (typeof report.history === 'object' && report.history !== null && Object.keys(report.history).length > 0) {
          return report.history;
        }
        // Fallback: try to parse summary if it looks like JSON
        if (report.summary && report.summary.startsWith('{')) {
          try {
            return JSON.parse(report.summary);
          } catch (e) {
            return {};
          }
        }
        return {};
      })()
    };
  } catch (error) {
    console.error('Error mapping report:', error, report);
    return {
      id: report.id || 'unknown',
      patientId: report.patientId || 'unknown',
      doctorId: null,
      date: new Date().toISOString().split('T')[0],
      doctorName: 'MedEcho AI',
      summary: 'Unable to load report details',
      diagnosis: 'Error loading diagnosis',
      prescription: [],
      aiConfidence: 0,
      vitals: {}
    };
  }
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
      const { data } = await api.put('/auth/update', updatedUser);
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
        try {
          const { data } = await api.get(`/reports/patient/${user.id}`);
          const reportsArray = Array.isArray(data) ? data : (data.value || []);

          // Map each report using the helper function
          return reportsArray.map((report: any) => mapBackendReportToFrontend(report));
        } catch (error) {
          console.error('Error fetching reports:', error);
          return [];
        }
      }

      // TODO: Implement getDoctorReports in backend
      return [];
    },
    create: async (report: MedicalReport): Promise<MedicalReport> => {
      // Ensure all required fields are set before sending
      const reportPayload = {
        ...report,
        diagnosis: String(report.diagnosis || 'Pending diagnosis').trim(),
        summary: String(report.summary || '').trim(),
        symptoms: report.symptoms || [],
        history: report.history || {}
      };
      const { data } = await api.post('/reports', reportPayload);
      return mapBackendReportToFrontend(data);
    }
  },

  users: {
    getDoctors: async (): Promise<User[]> => {
      const user = dbService.auth.getCurrentUser();
      const lang = user?.preferredLanguage || 'en';
      const { data } = await api.get(`/users/doctors/list?lang=${lang}`);
      return data;
    }
  }
};
