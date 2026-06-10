const CACHE_NAME = 'sacolas-braga-v1'
const OFFLINE_URL = '/offline'

const APP_SHELL = [
  '/',
  '/offline',
  '/manifest.json',
]

// Instala: cacheia o shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

// Ativa: remove caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch: network-first para API, cache-first para assets, offline fallback para navegação
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignora requests de outras origens
  if (url.origin !== self.location.origin) return

  // API → sempre network, sem cache
  if (url.pathname.startsWith('/api/')) return

  // Navegação → network-first com fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    )
    return
  }

  // Assets estáticos → cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => caches.match(OFFLINE_URL))
    })
  )
})

// Push notification recebida
self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try { data = event.data.json() } catch { return }

  const { titulo = 'Sacolas Braga', corpo = '', url = '/' } = data

  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: corpo,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      data: { url },
      vibrate: [200, 100, 200],
    })
  )
})

// Clique na notificação → abre a URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cls) => {
      const match = cls.find((c) => c.url === url && 'focus' in c)
      if (match) return match.focus()
      return clients.openWindow(url)
    })
  )
})
