import apiClient from './client';

export const notificationsService = {
  getNotifications: async (params = {}) => {
    const response = await apiClient.get('/notifications/', { params });
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

  markAllAsRead: async (category = null) => {
    const response = await apiClient.post('/notifications/mark-all-read/', category ? { category } : {});
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await apiClient.delete(`/notifications/${id}/`);
    return response.data;
  },

  clearNotifications: async (params = {}) => {
    const response = await apiClient.post('/notifications/clear/', params);
    return response.data;
  },


  // Reminder endpoints
  getReminders: async () => {
    const response = await apiClient.get('/notifications/reminders/');
    return response.data;
  },

  getDueReminders: async (undeliveredOnly = false) => {
    const response = await apiClient.get('/notifications/reminders/due/', {
      params: undeliveredOnly ? { undelivered: true } : {}
    });
    return response.data;
  },

  markReminderDelivered: async (id) => {
    const response = await apiClient.post(`/notifications/reminders/${id}/delivered/`);
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

  // Web Push endpoints
  getVapidPublicKey: async () => {
    const response = await apiClient.get('/notifications/push/vapid-key/');
    return response.data;
  },

  getPushSubscriptionStatus: async () => {
    const response = await apiClient.get('/notifications/push/status/');
    return response.data;
  },

  subscribePush: async (subscriptionData) => {
    const response = await apiClient.post('/notifications/push/subscribe/', subscriptionData);
    return response.data;
  },

  unsubscribePush: async (endpoint = null) => {
    const response = await apiClient.post('/notifications/push/unsubscribe/', endpoint ? { endpoint } : {});
    return response.data;
  },

  testPush: async () => {
    const response = await apiClient.post('/notifications/push/test/');
    return response.data;
  },
};

export function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default notificationsService;
