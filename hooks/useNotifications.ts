import { useCallback } from 'react';

// Avoid clashing with lib.dom NotificationOptions
interface AppNotificationOptions {
  title?: string;
  body?: string;
  icon?: string;
  tag?: string;
}

const useNotifications = () => {
  const sendNotification = useCallback(async (options: AppNotificationOptions) => {
    try {
      // Check if notifications are supported
      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return;
      }

      // Check permission
      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        // Try to use service worker notification first
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            registration.showNotification(options.title || 'YKS Koçu', {
              body: options.body,
              icon: options.icon || '/icons/icon-192x192.png',
              badge: '/icons/icon-72x72.png',
              tag: options.tag
            });
            return;
          }
        }

        // Fallback to regular notification
  new Notification(options.title || 'YKS Koçu', {
          body: options.body,
          icon: options.icon || '/icons/icon-192x192.png',
          tag: options.tag
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, []);

  return { sendNotification };
};

export default useNotifications;