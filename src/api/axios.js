import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      // Failed login attempts are surfaced by the login pages' own error
      // handling — don't hijack them with a hard redirect.
      const isLoginAttempt = /\/auth\/(admin\/)?login$/.test(url);
      if (!isLoginAttempt) {
        // Route admins to the dedicated admin login page; everyone else to the
        // regular one. Admin context is the stored role or an admin API path.
        let role = null;
        try {
          const stored = localStorage.getItem('tc_user');
          role = stored ? JSON.parse(stored)?.role : null;
        } catch { /* ignore malformed storage */ }
        const adminContext = role === 'admin' || url.includes('/admin');
        localStorage.removeItem('tc_token');
        localStorage.removeItem('tc_user');
        window.location.href = adminContext ? '/admin-login' : '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
