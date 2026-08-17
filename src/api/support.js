import api from './axios';

// User support tickets
export const createSupportTicket = (data) => api.post('/support', data);
export const getMySupportTickets = (params) => api.get('/support', { params });
export const getMySupportTicket = (id) => api.get(`/support/${id}`);
export const replyToSupportTicket = (id, data) => api.post(`/support/${id}/reply`, data);
export const closeMySupportTicket = (id) => api.post(`/support/${id}/close`);

// Public maintenance status
export const getMaintenanceStatus = () => api.get('/public/maintenance');
