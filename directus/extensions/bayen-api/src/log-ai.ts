/**
 * Endpoint POST /bayen-api/log-ai
 *
 * Mesure d'usage des fonctionnalités IA. La table `ai_logs` existait avec le
 * bon schéma mais restait VIDE : rien n'y écrivait. Conséquence, l'analyse
 * photo de repas semblait inutilisée alors que seule sa *sauvegarde* (qui
 * exigeait un compte) était mesurée.
 *
 * Volontairement anonyme : ni IP, ni session, ni contenu — uniquement le type
 * d'appel, son succès et sa durée. Fire-and-forget côté appelant.
 *
 * Rate-limité : 60 events / 5 min / IP (l'IP sert au throttle, jamais stockée).
 */

import { randomUUID } from 'node:crypto'
import type { Router, Request } from 'express'

interface AiLogRequest {
  type?: string
  success?: boolean
  duration_ms?: number
}

const TYPES = new Set(['meal_analyze', 'estimate', 'compare', 'coach', 'pipeline', 'identify'])

const WINDOW_MS = 5 * 60 * 1000
const MAX = 60
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

interface KnexLike {
  raw: (sql: string, bindings?: unknown[]) => Promise<unknown>
}

export function registerLogAiEndpoint(router: Router, context: { database: unknown }) {
  router.post('/log-ai', async (req, res) => {
    // Toujours 204 : un échec de mesure ne doit jamais remonter au client.
    try {
      if (!allowed(clientIp(req))) {
        res.status(204).end()
        return
      }
      const { type, success, duration_ms } = (req.body ?? {}) as AiLogRequest
      if (typeof type !== 'string' || !TYPES.has(type)) {
        res.status(204).end()
        return
      }
      const duration =
        typeof duration_ms === 'number' && Number.isFinite(duration_ms)
          ? Math.min(Math.max(Math.round(duration_ms), 0), 600000)
          : null

      // `ai_logs.id` est un UUID SANS valeur par défaut en base : il doit être
      // fourni explicitement (sinon l'INSERT échoue silencieusement).
      const knex = context.database as KnexLike
      await knex.raw(
        'INSERT INTO ai_logs (id, type, success, duration_ms, date_created) VALUES (?, ?, ?, ?, NOW())',
        [randomUUID(), type, success !== false, duration],
      )
    } catch {
      /* silencieux */
    }
    res.status(204).end()
  })
}
