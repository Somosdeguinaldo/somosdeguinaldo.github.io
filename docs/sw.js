/* El Perro — el «service worker»: guarda una copia del juego en el móvil para poder jugar sin cobertura.
   Siempre intenta primero lo nuevo de internet (así cada cambio llega enseguida); si no hay conexión, o tarda
   demasiado, tira de la copia guardada. Lo de Supabase (cuentas y mesa con amigos) no pasa por aquí. */
const VERSION = '8d3a4d9410';
const CACHE = 'el-perro-' + VERSION;
const BASICO = ['./', 'index.html', 'config.js', 'manifest.webmanifest', 'icono-180.png', 'icono-192.png', 'icono-512.png', 'icono-maskable-512.png'];
const FUENTES = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;
const ESPERA = 4000;   // con una raya de cobertura, a los 4 s se abre la copia guardada (y se renueva por detrás)

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(BASICO.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('el-perro-') && k !== CACHE && k !== 'el-perro-fuentes').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function primeroInternet(ev) {
  const req = ev.request;
  const guardada = () => caches.match(req, { ignoreSearch: true })
    .then(r => r || (req.mode === 'navigate' ? caches.match('index.html') : undefined));
  const deInternet = fetch(req).then(res => {
    if (res && res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return res;
  });
  ev.waitUntil(deInternet.catch(() => {}));
  const plazo = new Promise(ok => setTimeout(() => guardada().then(r => r && ok(r)), ESPERA));
  return Promise.race([deInternet.catch(() => guardada()), plazo]).then(r => r || deInternet);
}

function fuentes(ev) {
  // Las letras: la copia guardada al momento, y se renueva por detrás
  return caches.open('el-perro-fuentes').then(c => c.match(ev.request).then(r => {
    const nueva = fetch(ev.request).then(res => { if (res && (res.ok || res.type === 'opaque')) c.put(ev.request, res.clone()); return res; });
    ev.waitUntil(nueva.catch(() => {}));
    return r || nueva;
  }));
}

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) ev.respondWith(primeroInternet(ev));
  else if (FUENTES.test(req.url)) ev.respondWith(fuentes(ev));
});
