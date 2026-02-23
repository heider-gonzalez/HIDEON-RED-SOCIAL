// Enhanced Service Worker for HIDEON - Push Notifications & Offline Support
const CACHE_NAME = 'hideon-v1';
const STATIC_CACHE = 'hideon-static-v1';
const MESSAGES_CACHE = 'hideon-messages-v1';
const IMAGES_CACHE = 'hideon-images-v1';

// Resources to cache for offline
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
  '/icon-maskable.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('📦 Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheName.includes('hideon-v1')) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // In local development, always bypass the Service Worker for Vite module requests
  // to avoid serving stale bundles from cache.
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname.startsWith('192.168.') ||
    url.hostname.startsWith('10.') ||
    url.hostname.startsWith('172.16.') ||
    url.hostname.startsWith('172.17.') ||
    url.hostname.startsWith('172.18.') ||
    url.hostname.startsWith('172.19.') ||
    url.hostname.startsWith('172.20.') ||
    url.hostname.startsWith('172.21.') ||
    url.hostname.startsWith('172.22.') ||
    url.hostname.startsWith('172.23.') ||
    url.hostname.startsWith('172.24.') ||
    url.hostname.startsWith('172.25.') ||
    url.hostname.startsWith('172.26.') ||
    url.hostname.startsWith('172.27.') ||
    url.hostname.startsWith('172.28.') ||
    url.hostname.startsWith('172.29.') ||
    url.hostname.startsWith('172.30.') ||
    url.hostname.startsWith('172.31.') ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Skip non-GET requests and external requests
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Handle Supabase API requests (messages, notifications)
  if (url.hostname.includes('supabase')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses for messages
          if (response.ok && (url.pathname.includes('/messages') || url.pathname.includes('/notifications'))) {
            const responseClone = response.clone();
            caches.open(MESSAGES_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Try to serve from cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('🌐 Serving API response from cache:', request.url);
              return cachedResponse;
            }
            // Return offline indicator
            return new Response(JSON.stringify({ offline: true }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Handle images with cache-first strategy
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGES_CACHE));
    return;
  }

  // Handle static assets
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((response) => {
        // Cache successful responses
        if (response.ok && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Return offline fallback for navigation
        if (request.mode === 'navigate') {
          return caches.match('/').then((response) => {
            return response || new Response(getOfflinePage(), {
              headers: { 'Content-Type': 'text/html' }
            });
          });
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Cache first strategy for images
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('🖼️ Image fetch failed, serving placeholder');
    // Return a placeholder or cached version
    return new Response('', { status: 404 });
  }
}

// Generate offline page HTML
function getOfflinePage() {
  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>HIDEON - Sin conexión</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8f9fa;
            color: #333;
            text-align: center;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            max-width: 400px;
            padding: 40px 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .icon {
            font-size: 4rem;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0 0 10px 0;
            color: #666;
          }
          p {
            margin: 0 0 30px 0;
            color: #888;
            line-height: 1.5;
          }
          button {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.2s;
          }
          button:hover {
            background: #0056b3;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">📱</div>
          <h1>Sin conexión</h1>
          <p>No podemos cargar el contenido en este momento. Revisa tu conexión a internet e intenta de nuevo.</p>
          <button onclick="window.location.reload()">Reintentar</button>
        </div>
      </body>
    </html>
  `;
}

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received:', event);

  if (!event.data) {
    console.warn('⚠️ Push event without data');
    return;
  }

  let notificationData;

  try {
    notificationData = event.data.json();
  } catch (e) {
    console.warn('ℹ️ Push payload is not JSON; falling back to text');
    let textPayload = '';
    try {
      textPayload = event.data.text();
    } catch (_) {
      textPayload = '';
    }

    notificationData = {
      title: 'HIDEON',
      body: textPayload || 'Tienes una nueva notificación',
      type: 'generic'
    };
  }

  // Customize notification based on type
  const options = getNotificationOptions(notificationData);

  console.log('🔔 About to show notification:', { title: notificationData.title || 'HIDEON', options });

  event.waitUntil(
    self.registration
      .showNotification(notificationData.title || 'HIDEON', options)
      .then(() => {
        console.log('✅ showNotification succeeded');
        // Check if notification is actually stored
        return self.registration.getNotifications({ tag: options.tag });
      })
      .then((notifications) => {
        console.log('📬 getNotifications after show:', notifications.length, notifications.map(n => ({ title: n.title, tag: n.tag })));
        if (notifications.length === 0) {
          console.warn('⚠️ Notification not stored (possible system block)');
        }
      })
      .catch((err) => {
        console.error('❌ showNotification failed:', err);
      })
  );
});

// Generate notification options based on type
function getNotificationOptions(data) {
  const baseOptions = {
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      type: data.type,
      ...data
    },

    actions: [
      {
        action: 'view',
        title: 'Ver'
      },
      {
        action: 'dismiss',
        title: 'Descartar'
      }
    ],
    requireInteraction: false,
    silent: false,
    tag: data.tag || `hideon-${data.type || 'generic'}-${data.messageId || data.conversationId || data.channelId || data.senderId || Date.now()}` // Group similar notifications
  };

  // Customize based on notification type
  switch (data.type) {
    case 'message':
      return {
        ...baseOptions,
        body: data.body || `Mensaje de ${data.senderName || 'alguien'}`,
        icon: data.senderAvatar || '/icon.svg',
        data: {
          ...baseOptions.data,
          conversationId: data.conversationId
        }
      };

    case 'friend_request':
      return {
        ...baseOptions,
        body: `${data.senderName || 'Alguien'} quiere ser tu amigo`,
        actions: [
          {
            action: 'accept',
            title: 'Aceptar'
          },
          {
            action: 'view',
            title: 'Ver'
          },
          {
            action: 'dismiss',
            title: 'Descartar'
          }
        ]
      };

    case 'like':
    case 'comment':
      return {
        ...baseOptions,
        body: data.body || 'Nueva interacción en tu publicación',
        icon: '/icon.svg'
      };

    default:
      return {
        ...baseOptions,
        body: data.body || 'Nueva notificación'
      };
  }
}

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);

  event.notification.close();

  const { action, data } = event;

  if (action === 'dismiss') {
    return;
  }

  // Handle different actions
  let urlToOpen = '/';

  if (action === 'accept' && data.type === 'friend_request') {
    // Could implement direct acceptance here, but for now just open the app
    urlToOpen = `/friends`;
  } else if (data.type === 'message' && data.conversationId) {
    urlToOpen = `/messages?user=${data.conversationId}`;
  } else if (data.url) {
    urlToOpen = data.url;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window/tab open
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }

      // If no window/tab is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync for offline messages
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);

  if (event.tag === 'send-pending-messages') {
    event.waitUntil(sendPendingMessages());
  } else if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Function to send pending messages when back online
async function sendPendingMessages() {
  try {
    console.log('📤 Attempting to send pending messages...');

    // Get pending messages from IndexedDB or local storage
    // This is a placeholder - you would implement actual storage/retrieval
    const pendingMessages = await getPendingMessages();

    if (pendingMessages.length === 0) {
      console.log('📤 No pending messages to send');
      return;
    }

    // Send each pending message
    for (const message of pendingMessages) {
      try {
        await sendMessageToServer(message);
        await removePendingMessage(message.id);
        console.log('✅ Pending message sent:', message.id);
      } catch (error) {
        console.error('❌ Failed to send pending message:', message.id, error);
      }
    }

  } catch (error) {
    console.error('❌ Error in sendPendingMessages:', error);
  }
}

// Function to sync notifications
async function syncNotifications() {
  try {
    console.log('🔄 Syncing notifications...');
    // Implementation for syncing missed notifications
  } catch (error) {
    console.error('❌ Error syncing notifications:', error);
  }
}

// Placeholder functions for offline message handling
async function getPendingMessages() {
  // Implement with IndexedDB or similar
  return [];
}

async function sendMessageToServer(message) {
  // Implement actual API call
  return fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message)
  });
}

async function removePendingMessage(messageId) {
  // Implement removal from storage
}

// Message event - for communication with the main thread
self.addEventListener('message', (event) => {
  console.log('💬 Message received in SW:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'UPDATE_CACHE') {
    event.waitUntil(updateCache());
  }
});

// Update cache manually
async function updateCache() {
  console.log('🔄 Updating cache...');
  try {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(STATIC_ASSETS);
    console.log('✅ Cache updated');
  } catch (error) {
    console.error('❌ Cache update failed:', error);
  }
}