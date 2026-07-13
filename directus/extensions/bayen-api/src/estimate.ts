/**
 * Endpoint POST /bayen-api/estimate-and-score
 *
 * Pour un produit SANS données (non évalué) : demande à l'IA locale (Qwen)
 * une estimation nutritionnelle de référence pour 100 g, puis calcule le
 * score avec l'algorithme DÉTERMINISTE (règle CLAUDE.md : l'IA n'invente
 * jamais le score) et persiste le tout, marqué data_source='ai_estimate'
 * + confidence_score bas (badge « Estimation IA » côté UI).
 *
 * Anonyme (pas de login) mais rate-limité par IP. N'agit que sur les produits
 * réellement vides — idempotent. L'appel IA est interne au réseau Docker.
 */

import type { Router, Request } from 'express'
import { computeScore, type RiskLevel } from './scoring.js'

const OCR_URL = (process.env.OCR_INTERNAL_URL ?? 'http://bayen-tesseract:5000').replace(/\/$/, '')

// Rate limit : 20 estimations / 10 min / IP (appel IA = coûteux)
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 20
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

// Confiance IA → confidence_score (< 0.8 → badge non-vérifié / estimation)
const CONF_MAP: Record<string, number> = { faible: 0.3, moyenne: 0.4, elevee: 0.5 }

interface EstimateResponse {
  estimable?: boolean
  aliment?: string
  nutrition_100g?: Record<string, number | null>
  nova_group?: number | null
  confiance?: string
}

export function registerEstimateEndpoint(
  router: Router,
  context: { database: Record<string, (...args: unknown[]) => unknown> }
): void {
  router.post('/estimate-and-score', async (req, res) => {
    try {
      // Le batch nightly s'authentifie en admin (token statique) → pas de
      // rate limit pour lui ; les visiteurs anonymes restent limités.
      const isAdmin = (req as unknown as {
        accountability?: { admin?: boolean }
      }).accountability?.admin === true
      const ip = clientIp(req)
      if (!isAdmin && !checkRate(ip)) {
        res.status(429).json({ error: 'Trop de demandes, réessaie dans quelques minutes.' })
        return
      }

      const barcode = String((req.body as { barcode?: unknown })?.barcode ?? '').trim()
      if (!/^\d{8}$|^\d{13}$/.test(barcode)) {
        res.status(400).json({ error: 'Code-barres invalide.' })
        return
      }

      const knex = context.database as unknown as {
        (table: string): {
          where(cond: Record<string, unknown>): {
            first(): Promise<Record<string, unknown> | undefined>
            update(data: Record<string, unknown>): Promise<unknown>
          }
        }
      }

      const product = await knex('products').where({ barcode }).first()
      if (!product) {
        res.status(404).json({ error: 'Produit introuvable.' })
        return
      }

      // N'agir que sur les produits vides (pas de données, pas de score déjà posé)
      if (product.energy_kcal != null || product.scan_score != null) {
        res.json({ estimated: false, reason: 'already_scored' })
        return
      }

      // ── Estimation IA (interne au réseau Docker) ─────────────────
      const aiRes = await fetch(`${OCR_URL}/estimate-nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name_fr ?? '',
          brand: product.brand ?? '',
        }),
        signal: AbortSignal.timeout(45_000),
      })
      const ai = (await aiRes.json()) as EstimateResponse

      if (!ai.estimable || !ai.nutrition_100g) {
        res.json({ estimated: false, reason: 'not_estimable' })
        return
      }

      const n = ai.nutrition_100g
      const score = computeScore({
        nutrition: {
          energy_kcal: n.energy_kcal ?? null,
          fat_saturated: n.fat_saturated ?? null,
          sugars: n.sugars ?? null,
          salt: n.salt ?? null,
          fiber: n.fiber ?? null,
          proteins: n.proteins ?? null,
        },
        novaGroup: (ai.nova_group ?? null) as 1 | 2 | 3 | 4 | null,
        ingredientsText: (product.ingredients_text as string) ?? '',
        additives: [] as Array<{ code: string; risk_level: RiskLevel }>,
      })

      // Garde-fou : si malgré tout l'algo ne peut pas scorer, on ne touche à rien
      if (score.total == null) {
        res.json({ estimated: false, reason: 'not_scorable' })
        return
      }

      await knex('products').where({ barcode }).update({
        energy_kcal: n.energy_kcal ?? null,
        fat_total: n.fat_total ?? null,
        fat_saturated: n.fat_saturated ?? null,
        carbs_total: n.carbs_total ?? null,
        sugars: n.sugars ?? null,
        fiber: n.fiber ?? null,
        proteins: n.proteins ?? null,
        salt: n.salt ?? null,
        nova_group: ai.nova_group ?? null,
        scan_score: score.total,
        score_label: score.label,
        nutriscore_grade: score.nutriscore_grade,
        data_source: 'ai_estimate',
        confidence_score: CONF_MAP[String(ai.confiance)] ?? 0.4,
      })

      res.json({
        estimated: true,
        aliment: ai.aliment ?? null,
        score: {
          total: score.total,
          label: score.label,
          nutriscore_grade: score.nutriscore_grade,
          nova_group: score.nova_group,
        },
      })
    } catch (err) {
      console.error('[bayen-api/estimate-and-score] error:', err)
      res.status(502).json({ error: "L'estimation IA est indisponible pour le moment." })
    }
  })
}
