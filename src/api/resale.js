import api from './axios';

export const getMarketplaceListings = (params) => api.get('/resale/marketplace', { params });
export const getEventResale = (eventId) => api.get(`/resale/event/${eventId}`);
export const getMyResale = () => api.get('/resale/mine');
export const createResaleListing = (data) => api.post('/resale', data);
export const cancelResaleListing = (id) => api.delete(`/resale/${id}`);
export const purchaseResaleListing = (id, data) => api.post(`/resale/${id}/purchase`, data);
export const getOrganizerResaleListings = () => api.get('/resale/organizer');
export const approveResaleListing = (id) => api.put(`/resale/${id}/approve`);
export const rejectResaleListing = (id, reason) => api.put(`/resale/${id}/reject`, { reason });

