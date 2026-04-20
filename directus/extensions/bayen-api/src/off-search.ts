/**
 * Endpoint GET /bayen-api/off-search
 *
 * Proxy serveur vers l'API de recherche Open Food Facts avec :
 *  - cache mémoire 15 min (évite de marteler OFF sur la même page)
 *  - throttle 6 s entre appels OFF (respect du rate-limit OFF ~10 req/min)
 *  - retry exponentiel sur 503 (jusqu'à 3 tentatives)
 *  - déduplication des appels concurrents (2 clients demandent page 3 en
 *    même temps → 1 seul fetch OFF partagé)
 *
 * Query params :
 *   page      : numéro de page (1-N)
 *   country   : pays OFF (ex: "morocco", défaut)
 *   page_size : produits par page (défaut 100, max 100 côté OFF)
 */

import type { Router, Request, Response } from 'express'

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const OFF_USER_AGENT = process.env.OFF_USER_AGENT ?? 'Bayen/1.0 (contact@n0.ma)'

const OFF_FIELDS = [
  'code',
  'product_name_fr',
  'product_name',
  'brands',
  'nutriscore_grade',
  'nova_group',
  'nutriments',
  'ingredients_text_fr',
  'ingredients_text',
  'additives_tags',
  'image_front_url',
  'image_nutrition_url',
  'image_ingredients_url',
  'categories_tags',
  'traces_tags',
  'ingredients',
].join(',')

// ── Cache + throttle (process memory) ─────────────────────────────
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 min
const THROTTLE_MS = 6_000 // ≥ 6 s entre 2 appels OFF (rate limit ~10 req/min)

interface CacheEntry {
  body: Buffer
  expiresAt: number
}

const cache = new Map<string, CacheEntry>()
const inFlight = new Map<string, Promise<Buffer>>()
let lastOffCallAt = 0

function cacheKey(country: string, page: string, pageSize: string): string {
  return `${country}|${page}|${pageSize}`
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

async function fetchOffWithRetry(url: string): Promise<Buffer> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    // Throttle : pause jusqu'à laisser passer 6s depuis le dernier appel
    const elapsed = Date.now() - lastOffCallAt
    if (elapsed < THROTTLE_MS) await sleep(THROTTLE_MS - elapsed)
    lastOffCallAt = Date.now()

    const res = await fetch(url, {
      headers: { 'User-Agent': OFF_USER_AGENT },
      signal: AbortSignal.timeout(30_000),
    })

    if (res.ok) {
      return Buffer.from(await res.arrayBuffer())
    }

    // 503 = rate-limit OFF → backoff exponentiel puis retry
    if (res.status === 503 && attempt < 3) {
      const backoff = 2_000 * Math.pow(2, attempt - 1) // 2s, 4s
      console.warn(`[bayen-api/off-search] OFF 503 (attempt ${attempt}), backoff ${backoff}ms`)
      await sleep(backoff)
      continue
    }

    throw new Error(`OFF HTTP ${res.status}`)
  }
  throw new Error('OFF HTTP 503 après 3 tentatives')
}

export function registerOffSearchEndpoint(router: Router): void {
  router.get('/off-search', async (req: Request, res: Response) => {
    const page = typeof req.query.page === 'string' ? req.query.page : '1'
    const country = typeof req.query.country === 'string' ? req.query.country : 'morocco'
    const pageSize = typeof req.query.page_size === 'string' ? req.query.page_size : '100'

    // Validation stricte
    if (!/^\d{1,4}$/.test(page)) {
      res.status(400).json({ error: 'page invalide' })
      return
    }
    if (!/^[a-z-]{2,30}$/.test(country)) {
      res.status(400).json({ error: 'country invalide' })
      return
    }
    if (!/^\d{1,3}$/.test(pageSize)) {
      res.status(400).json({ error: 'page_size invalide' })
      return
    }

    const key = cacheKey(country, page, pageSize)
    const now = Date.now()

    // 1) Cache hit ?
    const cached = cache.get(key)
    if (cached && cached.expiresAt > now) {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('X-Bayen-Cache', 'HIT')
      res.status(200).send(cached.body)
      return
    }

    // 2) Requête déjà en vol ? → on la partage
    const url =
      `${OFF_SEARCH_URL}?tagtype_0=countries&tag_contains_0=contains&tag_0=${country}` +
      `&action=process&json=true&page_size=${pageSize}&page=${page}&fields=${OFF_FIELDS}`

    let pending = inFlight.get(key)
    if (!pending) {
      pending = fetchOffWithRetry(url)
      inFlight.set(key, pending)
      pending.finally(() => inFlight.delete(key))
    }

    try {
      const buf = await pending
      cache.set(key, { body: buf, expiresAt: Date.now() + CACHE_TTL_MS })
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'public, max-age=300')
      res.setHeader('X-Bayen-Cache', 'MISS')
      res.status(200).send(buf)
    } catch (err) {
      console.error('[bayen-api/off-search] fetch fail:', err)
      res.status(502).json({
        error: err instanceof Error ? err.message : 'fetch OFF a échoué',
      })
    }
  })
}
