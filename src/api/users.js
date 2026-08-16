import api from './axios';

export const getProfile = () => api.get('/users/profile');
export const updateProfile = (data) => api.put('/users/profile', data);
export const updatePassword = (data) => api.post('/users/change-password', data);
export const uploadAvatar = (data) => {
  const formData = new FormData();
  formData.append('avatar', data);
  return api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getFavorites = (params) => api.get('/users/favorites', { params });
export const toggleFavorite = (eventId) => api.post('/users/favorites/toggle', { eventId });
export const getFollowing = (params) => api.get('/users/following', { params });
export const getFollowingEvents = (params) => api.get('/users/following/events', { params });
export const followOrganizer = (organizerId) => api.post(`/users/organizers/${organizerId}/follow`);
export const unfollowOrganizer = (organizerId) => api.delete(`/users/organizers/${organizerId}/follow`);
export const getNotifications = (params) => api.get('/users/notifications', { params });
export const markNotificationRead = (id) => api.put(`/users/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/users/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/users/notifications/${id}`);
export const createReview = (data) => api.post('/users/reviews', data);
export const getReviews = (params) => api.get('/users/reviews', { params });
export const deleteReview = (id) => api.delete(`/users/reviews/${id}`);
