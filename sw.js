/* Ironhold service worker: offline app shell */
const VERSION = 'ironhold-v1.2.1';
const ASSETS = ['./', './index.html', './style.css', './js/billing.js', './js/more.js', './game.js', './manifest.webmanifest', './privacy.html', './icons/icon-192.png', './icons/more/apothecary.png', './icons/more/blackpool.png', './icons/more/cartographer.png', './icons/more/clockworkpost.png', './icons/more/elderon.png', './icons/more/harbormaster.png', './icons/more/keepthelight.png', './icons/more/lostproperty.png', './icons/more/mended.png', './icons/more/nightbakery.png', './icons/more/nighttrain.png', './icons/more/openstall.png', './icons/more/pocketdecks.png', './icons/more/seedandsprout.png', './icons/icon-512.png', './icons/maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fetch(e.request).then(res => { if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
