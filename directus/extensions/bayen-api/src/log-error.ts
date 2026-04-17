/**
 * Endpoint POST /bayen-api/log-error
 *
 * Ingestion légère des erreurs frontend (window.onerror, unhandledrejection,
 * ErrorBoundary React). Pas d'auth, fire-and-forget côté client.
 *
 * Rate-limité pour éviter qu'un bug en boucle ne floode la table :
 * 20 events / 5 min / IP. Au-delà, drop silencieux.
 */

import type { Router, Request } from 'express'

interface ErrorLogRequest {
  source?: 'frontend' | 'backend' | 'service-worker'
  severity?: 'error' | 'warning' | 'info'
  message?: string
  stack?: string
  url?: string
  context?: Record<string, unknown>
}

const WINDOW_MS = 5 * 60 * 1000
const MAX = 20
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

function truncate(s: unknown, max: number): string | null {
  if (typeof s !== 'string') return null
  return s.length > max ? s.slice(0, max) : s
}

export function registerLogErrorEndpoint(router: Router, context: {
  database: Record<string, (...args: unknown[]) => unknown>
}): void {
  router.post('/log-error', async (req, res) => {
    try {
      const ip = clientIp(req)
      if (!allowed(ip)) {
        res.status(204).end() // silence ; pas de feedback au client qui spam
        return
      }

      const body = (req.body ?? {}) as ErrorLogRequest
      const message = truncate(body.message, 2000)
      if (!message) {
        res.status(400).json({ error: 'message requis' })
        return
      }

      const ua = truncate(req.headers['user-agent'] ?? null, 500)
      const source = body.source && ['frontend', 'backend', 'service-worker'].includes(body.source) ? body.source : 'frontend'
      const severity = body.severity && ['error', 'warning', 'info'].includes(body.severity) ? body.severity : 'error'

      const knex = context.database as unknown as {
        (table: string): { insert(data: Record<string, unknown>): Promise<unknown> }
      }

      await knex('error_logs').insert({
        source,
        severity,
        message,
        stack: truncate(body.stack, 5000),
        url: truncate(body.url, 500),
        user_agent: ua,
        context: body.context ? JSON.stringify(body.context).slice(0, 3000) : null,
      })

      res.status(204).end()
    } catch (err) {
      console.error('[bayen-api/log-error] insert fail:', err)
      // On ne renvoie pas d'erreur au client — c'est fire-and-forget
      res.status(204).end()
    }
  })
}
