// Daily Atlas service worker: keeps the warm-up's satellite tiles (and the NASA backup picture) on this device, so the
// map opens instantly after the first time. Everything else goes straight to the network, so game updates are never stale.
const CACHE = "atlas-sat-v1", MAX_TILES = 6000;
const HOSTS = ["tiles.maps.eox.at", "server.arcgisonline.com"];
const isSat = url => HOSTS.includes(url.hostname) || (url.origin === location.origin && url.pathname.includes("/img/sat/"));

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

let puts = 0;
const noCors = new Set(); // hosts that refused a readable copy: load their tiles plainly, uncached
async function cached(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  const host = new URL(request.url).hostname;
  if (noCors.has(host)) return fetch(request);
  try {
    // ask for a readable (CORS) copy so it can be stored at its real size; if the host refuses, fall back to a plain load
    const res = await fetch(request.url, { mode: "cors", credentials: "omit" });
    if (res.ok) {
      await cache.put(request.url, res.clone());
      if (++puts % 50 === 0) trim(cache);
    }
    return res; // a failed tile goes back to the page as a failure, so the page can try the next source
  } catch (e) {
    noCors.add(host);
    return fetch(request);
  }
}
// drop the oldest tiles once there are too many
async function trim(cache) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - MAX_TILES))) await cache.delete(k);
}

self.addEventListener("fetch", e => {
  if (e.request.method === "GET" && isSat(new URL(e.request.url))) e.respondWith(cached(e.request));
});

// the page sends a list of tiles to fetch ahead of time (the whole world at the zoomed-out levels); ones already kept are skipped
self.addEventListener("message", e => {
  const urls = e.data && e.data.warm;
  if (!Array.isArray(urls)) return;
  const ok = urls.filter(u => typeof u === "string" && /^https:\/\/(tiles\.maps\.eox\.at|server\.arcgisonline\.com)\//.test(u)).slice(0, 2000);
  e.waitUntil((async () => { for (let i = 0; i < ok.length; i += 8) await Promise.all(ok.slice(i, i + 8).map(u => cached(new Request(u)).catch(() => {}))); })());
});
