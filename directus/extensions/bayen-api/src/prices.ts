/**
 * Endpoints prix communautaires
 *
 *   POST /bayen-api/price            → partager un prix (anonyme ou connecté)
 *   GET  /bayen-api/prices/:barcode  → agrégat 6 mois (médiane par enseigne)
 *
 * Modération : bornes SQL (0,5–10 000 DH), rate-limit par IP et un seul prix
 * par produit et par session et par jour. La médiane par enseigne absorbe les
 * valeurs aberrantes sans qu'il faille arbitrer manuellement.
 */

import { randomUUID } from 'node:crypto'
import type { Router, Request } from 'express'
import { creditPoints } from './points.js'

interface PriceRequest {
  barcode?: string
  price_mad?: number
  store?: string
  city?: string
  session_id?: string
}

const WINDOW_MS = 60 * 60 * 1000
const MAX = 20
const ipHits = new Map<string, number[]>()

function allowed(ip: string): boolean {
  const now = Date.now()
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (hits.length >= MAX) return false
  hits.push(now)
  ipHits.set(ip, hits)
  return true
}

function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0]?.trim() ?? 'unknown'
  if (Array.isArray(fwd)) return fwd[0] ?? 'unknown'
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown'
}

/** Enseignes connues : ramène les graphies libres à une forme unique. */
const KNOWN_STORES: Array<{ label: string; test: RegExp }> = [
  { label: 'Marjane', test: /marjane/i },
  { label: 'Carrefour', test: /carrefour|label\s*vie/i },
  { label: 'BIM', test: /\bbim\b/i },
  { label: 'Aswak Assalam', test: /aswak/i },
  { label: 'Atacadao', test: /atacad/i },
  { label: 'Épicerie du coin', test: /épicerie|epicerie|hanout|moul/i },
]

function normalizeStore(raw: string): string {
  const trimmed = raw.trim().slice(0, 60)
  for (const { label, test } of KNOWN_STORES) {
    if (test.test(trimmed)) return label
  }
  // Graphie libre : capitalisation simple, on garde tel quel sinon.
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function currentUserId(req: Request): string | null {
  const accountability = (req as unknown as { accountability?: { user?: string | null } }).accountability
  return accountability?.user ?? null
}

interface KnexLike {
  (table: string): {
    where(criteria: Record<string, unknown>): {
      first(): Promise<Record<string, unknown> | undefined>
    }
    insert(data: Record<string, unknown>): Promise<unknown>
  }
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
}

const MAX_PER_DAY = 10 // anti-farm : au-delà, le prix est enregistré mais non crédité

export function registerPricesEndpoints(router: Router, context: { database: unknown }) {
  // ── Partager un prix ──────────────────────────────────────────
  router.post('/price', async (req, res) => {
    try {
      if (!allowed(clientIp(req))) {
        res.status(429).json({ error: 'rate_limited' })
        return
      }

      const { barcode, price_mad, store, city, session_id } = (req.body ?? {}) as PriceRequest

      if (typeof barcode !== 'string' || !/^\d{8,14}$/.test(barcode)) {
        res.status(400).json({ error: 'invalid_barcode' })
        return
      }
      if (typeof price_mad !== 'number' || !Number.isFinite(price_mad) || price_mad < 0.5 || price_mad > 10000) {
        res.status(400).json({ error: 'invalid_price' })
        return
      }
      if (typeof store !== 'string' || store.trim().length < 2) {
        res.status(400).json({ error: 'invalid_store' })
        return
      }

      const knex = context.database as KnexLike
      const product = (await knex('products')
        .where({ barcode, status: 'published' })
        .first()) as { id: string } | undefined

      if (!product) {
        res.status(404).json({ error: 'product_not_found' })
        return
      }

      const userId = currentUserId(req)
      const session = typeof session_id === 'string' ? session_id.slice(0, 64) : null

      // Un seul prix par produit / session / jour — évite le double envoi.
      if (session) {
        const dup = await knex.raw(
          `SELECT 1 FROM prices
           WHERE product_id = ? AND session_id = ? AND date_created > NOW() - INTERVAL '1 day'
           LIMIT 1`,
          [product.id, session],
        )
        if (dup.rows.length > 0) {
          res.status(409).json({ error: 'already_submitted' })
          return
        }
      }

      await knex('prices').insert({
        id: randomUUID(),
        product_id: product.id,
        price_mad,
        store: normalizeStore(store),
        city: typeof city === 'string' ? city.trim().slice(0, 60) || null : null,
        user_id: userId,
        session_id: session,
        status: 'published',
        date_created: new Date(),
      })

      // Crédit plafonné : au-delà de MAX_PER_DAY prix dans la journée, la
      // contribution est conservée mais ne rapporte plus de points.
      let earned = 0
      if (userId) {
        const today = await knex.raw(
          `SELECT COUNT(*)::int AS n FROM prices
           WHERE user_id = ? AND date_created > NOW() - INTERVAL '1 day'`,
          [userId],
        )
        const count = Number(today.rows[0]?.n ?? 0)
        if (count <= MAX_PER_DAY) {
          earned = await creditPoints(context.database, userId, 'add_price', { countAsContribution: false })
        }
      }

      res.json({ ok: true, points_earned: earned })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })

  // ── Agrégat des prix d'un produit ─────────────────────────────
  router.get('/prices/:barcode', async (req, res) => {
    try {
      const barcode = String(req.params.barcode ?? '')
      if (!/^\d{8,14}$/.test(barcode)) {
        res.status(400).json({ error: 'invalid_barcode' })
        return
      }

      const knex = context.database as KnexLike
      const product = (await knex('products')
        .where({ barcode, status: 'published' })
        .first()) as { id: string } | undefined

      if (!product) {
        res.status(404).json({ error: 'product_not_found' })
        return
      }

      // Médiane par enseigne sur 6 mois : robuste aux saisies fantaisistes.
      const byStore = await knex.raw(
        `SELECT store,
                percentile_cont(0.5) WITHIN GROUP (ORDER BY price_mad)::numeric(8,2) AS median,
                COUNT(*)::int AS count,
                MAX(date_created) AS last
         FROM prices
         WHERE product_id = ? AND status = 'published'
           AND date_created > NOW() - INTERVAL '6 months'
         GROUP BY store
         ORDER BY median ASC`,
        [product.id],
      )

      const totals = await knex.raw(
        `SELECT COUNT(*)::int AS count,
                MIN(price_mad)::numeric(8,2) AS min,
                MAX(price_mad)::numeric(8,2) AS max,
                MAX(date_created) AS updated,
                MODE() WITHIN GROUP (ORDER BY city) AS main_city
         FROM prices
         WHERE product_id = ? AND status = 'published'
           AND date_created > NOW() - INTERVAL '6 months'`,
        [product.id],
      )

      const t = totals.rows[0] ?? {}
      res.setHeader('Cache-Control', 'public, max-age=300')
      res.json({
        count: Number(t.count ?? 0),
        min: t.min !== null && t.min !== undefined ? Number(t.min) : null,
        max: t.max !== null && t.max !== undefined ? Number(t.max) : null,
        city: t.main_city ?? null,
        updated: t.updated ?? null,
        by_store: byStore.rows.map((r) => ({
          store: String(r.store),
          median: Number(r.median),
          count: Number(r.count),
          last: r.last,
        })),
      })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
