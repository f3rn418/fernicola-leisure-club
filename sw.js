// Pixie Dust Plan: keeps the page working with a weak signal.
// Network first, checked against the server every time so a fresh deploy shows up right away.
// If the network has not answered in 4 seconds, the saved copy opens instead and the fetch keeps going to refresh it.
const PREFIX = 'pp-root-';
const CACHE = PREFIX + '202610092153';
const FONTS = CACHE + '-fonts';
const SHELL = ["Disney-Park-Day-Paths.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
const WAIT = 4000;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE && k !== FONTS).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function openPage(e, r) {
  const net = fetch(r, {cache: 'no-cache'}).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
    return res;
  });
  net.catch(() => {});
  const late = new Promise(done => setTimeout(() => done(null), WAIT));
  try { const res = await Promise.race([net, late]); if (res) return res; } catch (err) {}
  const saved = (await caches.match(r, {ignoreSearch: true})) || (await caches.match(SHELL[0], {ignoreSearch: true}));
  if (!saved) return net;
  e.waitUntil(net.catch(() => {}));
  return saved;
}
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    e.respondWith(openPage(e, r));
  } else if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open(FONTS).then(c => c.match(r).then(m => {
      const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }).catch(() => m);
      return m || net;
    })));
  }
});
