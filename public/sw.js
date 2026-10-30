// Service worker do Memorabilia
// - Guarda o "esqueleto" do app para abrir sem internet
// - Só mexe em arquivos do próprio site (nunca guarda Google Sheets, Gemini, capas etc.)
const CACHE = 'memorabilia-v1';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const save = (request, response) => {
  if (response && response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
  }
  return response;
};

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // ignora APIs e imagens externas

  // Abrir o app: tenta a internet primeiro (pega sempre a versão nova); sem rede, usa a cópia guardada
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => save('/index.html', res))
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Arquivos com código no nome (/assets/...) nunca mudam: pode usar a cópia guardada direto
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => save(request, res)))
    );
    return;
  }

  // O resto (ícones, manifest): internet primeiro, cópia como reserva
  event.respondWith(fetch(request).then((res) => save(request, res)).catch(() => caches.match(request)));
});
