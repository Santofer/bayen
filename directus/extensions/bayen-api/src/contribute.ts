/**
 * Endpoint POST /bayen-api/contribute
 *
 * Création anonyme d'un produit (sans login). Pour réduire le spam :
 * - JSON uniquement (pas d'upload d'images)
 * - Validation stricte du payload
 * - Rate-limiting basique par IP (mémoire process)
 *
 * Si l'utilisateur veut uploader des photos ou bénéficier de l'OCR
 * Tesseract+Mistral, il doit se connecter et utiliser ContributeForm.
 *
 * INSERT direct via Knex pour éviter le bug ItemsService (cache schéma
 * obsolète qui rejette des valeurs valides — voir scan.ts).
 */

import type { Router, Request } from 'express'
import { randomUUID } from 'node:crypto'

interface ContributeRequest {
  barcode?: string
  name_fr?: string
  brand?: string
  ingredients_text?: string
  energy_kcal?: number
  fat_total?: number
  fat_saturated?: number
  carbs_total?: number
  sugars?: number
  fiber?: number
  proteins?: number
  salt?: number
}

// Rate limiter en mémoire — 10 contributions / 5 min / IP
const RATE_WINDOW_MS = 5 * 60 * 1000
const RATE_MAX = 10
const ipHits = new Map<string, number[]>()

function checkRateLimit(ip: string): boolean {
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

function sanitizeNumber(v: unknown, max = 10000): number | undefined {
  const n = typeof v === 'number' ? v : (typeof v === 'string' ? parseFloat(v) : NaN)
  if (!isFinite(n) || n < 0 || n > max) return undefined
  return n
}

function sanitizeString(v: unknown, maxLen: number): string | undefined {
  if (typeof v !== 'string') return undefined
  const trimmed = v.trim()
  if (trimmed.length === 0) return undefined
  return trimmed.slice(0, maxLen)
}

export function registerContributeEndpoint(router: Router, context: {
  database: Record<string, (...args: unknown[]) => unknown>
}): void {
  router.post('/contribute', async (req, res) => {
    try {
      // Rate limit
      const ip = clientIp(req)
      if (!checkRateLimit(ip)) {
        res.status(429).json({ error: 'Trop de contributions. Réessaie dans quelques minutes.' })
        return
      }

      const body = (req.body ?? {}) as ContributeRequest

      // Validation barcode
      const barcode = sanitizeString(body.barcode, 20)
      if (!barcode || !/^\d{8}$|^\d{13}$/.test(barcode)) {
        res.status(400).json({ error: 'Code-barres invalide (EAN-8 ou EAN-13 attendu)' })
        return
      }

      // Validation nom
      const name_fr = sanitizeString(body.name_fr, 200)
      if (!name_fr || name_fr.length < 2) {
        res.status(400).json({ error: 'Nom du produit requis (min. 2 caractères)' })
        return
      }

      const knex = context.database as unknown as {
        (table: string): {
          where(col: string, val: string): { first(): Promise<{ id: string } | undefined> }
          insert(data: Record<string, unknown>): Promise<unknown>
        }
      }

      // Anti-doublon — si le produit existe déjà, retourner son ID
      const existing = await knex('products').where('barcode', barcode).first()
      if (existing) {
        res.status(200).json({
          ok: true,
          existed: true,
          product_id: existing.id,
          message: 'Ce produit existe déjà.',
          redirect_url: `/produit/${barcode}`,
        })
        return
      }

      // Construire le payload
      const newId = randomUUID()
      const payload: Record<string, unknown> = {
        id: newId,
        barcode,
        name_fr,
        brand: sanitizeString(body.brand, 100) ?? 'Marque inconnue',
        status: 'published',
        data_source: 'community',
        date_created: new Date(),
        scan_count: 0,
        confidence_score: 0.5, // Données saisies sans modération
      }

      // Champs optionnels
      const ingredients = sanitizeString(body.ingredients_text, 5000)
      if (ingredients) payload.ingredients_text = ingredients

      const energy = sanitizeNumber(body.energy_kcal, 1000)
      if (energy !== undefined) payload.energy_kcal = energy

      const fatTotal = sanitizeNumber(body.fat_total, 100)
      if (fatTotal !== undefined) payload.fat_total = fatTotal

      const fatSat = sanitizeNumber(body.fat_saturated, 100)
      if (fatSat !== undefined) payload.fat_saturated = fatSat

      const carbs = sanitizeNumber(body.carbs_total, 100)
      if (carbs !== undefined) payload.carbs_total = carbs

      const sugars = sanitizeNumber(body.sugars, 100)
      if (sugars !== undefined) payload.sugars = sugars

      const fiber = sanitizeNumber(body.fiber, 100)
      if (fiber !== undefined) payload.fiber = fiber

      const proteins = sanitizeNumber(body.proteins, 100)
      if (proteins !== undefined) payload.proteins = proteins

      const salt = sanitizeNumber(body.salt, 100)
      if (salt !== undefined) payload.salt = salt

      // INSERT via Knex (bypass ItemsService cache obsolète)
      await knex('products').insert(payload)

      res.json({
        ok: true,
        existed: false,
        product_id: newId,
        barcode,
        redirect_url: `/produit/${barcode}`,
      })
    } catch (err) {
      console.error('[bayen-api] /contribute error:', err)
      res.status(500).json({ error: 'Erreur interne lors de la création' })
    }
  })
}
