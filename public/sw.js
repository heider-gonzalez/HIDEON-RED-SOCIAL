const CACHE_NAME = 'hideon-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

const dynamicCacheName = 'hideon-dynamic-v1';

// Service Worker para HIDEON PWA
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== dynamicCacheName) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Solo interceptar requests GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requests de Chrome Extensions
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Cache hit - return cached response
      if (cachedResponse) {
        return cachedResponse;
      }

      // Cache miss - fetch and cache
      return caches.open(dynamicCacheName).then((cache) => {
        return fetch(event.request).then((response) => {
          // No cachear respuestas que no son exitosas
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clonar la respuesta porque se consume una vez
          const responseToCache = response.clone();
          cache.put(event.request, responseToCache);
          return response;
        });
      });
    }).catch(() => {
      // Si falla tanto el cache como la red, retornar offline page
      return caches.match('/offline.html');
    })
  );
});

// Estrategia de cache para API responses
self.addEventListener('fetch', (event) => {
  // Network First para API requests
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache exitoso responses
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(dynamicCacheName).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar el cache
          return caches.match(event.request);
        })
    );
  }
});

// Background sync para mensajes y notificaciones
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncNotifications());
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Nueva notificación en HIDEON',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: event.data?.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('HIDEON', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url, '_blank')
  );
});

// Funciones auxiliares
async function syncMessages() {
  // Implementar sincronización de mensajes pendientes
  console.log('Syncing messages...');
}

async function syncNotifications() {
  // Implementar sincronización de notificaciones pendientes
  console.log('Syncing notifications...');
}