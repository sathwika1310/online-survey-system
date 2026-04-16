import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  register: (data) => API.post('/api/auth/register', data),
  login: (data) => API.post('/api/auth/login', data),
  me: () => API.get('/api/auth/me'),
  updateProfile: (data) => API.put('/api/auth/profile', data),
  changePassword: (data) => API.put('/api/auth/change-password', data),
  getUsers: () => API.get('/api/auth/users'),
};

// Surveys
export const surveyAPI = {
  getAll: () => API.get('/api/surveys'),
  getById: (id) => API.get(`/api/surveys/${id}`),
  getByToken: (token) => API.get(`/api/surveys/public/${token}`),
  create: (data) => API.post('/api/surveys', data),
  update: (id, data) => API.put(`/api/surveys/${id}`, data),
  delete: (id) => API.delete(`/api/surveys/${id}`),
  toggle: (id) => API.post(`/api/surveys/${id}/toggle`),
};

// Responses
export const responseAPI = {
  submit: (data) => API.post('/api/responses', data),
  getBySurvey: (surveyId, params) => API.get(`/api/responses/survey/${surveyId}`, { params }),
  exportCSV: (surveyId) => `${API.defaults.baseURL}/api/responses/survey/${surveyId}/export`,
  delete: (id) => API.delete(`/api/responses/${id}`),
};

// Dashboard
export const dashboardAPI = {
  getStats: () => API.get('/api/dashboard/stats'),
  getSurveyAnalytics: (id) => API.get(`/api/dashboard/survey/${id}/analytics`),
};

// Analytics
export const analyticsAPI = {
  getOverview: (params) => API.get('/api/analytics/overview', { params }),
};

export default API;
