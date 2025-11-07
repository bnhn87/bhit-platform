// Service Worker for BHIT Work OS - Construction Progress Tracking
// Provides offline-first functionality with smart caching and sync

const CACHE_NAME = 'bhit-work-os-v1.0.1';
const API_CACHE_NAME = 'bhit-api-cache-v1.0.1';
const OFFLINE_URL = '/offline.html';

// Resources to cache for offline use
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  // Core pages
  '/job/',
  '/today/',
  '/settings/',
  // Styles and scripts will be added automatically by Next.js
];

// API endpoints that can be cached
const CACHEABLE_API_PATTERNS = [
  /\/api\/v2\/projects\/[\w-]+\/labour-analysis/,
  /\/api\/jobs\/active/,
  /\/api\/jobs\/[\w-]+/,
];

// Background sync tags
const SYNC_TAGS = {
  PRODUCT_UPDATE: 'product-update-sync',
  BULK_UPDATE: 'bulk-update-sync',
  DAILY_LOG: 'daily-log-sync',
  CLOSEOUT: 'closeout-sync'
};

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests and extension requests
  if (request.method !== 'GET' || request.url.includes('extension')) {
    return;
  }

  try {
    const url = new URL(request.url);

    // Handle different types of requests
    if (url.pathname.startsWith('/api/')) {
      event.respondWith(handleApiRequest(request));
    } else if (url.pathname.startsWith('/_next/static/')) {
      event.respondWith(handleStaticAssets(request));
    } else {
      event.respondWith(handlePageRequest(request));
    }
  } catch (error) {
    console.error('[SW] Invalid URL in fetch event:', request.url, error);
    // Let the browser handle invalid URLs
    return;
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    const url = new URL(request.url);

    // Check if this is a cacheable read-only API
    const isCacheable = CACHEABLE_API_PATTERNS.some(pattern => pattern.test(url.pathname));

    if (request.method === 'GET' && isCacheable) {
      try {
        // Try network first
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
          // Cache successful responses
          const cache = await caches.open(API_CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        }
      } catch (error) {
        console.log('[SW] Network failed for API request, trying cache');
      }

      // Fall back to cache
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // For write operations or non-cacheable APIs, handle offline
    if (!navigator.onLine && (request.method === 'POST' || request.method === 'PATCH')) {
      return handleOfflineApiRequest(request);
    }

    // Try network for all other requests
    try {
      return await fetch(request);
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Network unavailable',
          offline: true,
          message: 'This request will be retried when connection returns'
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (urlError) {
    console.error('[SW] Invalid URL in handleApiRequest:', request.url, urlError);
    // Return error response for invalid URLs
    return new Response(
      JSON.stringify({
        error: 'Invalid URL',
        message: 'The request URL could not be parsed'
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle offline API write requests - queue for sync
async function handleOfflineApiRequest(request) {
  try {
    const body = await request.text();
    const queueItem = {
      id: Date.now().toString(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: Date.now()
    };
    
    // Store in IndexedDB for background sync
    await storeForSync(queueItem);
    
    // Schedule background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      await self.registration.sync.register(SYNC_TAGS.PRODUCT_UPDATE);
    }
    
    return new Response(
      JSON.stringify({ 
        success: true,
        queued: true,
        message: 'Update queued for sync when online'
      }),
      { 
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Failed to queue request',
        details: error.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAssets(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle page requests with network-first, fallback to cache
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful page responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log('[SW] Network failed for page request, trying cache');
  }
  
  // Try cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Fallback to offline page for navigation requests
  if (request.mode === 'navigate') {
    const offlineResponse = await caches.match(OFFLINE_URL);
    if (offlineResponse) {
      return offlineResponse;
    }
  }
  
  // Return a basic offline response
  return new Response(
    'Offline - Please check your connection',
    { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    }
  );
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (Object.values(SYNC_TAGS).includes(event.tag)) {
    event.waitUntil(processOfflineQueue());
  }
});

// Process offline queue when connection returns
async function processOfflineQueue() {
  try {
    const queuedItems = await getQueuedItems();
    console.log('[SW] Processing', queuedItems.length, 'queued items');
    
    for (const item of queuedItems) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body
        });
        
        if (response.ok) {
          await removeFromQueue(item.id);
          console.log('[SW] Successfully synced item:', item.id);
        } else {
          console.log('[SW] Sync failed for item:', item.id, response.status);
        }
      } catch (error) {
        console.log('[SW] Sync error for item:', item.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Error processing offline queue:', error);
  }
}

// IndexedDB operations for offline queue
async function storeForSync(item) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bhit-offline-queue', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      
      store.add(item);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('queue')) {
        const store = db.createObjectStore('queue', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

async function getQueuedItems() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bhit-offline-queue', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['queue'], 'readonly');
      const store = transaction.objectStore('queue');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

async function removeFromQueue(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bhit-offline-queue', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['queue'], 'readwrite');
      const store = transaction.objectStore('queue');
      
      store.delete(id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_CACHE_STATUS':
        getCacheStatus().then(status => {
          event.ports[0].postMessage(status);
        });
        break;
      case 'CLEAR_CACHE':
        clearAllCaches().then(() => {
          event.ports[0].postMessage({ success: true });
        });
        break;
    }
  }
});

async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = keys.length;
  }
  
  return status;
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
}