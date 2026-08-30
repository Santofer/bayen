/**
 * Endpoint POST /bayen-api/contribute
 *
 * Création anonyme d'un produit (sans login). Pour réduire le spam :
 * - JSON uniquement, validation stricte du payload
 * - Rate-limiting basique par IP (mémoire process)
 * - Honeypot + heuristiques anti-spam sur le nom et la marque
 *
 * Les photos sont envoyées séparément à /bayen-api/upload-photo, qui renvoie
 * un identifiant de fichier repris ici : le parcours de contribution mobile
 * fonctionne donc sans compte, photos comprises.
 *
 * INSERT direct via Knex pour éviter le bug ItemsService (cache schéma
 * obsolète qui rejette des valeurs valides — voir scan.ts).
 */

import type { Router, Request } from 'express'
import { randomUUID } from 'node:crypto'
import { notifyNewProduct } from './notify.js'
import { scoreProduct } from './scan.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ContributeRequest {
  barcode?: string
  name_fr?: string
  brand?: string
  quantity?: string
  category_id?: number
  is_halal?: boolean
  image_front?: string
  image_ingredients?: string
  image_nutrition?: string
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

// Rate limiter en mémoire — 5 contributions / 5 min / IP (resserré post-spam)
const RATE_WINDOW_MS = 5 * 60 * 1000
const RATE_MAX = 5
const ipHits = new Map<string, number[]>()

// Anti-flood : nombre max de tentatives REJETÉES (validation fail) avant blacklist temporaire
const REJECT_THRESHOLD = 8
const REJECT_BLOCK_MS = 30 * 60 * 1000 // 30 min de cooldown
const ipRejects = new Map<string, { count: number; until: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  // Si l'IP est en cooldown anti-flood
  const rej = ipRejects.get(ip)
  if (rej && now < rej.until) return false

  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_MAX) return false
  hits.push(now)
  ipHits.set(ip, hits)
  return true
}

