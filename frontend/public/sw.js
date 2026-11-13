// BudgetBuddy Smart Reminders Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming push events (for Web Push)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    let data;
    try {
      data = event.data.json();
    } catch {
      data = { title: 'BudgetBuddy – Financial Reminder', body: event.data.text() };
    }

    const title = data.title || 'BudgetBuddy – Financial Reminder';
    const body = data.body || data.message || 'You have a scheduled financial reminder due.';
    const scheduledTime = data.scheduled_time ? new Date(data.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

    const options = {
      body: scheduledTime ? `${body} (Due: ${scheduledTime})` : body,
      icon: '/logo.png',
      badge: '/favicon.svg',
      tag: data.tag || `budgetbuddy-reminder-${data.id || Date.now()}`,
      renotify: true,
      requireInteraction: data.priority === 'urgent' || data.priority === 'high',
      data: {
        url: data.url || '/notifications?tab=reminders',
        id: data.id,
      },
      actions: [
        { action: 'open_reminders', title: 'View Reminders' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error('Failed to parse and display push notification:', err);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/notifications?tab=reminders';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 1. Look for an existing open BudgetBuddy window
      for (const client of windowClients) {
        if ('focus' in client) {
          if ('navigate' in client) {
            return client.navigate(targetUrl).then((c) => (c ? c.focus() : client.focus()));
          }
          return client.focus();
        }
      }
      // 2. If no window open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
