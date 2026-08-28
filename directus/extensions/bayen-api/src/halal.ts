/**
 * Endpoint POST /bayen-api/confirm-halal
 *
 * Confirmation communautaire de la présence du logo halal sur l'emballage.
 * Open Food Facts ne renseigne quasiment jamais ce label pour les produits
 * marocains (0 produit sur 2527 au moment de l'implémentation) : la source
 * réelle, c'est la personne qui a le paquet dans les mains.
 *
 * Anonyme autorisé, rate-limité par IP. Si un token est fourni, une
 * contribution `confirm` approuvée est créée → les hooks créditent les points.
 *
 * Règle de prudence : on ne rétrograde JAMAIS automatiquement un statut posé
 * par Open Food Facts ou par la communauté. Un « non vu » ne fait que décrémenter
 * le compteur, et ne peut annuler qu'une détection par vision restée seule.
 */

import { randomUUID } from 'node:crypto'
import type { Router, Request } from 'express'
import { creditPoints } from './points.js'

interface ConfirmHalalRequest {
  barcode?: string
  present?: boolean
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

interface ProductRow {
  id: string
  is_halal: boolean
  halal_source: string | null
  halal_confirmations: number
}

interface KnexLike {
  (table: string): {
    where(criteria: Record<string, unknown>): {
      first(): Promise<Record<string, unknown> | undefined>
      update(data: Record<string, unknown>): Promise<unknown>
    }
    insert(data: Record<string, unknown>): Promise<unknown>
  }
}

/** Directus peuple req.accountability depuis le Bearer token (null si anonyme). */
function currentUserId(req: Request): string | null {
  const accountability = (req as unknown as { accountability?: { user?: string | null } }).accountability
  return accountability?.user ?? null
}

export function registerHalalEndpoint(router: Router, context: { database: unknown }) {
  router.post('/confirm-halal', async (req, res) => {
    try {
      if (!allowed(clientIp(req))) {
        res.status(429).json({ error: 'rate_limited' })
        return
      }

      const { barcode, present } = (req.body ?? {}) as ConfirmHalalRequest
      if (typeof barcode !== 'string' || !/^\d{8,14}$/.test(barcode) || typeof present !== 'boolean') {
        res.status(400).json({ error: 'invalid_payload' })
        return
      }

      const knex = context.database as KnexLike
      const product = (await knex('products')
        .where({ barcode, status: 'published' })
        .first()) as ProductRow | undefined

      if (!product) {
        res.status(404).json({ error: 'product_not_found' })
        return
      }

      const before = product.halal_confirmations ?? 0
      const patch: Record<string, unknown> = {}

      if (present) {
        patch.halal_confirmations = before + 1
        if (!product.is_halal) {
          patch.is_halal = true
          patch.halal_source = 'packaging_user'
        }
      } else {
        patch.halal_confirmations = Math.max(before - 1, 0)
        // Seule une détection par vision jamais confirmée peut être annulée.
        if (product.halal_source === 'vision' && patch.halal_confirmations === 0) {
          patch.is_halal = false
          patch.halal_source = null
        }
      }

      await knex('products').where({ id: product.id }).update(patch)

      // Contribution tracée et créditée uniquement pour un utilisateur identifié.
      let earned = 0
      const userId = currentUserId(req)
      if (userId) {
        await knex('contributions').insert({
          id: randomUUID(),
          product_id: product.id,
          user_id: userId,
          type: 'confirm',
          data_after: JSON.stringify({ is_halal: present }),
          status: 'approved',
          // Crédité juste après par creditPoints : le marqueur empêche un
          // second crédit si la ligne est ré-enregistrée dans l'admin.
          points_awarded: true,
          date_created: new Date(),
        })
        earned = await creditPoints(context.database, userId, 'confirm')
      }

      res.json({
        ok: true,
        is_halal: patch.is_halal ?? product.is_halal,
        halal_confirmations: patch.halal_confirmations,
        points_earned: earned,
      })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
