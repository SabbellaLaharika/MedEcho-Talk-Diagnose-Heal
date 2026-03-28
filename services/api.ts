import axios from 'axios';
import { dbService } from './dbService';

// Backend Base URL
// Use local proxy /api in production (enabled by rewrites), fallback to localhost:5000 in dev
const isPROD = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
export let API_URL = import.meta.env.VITE_API_URL || (isPROD ? '/api' : 'http://localhost:5000/api');

// Safety check: Ensure URL ends with /api to match backend routes
// But only for external full URLs (not the relative proxy /api)
if (API_URL && API_URL.startsWith('http')) {
    if (!API_URL.endsWith('/api')) {
        API_URL = API_URL.endsWith('/') ? `${API_URL}api` : `${API_URL}/api`;
    }
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
            const currentPath = window.location.pathname;

            if (error.response.status === 401) {
                // Auto logout on 401
                dbService.auth.logout();
                // ONLY redirect if we aren't already on the login/home page to prevent infinite refresh loops
                if (currentPath !== '/' && currentPath !== '/index.html') {
                    window.location.href = '/';
                }
            } else if (error.response.status === 429) {
                // Rate limited (often during Render cold starts)
                error.message = 'AI Service is currently waking up or busy. Please wait 10 seconds and try again.';
            } else if (error.response.status === 503) {
                // Service down/starting up
                error.message = 'AI Service is currently starting up (Cold Start). Please wait 30 seconds for the system to initialize.';
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
