
/**
 * Browser Notification Service
 * Handles requesting permission and displaying notifications
 * even when the tab is in the background.
 */
class NotificationService {
  private hasPermission: boolean = false;
  private soundUrl = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

  constructor() {
    this.checkStatus();
  }

  private checkStatus() {
    if ("Notification" in window) {
      this.hasPermission = Notification.permission === "granted";
    }
  }

  /**
   * Request browser permission to show notifications
   */
  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications.");
      return false;
    }

    if (Notification.permission === "granted") {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === "granted";
      return this.hasPermission;
    }

    return false;
  }

  /**
   * Waits for the Service Worker to be fully active
   */
  private async waitForActiveServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    
    try {
      // Use the standard ready promise which resolves when a worker is active
      const registration = await navigator.serviceWorker.ready;
      return registration;
    } catch (err) {
      console.warn("Service Worker activation check failed:", err);
      return null;
    }
  }

  /**
   * Display a notification and play a sound
   * @param title Title of the notification
   * @param body Body message of the notification
   */
  async notify(title: string, body: string) {
    if (!this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    try {
      this.playPing();

      // Check if Service Worker is available (Preferred for background/reliability)
      const registration = await this.waitForActiveServiceWorker();
      if (registration && registration.active) {
        console.log(`[Notification Bridge] Sending message push for: ${title}`);
        registration.active.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: {
            title,
            body,
            data: { url: '/reminders', icon: '/Logo.jpeg', timestamp: Date.now() }
          }
        });
        return;
      }

      // Fallback to standard Window Notification
      console.log(`[Notification Bridge] Falling back to standard Notification for: ${title}`);
      new Notification(title, {
        body: body,
        icon: '/Logo.jpeg',
        tag: 'medecho-reminder',
        renotify: true
      } as any);
    } catch (err) {
      console.error("Failed to show notification:", err);
    }
  }


  private playPing() {
    try {
      const audio = new Audio(this.soundUrl);
      audio.volume = 0.5;
      audio.play().catch(e => {
        // Silently catch the NotAllowedError which occurs if user hasn't clicked anything yet
        if (e.name !== 'NotAllowedError') {
          console.warn("Sound play failed:", e);
        }
      });
    } catch (err) {
      console.warn("Failed to play sound:", err);
    }
  }
}

export const notificationService = new NotificationService();
