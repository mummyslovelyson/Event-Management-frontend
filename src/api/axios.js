import axios from 'axios';

const getBaseUrl = () => {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

/* ------------------------------------------------------------------ */
/* Request interceptor — attach access token                           */
/* ------------------------------------------------------------------ */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tc_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* ------------------------------------------------------------------ */
/* Response interceptor — auto-refresh + error normalization            */
/* ------------------------------------------------------------------ */
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const status = err.response?.status;

    // --- Auto-refresh on 401 (token expired) ---
    if (status === 401 && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('tc_refresh');
      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(err);
      }

      // Don't retry refresh or login endpoints
      const url = originalRequest.url || '';
      if (/\/auth\/(admin\/)?login$/.test(url) || /\/auth\/refresh$/.test(url)) {
        redirectToLogin();
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${originalRequest.baseURL || api.defaults.baseURL}/auth/refresh`,
          { refreshToken },
        );
        localStorage.setItem('tc_token', data.accessToken);
        localStorage.setItem('tc_refresh', data.refreshToken);
        api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        redirectToLogin();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // --- Account locked (423) ---
    if (status === 423) {
      const message = err.response?.data?.message || 'Account locked due to too many failed attempts';
      return Promise.reject({ ...err, friendlyMessage: message });
    }

    // --- Suspended (403) ---
    if (status === 403) {
      const message = err.response?.data?.message || 'Your account has been suspended';
      if (message.includes('suspended') || message.includes('Suspended')) {
        redirectToLogin();
        return Promise.reject({ ...err, friendlyMessage: message });
      }
    }

    // --- Rate limited (429) ---
    if (status === 429) {
      const message = err.response?.data?.message || 'Too many requests. Please wait a moment and try again.';
      return Promise.reject({ ...err, friendlyMessage: message });
    }

    // --- All other errors — pass through with friendly message ---
    const message = err.response?.data?.message || err.message || 'An error occurred';
    return Promise.reject({ ...err, friendlyMessage: message });
  }
);

function redirectToLogin() {
  const path = window.location.pathname;
  const publicAuthPaths = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/admin-login'];
  if (publicAuthPaths.some((p) => path.startsWith(p))) {
    return;
  }
  localStorage.removeItem('tc_token');
  localStorage.removeItem('tc_refresh');
  localStorage.removeItem('tc_user');
  let role = null;
  try {
    const stored = localStorage.getItem('tc_user');
    role = stored ? JSON.parse(stored)?.role : null;
  } catch { /* ignore */ }
  const adminContext = role === 'admin' || path.startsWith('/admin');
  window.location.href = adminContext ? '/admin-login' : '/login';
}

export default api;
