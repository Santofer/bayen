/**
 * Endpoint GET /bayen-api/my-stats
 *
 * Statistiques personnelles de l'utilisateur connecté :
 *  - streaks (séries de jours consécutifs avec au moins 1 scan)
 *  - position dans le classement global
 *  - points / rang / contributions
 *
 * Les streaks sont calculés À LA VOLÉE depuis la table `scans` (aucune
 * dénormalisation, aucun cron, toujours exact). Fuseau Maroc : tous les
 * jours sont calculés en Africa/Casablanca (pays mono-fuseau).
 *
 * Auth obligatoire (Bearer JWT). Sans token → 401.
 */

import type { Router, Request } from 'express'

const TZ = 'Africa/Casablanca'

interface ScanDayRow {
  day: string // 'YYYY-MM-DD'
}

/** Date du jour au format YYYY-MM-DD dans le fuseau Maroc. */
function casablancaToday(): string {
  // en-CA donne le format ISO YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Renvoie la chaîne YYYY-MM-DD du jour décalé de `deltaDays`. */
function shiftDay(isoDay: string, deltaDays: number): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  return dt.toISOString().slice(0, 10)
}

/** Diff en jours entre deux YYYY-MM-DD (a - b). */
function dayDiff(a: string, b: string): number {
  const da = Date.UTC(...(a.split('-').map(Number) as [number, number, number]))
  const db = Date.UTC(...(b.split('-').map(Number) as [number, number, number]))
  return Math.round((da - db) / 86_400_000)
}

interface StreakResult {
  current: number
  longest: number
  total_scan_days: number
  active_days: Array<{ periodStart: string; periodEnd: string }>
}

/**
 * Calcule les streaks à partir d'une liste de jours actifs DESC (récent → ancien).
 * - current : série consécutive se terminant aujourd'hui OU hier (sinon 0)
 * - longest : plus longue série consécutive jamais réalisée
 */
function computeStreaks(daysDesc: string[]): StreakResult {
  if (daysDesc.length === 0) {
    return { current: 0, longest: 0, total_scan_days: 0, active_days: [] }
  }

  const today = casablancaToday()
  const yesterday = shiftDay(today, -1)

  // current streak : la série la plus récente doit finir aujourd'hui ou hier
  let current = 0
  if (daysDesc[0] === today || daysDesc[0] === yesterday) {
    current = 1
    for (let i = 1; i < daysDesc.length; i++) {
      if (dayDiff(daysDesc[i - 1], daysDesc[i]) === 1) current++
      else break
    }
  }

  // longest streak : on balaie toute la liste
  let longest = 1
  let run = 1
  for (let i = 1; i < daysDesc.length; i++) {
    if (dayDiff(daysDesc[i - 1], daysDesc[i]) === 1) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  // active_days : les 30 jours actifs les plus récents (single-day ranges)
  const active_days = daysDesc.slice(0, 30).map((d) => ({ periodStart: d, periodEnd: d }))

  return { current, longest, total_scan_days: daysDesc.length, active_days }
}

export function registerStatsEndpoint(
  router: Router,
  context: {
    database: Record<string, (...args: unknown[]) => unknown>
  }
): void {
  router.get('/my-stats', async (req: Request, res) => {
    try {
      // Directus authentifie déjà la requête et peuple req.accountability
      // à partir du Bearer token (JWT) ou d'un static token. On lit l'user
      // directement — pas besoin de vérifier le token manuellement.
      const accountability = (req as unknown as {
        accountability?: { user?: string | null }
      }).accountability
      const userId = accountability?.user
      if (!userId) {
        res.status(401).json({ error: 'Authentification requise.' })
        return
      }

      const knex = context.database as unknown as {
        raw(sql: string, bindings?: unknown[]): Promise<{ rows: unknown[] }>
        (table: string): {
          where(col: string, val: string): {
            first(): Promise<Record<string, unknown> | undefined>
            count(col: string): Promise<Array<Record<string, unknown>>>
          }
        }
      }

      // ── Jours actifs distincts (tz Maroc), DESC ──────────────────
      const daysRes = await knex.raw(
        `SELECT DISTINCT (date_created AT TIME ZONE ?)::date::text AS day
         FROM scans
         WHERE user_id = ?
         ORDER BY day DESC`,
        [TZ, userId]
      )
      const daysDesc = (daysRes.rows as ScanDayRow[]).map((r) => r.day)
      const streaks = computeStreaks(daysDesc)

      // ── Total de scans (toutes lignes, pas juste les jours) ──────
      const totalRes = await knex.raw(
        `SELECT COUNT(*)::int AS n FROM scans WHERE user_id = ?`,
        [userId]
      )
      const totalScans = Number((totalRes.rows[0] as { n: number })?.n ?? 0)

      // ── Profil + position classement ─────────────────────────────
      const userRes = await knex.raw(
        `SELECT points, rank, contributions_count, display_name, first_name
         FROM directus_users WHERE id = ?`,
        [userId]
      )
      const u = (userRes.rows[0] as Record<string, unknown>) ?? {}
      const points = Number(u.points ?? 0)

      // Position : nombre d'utilisateurs avec STRICTEMENT plus de points + 1
      const posRes = await knex.raw(
        `SELECT COUNT(*)::int AS ahead FROM directus_users WHERE points > ?`,
        [points]
      )
      const position = Number((posRes.rows[0] as { ahead: number })?.ahead ?? 0) + 1

      res.json({
        ok: true,
        streak: {
          current: streaks.current,
          longest: streaks.longest,
          total_scans: totalScans,
          total_scan_days: streaks.total_scan_days,
          active_days: streaks.active_days,
          today: casablancaToday(),
        },
        profile: {
          id: userId,
          points,
          rank: (u.rank as string) ?? 'nouveau',
          contributions_count: Number(u.contributions_count ?? 0),
          display_name: (u.display_name as string) ?? (u.first_name as string) ?? null,
          position,
        },
      })
    } catch (err) {
      console.error('[bayen-api/my-stats] error:', err)
      res.status(500).json({ error: 'Erreur interne.' })
    }
  })
}
