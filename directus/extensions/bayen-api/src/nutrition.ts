/**
 * Endpoint GET /bayen-api/nutrition-summary
 *
 * Résumé nutritionnel de l'utilisateur connecté, calculé à la volée depuis
 * `meal_scans` (aucune dénormalisation) :
 *   - totaux du JOUR : kcal + macros + nombre de repas
 *   - 7 derniers jours : kcal + nb repas par jour (pour le graphe)
 *   - moyenne kcal/jour sur les jours actifs de la semaine
 *   - répartition des verdicts sur 7 jours
 *
 * Fuseau Maroc (Africa/Casablanca, pays mono-fuseau) pour découper les jours.
 * Les kcal d'un repas = `estimated_kcal` (milieu de la fourchette, déjà
 * calculé et stocké par /meal-scan). Auth obligatoire (Bearer) → sinon 401.
 */

import type { Router, Request } from 'express'

const TZ = 'Africa/Casablanca'

/** Date du jour YYYY-MM-DD dans le fuseau Maroc. */
function casablancaToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

/** YYYY-MM-DD décalé de `deltaDays`. */
function shiftDay(isoDay: string, deltaDays: number): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + deltaDays)
  return dt.toISOString().slice(0, 10)
}

interface DayAggRow {
  day: string
  kcal: number | string | null
  proteines: number | string | null
  glucides: number | string | null
  lipides: number | string | null
  meals: number | string | null
}

interface VerdictRow {
  verdict: string | null
  n: number | string | null
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? 0))
  return isFinite(n) ? Math.round(n) : 0
}

export function registerNutritionEndpoint(
  router: Router,
  context: {
    database: Record<string, (...args: unknown[]) => unknown>
  }
): void {
  router.get('/nutrition-summary', async (req: Request, res) => {
    try {
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
      }

      const today = casablancaToday()
      const weekStart = shiftDay(today, -6) // 7 jours glissants, aujourd'hui inclus

      // ── Agrégat par jour sur les 7 derniers jours (tz Maroc) ──────
      const aggRes = await knex.raw(
        `SELECT (date_created AT TIME ZONE ?)::date::text AS day,
                COALESCE(SUM(estimated_kcal), 0)::int AS kcal,
                COALESCE(SUM(proteines_g), 0)::int     AS proteines,
                COALESCE(SUM(glucides_g), 0)::int      AS glucides,
                COALESCE(SUM(lipides_g), 0)::int       AS lipides,
                COUNT(*)::int                          AS meals
         FROM meal_scans
         WHERE user_id = ?
           AND (date_created AT TIME ZONE ?)::date >= ?::date
         GROUP BY day`,
        [TZ, userId, TZ, weekStart]
      )
      const byDay = new Map<string, DayAggRow>()
      for (const r of aggRes.rows as DayAggRow[]) byDay.set(r.day, r)

      // Série des 7 jours (du plus ancien au plus récent), trous = 0
      const week = Array.from({ length: 7 }, (_, i) => {
        const day = shiftDay(weekStart, i)
        const row = byDay.get(day)
        return {
          day,
          kcal: num(row?.kcal),
          meals: num(row?.meals),
        }
      })

      const todayRow = byDay.get(today)
      const todayTotals = {
        kcal: num(todayRow?.kcal),
        proteines: num(todayRow?.proteines),
        glucides: num(todayRow?.glucides),
        lipides: num(todayRow?.lipides),
        meals: num(todayRow?.meals),
      }

      // Moyenne sur les jours ACTIFS de la semaine (pas les jours à 0)
      const activeDays = week.filter((d) => d.meals > 0)
      const weekAvgKcal = activeDays.length
        ? Math.round(activeDays.reduce((s, d) => s + d.kcal, 0) / activeDays.length)
        : 0

      // ── Répartition des verdicts sur 7 jours ──────────────────────
      const verdictRes = await knex.raw(
        `SELECT verdict, COUNT(*)::int AS n
         FROM meal_scans
         WHERE user_id = ?
           AND verdict IS NOT NULL
           AND (date_created AT TIME ZONE ?)::date >= ?::date
         GROUP BY verdict`,
        [userId, TZ, weekStart]
      )
      const verdictCounts: Record<string, number> = { sain: 0, equilibre: 0, a_limiter: 0, occasionnel: 0 }
      for (const r of verdictRes.rows as VerdictRow[]) {
        if (r.verdict && r.verdict in verdictCounts) verdictCounts[r.verdict] = num(r.n)
      }

      res.json({
        ok: true,
        today,
        today_totals: todayTotals,
        week,
        week_avg_kcal: weekAvgKcal,
        verdict_counts_7d: verdictCounts,
      })
    } catch (err) {
      console.error('[bayen-api/nutrition-summary] error:', err)
      res.status(500).json({ error: 'Erreur interne.' })
    }
  })
}
