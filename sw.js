/* Service Worker: hält die App offline verfügbar.
   Bei jeder Änderung an index.html, css/ oder js/ die VERSION erhöhen. */
const VERSION = 'v1';
const CACHE = 'lebenskompass-' + VERSION;
const SHELL = [
  './',
  'index.html',
  'css/app.css',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('lebenskompass-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Datenbank, Anmeldung und KI nie zwischenspeichern
  if (url.hostname.endsWith('supabase.co')) return;
  // Die Hülle für die Apps-Script-App (kompass/) nicht anfassen
  if (url.origin === self.location.origin && url.pathname.indexOf('/kompass/') > -1) return;

  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const isShell = url.origin === self.location.origin || url.hostname === 'cdn.jsdelivr.net' || isFont;
  if (!isShell) return;

  // Sofort aus dem Speicher antworten, im Hintergrund aktualisieren
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(req, { ignoreSearch: url.origin === self.location.origin }).then((hit) => {
        const netz = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit || (req.mode === 'navigate' ? cache.match('index.html') : undefined));
        return hit || netz;
      })
    )
  );
});
