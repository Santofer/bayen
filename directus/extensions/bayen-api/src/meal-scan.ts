/**
 * Endpoint POST /bayen-api/meal-scan
 *
 * Sauvegarde une estimation photo de repas dans meal_scans pour les
 * utilisateurs connectés. Les anonymes ne sont PAS stockés (204).
 *
 * Schéma v2 (Qwen3.5-9B vision) : estimation calories en fourchette +
 * macros + confiance. Le VLM est appelé côté frontend via /api/meal-score
 * → tesseract-api /meal-analyze. Cet endpoint reçoit le résultat normalisé.
 *
 * INSERT via Knex pour éviter le bug ItemsService (cf. scan.ts).
 */

import type { Router, Request } from 'express'
import { randomUUID } from 'node:crypto'

interface MealAnalysis {
  plat?: string | null
  ingredients?: string[]
  portion_estimee_g?: number | null
  calories_kcal?: { min?: number | null; max?: number | null }
  macros_g?: { proteines?: number | null; glucides?: number | null; lipides?: number | null }
  nutrition_100g?: Record<string, number | null>
  nova_group?: number | null
  is_beverage?: boolean
  confiance?: 'faible' | 'moyenne' | 'elevee'
  remarques?: string
}

interface MealScanRequest {
  image_file_id?: string | null
  analysis?: MealAnalysis
  meal_score?: number | null
  score_label?: string | null
}

// Rate limit par IP : 30 scans / 10 min
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

function clampInt(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  if (!isFinite(n)) return null
  return Math.round(Math.max(min, Math.min(max, n)))
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
      // Pas de user (anonyme) → estimation éphémère, on ne stocke rien (204).
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
      if (!plat) {
        res.status(400).json({ error: 'Analyse incomplète (plat manquant).' })
        return
      }

      const ingredients = Array.isArray(a.ingredients)
        ? a.ingredients.filter((x) => typeof x === 'string').slice(0, 30)
        : []

      const cal = a.calories_kcal ?? {}
      let calMin = clampInt(cal.min, 0, 6000)
      let calMax = clampInt(cal.max, 0, 6000)
      if (calMin != null && calMax != null && calMin > calMax) {
        const tmp = calMin; calMin = calMax; calMax = tmp
      }
      // Midpoint pour le tri/affichage compact dans le journal
      const midKcal = calMin != null && calMax != null
        ? Math.round((calMin + calMax) / 2)
        : (calMax ?? calMin)

      const macros = a.macros_g ?? {}
      const portionG = clampInt(a.portion_estimee_g, 0, 5000)

      let confiance = sanitizeString(a.confiance, 10)
      if (confiance && !['faible', 'moyenne', 'elevee'].includes(confiance)) confiance = 'moyenne'

      const knex = context.database as unknown as {
        (table: string): { insert(data: Record<string, unknown>): Promise<unknown> }
      }
      const id = randomUUID()
      await knex('meal_scans').insert({
        id,
        user_id: userId,
        image: sanitizeString(body.image_file_id, 36),
        plat,
        ingredients: JSON.stringify(ingredients),
        // Nouveau schéma v2
        calories_min: calMin,
        calories_max: calMax,
        portion_g: portionG,
        proteines_g: clampInt(macros.proteines, 0, 500),
        glucides_g: clampInt(macros.glucides, 0, 500),
        lipides_g: clampInt(macros.lipides, 0, 500),
        confiance,
        remarques: sanitizeString(a.remarques, 500),
        // Score santé Bayen (calculé côté front par scoring.ts) + nutrition/100g
        meal_score: clampInt(body.meal_score, 0, 100),
        score_label: sanitizeString(body.score_label, 20),
        nutrition: a.nutrition_100g ? JSON.stringify(a.nutrition_100g) : null,
        nova_group: clampInt(a.nova_group, 1, 4),
        is_beverage: a.is_beverage === true,
        // Compat journal / affichage compact
        estimated_kcal: midKcal,
        estimated_portion: portionG != null ? `${portionG} g` : null,
        raw_analysis: JSON.stringify(a).slice(0, 20000),
        date_created: new Date(),
      })

      res.json({ ok: true, id, redirect_url: '/compte/journal' })
    } catch (err) {
      console.error('[bayen-api/meal-scan] error:', err)
      res.status(500).json({ error: 'Erreur interne.' })
    }
  })
}
