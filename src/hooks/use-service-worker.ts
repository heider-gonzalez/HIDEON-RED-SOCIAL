import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [pushSubscriptionAttempted, setPushSubscriptionAttempted] = useState(false);

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
    // Prevent infinite retry loops if VAPID key is not configured
    if (pushSubscriptionAttempted) {
      console.warn('🔔 Push subscription already attempted, skipping to prevent retry loop');
      return null;
    }

    if (!registration) {
      console.warn('Service Worker not registered');
      return null;
    }

    try {
      console.log('🔔 Subscribing to push notifications...');

      // Validate VAPID public key from environment variable
      const rawVapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      const vapidPublicKey = (rawVapidPublicKey ?? '')
        .toString()
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .replace(/\s+/g, '');

      // If no VAPID key is provided, skip push notifications and mark as attempted
      if (!vapidPublicKey || vapidPublicKey === 'BKxQzAkQF0R2W9t4t7bzqkQkQ8QzAkQF0R2W9t4t7bzqkQkQ8QzAkQF0R2W9t4t7bzqkQkQ8QzAkQF0R2W9t4t7bzqkQkQ8QzAkQF0R2W9t4t7bzqkQ') {
        console.warn('🔔 VAPID public key not configured. Set VITE_VAPID_PUBLIC_KEY in your .env file to enable push notifications.');
        setPushSubscriptionAttempted(true);
        return null;
      }

      console.log('🔔 VAPID key info:', {
        stringLength: vapidPublicKey.length,
        previewStart: vapidPublicKey.slice(0, 10),
        previewEnd: vapidPublicKey.slice(-10),
      });

      let applicationServerKey: Uint8Array;
      try {
        applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      } catch (e) {
        console.error('❌ Invalid VAPID public key (base64 decode failed)', {
          length: vapidPublicKey.length,
        });
        setPushSubscriptionAttempted(true);
        return null;
      }

      // Some generators/exports provide the raw X||Y (64 bytes) without the uncompressed point prefix (0x04).
      // PushManager expects an uncompressed P-256 public key which is 65 bytes: 0x04 || X (32) || Y (32).
      if (applicationServerKey.byteLength === 64) {
        const fixed = new Uint8Array(65);
        fixed[0] = 0x04;
        fixed.set(applicationServerKey, 1);
        applicationServerKey = fixed;
        console.warn('🔧 VAPID key decoded to 64 bytes; prepended 0x04 prefix to fix to 65 bytes');
      }

      // WebPush VAPID public key (P-256) should decode to 65 bytes.
      if (applicationServerKey.byteLength !== 65) {
        console.error('❌ Invalid VAPID public key (wrong decoded length)', {
          decodedLength: applicationServerKey.byteLength,
          stringLength: vapidPublicKey.length,
        });
        setPushSubscriptionAttempted(true);
        return null;
      }

      console.log('🔔 VAPID decoded length OK:', {
        decodedLength: applicationServerKey.byteLength,
      });

      const applicationServerKeyBuffer = applicationServerKey.buffer.slice(
        applicationServerKey.byteOffset,
        applicationServerKey.byteOffset + applicationServerKey.byteLength,
      ) as ArrayBuffer;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKeyBuffer
      });

      console.log('✅ Push subscription successful:', subscription);

      // Save subscription to Supabase database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const subscriptionJson = subscription.toJSON();

        const { error } = await (supabase as any)
          .from('push_subscriptions')
          .upsert({
            user_id: user.id,
            subscription_data: subscriptionJson,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          });

        if (error) {
          console.error('❌ Error saving subscription to database:', error);
        } else {
          console.log('💾 Subscription saved to database');
        }
      }

      return subscription;
    } catch (error: any) {
      console.error('❌ Push subscription failed:', error);
      // Mark as attempted to prevent infinite retry loops
      setPushSubscriptionAttempted(true);
      // Don't break the app flow, just log the error
      console.warn('🔔 Push notifications disabled due to configuration error. App will continue to function without push notifications.');
      return null;
    }
  }, [registration, pushSubscriptionAttempted]);

  // Send push notification (for testing)
  const sendTestNotification = useCallback(async (data: PushNotificationData) => {
    if (!registration) return;

    try {
      // This is for testing - in production, this would come from your backend
      await registration.showNotification(data.title, {
        body: data.body,
        icon: '/icon.svg',
        badge: '/icon.svg',
        data: data,
        actions: [
          { action: 'view', title: 'Ver' },
          { action: 'dismiss', title: 'Descartar' }
        ]
      } as any);
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