function recordRejection(ip: string): void {
  const now = Date.now()
  const rej = ipRejects.get(ip) ?? { count: 0, until: 0 }
  rej.count += 1
  if (rej.count >= REJECT_THRESHOLD) {
    rej.until = now + REJECT_BLOCK_MS
    rej.count = 0
    console.warn(`[bayen-api/contribute] IP ${ip} bloquée 30min (${REJECT_THRESHOLD} payloads rejetés)`)
  }
  ipRejects.set(ip, rej)
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

// Heuristiques anti-spam sur le nom/marque
const SPAM_KEYWORDS = [
  'test', 'asdf', 'lorem', 'qwerty', 'azerty', 'spam', 'bot',
  'http://', 'https://', '<script', '<iframe', 'onclick=',
  'undefined', 'null', 'admin', 'password',
]

function looksLikeSpam(text: string): string | null {
  const lower = text.toLowerCase()

  // Mot-clés interdits
  for (const kw of SPAM_KEYWORDS) {
    if (lower.includes(kw)) return `Contenu suspect détecté ("${kw}")`
  }
  // Caractère unique répété 4+ fois (aaaa, 1111, ----)
  if (/(.)\1{3,}/.test(text)) return 'Caractères répétés détectés'
  // Que des chiffres (likely garbage)
  if (/^\d+$/.test(text) && text.length > 4) return 'Le nom ne peut pas être uniquement numérique'
  // Que des espaces ou caractères spéciaux (quasi vide)
  if (!/[a-zA-Z\u00C0-\u017F\u0600-\u06FF]{2,}/.test(text)) return 'Le nom doit contenir au moins 2 lettres'

  return null
}

export function registerContributeEndpoint(router: Router, context: {
  database: Record<string, (...args: unknown[]) => unknown>
}): void {
  router.post('/contribute', async (req, res) => {
    const ip = clientIp(req)
    try {
      // Rate limit (inclut la blacklist anti-flood)
      if (!checkRateLimit(ip)) {
        res.status(429).json({ error: 'Trop de contributions. Réessaie dans quelques minutes.' })
        return
      }

      const body = (req.body ?? {}) as ContributeRequest & { url?: string; website?: string }

      // Honeypot — champ caché que les bots remplissent automatiquement
      if (body.url || body.website) {
        recordRejection(ip)
        // Réponse fake-success pour ne pas révéler la présence du honeypot
        res.status(200).json({ ok: true, existed: false, product_id: '00000000-0000-0000-0000-000000000000' })
        return
      }

      // Validation barcode
      const barcode = sanitizeString(body.barcode, 20)
      if (!barcode || !/^\d{8}$|^\d{13}$/.test(barcode)) {
        recordRejection(ip)
        res.status(400).json({ error: 'Code-barres invalide (EAN-8 ou EAN-13 attendu)' })
        return
      }

      // Validation nom
      const name_fr = sanitizeString(body.name_fr, 200)
      if (!name_fr || name_fr.length < 2) {
        recordRejection(ip)
        res.status(400).json({ error: 'Nom du produit requis (min. 2 caractères)' })
        return
      }

      // Heuristiques anti-spam sur le nom
      const nameSpam = looksLikeSpam(name_fr)
      if (nameSpam) {
        recordRejection(ip)
        res.status(400).json({ error: nameSpam })
        return
      }
      // ... et sur la marque si fournie
      if (typeof body.brand === 'string' && body.brand.trim().length > 0) {
        const brandSpam = looksLikeSpam(body.brand.trim())
        if (brandSpam) {
          recordRejection(ip)
          res.status(400).json({ error: `Marque : ${brandSpam}` })
          return
        }
      }

      const knex = context.database as unknown as {
        (table: string): {
          where(col: string, val: string): {
            first(): Promise<Record<string, unknown> | undefined>
            update(data: Record<string, unknown>): Promise<unknown>
          }
          insert(data: Record<string, unknown>): Promise<unknown>
        }
      }

      // Anti-doublon — si le produit existe déjà, COMPLÉTER ses trous plutôt
      // qu'ignorer l'envoi : quand une soumission échoue à moitié (cas vécu :
      // réponses illisibles côté client pour cause de CORS, fiche créée sans
      // photos), la re-soumission de la même personne répare la fiche.
      const existing = await knex('products').where('barcode', barcode).first()
      if (existing) {
        const fill: Record<string, unknown> = {}
        for (const [field, value] of [
          ['image_front', body.image_front],
          ['image_ingredients', body.image_ingredients],
          ['image_nutrition', body.image_nutrition],
        ] as const) {
          if (!existing[field] && typeof value === 'string' && UUID_RE.test(value)) fill[field] = value
        }
        const quantityFill = sanitizeString(body.quantity, 40)
        if (!existing.quantity && quantityFill) fill.quantity = quantityFill
        if (!existing.category_id && typeof body.category_id === 'number' && Number.isInteger(body.category_id)) {
          fill.category_id = body.category_id
        }
        if (!existing.is_halal && body.is_halal === true) {
          fill.is_halal = true
          fill.halal_source = 'packaging_user'
          fill.halal_confirmations = 1
        }
        if (Object.keys(fill).length > 0) {
          await knex('products').where('barcode', barcode).update(fill)
        }
        res.status(200).json({
          ok: true,
          existed: true,
          completed_fields: Object.keys(fill),
          product_id: existing.id as string,
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

      // Contenance : ce qui distingue deux variantes d'un même produit.
      const quantity = sanitizeString(body.quantity, 40)
      if (quantity) payload.quantity = quantity

      if (typeof body.category_id === 'number' && Number.isInteger(body.category_id)) {
        payload.category_id = body.category_id
      }

      // Halal déclaré depuis l'emballage par la personne qui l'a en main.
      if (body.is_halal === true) {
        payload.is_halal = true
        payload.halal_source = 'packaging_user'
        payload.halal_confirmations = 1
      }

      // Photos déjà déposées via /upload-photo (identifiants de fichiers).
      for (const [field, value] of [
        ['image_front', body.image_front],
        ['image_ingredients', body.image_ingredients],
        ['image_nutrition', body.image_nutrition],
      ] as const) {
        if (typeof value === 'string' && UUID_RE.test(value)) payload[field] = value
      }

      // INSERT via Knex (bypass ItemsService cache obsolète)
      await knex('products').insert(payload)

      // Score calculé immédiatement : une fiche fraîchement créée doit
      // s'afficher avec sa note, pas attendre le prochain scan.
      try {
        const created = await knex('products').where('id', newId).first()
        if (created) {
          const score = await scoreProduct(
            created as unknown as Parameters<typeof scoreProduct>[0],
            context.database,
          )
          await knex('products').where('id', newId).update({
            scan_score: score.total,
            score_label: score.label,
            nutriscore_grade: score.nutriscore_grade,
          })
        }
      } catch (scoreErr) {
        // Un scoring raté ne doit pas perdre la contribution : le prochain
        // scan du produit le recalculera.
        console.warn('[bayen-api] scoring contribution échoué:', (scoreErr as Error).message)
      }

      // Notification admin (in-app + webhook optionnel)
      await notifyNewProduct(context.database, {
        id: newId,
        barcode,
        name_fr,
        brand: payload.brand as string,
        data_source: 'community',
      })

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
