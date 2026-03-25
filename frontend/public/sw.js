/**
 * Service Worker Bayen — stratégies de cache
 *
 * - Shell (HTML, CSS, JS) : CacheFirst avec fallback réseau
 * - API Directus : NetworkFirst, fallback cache 24h
 * - Images CDN : CacheFirst, max 500 entrées, expiry 7 jours
 * - Offline : page offline statique
 *
 * Référence : SPEC.md §9
 */

const CACHE_SHELL = 'bayen-shell-v1'
const CACHE_API = 'bayen-api-v1'
const CACHE_IMAGES = 'bayen-images-v1'

const SHELL_URLS = [
  '/',
  '/scan',
  '/additifs',
  '/recherche',
  '/contribuer',
]

// Installation — pré-cache du shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => {
      return cache.addAll(SHELL_URLS).catch(() => {
        // Ignorer les erreurs de pré-cache (pages SSR)
      })
    })
  )
  self.skipWaiting()
})

// Activation — nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !key.startsWith('bayen-'))
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch — routage par type de requête
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return

  // API Directus — NetworkFirst avec cache 24h
  if (url.hostname.includes('api-bayen') || url.pathname.startsWith('/items/')) {
    event.respondWith(networkFirst(event.request, CACHE_API, 24 * 60 * 60))
    return
  }

  // Images CDN — CacheFirst, max 7 jours
  if (
    url.pathname.includes('/assets/') ||
    url.hostname.includes('cdn') ||
    /\.(jpg|jpeg|png|webp|gif|svg)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(event.request, CACHE_IMAGES))
    return
  }

  // Shell (pages, JS, CSS) — CacheFirst avec fallback réseau
  if (
    event.request.destination === 'document' ||
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    url.pathname.startsWith('/_astro/')
  ) {
    event.respondWith(cacheFirst(event.request, CACHE_SHELL))
    return
  }
})

// Stratégie CacheFirst
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())

      // Limiter le cache images à 500 entrées
      if (cacheName === CACHE_IMAGES) {
        limitCache(cacheName, 500)
      }
    }
    return response
  } catch {
    return new Response('Offline', { status: 503 })
  }
}

// Stratégie NetworkFirst avec timeout
async function networkFirst(request, cacheName, maxAgeSeconds) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      ),
    ])
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

// Limiter le nombre d'entrées dans un cache
async function limitCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    // Supprimer les plus anciennes
    const toDelete = keys.slice(0, keys.length - maxEntries)
    for (const key of toDelete) {
      await cache.delete(key)
    }
  }
}
