const CACHE_NAME = 'medical-recorder-v1';
const urlsToCache = [
  '/',
  '/src/main.tsx',
  '/src/index.css',
  '/src/App.tsx',
  '/src/pages/Index.tsx',
  // Add other critical assets
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // If the request is a blob: URL, do not intercept — let browser handle it
  try {
    if (event.request.url.startsWith('blob:')) {
      return; // no event.respondWith -> browser default handling
    }
  } catch (e) {
    // ignore
  }
  // If the request includes a Range header, bypass cache to avoid partial content issues
  const rangeHeader = event.request.headers.get('range');
  if (rangeHeader) {
    // For blob/video playback with Range requests, just forward to network
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});