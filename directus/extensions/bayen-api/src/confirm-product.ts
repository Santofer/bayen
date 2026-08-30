/**
 * Endpoint POST /bayen-api/confirm-product
 *
 * « Ces informations sont exactes » — la brique qui fait passer une fiche de
 * « Non vérifié » à « Vérifié » : 3 confirmations par des comptes distincts
 * de rang contributeur ou plus → confidence_score monte à 0.8 (le seuil du
 * badge). Auparavant cette logique vivait côté client : token jamais attendu
 * (les requêtes partaient avec une Promise en guise de token) et PATCH du
 * produit par l'utilisateur — un chemin cassé ET dangereux à la fois.
 */

import { randomUUID } from 'node:crypto'
import type { Router, Request } from 'express'
import { creditPoints } from './points.js'

const VERIFY_THRESHOLD = 3
const VERIFIED_CONFIDENCE = 0.8

function currentUserId(req: Request): string | null {
  const accountability = (req as unknown as { accountability?: { user?: string | null } }).accountability
  return accountability?.user ?? null
}

interface KnexLike {
  (table: string): {
    where(criteria: Record<string, unknown>): {
      first(): Promise<Record<string, unknown> | undefined>
      update(data: Record<string, unknown>): Promise<unknown>
    }
    insert(data: Record<string, unknown>): Promise<unknown>
  }
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
}

export function registerConfirmProductEndpoint(router: Router, context: { database: unknown }) {
  router.post('/confirm-product', async (req, res) => {
    try {
      const userId = currentUserId(req)
      if (!userId) {
        res.status(401).json({ error: 'auth_required' })
        return
      }

      const barcode = String((req.body ?? {}).barcode ?? '')
      if (!/^\d{8,14}$/.test(barcode)) {
        res.status(400).json({ error: 'invalid_barcode' })
        return
      }

      const knex = context.database as KnexLike
      const product = (await knex('products')
        .where({ barcode, status: 'published' })
        .first()) as { id: string; confidence_score: number | null; created_by: string | null } | undefined
      if (!product) {
        res.status(404).json({ error: 'product_not_found' })
        return
      }

      // On ne confirme pas sa propre fiche : la vérification vient des autres.
      if (product.created_by === userId) {
        res.status(403).json({ error: 'own_product' })
        return
      }

      // Seuls les rangs contributeur et plus confirment (il faut avoir déjà
      // prouvé sa bonne foi pour valider celle des autres).
      const user = (await knex('directus_users').where({ id: userId }).first()) as
        | { rank: string | null }
        | undefined
      if (!user || !['contributeur', 'expert', 'vérifié'].includes(String(user.rank ?? ''))) {
        res.status(403).json({ error: 'rank_too_low' })
        return
      }

      // Une seule confirmation par personne et par fiche.
      const already = await knex.raw(
        `SELECT 1 FROM contributions
         WHERE product_id = ? AND user_id = ? AND type = 'confirm' LIMIT 1`,
        [product.id, userId],
      )
      if (already.rows.length > 0) {
        res.status(409).json({ error: 'already_confirmed' })
        return
      }

      await knex('contributions').insert({
        id: randomUUID(),
        product_id: product.id,
        user_id: userId,
        type: 'confirm',
        data_after: JSON.stringify({ confirmed: true }),
        status: 'approved',
        points_awarded: true,
        date_created: new Date(),
      })
      const earned = await creditPoints(context.database, userId, 'confirm')

      const countRes = await knex.raw(
        `SELECT COUNT(DISTINCT user_id)::int AS n FROM contributions
         WHERE product_id = ? AND type = 'confirm'`,
        [product.id],
      )
      const confirmations = Number(countRes.rows[0]?.n ?? 0)

      let verified = false
      if (confirmations >= VERIFY_THRESHOLD && Number(product.confidence_score ?? 0) < VERIFIED_CONFIDENCE) {
        await knex('products').where({ id: product.id }).update({ confidence_score: VERIFIED_CONFIDENCE })
        verified = true
      }

      res.json({ ok: true, confirmations, verified, points_earned: earned })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
