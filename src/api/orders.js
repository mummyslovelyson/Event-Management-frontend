import api from './axios';

export const createOrder = (data) => api.post('/orders', data);
export const getOrders = (params) => api.get('/orders', { params });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const cancelOrder = (id, data) => api.post(`/orders/${id}/cancel`, data);
export const verifyPayment = (data) => api.post('/orders/verify-payment', data);
export const initiatePayment = (id, data) => api.post(`/orders/${id}/payment`, data);
export const refundOrder = (id, data) => api.post(`/orders/${id}/refund`, data);
export const getOrderInvoice = (id) => api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
export const applyCoupon = (data) => api.post('/orders/apply-coupon', data);
