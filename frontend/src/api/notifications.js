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

  // Reminder endpoints
  getReminders: async () => {
    const response = await apiClient.get('/notifications/reminders/');
    return response.data;
  },

  getDueReminders: async () => {
    const response = await apiClient.get('/notifications/reminders/due/');
    return response.data;
  },

  createReminder: async (data) => {
    const response = await apiClient.post('/notifications/reminders/', data);
    return response.data;
  },

  updateReminder: async (id, data) => {
    const response = await apiClient.put(`/notifications/reminders/${id}/`, data);
    return response.data;
  },

  deleteReminder: async (id) => {
    const response = await apiClient.delete(`/notifications/reminders/${id}/`);
    return response.data;
  },

  completeReminder: async (id) => {
    const response = await apiClient.post(`/notifications/reminders/${id}/complete/`);
    return response.data;
  },

  dismissReminder: async (id) => {
    const response = await apiClient.post(`/notifications/reminders/${id}/dismiss/`);
    return response.data;
  },

  snoozeReminder: async (id, payload) => {
    const response = await apiClient.post(`/notifications/reminders/${id}/snooze/`, payload);
    return response.data;
  },

  getReminderSummary: async () => {
    const response = await apiClient.get('/notifications/reminders/summary/');
    return response.data;
  },
};

export default notificationsService;
