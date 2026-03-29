
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
   * Display a notification and play a sound
   * @param title Title of the notification
   * @param body Body message of the notification
   */
  notify(title: string, body: string) {
    if (!this.hasPermission) {
      console.warn("Notifications permission not granted.");
      return;
    }

    try {
      // Play a subtle ping sound
      this.playPing();

      // Create notification
      new Notification(title, {
        body: body,
        icon: '/Logo.jpeg', // Using Logo.jpeg from root
        tag: 'medecho-notification', // Groups overlapping notifications
        renotify: true // Notifies again even if tag exists
      } as any);
    } catch (err) {
      console.error("Failed to show notification:", err);
    }
  }

  private playPing() {
    try {
      const audio = new Audio(this.soundUrl);
      audio.volume = 0.5;
      audio.play().catch(e => console.warn("Sound play failed:", e));
    } catch (err) {
      console.warn("Failed to play sound:", err);
    }
  }
}

export const notificationService = new NotificationService();
