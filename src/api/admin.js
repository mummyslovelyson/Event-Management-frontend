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

export const getUserManagementStats = () => api.get('/admin/users/stats');
export const getUserActivity = (id, params) => api.get(`/admin/users/${id}/activity`, { params });
export const getUserSessions = (id) => api.get(`/admin/users/${id}/sessions`);
export const getUserStats = (id) => api.get(`/admin/users/${id}/stats`);
export const forceLogoutUser = (id) => api.post(`/admin/users/${id}/force-logout`);
export const addAdminNote = (id, data) => api.post(`/admin/users/${id}/notes`, data);
export const getAdminNotes = (id) => api.get(`/admin/users/${id}/notes`);
export const deleteAdminNote = (noteId) => api.delete(`/admin/users/notes/${noteId}`);
export const exportUsersCSV = (params) => api.get('/admin/users/export/csv', { params, responseType: 'blob' });
export const bulkRoleChange = (data) => api.post('/admin/users/bulk/role', data);
export const bulkDeleteUsers = (data) => api.post('/admin/users/bulk/delete', data);

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
export const sendTestEmail = (data) => api.post('/admin/settings/test-email', data);
export const sendTestSms = (data) => api.post('/admin/settings/test-sms', data);
export const getSmsBalance = () => api.get('/admin/settings/sms-balance');
export const testPaystack = () => api.post('/admin/settings/test-paystack');

export const getAuditLogs = (params) => api.get('/admin/audit-logs', { params });
