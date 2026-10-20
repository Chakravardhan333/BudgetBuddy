import apiClient from './client';

export const notificationsService = {
  getNotifications: async () => {
    const response = await apiClient.get('/notifications/');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get('/notifications/unread-count/');
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await apiClient.post(`/notifications/${id}/read/`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.post('/notifications/mark-all-read/');
    return response.data;
  },
};

export default notificationsService;
