/* Offline cache for the six-room portfolio.
   Bump CACHE when the caching strategy changes or when a cached model changes
   at the same URL; hashed Next chunks do not need a per-deploy bump. */
const CACHE = "kg-pwa-v2";

const CORE = [
  "/manifest.webmanifest",
  "/offline.html",
  "/fetch_file_index.json",
  "/favicon.ico",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
  "/android-chrome-maskable-512x512.png",
  "/apple-touch-icon.png",
  "/favicon-32x32.png",
  "/favicon-16x16.png",
  "/fonts/montenegrin-gothic-one-latin.woff2",
  "/fonts/montenegrin-gothic-one-latin-ext.woff2",
];

const ASSET_PREFIXES = [
  "/_next/static/",
  "/models/",
  "/images/",
  "/certificates/",
  "/profile/",
  "/music/",
  "/vid/",
  "/sfx/",
  "/draco/",
  "/wall-textures/",
  "/fonts/",
];

async function precacheShell(cache) {
  try {
    const response = await fetch("/", { cache: "reload" });
    if (!response.ok) return;

    await cache.put("/", response.clone());
    const html = await response.text();
    const chunks = new Set();

    for (const match of html.matchAll(/["'](\/_next\/static\/[^"'\\]+)["']/g)) {
      chunks.add(match[1]);
    }

    await Promise.allSettled([...chunks].map((url) => cache.add(url)));
  } catch {
    // The runtime fetch handler can still fill the cache on later visits.
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        await Promise.allSettled(CORE.map((url) => cache.add(url)));
        await precacheShell(cache);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("kg-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    if (request.mode === "navigate") {
      const shell = await caches.match("/");
      if (shell) return shell;
      const offline = await caches.match("/offline.html");
      if (offline) return offline;
    }

    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Range requests keep the browser's own media streaming and avoid caching
  // partial 206 responses as if they were complete files.
  if (request.headers.has("range")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (ASSET_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});
