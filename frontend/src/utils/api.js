import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sw_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sw_token');
      localStorage.removeItem('sw_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data) => api.post('/auth/login', data),
  getProfile:     ()     => api.get('/auth/profile'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── Shifts ───────────────────────────────────────────────────────────────────
export const shiftsAPI = {
  getAll:  ()        => api.get('/shifts'),
  getById: (id)      => api.get(`/shifts/${id}`),
  update:  (id, data)=> api.put(`/shifts/${id}`, data),
};

// ─── Employees ────────────────────────────────────────────────────────────────
export const employeesAPI = {
  getAll:     (params) => api.get('/employees', { params }),
  getById:    (id)     => api.get(`/employees/${id}`),
  create:     (data)   => api.post('/employees', data),
  update:     (id, d)  => api.put(`/employees/${id}`, d),
  deactivate: (id)     => api.delete(`/employees/${id}`),
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceAPI = {
  markIn:          (data)   => api.post('/attendance/mark-in', data),
  markOut:         (data)   => api.post('/attendance/mark-out', data),
  getToday:        (params) => api.get('/attendance/today', { params }),
  getDashboard:    (params) => api.get('/attendance/dashboard', { params }),
  getDailyReport:  (params) => api.get('/attendance/report/daily', { params }),
  getShiftReport:  (params) => api.get('/attendance/report/shift', { params }),
  getEmpReport:    (id, params) => api.get(`/attendance/report/employee/${id}`, { params }),
  getLogs:         (id)     => api.get(`/attendance/logs/${id}`),
  override:        (id, d)  => api.put(`/attendance/override/${id}`, d),
  manual:          (data)   => api.post('/attendance/manual', data),
};

export default api;
