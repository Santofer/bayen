/**
 * Endpoint POST /bayen-api/meal-scan
 *
 * Sauvegarde une analyse photo de repas dans meal_scans pour les
 * utilisateurs connectés. Les anonymes ne sont PAS stockés (204).
 *
 * Le VLM est appelé côté frontend via /api/meal-score → tesseract-api
 * /meal-analyze. Cet endpoint reçoit juste le résultat + les métadonnées
 * pour persistance. Le score Bayen est calculé côté frontend via
 * scoring.ts (même algo que page produit).
 *
 * INSERT via Knex pour éviter le bug ItemsService (cf. scan.ts).
 */

import type { Router, Request } from 'express'
import { randomUUID } from 'node:crypto'

interface MealScanRequest {
  image_file_id?: string | null
  analysis?: {
    plat?: string
    description?: string
    ingredients_detected?: string[]
    estimated_kcal?: number
    estimated_portion?: string
    nutrition_per_100g?: Record<string, number>
    nova_group?: number
    is_beverage?: boolean
    confidence?: number
  }
  meal_score?: number
  score_label?: string
  raw?: Record<string, unknown>
}

// Rate limit par IP : 30 scans / 10 min (un repas prend ~25s côté VLM,
// donc au-delà de 30 c'est du spam ou un bot)
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 30
const ipHits = new Map<string, number[]>()

function checkRate(ip: string): boolean {
  const now = Date.now()
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_MAX) return false
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

function clamp(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!isFinite(n)) return null
  return Math.max(min, Math.min(max, n))
}

function sanitizeString(v: unknown, maxLen: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  if (!t) return null
  return t.slice(0, maxLen)
}

export function registerMealScanEndpoint(
  router: Router,
  context: {
    database: Record<string, (...args: unknown[]) => unknown>
  }
): void {
  router.post('/meal-scan', async (req, res) => {
    try {
      const ip = clientIp(req)
      if (!checkRate(ip)) {
        res.status(429).json({ error: 'Trop de scans, réessaie dans quelques minutes.' })
        return
      }

      // Directus peuple req.accountability depuis le Bearer token.
      // Pas de user (anonyme) → scan éphémère, on ne stocke rien (204).
      const accountability = (req as unknown as {
        accountability?: { user?: string | null }
      }).accountability
      const userId = accountability?.user
      if (!userId) {
        res.status(204).end()
        return
      }

      const body = (req.body ?? {}) as MealScanRequest
      const a = body.analysis ?? {}

      const plat = sanitizeString(a.plat, 200)
      const description = sanitizeString(a.description, 2000)
      const ingredients = Array.isArray(a.ingredients_detected)
        ? a.ingredients_detected.filter((x) => typeof x === 'string').slice(0, 30)
        : []
      const nutrition = a.nutrition_per_100g && typeof a.nutrition_per_100g === 'object'
        ? a.nutrition_per_100g
        : {}
      const estimatedKcal = clamp(a.estimated_kcal, 0, 5000)
      const portion = sanitizeString(a.estimated_portion, 50)
      const novaGroup = clamp(a.nova_group, 1, 4)
      const confidence = clamp(a.confidence, 0, 1)
      const mealScore = clamp(body.meal_score, 0, 100)
      const scoreLabel = sanitizeString(body.score_label, 20)

      if (!plat) {
        res.status(400).json({ error: 'Analyse incomplète (plat manquant).' })
        return
      }

      const knex = context.database as unknown as {
        (table: string): { insert(data: Record<string, unknown>): Promise<unknown> }
      }
      const id = randomUUID()
      await knex('meal_scans').insert({
        id,
        user_id: userId,
        image: sanitizeString(body.image_file_id, 36), // UUID = 36 chars
        plat,
        description,
        ingredients: JSON.stringify(ingredients),
        nutrition: JSON.stringify(nutrition),
        estimated_kcal: estimatedKcal,
        estimated_portion: portion,
        nova_group: novaGroup,
        is_beverage: a.is_beverage === true,
        confidence,
        meal_score: mealScore,
        score_label: scoreLabel,
        raw_analysis: body.raw ? JSON.stringify(body.raw).slice(0, 20000) : null,
        date_created: new Date(),
      })

      res.json({
        ok: true,
        id,
        redirect_url: '/compte/journal',
      })
    } catch (err) {
      console.error('[bayen-api/meal-scan] error:', err)
      res.status(500).json({ error: 'Erreur interne.' })
    }
  })
}
