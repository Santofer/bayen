/**
 * Réception des demandes de partenariat dans le compte admin du SITE.
 *
 *   GET  /bayen-api/partner-requests        → liste complète (admin uniquement)
 *   POST /bayen-api/partner-request-status  → marquer traitée / écartée
 *
 * Les demandes vivaient uniquement dans l'admin Directus (api.bayen.ma/admin),
 * une interface séparée avec ses propres identifiants : personne ne pensait à
 * aller les y chercher. Ces endpoints les exposent au compte administrateur
 * connecté sur bayen.ma (accountability.admin, posé par Directus depuis le
 * Bearer token — jamais accessible aux comptes ordinaires).
 */

import type { Router, Request } from 'express'

function isAdmin(req: Request): boolean {
  const accountability = (req as unknown as { accountability?: { admin?: boolean } }).accountability
  return accountability?.admin === true
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const STATUSES = new Set(['new', 'processed', 'dismissed'])

interface KnexLike {
  (table: string): {
    where(criteria: Record<string, unknown>): {
      first(): Promise<Record<string, unknown> | undefined>
      update(data: Record<string, unknown>): Promise<unknown>
    }
  }
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
}

export function registerPartnerAdminEndpoints(router: Router, context: { database: unknown }) {
  router.get('/partner-requests', async (req, res) => {
    try {
      if (!isAdmin(req)) {
        res.status(403).json({ error: 'admin_only' })
        return
      }
      const knex = context.database as KnexLike
      const result = await knex.raw(
        `SELECT id, company, role, name, email, message, status, email_sent, date_created
         FROM partner_requests
         ORDER BY (status = 'new') DESC, date_created DESC
         LIMIT 200`,
      )
      res.json({ requests: result.rows })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })

  router.post('/partner-request-status', async (req, res) => {
    try {
      if (!isAdmin(req)) {
        res.status(403).json({ error: 'admin_only' })
        return
      }
      const { id, status } = (req.body ?? {}) as { id?: string; status?: string }
      if (typeof id !== 'string' || !UUID_RE.test(id) || typeof status !== 'string' || !STATUSES.has(status)) {
        res.status(400).json({ error: 'invalid_payload' })
        return
      }
      const knex = context.database as KnexLike
      await knex('partner_requests').where({ id }).update({ status })
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
