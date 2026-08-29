import api from './axios';

export const getEvents = (params) => api.get('/events', { params });
export const getEvent = (id) => api.get(`/events/${id}`);

// The event wizard (CreateEventPage) uses camelCase field names while the
// backend stores snake_case columns — map them here so both stay in sync.
const EVENT_FIELD_MAP = {
  startDate: 'start_date',
  endDate: 'end_date',
  startTime: 'start_time',
  endTime: 'end_time',
  bannerImage: 'banner_image',
  additionalImages: 'images',
  contactEmail: 'contact_email',
  contactPhone: 'contact_phone',
  totalCapacity: 'capacity',
  dressCode: 'dress_code',
  isFeatured: 'is_featured',
};

const mapEventPayload = (data) => {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    out[EVENT_FIELD_MAP[key] || key] = value;
  }
  return out;
};

export const createEvent = (data) => api.post('/events', mapEventPayload(data));
export const updateEvent = (id, data) => api.put(`/events/${id}`, mapEventPayload(data));

// Upload a single image (banner / gallery). Returns { url } pointing at the
// file the backend already serves under /uploads.
export const uploadImage = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  // Drop the default JSON Content-Type so the browser sets the multipart
  // boundary for us.
  return api.post('/upload/image', formData, { headers: { 'Content-Type': undefined } });
};
export const deleteEvent = (id) => api.delete(`/events/${id}`);
export const getFeaturedEvents = (params) => api.get('/events/featured', { params });
export const getTrendingEvents = (params) => api.get('/events/trending', { params });
export const getRecommendedEvents = (params) => api.get('/events/recommended', { params });
export const getCategories = () => api.get('/events/categories');
export const publishEvent = (id) => api.patch(`/events/${id}/publish`);
export const unpublishEvent = (id) => api.patch(`/events/${id}/unpublish`);
export const getOrganizerEvents = (params) => api.get('/events/organizer/mine', { params });
export const getFeaturedOrganizers = (params) => api.get('/events/featured-organizers', { params });
export const toggleEventReminder = (id) => api.post(`/events/${id}/reminders`);
export const getEventReminderStatus = (id) => api.get(`/events/${id}/reminders`);
export const getUserReminders = () => api.get('/events/reminders/mine');
