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
  try {
    const token = sessionStorage.getItem('tc_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch { /* ignore */ }
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
      let refreshToken = null;
      try {
        refreshToken = sessionStorage.getItem('tc_refresh');
      } catch { /* ignore */ }

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
        try {
          sessionStorage.setItem('tc_token', data.accessToken);
          sessionStorage.setItem('tc_refresh', data.refreshToken);
        } catch { /* ignore */ }
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
      const message = err.response?.data?.message || 'Account locked due to too many failed attempts. Please try again in 15 minutes.';
      return Promise.reject({ ...err, friendlyMessage: message });
    }

    // --- Suspended or Forbidden (403) ---
    if (status === 403) {
      const message = err.response?.data?.message || 'Access forbidden: you do not have permission for this resource.';
      if (message.toLowerCase().includes('suspended')) {
        redirectToLogin();
      }
      return Promise.reject({ ...err, friendlyMessage: message });
    }

    // --- Rate limited (429) ---
    if (status === 429) {
      const message = err.response?.data?.message || 'Too many requests. Please wait a moment and try again.';
      return Promise.reject({ ...err, friendlyMessage: message });
    }

    // --- Payload too large (413) ---
    if (status === 413) {
      const message = err.response?.data?.message || 'Upload size exceeds the maximum limit (5 MB). Please choose a smaller file.';
      return Promise.reject({ ...err, friendlyMessage: message });
    }

    // --- Network / Connection Failure ---
    if (!err.response) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        return Promise.reject({ ...err, friendlyMessage: 'The request timed out. Please check your connection and try again.' });
      }
      return Promise.reject({
        ...err,
        friendlyMessage: 'Unable to connect to the Tribes & Cliqs server. Please verify your internet connection.',
      });
    }

    // --- Server errors (500, 502, 503, 504) ---
    if (status >= 500) {
      const message = err.response?.data?.message || 'Our services are temporarily busy. Please try again in a moment.';
      return Promise.reject({ ...err, friendlyMessage: message });
    }

    // --- Default friendly message ---
    const message = err.response?.data?.message || err.message || 'An unexpected error occurred.';
    return Promise.reject({ ...err, friendlyMessage: message });
  }
);

function redirectToLogin() {
  const path = window.location.pathname;
  const publicAuthPaths = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/admin-login'];
  if (publicAuthPaths.some((p) => path.startsWith(p))) {
    return;
  }
  try {
    sessionStorage.removeItem('tc_token');
    sessionStorage.removeItem('tc_refresh');
    sessionStorage.removeItem('tc_user');
  } catch { /* ignore */ }
  let role = null;
  try {
    const stored = sessionStorage.getItem('tc_user');
    role = stored ? JSON.parse(stored)?.role : null;
  } catch { /* ignore */ }
  const adminContext = role === 'admin' || path.startsWith('/admin');
  window.location.href = adminContext ? '/admin-login' : '/login';
}

export default api;
