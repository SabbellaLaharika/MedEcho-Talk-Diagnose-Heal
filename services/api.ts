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
    timeout: 300000, // 5 minutes for heavy Render cold starts
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
            }
            
            // Extract the user-friendly backend message, if available. 
            // This is critical for Render the 429/503 "Waking Up" messages.
            const backendData = error.response.data;
            if (backendData && (backendData.reply || backendData.message || backendData.error)) {
                error.message = backendData.reply || backendData.message || backendData.error;
            } else if (error.response.status === 429) {
                error.message = 'AI Service is currently waking up or busy. Please wait a few seconds and try again.';
            } else if (error.response.status === 503) {
                error.message = 'AI Service is currently starting up (Cold Start). Please wait a moment.';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
