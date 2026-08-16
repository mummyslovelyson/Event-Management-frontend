import api from './axios';

export const getTicketTypes = (eventId) => api.get(`/tickets/${eventId}/types`);
export const createTicketType = (eventId, data) => api.post(`/tickets/${eventId}/types`, data);
export const updateTicketType = (_eventId, ticketId, data) => api.put(`/tickets/types/${ticketId}`, data);
export const deleteTicketType = (_eventId, ticketId) => api.delete(`/tickets/types/${ticketId}`);
export const getUserTickets = (params) => api.get('/tickets', { params });
export const getTicket = (id) => api.get(`/tickets/${id}`);
export const checkIn = (ticketId, data) => api.post(`/tickets/${ticketId}/check-in`, data);
export const bulkCheckIn = (data) => api.post('/tickets/check-in/bulk', data);
export const transferTicket = (ticketId, data) => api.post(`/tickets/${ticketId}/transfer`, data);
export const downloadTicket = (id) => api.get(`/tickets/${id}/download`, { responseType: 'blob' });
export const verifyTicket = (code) => api.get(`/tickets/verify/${code}`);
