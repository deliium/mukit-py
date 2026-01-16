import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// Always log API URL to help with debugging
console.log('🔗 API Base URL:', API_BASE_URL);
if (!import.meta.env.VITE_API_URL) {
  console.warn('⚠️  VITE_API_URL is not set! Using default:', API_BASE_URL);
  console.warn(
    '⚠️  Make sure VITE_API_URL is set in GitHub Secrets during build!'
  );
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
