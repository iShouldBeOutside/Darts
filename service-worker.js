// ─────────────────────────────────────────────
//  service-worker.js  —  Darts PWA
//  Strategy: Network-first with offline fallback
// ─────────────────────────────────────────────

// ── 1. CACHE NAME ──────────────────────────────────────────────────────────
// Change the version string (e.g. "v2") whenever you deploy an update.
// This forces old caches to be cleared automatically.
const CACHE_NAME = "darts-cache-v3";

// ── 2. FILES TO PRE-CACHE ON INSTALL ───────────────────────────────────────
// These are fetched and stored the moment the PWA is first installed.
// Add every file your app needs to run offline.
const PRECACHE_URLS = [
  "/Darts/",
  "/Darts/index.html",
  "/Darts/stats.html",
  "/Darts/profile.html",
  "/Darts/common.css",
  "/Darts/sfx.js",
  "/Darts/utils.js",
  "/Darts/players.js",
  "/Darts/manifest.json",
  "/Darts/icon-192.png",
  "/Darts/icon-512.png",
  "/Darts/games/x01.html",
  "/Darts/games/cricket.html",
  "/Darts/games/clock.html",
  "/Darts/games/shanghai.html",
  "/Darts/games/halveit.html",
  "/Darts/games/bobs27.html",
  "/Darts/games/killer.html",
  "/Darts/games/legs.html",
  "/Darts/games/countup.html"
];

// ── 3. INSTALL EVENT ───────────────────────────────────────────────────────
// Runs once when the service worker is first registered.
// Opens the cache and stores all the files listed above.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching app shell");
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately — don't wait for old tabs to close
  self.skipWaiting();
});

// ── 4. ACTIVATE EVENT ──────────────────────────────────────────────────────
// Runs after install. Deletes any caches from older versions of the app.
// This is how old cached files get cleaned up when you bump CACHE_NAME.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)  // find old caches
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);            // delete them
          })
      );
    })
  );
  // Take control of all open tabs immediately
  self.clients.claim();
});

// ── 5. FETCH EVENT (NETWORK-FIRST STRATEGY) ────────────────────────────────
// Every time the app requests a file, this runs.
//
// Network-first means:
//   1. Try to get the file from the internet (fresh, up-to-date)
//   2. If that succeeds → save a copy to cache, then return it
//   3. If the network fails (offline) → serve the cached copy instead
//   4. If there's no cached copy either → return a basic offline message
//
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests (e.g. POST form submissions — we don't touch those)
  if (event.request.method !== "GET") return;

  // Skip requests outside our app's scope (e.g. analytics, external CDNs)
  if (!event.request.url.startsWith(self.location.origin)) return;

  // For CSS files, force a fresh fetch by adding a timestamp query string
  // This bypasses HTTP caching and ensures style updates are always fresh
  let fetchUrl = event.request.url;
  if (event.request.url.includes("common.css")) {
    fetchUrl = event.request.url + (event.request.url.includes("?") ? "&" : "?") + "t=" + Date.now();
  }

  event.respondWith(
    fetch(fetchUrl)
      .then((networkResponse) => {
        // Network succeeded — clone the response and save it to cache
        // (A response can only be read once, so we clone before caching)
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse; // return the fresh network response
      })
      .catch(() => {
        // Network failed — try the cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log("[SW] Serving from cache:", event.request.url);
            return cachedResponse;
          }
          // Nothing in cache either — return a minimal offline fallback
          // This only shows for pages not yet cached (e.g. first visit offline)
          return new Response(
            `<!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Darts — Offline</title>
              <style>
                body {
                  background: #0d0d0d;
                  color: #888;
                  font-family: monospace;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  text-align: center;
                  gap: 1rem;
                }
                h1 { color: #cc2200; font-size: 2rem; font-weight: 400; }
                p  { font-size: 0.8rem; letter-spacing: 0.1em; }
              </style>
            </head>
            <body>
              <h1>🎯 Darts</h1>
              <p>YOU ARE OFFLINE</p>
              <p style="color:#555">Open the app at least once online<br>to enable offline play.</p>
            </body>
            </html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        });
      })
  );
});
