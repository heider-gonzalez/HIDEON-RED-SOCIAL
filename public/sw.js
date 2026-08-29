const CACHE_NAME = 'hsocial-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

const dynamicCacheName = 'hsocial-dynamic-v1';

// Service Worker para HSOCIAL PWA
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

// Función para verificar si es request de Supabase
function isSupabaseRequest(url) {
  return url.includes('supabase.co') || url.includes('supabase');
}

// Función para verificar si es request de autenticación
function isAuthRequest(url) {
  return url.includes('/auth/') || url.includes('auth/callback');
}

self.addEventListener('fetch', (event) => {
  // Solo interceptar requests GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar requests de Chrome Extensions
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // NO cachear requests de Supabase - siempre ir a la red
  if (isSupabaseRequest(event.request.url)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // NO cachear requests de autenticación
  if (isAuthRequest(event.request.url)) {
    event.respondWith(fetch(event.request));
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

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Nueva notificación en HSOCIAL',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: event.data?.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification('HSOCIAL', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url, '_blank')
  );
});