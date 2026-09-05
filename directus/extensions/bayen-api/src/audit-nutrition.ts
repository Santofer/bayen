/**
 * POST /bayen-api/audit-nutrition — audit des valeurs nutritionnelles (admin).
 *
 * Passe toutes les fiches alimentaires publiées au crible de nutrition-guard :
 *   1. valeurs impossibles → on retente Open Food Facts (la fiche a pu être
 *      corrigée depuis l'import) ; si OFF fournit un tableau cohérent et différent,
 *      il remplace le nôtre ;
 *   2. sinon on applique `sanitizeNutrition` (kJ → kcal, champ fautif effacé) ;
 *   3. les anomalies restantes (énergie incohérente sans coupable évident) sont
 *      consignées dans `products.data_issues` pour l'admin et la fiche ;
 *   4. tout produit modifié est rescoré par l'algorithme déterministe.
 *
 * Body : { apply?: boolean (défaut false = rapport seul), limit?: number, refetch_off?: boolean }
 * Appelé chaque nuit à 09:15 (scripts/audit-nutrition.sh).
 */

import type { Router, Request } from 'express'
import { auditNutrition, sanitizeNutrition, type NutritionInput, type NutritionField } from './nutrition-guard.js'
import { scoreProduct } from './scan.js'

const OFF_USER_AGENT = process.env.OFF_USER_AGENT ?? 'Bayen/1.0 (contact@n0.ma)'
const OFF_API_URL = process.env.OFF_API_URL ?? 'https://world.openfoodfacts.org/api/v2'
const FIELDS: NutritionField[] = ['energy_kcal', 'fat_total', 'fat_saturated', 'carbs_total', 'sugars', 'fiber', 'proteins', 'salt']
const OFF_KEYS: Record<NutritionField, string> = {
  energy_kcal: 'energy-kcal_100g', fat_total: 'fat_100g', fat_saturated: 'saturated-fat_100g', carbs_total: 'carbohydrates_100g',
  sugars: 'sugars_100g', fiber: 'fiber_100g', proteins: 'proteins_100g', salt: 'salt_100g',
}

interface KnexRaw {
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
}

function isAdmin(req: Request): boolean {
  return (req as unknown as { accountability?: { admin?: boolean } }).accountability?.admin === true
}

async function fetchOff(barcode: string): Promise<NutritionInput | null> {
  try {
    const res = await fetch(`${OFF_API_URL}/product/${barcode}.json?fields=nutriments`, {
      headers: { 'User-Agent': OFF_USER_AGENT }, signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const data = await res.json() as { status?: number; product?: { nutriments?: Record<string, unknown> } }
    if (data.status !== 1 || !data.product?.nutriments) return null
    const n = data.product.nutriments
    const out: NutritionInput = {}
    let any = false
    for (const f of FIELDS) {
      const v = n[OFF_KEYS[f]]
      if (typeof v === 'number' && Number.isFinite(v)) { out[f] = v; any = true }
    }
    return any ? out : null
  } catch {
    return null
  }
}

const same = (a: number | null | undefined, b: number | null | undefined): boolean =>
  (a == null && b == null) || (a != null && b != null && Math.abs(a - b) < 0.05)

export function registerAuditNutritionEndpoint(router: Router, context: { database: unknown }): void {
  router.post('/audit-nutrition', async (req, res) => {
    try {
      if (!isAdmin(req)) { res.status(403).json({ error: 'admin_only' }); return }
      const body = (req.body ?? {}) as { apply?: boolean; limit?: number; refetch_off?: boolean }
      const apply = body.apply === true
      const refetch = body.refetch_off !== false
      const limit = Math.min(Math.max(Number(body.limit) || 5000, 1), 10000)
      const knex = context.database as KnexRaw

      const { rows } = await knex.raw(
        `SELECT id, barcode, name_fr, brand, data_source, energy_kcal, fat_total, fat_saturated, carbs_total, sugars, fiber, proteins, salt, data_issues
         FROM products WHERE status = 'published' AND product_type = 'food'
         AND (energy_kcal IS NOT NULL OR proteins IS NOT NULL OR carbs_total IS NOT NULL OR fat_total IS NOT NULL OR salt IS NOT NULL OR sugars IS NOT NULL)
         ORDER BY scan_count DESC LIMIT ?`, [limit])

      const summary = { audited: rows.length, flagged: 0, fixed_from_off: 0, sanitized: 0, kj_converted: 0, only_flagged: 0, cleared: 0 }
      const examples: Array<Record<string, unknown>> = []

      for (const r of rows) {
        const current: NutritionInput = {}
        for (const f of FIELDS) current[f] = typeof r[f] === 'number' ? (r[f] as number) : (r[f] == null ? null : Number(r[f]))
        const name = `${r.name_fr ?? ''} ${r.brand ?? ''}`
        const issues = auditNutrition(current, name)

        if (issues.length === 0) {
          // Plus d'anomalie (corrigée à la main ?) → on efface l'ancien signalement
          if (r.data_issues != null) {
            summary.cleared++
            if (apply) await knex.raw(`UPDATE products SET data_issues = NULL WHERE id = ?`, [r.id])
          }
          continue
        }
        summary.flagged++

        let next: NutritionInput | null = null
        let how = ''
        if (refetch && typeof r.barcode === 'string' && /^\d{8,13}$/.test(r.barcode)) {
          const off = await fetchOff(r.barcode)
          if (off && auditNutrition(off, name).length === 0 && FIELDS.some((f) => !same(off[f], current[f]))) {
            next = { ...current, ...off }
            how = 'off'
          }
        }
        let remaining = next ? [] : issues
        if (!next) {
          const s = sanitizeNutrition(current, name)
          if (s.changed.length > 0) {
            next = s.values
            how = s.changed.includes('energy_kcal') && s.issues.some((i) => i.code === 'energy_in_kj') ? 'kj' : 'sanitized'
            remaining = auditNutrition(next, name)
          }
        }

        const record = { barcode: r.barcode, name: String(r.name_fr ?? '').slice(0, 40), source: r.data_source, how: how || 'flag', issues: issues.map((i) => i.message), remaining: remaining.map((i) => i.message) }
        if (examples.length < 80) examples.push(record)
        if (how === 'off') summary.fixed_from_off++
        else if (how === 'kj') summary.kj_converted++
        else if (how === 'sanitized') summary.sanitized++
        else summary.only_flagged++

        if (!apply) continue
        const patch: Record<string, unknown> = { data_issues: remaining.length > 0 ? JSON.stringify(remaining.map((i) => ({ field: i.field, code: i.code, message: i.message }))) : null }
        if (next) for (const f of FIELDS) patch[f] = next[f] ?? null
        const sets = Object.keys(patch).map((k) => `${k} = ?`).join(', ')
        await knex.raw(`UPDATE products SET ${sets} WHERE id = ?`, [...Object.values(patch), r.id])
        if (next) {
          const { rows: fresh } = await knex.raw(`SELECT * FROM products WHERE id = ?`, [r.id])
          const p = fresh[0] as Parameters<typeof scoreProduct>[0] | undefined
          if (p) {
            if (typeof p.additives === 'string') p.additives = JSON.parse(p.additives) as string[]
            const score = await scoreProduct(p, context.database as Record<string, (...args: unknown[]) => unknown>)
            await knex.raw(`UPDATE products SET scan_score = ?, score_label = ?, nutriscore_grade = ? WHERE id = ?`,
              [score.total, score.label, score.nutriscore_grade ?? null, r.id])
          }
        }
      }
      res.json({ apply, ...summary, examples })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
