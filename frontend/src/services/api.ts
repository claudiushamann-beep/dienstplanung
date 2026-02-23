import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name: string; role?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

export const employeesApi = {
  getAll: () => api.get('/employees'),
  getById: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
};

export const constraintsApi = {
  getByEmployee: (employeeId: string) => api.get(`/constraints/employee/${employeeId}`),
  create: (data: any) => api.post('/constraints', data),
  update: (id: string, data: any) => api.put(`/constraints/${id}`, data),
  delete: (id: string) => api.delete(`/constraints/${id}`),
};

export const absencesApi = {
  getAll: (params?: any) => api.get('/absences', { params }),
  getByEmployee: (employeeId: string) => api.get(`/absences/employee/${employeeId}`),
  create: (data: any) => api.post('/absences', data),
  update: (id: string, data: any) => api.put(`/absences/${id}`, data),
  delete: (id: string) => api.delete(`/absences/${id}`),
};

export const shiftModelsApi = {
  getAll: () => api.get('/shift-models'),
  getById: (id: string) => api.get(`/shift-models/${id}`),
  create: (data: any) => api.post('/shift-models', data),
  update: (id: string, data: any) => api.put(`/shift-models/${id}`, data),
  delete: (id: string) => api.delete(`/shift-models/${id}`),
};

export const schedulesApi = {
  getSoll: (params?: any) => api.get('/schedules/soll', { params }),
  getIst: (params?: any) => api.get('/schedules/ist', { params }),
  createSoll: (entries: any[]) => api.post('/schedules/soll', { entries }),
  createIst: (entries: any[]) => api.post('/schedules/ist', { entries }),
  deleteSoll: (id: string) => api.delete(`/schedules/soll/${id}`),
  deleteIst: (id: string) => api.delete(`/schedules/ist/${id}`),
  copySollToIst: (startDate: string, endDate: string) => 
    api.post('/schedules/copy-soll-to-ist', { startDate, endDate }),
};

export const statisticsApi = {
  getAll: (params?: any) => api.get('/statistics', { params }),
  getByEmployee: (employeeId: string, params?: any) => 
    api.get(`/statistics/employee/${employeeId}`, { params }),
  calculate: (month: number, year: number) => 
    api.post('/statistics/calculate', { month, year }),
};

export const aiApi = {
  getProviders: () => api.get('/ai/providers'),
  createProvider: (data: any) => api.post('/ai/providers', data),
  updateProvider: (id: string, data: any) => api.put(`/ai/providers/${id}`, data),
  deleteProvider: (id: string) => api.delete(`/ai/providers/${id}`),
  explainModel: (description: string, providerId?: string) =>
    api.post('/ai/explain-model', { description, providerId }),
  generateSchedule: (shiftModelId: string, startDate: string, endDate: string, providerId?: string) =>
    api.post('/ai/generate-schedule', { shiftModelId, startDate, endDate, providerId }),
  chat: (messages: { role: 'user' | 'assistant'; content: string }[], providerId?: string) =>
    api.post('/ai/chat', { messages, providerId }),
};
