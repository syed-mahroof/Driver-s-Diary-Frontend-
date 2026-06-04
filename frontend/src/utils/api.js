import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/token/refresh/`, { refresh });
          localStorage.setItem('access_token', data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: (username, password) =>
    api.post('/login/', { username, password }),
  register: (data) =>
    api.post('/register/', data),
  forgotPassword: (contact) =>
    api.post('/forgot-password/', { contact }),
  verifyOTP: (contact, otp) =>
    api.post('/verify-otp/', { contact, otp }),
  resetPassword: (contact, otp, new_password) =>
    api.post('/reset-password/', { contact, otp, new_password }),
};

export const driverAPI = {
  getDashboard: () => api.get('/driver/dashboard/'),
  createRide: (data) => api.post('/rides/', data),
  updateRide: (id, data) => api.patch(`/rides/${id}/update/`, data),
  createCharge: (data) => api.post('/driver/charge/', data),
  syncRides: (rides) => api.post('/sync-rides/', { rides }),
  getCompanies: () => api.get('/companies/'),
  exportDriverReport: (period) => api.get('/driver/export-excel/', {
    params: { period },
    responseType: 'blob',
  }),
  getReportData: (period) => api.get('/driver/report-data/', {
    params: { period },
  }),
  getVehicles: () => api.get('/vehicles/'),
  updateDefaultVehicle: (data) => api.post('/driver/update-default-vehicle/', data),
  requestAdvanceSalary: (data) => api.post('/advance-salary/request/', data),
  getAdvanceRequests: () => api.get('/advance-salary/'),
};

export const adminAPI = {
  getDashboard: (filters = {}) => api.get('/admin/dashboard/', { params: filters }),
  getDrivers: () => api.get('/admin/drivers/'),
  createDriver: (data) => api.post('/admin/drivers/create/', data),
  getCompanies: () => api.get('/companies/'),
  createCompany: (data) => api.post('/companies/create/', data),
  getReports: (filters = {}) => api.get('/reports/', { params: filters }),
  exportExcel: (filters = {}) => api.get('/export-excel/', {
    params: filters,
    responseType: 'blob',
  }),
  exportMonthlyReport: (month, year) => api.get('/export-monthly-report/', {
    params: { month, year },
    responseType: 'blob',
  }),
  createVehicle: (data) => api.post('/vehicles/create/', data),
  getAdvanceRequests: (params = {}) => api.get('/advance-salary/', { params }),
  updateAdvanceRequest: (id, data) => api.patch(`/advance-salary/${id}/update/`, data),
};
