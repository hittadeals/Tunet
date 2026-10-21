import { useEffect, useRef } from 'react';
import { useHomeAssistantMeta } from '../../contexts';
import { useOptionalToast } from '../../contexts/ToastContext';

/**
 * Surfaces Home Assistant's persistent notifications as toasts.
 *
 * The dashboard never subscribed to events before, so notifications created
 * by automations or scripts were invisible. New notifications are shown once;
 * the list is cleared from Home Assistant when it is dismissed there.
 */
export default function PersistentNotificationBridge() {
  const { persistentNotifications } = useHomeAssistantMeta();
  const toastContext = useOptionalToast();
  const addToast = toastContext?.addToast;
  const shownRef = useRef(new Set());

  useEffect(() => {
    if (!Array.isArray(persistentNotifications) || persistentNotifications.length === 0) return;

    persistentNotifications.forEach((notification) => {
      const id = notification.id || notification.notification_id;
      if (!id || shownRef.current.has(id)) return;
      shownRef.current.add(id);
      const message = notification.title
        ? `${notification.title}: ${notification.message}`
        : notification.message;
      if (message && addToast) addToast(message, 'info');
    });
  }, [persistentNotifications, addToast]);

  // Notifications that were removed upstream should be announceable again.
  useEffect(() => {
    if (!Array.isArray(persistentNotifications)) return;
    const currentIds = new Set(persistentNotifications.map((n) => n.id));
    shownRef.current.forEach((id) => {
      if (!currentIds.has(id)) shownRef.current.delete(id);
    });
  }, [persistentNotifications]);

  return null;
}
