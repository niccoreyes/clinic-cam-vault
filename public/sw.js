// Versioned caches
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Detect Vite dev scope (so we fully bypass in development)
const DEV_HOSTS = ['localhost', '127.0.0.1'];
const DEV_PORT = '8080';
const IS_DEV_SCOPE = DEV_HOSTS.includes(self.location.hostname) && self.location.port === DEV_PORT;

// Minimal precache of app shell assets available at runtime
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  // Add other public/ assets as needed (do not include /src/* which doesn't exist in production)
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      if (IS_DEV_SCOPE) {
        // In dev, don't cache anything and activate immediately
        self.skipWaiting();
        return;
      }
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS);
      // Activate the new SW immediately
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }
        })
      );
      // Control any open clients as soon as possible
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // In development, completely bypass the SW so dev/HMR works
  if (IS_DEV_SCOPE) return;

  // Do not interfere with non-GET requests
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept the service worker file or Vite dev/HMR endpoints
  if (
    url.pathname === '/sw.js' ||
    url.pathname.startsWith('/@vite') ||
    url.pathname.startsWith('/@react-refresh') ||
    url.pathname.startsWith('/src/')
  ) {
    return;
  }

  // Let the browser handle blob: URLs
  try {
    if (req.url.startsWith('blob:')) return;
  } catch {}

  // Bypass cache for Range requests (e.g., video playback)
  if (req.headers.get('range')) {
    event.respondWith(fetch(req));
    return;
  }

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // App navigation: try network first, fallback to cached app shell
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, true));
    return;
  }

  const assetLike =
    url.pathname.startsWith('/assets/') ||
    ['script', 'style', 'image', 'font'].includes(req.destination);

  if (assetLike) {
    // Static assets: cache first
    event.respondWith(cacheFirst(req));
    return;
  }

  // Other same-origin GET requests: network first, fallback to cache
  event.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (isCacheableResponse(res)) {
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    // As last resort, return any cached fallback for navigation
    if (req.mode === 'navigate') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    throw e;
  }
}

async function networkFirst(req, isNavigation = false) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(req);
    if (isCacheableResponse(res)) {
      cache.put(req, res.clone());
    }
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    if (cached) return cached;
    if (isNavigation) {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    // Return a basic Response instead of throwing to avoid unhandled promise rejections
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

function isCacheableResponse(res) {
  try {
    return res && res.status === 200 && (res.type === 'basic' || res.type === 'opaqueredirect' || res.type === 'default');
  } catch {
    return false;
  }
}