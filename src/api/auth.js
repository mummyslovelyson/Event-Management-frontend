import api from './axios';

export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const loginAdmin = (data) => api.post('/auth/admin/login', data);
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const verifyEmail = (data) => api.post('/auth/verify-email', data);
export const logoutUser = () => api.post('/auth/logout');
