import api from './axios';

export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);
export const loginAdmin = (data) => api.post('/auth/admin/login', data);
export const googleLogin = (data) => api.post('/auth/google', data);
export const forgotPassword = (data) => api.post('/auth/forgot-password', data);
export const resetPassword = (data) => api.post('/auth/reset-password', data);
export const verifyEmail = (data) => api.post('/auth/verify-email', data);
export const verifyOTP = (data) => api.post('/auth/verify-email', data);
export const resendVerification = (data) => api.post('/auth/resend-verification', data);
export const logoutUser = (refreshToken) => api.post('/auth/logout', { refreshToken });
export const logoutAll = () => api.post('/auth/logout-all');
export const changePassword = (data) => api.post('/auth/change-password', data);
export const getSessions = () => api.get('/auth/sessions');
export const revokeSession = (sessionId) => api.delete(`/auth/sessions/${sessionId}`);
