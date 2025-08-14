
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW: Service Worker registered successfully:', registration.scope);
        
        // Update available
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('SW: New content available, please refresh.');
                // Burada kullanıcıya güncelleme bildirimi gösterebilirsin
                if (confirm('Yeni bir güncelleme mevcut. Sayfayı yenilemek ister misiniz?')) {
                  window.location.reload();
                }
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('SW: Service Worker registration failed:', error);
      });
  });

  // Service Worker mesajlarını dinle
  navigator.serviceWorker.addEventListener('message', (event) => {
    console.log('SW: Message from service worker:', event.data);
  });
}

// Online/Offline durumu
window.addEventListener('online', () => {
  console.log('App: Back online');
  // Burada offline sırasında biriken verileri senkronize edebilirsin
});

window.addEventListener('offline', () => {
  console.log('App: Gone offline');
  // Burada offline durumu için UI gösterebilirsin
});