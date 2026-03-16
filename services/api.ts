import axios from 'axios';
import { dbService } from './dbService';

// Backend Base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
    (config) => {
        const session = localStorage.getItem('medecho_session');
        if (session) {
            const { token } = JSON.parse(session);
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle Errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Auto logout on 401
            dbService.auth.logout();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
