/**
 * Endpoint POST /bayen-api/weekly-coach
 *
 * Bilan nutritionnel hebdomadaire de l'utilisateur connecté : lit ses repas
 * des 7 derniers jours (meal_scans), construit un résumé et demande à l'IA
 * locale (Qwen) un bilan bienveillant + conseils. L'IA ne voit qu'un résumé
 * textuel, pas de données médicales. Auth obligatoire.
 */

import type { Router, Request } from 'express'

const OCR_URL = (process.env.OCR_INTERNAL_URL ?? 'http://bayen-tesseract:5000').replace(/\/$/, '')
const TZ = 'Africa/Casablanca'

interface MealRow {
  plat: string | null
  verdict: string | null
  caracteristiques: unknown
  estimated_kcal: number | null
}

const VERDICT_FR: Record<string, string> = {
  sain: 'sain',
  equilibre: 'équilibré',
  a_limiter: 'à limiter',
  occasionnel: 'occasionnel',
}

export function registerCoachEndpoint(
  router: Router,
  context: { database: Record<string, (...args: unknown[]) => unknown> }
): void {
  router.post('/weekly-coach', async (req, res) => {
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

      const rowsRes = await knex.raw(
        `SELECT plat, verdict, caracteristiques, estimated_kcal
         FROM meal_scans
         WHERE user_id = ?
           AND (date_created AT TIME ZONE ?)::date >= ((now() AT TIME ZONE ?)::date - 6)
         ORDER BY date_created DESC
         LIMIT 40`,
        [userId, TZ, TZ]
      )
      const meals = rowsRes.rows as MealRow[]

      if (meals.length < 2) {
        res.json({ enough: false, nb_repas: meals.length })
        return
      }

      // Résumé textuel pour l'IA
      const resume = meals
        .map((m) => {
          const carac = Array.isArray(m.caracteristiques)
            ? (m.caracteristiques as string[]).join(', ')
            : ''
          const v = m.verdict ? (VERDICT_FR[m.verdict] ?? m.verdict) : '?'
          const kcal = m.estimated_kcal != null ? `~${m.estimated_kcal} kcal` : ''
          return `- ${m.plat ?? 'repas'} (${v}${carac ? ' ; ' + carac : ''}${kcal ? ' ; ' + kcal : ''})`
        })
        .join('\n')

      const aiRes = await fetch(`${OCR_URL}/weekly-coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, nb_repas: meals.length }),
        signal: AbortSignal.timeout(45_000),
      })
      if (!aiRes.ok) {
        res.status(502).json({ error: 'Bilan indisponible pour le moment.' })
        return
      }
      const ai = (await aiRes.json()) as { bilan?: string; conseils?: string[] }

      res.json({
        enough: true,
        nb_repas: meals.length,
        bilan: ai.bilan ?? '',
        conseils: Array.isArray(ai.conseils) ? ai.conseils : [],
      })
    } catch (err) {
      console.error('[bayen-api/weekly-coach] error:', err)
      res.status(500).json({ error: 'Erreur interne.' })
    }
  })
}
