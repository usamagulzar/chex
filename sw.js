// --- CHEX SERVICE WORKER ----------------------------------------------------
// Bump this on every deploy that changes any cached file. Old caches are
// purged automatically on activate, so this is the only version knob you need.
const CACHE_VERSION = 'chex-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SCOPE = self.registration.scope; // e.g. https://usamagulzar.github.io/chex/

// The app shell: everything needed to boot the board offline.
// Paths are relative to SCOPE so this works whether you're hosted at a
// domain root or a sub-path (GitHub Pages project sites).
const PRECACHE_URLS = [
  '',
  'index.html',
  'manifest.json',
  'css/style.css',
  'fonts.css',
  'js/svg.js',
  'js/audio.js',
  'js/ui.js',
  'js/timer.js',
  'js/analysis.js',
  'js/engine.js',
  'js/variants.js',
  'js/history.js',
  'js/multiplayer.js',
  'js/auth.js',
  'js/app.js',
  'js/stockfish-18-lite-single.js',
  'js/stockfish-18-lite-single.wasm',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'offline.html'
].map((p) => new URL(p, SCOPE).toString());

// Never cache Firebase's live data channels — these must always hit the
// network, or multiplayer state will go stale / silently fail offline.
const NEVER_CACHE_HOSTS = [
  'firestore.googleapis.com',
  'firebaseio.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('chex-') && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // never intercept writes

  const url = new URL(req.url);

  // Let Firebase's live data traffic go straight to the network, untouched.
  if (NEVER_CACHE_HOSTS.some((host) => url.hostname.includes(host))) {
    return;
  }

  // Navigations (loading the app itself): try network first so players
  // always get the latest shell when online, fall back to cache, then to
  // a dedicated offline page if neither is available.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then((cached) => cached || caches.match(new URL('index.html', SCOPE).toString()))
            .then((fallback) => fallback || caches.match(new URL('offline.html', SCOPE).toString()))
        )
    );
    return;
  }

  // Same-origin static assets (JS/CSS/wasm/icons/fonts): cache-first,
  // refresh in the background so the next load picks up updates.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Cross-origin static deps (Firebase SDK from gstatic, Google Fonts, etc.):
  // stale-while-revalidate so the app still boots offline with a slightly
  // older SDK build rather than failing outright.
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    )
  );
});
