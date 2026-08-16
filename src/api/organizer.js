import api from './axios';

export const getDashboard = (params) => api.get('/organizer/dashboard', { params });
export const getRevenue = (params) => api.get('/organizer/revenue', { params });
export const getAttendees = (eventId, params) => api.get(`/organizer/attendees/${eventId}`, { params });
export const getSalesReport = (params) => api.get('/organizer/reports/sales', { params });
export const getEventAnalytics = (eventId, params) => api.get(`/organizer/events/${eventId}/analytics`, { params });
export const createCoupon = (data) => api.post('/organizer/coupons', data);
export const getCoupons = (params) => api.get('/organizer/coupons', { params });
export const updateCoupon = (id, data) => api.put(`/organizer/coupons/${id}`, data);
export const deleteCoupon = (id) => api.delete(`/organizer/coupons/${id}`);
export const requestWithdrawal = (data) => api.post('/organizer/wallet/withdrawals', data);
export const getWithdrawals = (params) => api.get('/organizer/wallet/withdrawals', { params });
export const getWalletBalance = () => api.get('/organizer/wallet/balance');
export const getTransactions = (params) => api.get('/organizer/wallet/transactions', { params });
export const getTeamMembers = () => api.get('/organizer/team');
export const inviteTeamMember = (data) => api.post('/organizer/team/invite', data);
export const removeTeamMember = (id) => api.delete(`/organizer/team/${id}`);
export const getMarketingCampaigns = (params) => api.get('/organizer/marketing', { params });
export const createMarketingCampaign = (data) => api.post('/organizer/marketing', data);
export const exportAttendees = (eventId) => api.get(`/organizer/attendees/${eventId}/export`, { responseType: 'blob' });
export const exportAttendeesPDF = (eventId) => api.get(`/organizer/attendees/${eventId}/export`, { params: { format: 'pdf' }, responseType: 'blob' });

export const getFlashSales = (params) => api.get('/organizer/flash-sales', { params });
export const createFlashSale = (data) => api.post('/organizer/flash-sales', data);
export const deleteFlashSale = (id) => api.delete(`/organizer/flash-sales/${id}`);

export const getReportSummary = (params) => api.get('/organizer/reports/summary', { params });
export const getAttendanceReport = (params) => api.get('/organizer/reports/attendance', { params });
export const getTopEvents = (params) => api.get('/organizer/reports/top-events', { params });
export const getRefundReport = (params) => api.get('/organizer/reports/refunds', { params });
export const exportReport = (params) => api.get('/organizer/reports/export', { params, responseType: 'blob' });

export const getPendingInvites = () => api.get('/organizer/team/invites');
export const resendInvite = (id) => api.post(`/organizer/team/invites/${id}/resend`);
export const cancelInvite = (id) => api.delete(`/organizer/team/invites/${id}`);

export const getWalletEarnings = (params) => api.get('/organizer/wallet/earnings', { params });

export const getOrganizationProfile = () => api.get('/organizer/settings/organization');
export const updateOrganizationProfile = (data) => api.put('/organizer/settings/organization', data);
export const getPaymentAccount = () => api.get('/organizer/settings/payment');
export const updatePaymentAccount = (data) => api.put('/organizer/settings/payment', data);
export const changePassword = (data) => api.post('/organizer/settings/password', data);
export const getActiveSessions = () => api.get('/organizer/settings/sessions');
export const revokeSession = (id) => api.delete(`/organizer/settings/sessions/${id}`);
export const getBranding = () => api.get('/organizer/settings/branding');
export const updateBranding = (data) => api.put('/organizer/settings/branding', data);
