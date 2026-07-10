const CACHE_PREFIX = "jianfei-paipai-shell";
const CACHE_VERSION = "stage3-activity-reward-v1";
const SHELL_CACHE = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/app-icon-192.png",
  "/app-icon-512.png",
];
const LOCAL_ONLY_PROTOCOLS = new Set(["blob:", "data:"]);

async function cacheAppShell() {
  const cache = await caches.open(SHELL_CACHE);

  await Promise.all(
    APP_SHELL.map(async (path) => {
      try {
        const response = await fetch(path, { cache: "reload" });
        if (response.ok) await cache.put(path, response);
      } catch {
        // A missing optional icon must not prevent the worker from installing.
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith(CACHE_PREFIX) && key !== SHELL_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirstShell(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) await cache.put("/", response.clone());
    return response;
  } catch {
    return (await cache.match("/")) ?? Response.error();
  }
}

async function cacheFirstStatic(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (LOCAL_ONLY_PROTOCOLS.has(url.protocol)) return;
  if (url.origin !== self.location.origin) return;

  // Cache only the single-page app shell and build-owned assets. IndexedDB
  // records, local photo Blobs, provider responses, and future server data stay
  // outside Cache Storage by construction.
  if (request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(networkFirstShell(request));
    return;
  }

  if (
    APP_SHELL.includes(url.pathname) ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(cacheFirstStatic(request));
  }
});
