import { API_URL } from './api';
import axios from 'axios';

// Public VAPID Key - Injected via Vite build
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BFpoWP42ayomI-t62kJUIJNW84ZUUYO3DL8gA5r6jIo1J8V4W2XuUyCsUXgGdOW_pf8qgbAY30-dhQbiZj2UTZE';
console.log('[Push] Using VAPID Public Key:', VAPID_PUBLIC_KEY);



/**
 * Utility to convert base64 VAPID key to UInt8Array for the browser
 */
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const pushNotificationService = {
  /**
   * Request permission and subscribe the user to push notifications
   */
  subscribeUser: async (userId: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported on this browser.');
      return;
    }

    try {
      // 1. Ensure the Service Worker is active
      const registration = await navigator.serviceWorker.ready;
      
      // on mobile, it's often better to wait a moment for the SW to fully initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      // 2. Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();
      
      // OPTIMIZED REFRESH: We only want to force a reset ONCE to fix the current system.
      // Doing this on every load causes infinite loops and heavy network usage.
      const SYNC_VERSION = 'v5'; // Bump to force refresh after service updates

      const lastSync = localStorage.getItem('medecho_push_sync');

      if (subscription && lastSync !== SYNC_VERSION) {
        console.log('[Push] Performing one-time subscription refresh for version:', SYNC_VERSION);
        await subscription.unsubscribe();
        subscription = null; // Force re-subscribe below
        localStorage.setItem('medecho_push_sync', SYNC_VERSION);
      }

      if (!subscription) {
        // 3. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[Push] Permission denied by user');
        return;
      }

      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      };

        subscription = await registration.pushManager.subscribe(subscribeOptions);
        console.log('[Push] Fresh subscription obtained successfully');
      }


      // 4. Send/Update subscription on backend
      // We always send it to ensure the backend has the latest endpoint for this user session
      await axios.post(`${API_URL}/push/subscribe`, {
        userId,
        subscription: subscription.toJSON()
      });
      
      // Update sync flag to prevent loop
      localStorage.setItem('medecho_push_sync', SYNC_VERSION);
      
      console.log('[Push] Subscription synced with backend for user', userId);
      return true;

    } catch (error) {
      console.error('[Push] Subscription process failed:', error);
      return false;
    }
  },


  /**
   * Unsubscribe from push notifications
   */
  unsubscribeUser: async () => {
    try {
      // 1. Check if Service Worker is supported
      if (!('serviceWorker' in navigator)) {
        console.warn("[Push] Service Worker not supported in this browser");
        return false;
      }

      // 2. Wait for Service Worker to be ready
      console.log("[Push] Waiting for Service Worker to be ready...");
      const registration = await navigator.serviceWorker.ready;
      console.log("[Push] Service Worker ready:", registration.active?.scriptURL);
      
      if (!('pushManager' in registration)) {
        console.warn("[Push] Push Manager not supported in this Service Worker");
        return false;
      }

      // 3. Get existing subscription or create new one
      let subscription = await registration.pushManager.getSubscription();
      console.log("[Push] Existing subscription:", subscription ? "Found" : "None");
      
      if (subscription) {
        await subscription.unsubscribe();
        await axios.post(`${API_URL}/push/unsubscribe`, {
          endpoint: subscription.endpoint
        });
        console.log('[Push] Unsubscribed successfully');
      }
    } catch (error) {
      console.error('[Push] Unsubscribe failed:', error);
    }
  }
};
