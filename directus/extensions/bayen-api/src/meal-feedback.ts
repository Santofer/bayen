/**
 * Endpoint POST /bayen-api/meal-feedback
 *
 * Retour de l'utilisateur sur une estimation de repas : pouce haut/bas, et
 * éventuellement une correction (plat, portion, calories).
 *
 * Anonyme autorisé : aucune photo, aucune donnée personnelle — seulement le
 * plat identifié par l'IA et la correction saisie. Ces retours servent à
 * affiner le référentiel `moroccan_dishes` (script hebdomadaire), pas à
 * réentraîner le modèle.
 *
 * Un simple pouce ne rapporte rien ; seule une correction argumentée crédite
 * des points (anti-farm).
 */

import { randomUUID } from 'node:crypto'
import type { Router, Request } from 'express'
import { creditPoints } from './points.js'

interface Correction {
  plat?: string
  portion_g?: number
  calories_kcal?: number
}

interface FeedbackRequest {
  meal_scan_id?: string
  plat_detecte?: string
  rating?: string
  correction?: Correction
  confiance_ia?: string
  session_id?: string
}

const WINDOW_MS = 60 * 60 * 1000
const MAX = 30
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

function currentUserId(req: Request): string | null {
  const accountability = (req as unknown as { accountability?: { user?: string | null } }).accountability
  return accountability?.user ?? null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Ne garde que des valeurs plausibles : une correction absurde est du bruit. */
function sanitizeCorrection(raw: unknown): Correction | null {
  if (!raw || typeof raw !== 'object') return null
  const c = raw as Correction
  const out: Correction = {}
  if (typeof c.plat === 'string' && c.plat.trim().length >= 2) {
    out.plat = c.plat.trim().slice(0, 200)
  }
  if (typeof c.portion_g === 'number' && Number.isFinite(c.portion_g) && c.portion_g > 0 && c.portion_g <= 3000) {
    out.portion_g = Math.round(c.portion_g)
  }
  if (
    typeof c.calories_kcal === 'number'
    && Number.isFinite(c.calories_kcal)
    && c.calories_kcal > 0
    && c.calories_kcal <= 5000
  ) {
    out.calories_kcal = Math.round(c.calories_kcal)
  }
  return Object.keys(out).length > 0 ? out : null
}

interface KnexLike {
  (table: string): { insert(data: Record<string, unknown>): Promise<unknown> }
}

export function registerMealFeedbackEndpoint(router: Router, context: { database: unknown }) {
  router.post('/meal-feedback', async (req, res) => {
    try {
      if (!allowed(clientIp(req))) {
        res.status(429).json({ error: 'rate_limited' })
        return
      }

      const body = (req.body ?? {}) as FeedbackRequest
      const rating = body.rating
      if (rating !== 'up' && rating !== 'down') {
        res.status(400).json({ error: 'invalid_rating' })
        return
      }

      const correction = sanitizeCorrection(body.correction)
      const userId = currentUserId(req)
      const knex = context.database as KnexLike

      await knex('meal_feedback').insert({
        id: randomUUID(),
        meal_scan_id:
          typeof body.meal_scan_id === 'string' && UUID_RE.test(body.meal_scan_id) ? body.meal_scan_id : null,
        user_id: userId,
        session_id: typeof body.session_id === 'string' ? body.session_id.slice(0, 64) : null,
        plat_detecte: typeof body.plat_detecte === 'string' ? body.plat_detecte.slice(0, 255) : null,
        rating,
        correction: correction ? JSON.stringify(correction) : null,
        confiance_ia: typeof body.confiance_ia === 'string' ? body.confiance_ia.slice(0, 10) : null,
        date_created: new Date(),
      })

      // Seule une correction rapporte des points, et elle ne compte pas comme
      // une contribution produit (compteur `contributions_count` inchangé).
      const earned = correction
        ? await creditPoints(context.database, userId, 'fix_meal', { countAsContribution: false })
        : 0

      res.json({ ok: true, points_earned: earned })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
