import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';

// VERSION: 1.0.2 (Force Update for De-duplication)
const SW_VERSION = '1.0.2';

// This is required for VitePWA with injectManifest strategy
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Immediate activation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log('[MedEcho SW] Activated and claimed control');
});

// SHARED NOTIFICATION LOGIC
const showLocalNotification = async (title, body, data, registration) => {
  const isCall = data?.type === 'CALL' || title.toLowerCase().includes('call');
  
  const options = {
    body: body,
    icon: '/Logo.jpeg',
    badge: '/Logo.jpeg',
    vibrate: isCall ? [500, 200, 500, 200, 500, 200, 800] : [200, 100, 200],
    tag: isCall ? `medecho-call-${data?.appointmentId || Date.now()}` : 'medecho-reminder-main',
    renotify: true,
    requireInteraction: isCall, // Call notifications stay until acted upon
    data: data || {},
    actions: isCall ? [
      { action: 'accept', title: '✅ Accept Call' },
      { action: 'dismiss', title: '❌ Dismiss' }
    ] : [
      { action: 'view', title: 'View Details' },
      { action: 'close', title: 'Dismiss' }
    ]
  };
  return registration.showNotification(title, options);
};

// Handle incoming messages from the foreground app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, data } = event.data.payload;
    console.log(`[MedEcho SW v${SW_VERSION}] Bridge Notification: ${title}`);
    event.waitUntil(
      showLocalNotification(title, body, data, self.registration)
    );
  }
});

// Handle real Web Push events from the backend (Background)
self.addEventListener('push', (event) => {
  console.log(`[MedEcho SW v${SW_VERSION}] Push event received`);

  // Fast-Path Fallback
  const fastPromise = self.registration.showNotification('MedEcho Update', {
    body: 'Analyzing health alert...',
    tag: 'medecho-reminder-main',
    silent: true
  });

  const pushTask = async () => {
    try {
      let payload = {};
      if (event.data) {
        try {
          const rawData = event.data.json();
          payload = rawData.payload || rawData;
        } catch (e) {
          payload = { title: 'MedEcho Alert', body: event.data.text() };
        }
      }

      const title = payload.title || 'MedEcho Alert';
      const body = payload.body || 'You have a new medical reminder.';
      
      console.log(`[MedEcho SW v${SW_VERSION}] Final Push Showing: ${title}`);
      return showLocalNotification(title, body, payload.data || payload, self.registration);
    } catch (err) {
      console.error(`[MedEcho SW v${SW_VERSION}] Push Error:`, err);
    }
  };

  event.waitUntil(Promise.all([fastPromise, pushTask()]));
});

// Handle notification interaction
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.type === 'CALL' ? '/' : '/reminders';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      // If we accepted a call, we want to broadcast this to the app
      if (event.action === 'accept') {
          for (const client of clientList) {
              if ('postMessage' in client) {
                  client.postMessage({
                      type: 'ACTION_ACCEPT_CALL',
                      payload: event.notification.data
                  });
              }
          }
      }

      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
