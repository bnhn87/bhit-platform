/**
 * PWA Utilities for BHIT Work OS
 * Handles service worker registration, offline detection, and sync management
 */

import React from 'react';

interface PWAInstallPrompt extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export class PWAManager {
  private static instance: PWAManager;
  private installPrompt: PWAInstallPrompt | null = null;
  private isOnline = navigator.onLine;
  private syncQueue: Array<Record<string, unknown> & { id: string; timestamp: number }> = [];
  private eventListeners: Map<string, Array<(...args: unknown[]) => void>> = new Map();

  private constructor() {
    this.init();
  }

  static getInstance(): PWAManager {
    if (!PWAManager.instance) {
      PWAManager.instance = new PWAManager();
    }
    return PWAManager.instance;
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Register service worker
    this.registerServiceWorker();

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as PWAInstallPrompt;
      this.emit('installAvailable', this.installPrompt);
    });

    // Listen for app installation
    window.addEventListener('appinstalled', () => {
      this.installPrompt = null;
      this.emit('appInstalled');
    });

    // Monitor online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emit('online');
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emit('offline');
    });

    // Handle PWA updates
    this.handlePWAUpdates();
  }

  private async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.emit('updateAvailable', newWorker);
              }
            });
          }
        });

        return registration;
      } catch (error: unknown) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    }
  }

  private handlePWAUpdates() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }

  // Event emitter methods
  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: unknown) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Installation methods
  async showInstallPrompt(): Promise<boolean> {
    if (!this.installPrompt) return false;

    try {
      await this.installPrompt.prompt();
      const choiceResult = await this.installPrompt.userChoice;
      this.installPrompt = null;
      return choiceResult.outcome === 'accepted';
    } catch (error: unknown) {
      console.error('[PWA] Install prompt failed:', error);
      return false;
    }
  }

  isInstallAvailable(): boolean {
    return this.installPrompt !== null;
  }

  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as { standalone?: boolean }).standalone === true;
  }

  // Offline/Online methods
  getOnlineStatus(): boolean {
    return this.isOnline;
  }

  // Sync queue management
  addToSyncQueue(operation: Record<string, unknown>) {
    this.syncQueue.push({
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...operation
    });
    
    // Try to sync immediately if online
    if (this.isOnline) {
      this.processSyncQueue();
    }
  }

  private async processSyncQueue() {
    if (this.syncQueue.length === 0) return;

    try {
      const response = await fetch('/api/v2/sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: this.syncQueue,
          device_id: this.getDeviceId()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        this.syncQueue = [];
        this.emit('syncComplete', result);
      } else {
        this.emit('syncError', result);
      }
    } catch (error: unknown) {
      console.error('[PWA] Sync failed:', error);
      this.emit('syncError', error);
    }
  }

  getSyncQueueLength(): number {
    return this.syncQueue.length;
  }

  // Cache management
  async getCacheStatus(): Promise<Record<string, unknown>> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        navigator.serviceWorker.controller?.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [messageChannel.port2]
        );
      });
    }
    return {};
  }

  async clearCache(): Promise<boolean> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.success);
        };
        navigator.serviceWorker.controller?.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      });
    }
    return false;
  }

  // Update management
  async skipWaiting() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  // Utility methods
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('bhit-device-id');
    if (!deviceId) {
      deviceId = 'web-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('bhit-device-id', deviceId);
    }
    return deviceId;
  }

  // Network detection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Background sync registration
  async registerBackgroundSync(tag: string): Promise<boolean> {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await (registration as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register(tag);
        return true;
      } catch (error: unknown) {
        console.error('[PWA] Background sync registration failed:', error);
        return false;
      }
    }
    return false;
  }

  // Share functionality
  async share(data: { title?: string; text?: string; url?: string; files?: File[] }): Promise<boolean> {
    if ('share' in navigator) {
      try {
        await (navigator as Navigator & { share: (data: unknown) => Promise<void> }).share(data);
        return true;
      } catch (error: unknown) {
        console.error('[PWA] Share failed:', error);
        return false;
      }
    }
    return false;
  }

  // Clipboard functionality
  async copyToClipboard(text: string): Promise<boolean> {
    if ('clipboard' in navigator) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error: unknown) {
        console.error('[PWA] Clipboard write failed:', error);
        return false;
      }
    }
    return false;
  }

  // Notifications
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return 'denied';
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<boolean> {
    if ('serviceWorker' in navigator && Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          badge: '/icons/icon-72x72.png',
          icon: '/icons/icon-192x192.png',
          ...options
        });
        return true;
      } catch (error: unknown) {
        console.error('[PWA] Notification failed:', error);
        return false;
      }
    }
    return false;
  }

  // Performance monitoring
  getConnectionInfo(): { effectiveType: string; downlink: number; rtt: number; saveData: boolean } | null {
    if ('connection' in navigator) {
      const connection = (navigator as Navigator & {
        connection: {
          effectiveType: string;
          downlink: number;
          rtt: number;
          saveData: boolean;
        }
      }).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  // Storage quota management
  async getStorageQuota(): Promise<{ quota: number; usage: number } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota || 0,
          usage: estimate.usage || 0
        };
      } catch (error: unknown) {
        console.error('[PWA] Storage estimate failed:', error);
        return null;
      }
    }
    return null;
  }
}

// React hooks for PWA functionality
export function usePWA() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [installPrompt, setInstallPrompt] = React.useState<PWAInstallPrompt | null>(null);
  const [syncQueueLength, setSyncQueueLength] = React.useState(0);

  React.useEffect(() => {
    const pwa = PWAManager.getInstance();

    // Set initial states
    setIsInstalled(pwa.isInstalled());
    setSyncQueueLength(pwa.getSyncQueueLength());

    // Event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstallAvailable = (...args: unknown[]) => setInstallPrompt(args[0] as PWAInstallPrompt);
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    const handleSyncComplete = () => setSyncQueueLength(0);

    pwa.on('online', handleOnline);
    pwa.on('offline', handleOffline);
    pwa.on('installAvailable', handleInstallAvailable);
    pwa.on('appInstalled', handleAppInstalled);
    pwa.on('syncComplete', handleSyncComplete);

    return () => {
      pwa.off('online', handleOnline);
      pwa.off('offline', handleOffline);
      pwa.off('installAvailable', handleInstallAvailable);
      pwa.off('appInstalled', handleAppInstalled);
      pwa.off('syncComplete', handleSyncComplete);
    };
  }, []);

  const installApp = async () => {
    const pwa = PWAManager.getInstance();
    return await pwa.showInstallPrompt();
  };

  const addToSyncQueue = (operation: Record<string, unknown>) => {
    const pwa = PWAManager.getInstance();
    pwa.addToSyncQueue(operation);
    setSyncQueueLength(pwa.getSyncQueueLength());
  };

  return {
    isOnline,
    isInstalled,
    installPrompt: installPrompt !== null,
    syncQueueLength,
    installApp,
    addToSyncQueue,
    pwa: PWAManager.getInstance()
  };
}

// Singleton instance
export const pwaManager = PWAManager.getInstance();