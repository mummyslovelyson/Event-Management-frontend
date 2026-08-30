import api from './axios';

export const sendChatMessage = (message, conversationHistory = [], context = {}) => {
  return api.post('/chat/message', {
    message,
    conversationHistory,
    context,
  });
};

export default { sendChatMessage };
