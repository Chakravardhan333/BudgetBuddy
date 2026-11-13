import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { notificationsService, urlB64ToUint8Array } from '../api/notifications';


const ReminderNotificationContext = createContext(null);

const STORAGE_KEY_PREFIX = 'bb_reminder_notified_';
const BROADCAST_CHANNEL_NAME = 'budgetbuddy_reminder_events';

export function ReminderNotificationProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSupported = typeof window !== 'undefined' && 'Notification' in window;
  const pushSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
  const [permission, setPermission] = useState(() => (isSupported ? Notification.permission : 'unsupported'));
  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [dueReminders, setDueReminders] = useState([]);
  const [isChecking, setIsChecking] = useState(false);


  // In-memory set to prevent duplicate deliveries in current tab
  const deliveredSetRef = useRef(new Set());
  const broadcastChannelRef = useRef(null);
  const isCheckingRef = useRef(false);

  // Initialize BroadcastChannel for cross-tab synchronization
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, dedupeKey } = event.data || {};
        if (type === 'REMINDER_DELIVERED' && dedupeKey) {
          deliveredSetRef.current.add(dedupeKey);
        }
      };

      return () => {
        channel.close();
      };
    }
  }, []);

  // Listen to browser permission changes if supported
  useEffect(() => {
    if (!isSupported) return;

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'notifications' })
        .then((permissionStatus) => {
          setPermission(permissionStatus.state);
          permissionStatus.onchange = () => {
            setPermission(permissionStatus.state);
          };
        })
        .catch(() => {
          // Permissions API fallback
        });
    }
  }, [isSupported]);

  // Deliver an individual browser / desktop notification
  const deliverNotification = useCallback(
    async ({ title, body, tag, data }) => {
      if (!isSupported || Notification.permission !== 'granted') return false;

      const targetUrl = data?.url || '/notifications?tab=reminders';
      const options = {
        body,
        icon: '/logo.png',
        badge: '/favicon.svg',
        tag,
        renotify: false,
        data: { url: targetUrl, ...data },
      };

      const handleNotificationClick = () => {
        try {
          window.focus();
        } catch {
          // ignore
        }
        navigate(targetUrl);
      };

      let notificationInstance = null;
      try {
        const notification = new Notification(title, options);
        notification.onclick = (e) => {
          e.preventDefault();
          handleNotificationClick();
          try {
            notification.close();
          } catch {
            // ignore
          }
        };
        notificationInstance = notification;
      } catch (err) {
        console.warn('Standard Notification constructor failed, attempting Service Worker fallback:', err);
      }

      // Fall back to the service worker if the page Notification API is blocked.
      if (!notificationInstance && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification(title, options);
          if (typeof window !== 'undefined') {
            window.__active_notification = { title, options, onclick: handleNotificationClick };
          }
          return true;
        } catch (err) {
          console.error('Service Worker showNotification error:', err);
          return false;
        }
      }

      if (!notificationInstance) return false;

      if (typeof window !== 'undefined') {
        window.__active_notification = notificationInstance;
      }

      return true;
    },
    [isSupported, navigate]
  );

  // Check and deliver due reminders
  const checkDueReminders = useCallback(async () => {
    if (!user || isCheckingRef.current) return;

    try {
      isCheckingRef.current = true;
      setIsChecking(true);

      // Query active due reminders from backend
      const list = await notificationsService.getDueReminders();
      setDueReminders(list || []);

      if (!list || list.length === 0) return;

      // Do not mark reminders as delivered until browser notification permission
      // is granted. Otherwise a user who grants permission later would never
      // receive reminders that became due while permission was denied/prompt.
      const canNotify = isSupported && Notification.permission === 'granted';
      if (!canNotify) return;

      for (const reminder of list) {
        // Skip completed or dismissed
        if (reminder.is_completed || reminder.is_dismissed) continue;

        // Deduplication key composed of reminder ID and scheduled datetime
        const timestamp = new Date(reminder.reminder_datetime).getTime();
        const dedupeKey = `${reminder.id}_${timestamp}`;
        const storageKey = `${STORAGE_KEY_PREFIX}${dedupeKey}`;

        // 1. In-memory check
        if (deliveredSetRef.current.has(dedupeKey)) continue;

        // 2. localStorage check (across tabs & reloads)
        const alreadyStored = localStorage.getItem(storageKey);
        if (alreadyStored) {
          deliveredSetRef.current.add(dedupeKey);
          continue;
        }

        // Display the notification before recording its delivery state.
        {
          const priority = (reminder.priority || 'medium').toUpperCase();
          const scheduledTime = reminder.reminder_datetime
            ? new Date(reminder.reminder_datetime).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';

          const description = reminder.description || reminder.message || 'Your scheduled reminder is due.';
          const notificationTitle = 'BudgetBuddy – Financial Reminder';
          const notificationBody = `${reminder.title} – ${description}\nPriority: ${priority} | Due: ${scheduledTime}`;

          const delivered = await deliverNotification({
            title: notificationTitle,
            body: notificationBody,
            tag: `budgetbuddy-reminder-${dedupeKey}`,
            data: {
              url: '/notifications?tab=reminders',
              reminderId: reminder.id,
            },
          });

          if (!delivered) continue;

          deliveredSetRef.current.add(dedupeKey);
          try {
            localStorage.setItem(storageKey, new Date().toISOString());
          } catch {
            // localStorage might be full or disabled
          }

          if (broadcastChannelRef.current) {
            try {
              broadcastChannelRef.current.postMessage({
                type: 'REMINDER_DELIVERED',
                dedupeKey,
                reminderId: reminder.id,
              });
            } catch {
              // Channel error ignored
            }
          }

          if (typeof window !== 'undefined') {
            window.__last_delivered_reminder = reminder;
            window.__delivered_reminders_count = (window.__delivered_reminders_count || 0) + 1;
            window.__last_notification_instance = true;
          }
        }

        // Update the backend only after successful browser/service-worker delivery.
        notificationsService.markReminderDelivered(reminder.id).catch(() => {
          // A transient API failure should not break reminder polling.
        });
      }
    } catch {
      // Silent catch during periodic background polls
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [user, isSupported, deliverNotification]);

  // Request browser permission explicitly
  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      return 'unsupported';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        // Welcome notification confirming desktop alerts are ready
        deliverNotification({
          title: 'BudgetBuddy – Financial Reminder',
          body: 'Notifications enabled! You will receive timely alerts for upcoming bills, expenses, and budget limits.',
          tag: 'budgetbuddy-welcome-confirmation',
          data: { url: '/notifications?tab=reminders' },
        });

        // Trigger immediate check for any existing due reminders
        checkDueReminders();
      }

      return result;
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      return Notification.permission;
    }
  }, [isSupported, deliverNotification, checkDueReminders]);

  // Check Web Push subscription state
  const checkPushSubscriptionStatus = useCallback(async () => {
    if (!user || !pushSupported) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setIsPushSubscribed(true);
      } else {
        const statusRes = await notificationsService.getPushSubscriptionStatus().catch(() => null);
        setIsPushSubscribed(Boolean(statusRes?.is_subscribed));
      }
    } catch {
      // ignore
    }
  }, [user, pushSupported]);

  // Subscribe to Web Push notifications
  const subscribeToPush = useCallback(async () => {
    if (!pushSupported) {
      throw new Error('Web Push notifications are not supported by this browser.');
    }

    setPushLoading(true);
    try {
      // 1. Ensure permission is granted
      let currentPerm = Notification.permission;
      if (currentPerm !== 'granted') {
        currentPerm = await Notification.requestPermission();
        setPermission(currentPerm);
      }
      if (currentPerm !== 'granted') {
        throw new Error('Notification permission was not granted. Please allow notifications in your browser settings.');
      }

      // 2. Register Service Worker and wait until ready
      await navigator.serviceWorker.register('/sw.js');
      const registration = await navigator.serviceWorker.ready;

      // 3. Fetch VAPID public key
      const vapidData = await notificationsService.getVapidPublicKey();
      const vapidKey = vapidData?.public_key;
      if (!vapidKey) {
        throw new Error('Could not retrieve VAPID public key from backend.');
      }

      // 4. Subscribe via PushManager
      const convertedVapidKey = urlB64ToUint8Array(vapidKey);
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey,
        });
      }

      // 5. Send subscription payload to backend
      const subscriptionJson = subscription.toJSON();
      await notificationsService.subscribePush({
        ...subscriptionJson,
        user_agent: navigator.userAgent,
      });

      setIsPushSubscribed(true);
      return subscription;
    } finally {
      setPushLoading(false);
    }
  }, [pushSupported]);

  // Unsubscribe from Web Push notifications
  const unsubscribeFromPush = useCallback(async () => {
    if (!pushSupported) return;

    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await notificationsService.unsubscribePush(subscription.endpoint).catch(() => null);
      } else {
        await notificationsService.unsubscribePush().catch(() => null);
      }
      setIsPushSubscribed(false);
    } finally {
      setPushLoading(false);
    }
  }, [pushSupported]);

  // Send a test push notification
  const sendTestPushNotification = useCallback(async () => {
    setPushLoading(true);
    try {
      const res = await notificationsService.testPush();
      return res;
    } finally {
      setPushLoading(false);
    }
  }, []);


  // Global Periodic Polling and Event Listeners
  useEffect(() => {
    if (!user) return;

    // 1. Immediate check on application load / login
    checkDueReminders();
    checkPushSubscriptionStatus();


    // 2. Periodic poll every 30 seconds
    const intervalId = setInterval(() => {
      checkDueReminders();
    }, 30000);

    // 3. Trigger check immediately when browser tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDueReminders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Trigger check when window gains focus
    const handleFocus = () => {
      checkDueReminders();
    };
    window.addEventListener('focus', handleFocus);

    // 5. Listen to application events (when reminder is created, edited, snoozed, or deleted)
    const handleRemindersUpdated = () => {
      checkDueReminders();
    };
    window.addEventListener('reminders:updated', handleRemindersUpdated);
    window.addEventListener('notifications:updated', handleRemindersUpdated);
    window.addEventListener('finance:mutation', handleRemindersUpdated);

    // 6. Cross-tab storage event listener
    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith(STORAGE_KEY_PREFIX)) {
        const dedupeKey = e.key.replace(STORAGE_KEY_PREFIX, '');
        deliveredSetRef.current.add(dedupeKey);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('reminders:updated', handleRemindersUpdated);
      window.removeEventListener('notifications:updated', handleRemindersUpdated);
      window.removeEventListener('finance:mutation', handleRemindersUpdated);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user, checkDueReminders]);

  const value = {
    permission,
    isSupported,
    dueReminders,
    isChecking,
    requestPermission,
    checkDueReminders,
    deliverNotification,
    displayBrowserNotification: deliverNotification,
    pushSupported,
    isPushSubscribed,
    pushLoading,
    subscribeToPush,
    unsubscribeFromPush,
    sendTestPushNotification,
    checkPushSubscriptionStatus,
  };


  return (
    <ReminderNotificationContext.Provider value={value}>
      {children}
    </ReminderNotificationContext.Provider>
  );
}

export function useReminderNotifications() {
  const context = useContext(ReminderNotificationContext);
  if (!context) {
    throw new Error('useReminderNotifications must be used within a ReminderNotificationProvider');
  }
  return context;
}

export default ReminderNotificationContext;
