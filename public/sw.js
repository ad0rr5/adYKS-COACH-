importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

const CACHE_NAME = 'yks-coach-v1.2.0';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/index.css'
];

const DYNAMIC_CACHE_NAME = 'yks-coach-dynamic-v1.2.0';
const MAX_CACHE_SIZE = 50; // Maximum number of items in dynamic cache

// Optimized Service Worker installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Pre-cache critical resources
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Optimized Service Worker activation with cache cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => 
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        )
      ),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Firebase init for background messaging
try {
  firebase.initializeApp({
    apiKey: 'AIzaSyBdPLTq4bG4zdx4K2bevgMaGZwWrKqyPzU',
    authDomain: 'ai-studio-koc.firebaseapp.com',
    projectId: 'ai-studio-koc',
    messagingSenderId: '191116218089',
    appId: '1:191116218089:web:fa580f323374fa1748ea78'
  });
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    // DND kontrolü
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 21 || hour < 5) return;
    const { title, body, icon } = (payload?.notification || {});
    self.registration.showNotification(title || 'YKS Koçu', {
      body: body || 'Yeni bildirim',
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png'
    });
  });
} catch (e) {
  // ignore
}

// Fetch event - Network First Strategy for API calls, Cache First for static files
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Firebase API istekleri için Network First
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('firebase.googleapis.com') ||
      url.hostname.includes('googleapis.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Başarılı response'u cache'le
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseClone);
              });
          }
          return response;
        })
        .catch(() => {
          // Network başarısız olursa cache'den dön
          return caches.match(request);
        })
    );
    return;
  }

  // Static dosyalar için Cache First
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          return fetch(request)
            .then((response) => {
              // Sadece başarılı response'ları cache'le
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(DYNAMIC_CACHE_NAME)
                  .then((cache) => {
                    // Limit cache size
                    cache.keys().then((keys) => {
                      if (keys.length >= MAX_CACHE_SIZE) {
                        cache.delete(keys[0]); // Remove oldest entry
                      }
                    });
                    cache.put(request, responseClone);
                  });
              }
              return response;
            })
            .catch(() => {
              // Offline durumunda fallback sayfası
              if (request.destination === 'document') {
                return caches.match('/');
              }
              // Return a basic offline response for other requests
              return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
  }
});

// Background Sync için
self.addEventListener('sync', (event) => {
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Offline sırasında biriken verileri senkronize et
      syncOfflineData()
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  // Rahatsız Etme: 21:00 - 05:00 arası bildirimleri bastır
  const now = new Date();
  const hour = now.getHours();
  const isDnd = (hour >= 21 || hour < 5);
  if (isDnd) {
    return; // sessizce yoksay
  }
  const options = {
    body: event.data ? event.data.text() : 'Yeni bir bildirim var!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Uygulamayı Aç',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Kapat',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('YKS Koçu', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Receive message from page to show a notification
self.addEventListener('message', (event) => {
  try {
    const data = event.data || {};
    if (data && data.type === 'SHOW_NOTIFICATION') {
  // DND kontrolü
  const now = new Date();
  const hour = now.getHours();
  if (hour >= 21 || hour < 5) return;
      const { title, options } = data;
      event.waitUntil(self.registration.showNotification(title || 'Bildirim', options || {}));
    }
  } catch (e) {
    // ignore
  }
});

// Offline data sync function
async function syncOfflineData() {
  try {
    // Burada offline sırasında biriken verileri Firebase'e gönderebilirsin
    // IndexedDB'den veri oku ve Firebase'e gönder
  } catch (error) {
  // Sessizce geç
  }
}