import api from './axios';

export const getAdminDashboard = (params) => api.get('/admin/dashboard', { params });
export const getUsers = (params) => api.get('/admin/users', { params });
export const getUser = (id) => api.get(`/admin/users/${id}`);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
export const suspendUser = (id, data) => api.post(`/admin/users/${id}/suspend`, data);
export const unsuspendUser = (id) => api.post(`/admin/users/${id}/unsuspend`);
export const verifyUser = (id) => api.post(`/admin/users/${id}/verify`);
export const resetUserPassword = (id, data) => api.post(`/admin/users/${id}/reset-password`, data);

export const approveOrganizer = (id) => api.post(`/admin/organizers/${id}/approve`);
export const rejectOrganizer = (id, data) => api.post(`/admin/organizers/${id}/reject`, data);

export const getAdminEvents = (params) => api.get('/admin/events', { params });
export const approveEvent = (id) => api.post(`/admin/events/${id}/approve`);
export const rejectEvent = (id, data) => api.post(`/admin/events/${id}/reject`, data);
export const toggleEventFeatured = (id, featured) => api.post(`/admin/events/${id}/feature`, { featured });
export const suspendEvent = (id) => api.post(`/admin/events/${id}/suspend`);
export const unsuspendEvent = (id) => api.post(`/admin/events/${id}/unsuspend`);
export const adminDeleteEvent = (id) => api.delete(`/admin/events/${id}`);

export const getCategories = () => api.get('/admin/categories');
export const createCategory = (data) => api.post('/admin/categories', data);
export const updateCategory = (id, data) => api.put(`/admin/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/admin/categories/${id}`);

export const getPayments = (params) => api.get('/admin/payments', { params });
export const getPayment = (id) => api.get(`/admin/payments/${id}`);
export const refundPayment = (id, data) => api.post(`/admin/payments/${id}/refund`, data);

export const getReports = (params) => api.get('/admin/reports', { params });
export const getRevenueReport = (params) => api.get('/admin/reports/revenue', { params });
export const getGrowthReport = (params) => api.get('/admin/reports/growth', { params });

export const getContentPages = () => api.get('/admin/content');
export const createContentPage = (data) => api.post('/admin/content', data);
export const updateContentPage = (id, data) => api.put(`/admin/content/${id}`, data);
export const deleteContentPage = (id) => api.delete(`/admin/content/${id}`);

export const sendNotification = (data) => api.post('/admin/notifications', data);
export const getAdminNotifications = (params) => api.get('/admin/notifications', { params });

export const getSupportTickets = (params) => api.get('/admin/support', { params });
export const getSupportTicket = (id) => api.get(`/admin/support/${id}`);
export const respondToSupportTicket = (id, data) => api.post(`/admin/support/${id}/respond`, data);
export const closeSupportTicket = (id) => api.post(`/admin/support/${id}/close`);

export const getSettings = () => api.get('/admin/settings');
export const updateSettings = (data) => api.put('/admin/settings', data);

export const getAuditLogs = (params) => api.get('/admin/audit-logs', { params });
