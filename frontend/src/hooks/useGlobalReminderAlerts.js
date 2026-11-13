import { useReminderNotifications } from '../context/ReminderNotificationContext';

export function useGlobalReminderAlerts() {
  return useReminderNotifications();
}

export default useGlobalReminderAlerts;
