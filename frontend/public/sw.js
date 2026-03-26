/**
 * Service Worker Bayen — stratégies de cache
 *
 * - Shell (JS, CSS, assets statiques) : CacheFirst
 * - Pages (document) : NetworkFirst — JAMAIS CacheFirst pour éviter les redirections cachées
 * - API Directus : NetworkFirst, fallback cache 24h
 * - Images CDN : CacheFirst, max 500 entrées, expiry 7 jours
 * - Offline : page offline statique
 *
 * Référence : SPEC.md §9
 */

const CACHE_VERSION = 'v2'
const CACHE_SHELL = `bayen-shell-${CACHE_VERSION}`
const CACHE_API = `bayen-api-${CACHE_VERSION}`
const CACHE_IMAGES = `bayen-images-${CACHE_VERSION}`
const CACHE_PAGES = `bayen-pages-${CACHE_VERSION}`

const VALID_CACHES = [CACHE_SHELL, CACHE_API, CACHE_IMAGES, CACHE_PAGES]

// Installation — pré-cache des assets statiques uniquement (pas les pages)
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activation — nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !VALID_CACHES.includes(key))
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

  // Ignorer les requêtes cross-origin sauf images CDN
  if (url.origin !== self.location.origin && !url.hostname.includes('cdn')) {
    return
  }

  // API Directus — NetworkFirst avec cache 24h
  if (url.hostname.includes('api-bayen') || url.pathname.startsWith('/items/')) {
    event.respondWith(networkFirst(event.request, CACHE_API))
    return
  }

  // Images CDN — CacheFirst, max 7 jours
  if (
    url.pathname.includes('/assets/') ||
    url.hostname.includes('cdn') ||
    /\.(jpg|jpeg|png|webp|gif|svg|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirstSafe(event.request, CACHE_IMAGES))
    return
  }

  // Pages HTML (navigation) — NetworkFirst OBLIGATOIRE
  // Ne JAMAIS utiliser CacheFirst pour les documents (risque de cacher des redirections)
  if (event.request.destination === 'document' || event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, CACHE_PAGES))
    return
  }

  // Assets statiques (JS, CSS, fonts) — CacheFirst
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.destination === 'font' ||
    url.pathname.startsWith('/_astro/')
  ) {
    event.respondWith(cacheFirstSafe(event.request, CACHE_SHELL))
    return
  }
})

/**
 * CacheFirst sécurisé — ne cache JAMAIS les réponses redirigées ou en erreur
 */
async function cacheFirstSafe(request, cacheName) {
  const cached = await caches.match(request)
  // Ne renvoyer le cache QUE si c'est une réponse valide (pas une redirection)
  if (cached && !cached.redirected && cached.status >= 200 && cached.status < 300) {
    return cached
  }

  try {
    const response = await fetch(request)
    // Ne cacher QUE les réponses 200 OK, non-redirigées, non-opaques
    if (response.ok && !response.redirected && response.type !== 'opaque') {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())

      // Limiter le cache images à 500 entrées
      if (cacheName === CACHE_IMAGES) {
        limitCache(cacheName, 500)
      }
    }
    return response
  } catch {
    // Fallback offline pour les assets statiques
    return new Response('', { status: 503, statusText: 'Offline' })
  }
}

/**
 * NetworkFirst — réseau d'abord, fallback cache
 * Ne cache JAMAIS les redirections
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 5000)
      ),
    ])
    // Ne cacher QUE les 200 OK sans redirection
    if (response.ok && !response.redirected) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached && !cached.redirected && cached.status >= 200 && cached.status < 300) {
      return cached
    }
    // Fallback pour les documents : retourner la page d'accueil cachée
    if (request.destination === 'document' || request.mode === 'navigate') {
      const homeCache = await caches.match('/')
      if (homeCache && !homeCache.redirected) {
        return homeCache
      }
    }
    return new Response(
      request.destination === 'document'
        ? '<html><body><h1>Hors ligne</h1><p>Vérifiez votre connexion internet.</p></body></html>'
        : JSON.stringify({ error: 'offline' }),
      {
        status: 503,
        headers: {
          'Content-Type': request.destination === 'document' ? 'text/html; charset=utf-8' : 'application/json',
        },
      }
    )
  }
}

// Limiter le nombre d'entrées dans un cache
async function limitCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries)
    for (const key of toDelete) {
      await cache.delete(key)
    }
  }
}
