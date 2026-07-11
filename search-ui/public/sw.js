const CACHE_NAME = 'iptv-shell-v3'
const API_CACHE = 'iptv-api-v1'

// Static assets to precache
const PRECACHE_URLS = [
  '/',
  '/index.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Never cache stream proxy requests
  if (url.pathname.startsWith('/api/proxy/')) return

  // Playback memory saves: let them pass through without caching
  if (url.pathname === '/api/playback/memory' && request.method === 'PUT') return

  // API requests: NetworkFirst with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response.ok && request.method === 'GET') cache.put(request, response.clone())
            return response
          })
          .catch(() => cache.match(request))
      )
    )
    return
  }

  // Static assets: CacheFirst
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // Navigation: NetworkFirst
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    )
  }
})

// Handle playback progress saves off the main thread
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SAVE_PLAYBACK') {
    const { id, currentTime, duration } = event.data
    fetch('/api/playback/memory', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, currentTime, duration }),
    }).catch(() => {})
  }
})
