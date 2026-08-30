/**
 * Endpoint GET /bayen-api/leaderboard
 *
 * Top contributeurs réels. La page /classement tentait de lire
 * /users publiquement (403) et retombait sur des données de démo codées en
 * dur — un classement fictif affiché à tout le monde. Ici : uniquement des
 * comptes réels avec des points, et rien d'autre que le nécessaire (jamais
 * d'email).
 */

import type { Router } from 'express'

interface KnexLike {
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
}

export function registerLeaderboardEndpoint(router: Router, context: { database: unknown }) {
  router.get('/leaderboard', async (_req, res) => {
    try {
      const knex = context.database as KnexLike
      const result = await knex.raw(
        `SELECT id, display_name, first_name, points, contributions_count, rank
         FROM directus_users
         WHERE points > 0 AND status = 'active'
         ORDER BY points DESC, contributions_count DESC
         LIMIT 50`,
      )

      res.setHeader('Cache-Control', 'public, max-age=300')
      res.json({
        entries: result.rows.map((u) => ({
          id: String(u.id),
          name: String(u.display_name ?? u.first_name ?? 'Contributeur'),
          points: Number(u.points ?? 0),
          contributions: Number(u.contributions_count ?? 0),
          rank: String(u.rank ?? 'nouveau'),
        })),
      })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
