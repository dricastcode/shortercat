// Service Worker for Children's Catechism App
// Enables offline functionality and caching

const CACHE_NAME = 'childrens-catechism-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/manifest.json',
  '/data/childrens-catechism.json',
  '/apple-touch-icon.png',
  // Add any other assets you have
];

// Install event - cache all essential files
self.addEventListener('install', event => {
  console.log('Service Worker: Installing');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: All files cached successfully');
        return self.skipWaiting(); // Activate new service worker immediately
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache files', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old caches that don't match current version
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming control');
      return self.clients.claim(); // Take control of all pages immediately
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If we have a cached version, return it
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return cachedResponse;
        }

        // Otherwise, try to fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response (since it's a stream, it can only be consumed once)
            const responseToCache = response.clone();

            // Add successful responses to cache for future offline use
            caches.open(CACHE_NAME)
              .then(cache => {
                // Only cache same-origin requests to avoid CORS issues
                if (event.request.url.startsWith(self.location.origin)) {
                  console.log('Service Worker: Caching new resource', event.request.url);
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          })
          .catch(() => {
            // Network failed, and we don't have a cached version
            console.log('Service Worker: Network failed and no cache available for', event.request.url);
            
            // For HTML requests, return a custom offline page if you have one
            if (event.request.headers.get('accept').includes('text/html')) {
              return new Response(
                `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Offline - Children's Catechism</title>
                    <style>
                        body { 
                            font-family: Georgia, serif; 
                            text-align: center; 
                            padding: 50px 20px; 
                            background: #f5f5f5; 
                            color: #333; 
                        }
                        .offline-message { 
                            max-width: 400px; 
                            margin: 0 auto; 
                        }
                        h1 { color: #666; margin-bottom: 20px; }
                        p { line-height: 1.6; margin-bottom: 20px; }
                        .retry-btn { 
                            background: #4a90e2; 
                            color: white; 
                            border: none; 
                            padding: 12px 24px; 
                            border-radius: 6px; 
                            cursor: pointer; 
                            font-size: 16px;
                        }
                        .retry-btn:hover { background: #357abd; }
                    </style>
                </head>
                <body>
                    <div class="offline-message">
                        <h1>📖 Children's Catechism</h1>
                        <h2>You're Offline</h2>
                        <p>It looks like you're not connected to the internet. The app should work offline once you've loaded it at least once.</p>
                        <button class="retry-btn" onclick="window.location.reload()">Try Again</button>
                    </div>
                </body>
                </html>`,
                {
                  headers: { 'Content-Type': 'text/html' }
                }
              );
            }
            
            // For other requests, just fail
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Handle service worker updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: Received skip waiting message');
    self.skipWaiting();
  }
});

// Periodic background sync (if supported)
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);
  // You could implement background data syncing here if needed
});

// Handle push notifications (if you add them later)
self.addEventListener('push', event => {
  console.log('Service Worker: Push message received', event);
  // Handle push notifications here if you implement them
});

console.log('Service Worker: Script loaded');