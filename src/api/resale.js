import api from './axios';

export const getEventResale = (eventId) => api.get(`/resale/event/${eventId}`);
export const getMyResale = () => api.get('/resale/mine');
export const createResaleListing = (data) => api.post('/resale', data);
export const cancelResaleListing = (id) => api.delete(`/resale/${id}`);
export const purchaseResaleListing = (id) => api.post(`/resale/${id}/purchase`);
