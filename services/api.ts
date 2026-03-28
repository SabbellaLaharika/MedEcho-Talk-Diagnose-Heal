import axios from 'axios';
import { dbService } from './dbService';

// Backend Base URL
export let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Safety check: Ensure URL ends with /api to match backend routes
if (API_URL && !API_URL.endsWith('/api')) {
    API_URL = API_URL.endsWith('/') ? `${API_URL}api` : `${API_URL}/api`;
}

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
        if (error.response) {
            if (error.response.status === 401) {
                // Auto logout on 401
                dbService.auth.logout();
                window.location.href = '/';
            } else if (error.response.status === 429) {
                // Rate limited
                error.message = 'AI Service is currently busy. Please wait a moment before trying again.';
            } else if (error.response.status === 503) {
                // Service down/starting up
                error.message = 'AI Service is currently starting up or unavailable. Please try again in 30 seconds.';
            }
            // Extract the user-friendly backend message, if available

            if (error.response.data && error.response.data.message) {
                error.message = error.response.data.message;
            } else if (error.response.data && error.response.data.error) {
                error.message = error.response.data.error;
            }
        }
        return Promise.reject(error);
    }
);

export default api;
