import api from './axios';

export const getEventMeetups = (eventId, params) => api.get(`/meetups/event/${eventId}`, { params });
export const createMeetup = (eventId, data) => api.post(`/meetups/event/${eventId}`, data);
export const joinMeetup = (meetupId) => api.post(`/meetups/${meetupId}/join`);
export const leaveMeetup = (meetupId) => api.post(`/meetups/${meetupId}/leave`);
export const deleteMeetup = (meetupId) => api.delete(`/meetups/${meetupId}`);
export const getMyMeetups = (params) => api.get('/meetups/mine', { params });
