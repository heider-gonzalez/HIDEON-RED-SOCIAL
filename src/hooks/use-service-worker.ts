import { useEffect, useState, useCallback } from 'react';

export interface PushNotificationData {
  title: string;
  body: string;
  type: 'message' | 'friend_request' | 'like' | 'comment' | 'generic';
  senderName?: string;
  senderAvatar?: string;
  conversationId?: string;
  url?: string;
  tag?: string;
}

export function useServiceWorker() {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if service workers and push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      const swSupported = 'serviceWorker' in navigator;
      const pushSupported = 'PushManager' in window;
      const notificationSupported = 'Notification' in window;

      setIsSupported(swSupported && pushSupported && notificationSupported);
    };

    checkSupport();
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!isSupported || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      console.log('🔧 Registering Service Worker...');

      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      console.log('✅ Service Worker registered successfully:', reg);

      setRegistration(reg);
      setIsRegistered(true);

      // Listen for updates
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available, notify user
              console.log('🔄 New Service Worker version available');
              // You could show a toast here to refresh the page
            }
          });
        }
      });

      // Handle controller change (when SW takes control)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('🎛️ Service Worker controller changed');
        window.location.reload();
      });

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }, [isSupported]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        console.log('✅ Notification permission granted');
        return true;
      } else {
        console.log('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      return false;
    }
  }, []);

  // Subscribe to push notifications
  const subscribeToPushNotifications = useCallback(async () => {
    if (!registration) {
      console.warn('Service Worker not registered');
      return null;
    }

    try {
      console.log('🔔 Subscribing to push notifications...');

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // This should come from your backend/VAPID keys
          // For now, using a placeholder - replace with your actual VAPID public key
          'BKxQzAkQF0R2W9t4t7bzqkQkQ8QzAkQF0R2W9t4t7bzqkQkQ8QzAkQF0R2W9t4t7bzqkQkQ8QzAkQF0R2W9t4t7bzqkQ'
        )
      });

      console.log('✅ Push subscription successful:', subscription);
      return subscription;
    } catch (error) {
      console.error('❌ Push subscription failed:', error);
      return null;
    }
  }, [registration]);

  // Send push notification (for testing)
  const sendTestNotification = useCallback(async (data: PushNotificationData) => {
    if (!registration) return;

    try {
      // This is for testing - in production, this would come from your backend
      await registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: data,
        actions: [
          { action: 'view', title: 'Ver' },
          { action: 'dismiss', title: 'Descartar' }
        ]
      });
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
    }
  }, [registration]);

  // Update service worker cache
  const updateCache = useCallback(() => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_CACHE'
      });
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (isSupported) {
      registerServiceWorker();
    }
  }, [isSupported, registerServiceWorker]);

  return {
    isSupported,
    isRegistered,
    registration,
    requestNotificationPermission,
    subscribeToPushNotifications,
    sendTestNotification,
    updateCache
  };
}

// Utility function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
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
