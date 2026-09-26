import api from './axios';

export const sendChatMessage = (message, conversationHistory = [], context = {}) => {
  return api.post('/chat/message', {
    message,
    conversationHistory,
    context,
  });
};

export const createAgentBookingHold = (payload) => {
  return api.post('/chat/book', payload);
};

export const verifyAgentPayment = (payload) => {
  return api.post('/chat/verify-payment', payload);
};

export const resendAgentTicket = (payload) => {
  return api.post('/chat/resend', payload);
};

export default {
  sendChatMessage,
  createAgentBookingHold,
  verifyAgentPayment,
  resendAgentTicket,
};
