// Service worker mínimo: stale-while-revalidate pro app shell/assets
// estáticos, nunca cacheia /api/* (dados vêm sempre de rede).
const CACHE = 'agrocheck-v1'
const APP_SHELL = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  const { request } = e
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.pathname.startsWith('/api/')) return // API sempre vai direto pra rede

  e.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(request, res.clone()))
          return res
        })
        .catch(() => cached)
      return cached || fetchPromise
    })
  )
})
