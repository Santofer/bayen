/**
 * Univers beauté — appariement INCI et score cosmétique.
 *
 *   matchInci()             tokens INCI → ingrédients du référentiel (nom, synonyme,
 *                           ou découpage d'un token « collé » type « PARFUM COCAMIDOPROPYL BETAINE »)
 *   scoreCosmeticProduct()  parse + apparie + score + persiste (cosmetic_risk,
 *                           scan_score, products_cosmetic_ingredients)
 *   GET  /cosmetic-ingredients?q=   autocomplétion (wizard)
 *   POST /cosmetic-score            recalcul admin ({ barcode } ou { all: true })
 *
 * Le score reste déterministe (scoring-cosmetic.ts) : l'IA ne fait que lire
 * la liste sur la photo, jamais noter.
 */

import type { Router, Request } from 'express'
import { parseInci } from './inci.js'
import { computeCosmeticScore, type CosmeticRiskLevel, type CosmeticScoreResult, type MatchedIngredient } from './scoring-cosmetic.js'

interface IngredientRow {
  id: number
  inci_name: string
  name_fr: string | null
  risk_level: CosmeticRiskLevel
  risk_types: string[] | string | null
  risk_status: string | null
}

export interface KnexRaw {
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
}

/** Catégories rincées : exposition brève, irritants atténués. */
const RINSE_OFF_CATEGORIES = new Set(['cheveux', 'hygiene', 'dents'])
const RINSE_OFF_NAME_RE = /shampo|shampoo|gel douche|savon|soap|dentifrice|toothpaste|nettoyant|cleanser|démaquillant|demaquillant|gommage|scrub|après-shampo|conditioner|masque capillaire/i

function asArray(v: string[] | string | null | undefined): string[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    try { const p = JSON.parse(v) as unknown; return Array.isArray(p) ? (p as string[]) : [] } catch { return [] }
  }
  return []
}

async function lookup(knex: KnexRaw, names: string[]): Promise<Map<string, IngredientRow>> {
  const map = new Map<string, IngredientRow>()
  if (names.length === 0) return map
  const ph = names.map(() => '?').join(',')
  const direct = await knex.raw(
    `SELECT id, inci_name, name_fr, risk_level, risk_types, risk_status
     FROM cosmetic_ingredients WHERE status = 'published' AND inci_name IN (${ph})`, names)
  for (const r of direct.rows) map.set(String(r.inci_name), r as unknown as IngredientRow)
  const missing = names.filter((n) => !map.has(n))
  if (missing.length > 0) {
    // Synonymes (« OXYBENZONE », « SLS »…) : colonne JSON, jsonb_exists_any évite l'opérateur ?|
    const syn = await knex.raw(
      `SELECT id, inci_name, name_fr, risk_level, risk_types, risk_status, synonyms
       FROM cosmetic_ingredients WHERE status = 'published' AND synonyms IS NOT NULL
       AND jsonb_exists_any(synonyms::jsonb, ?)`, [missing])
    for (const r of syn.rows) {
      for (const s of asArray(r.synonyms as string[] | string | null)) {
        if (missing.includes(s) && !map.has(s)) map.set(s, r as unknown as IngredientRow)
      }
    }
  }
  return map
}

export interface InciMatch {
  matched: Array<MatchedIngredient & { id: number; name_fr: string | null; raw_text: string }>
  unknown: string[]
}

export async function matchInci(knex: KnexRaw, tokens: string[]): Promise<InciMatch> {
  const found = await lookup(knex, tokens)

  // « AQUA/WATER », « CI 77891/TITANIUM DIOXIDE » : chaque côté est un nom possible
  const slashed = tokens.filter((t) => !found.has(t) && t.includes('/'))
  if (slashed.length > 0) {
    const sides = await lookup(knex, [...new Set(slashed.flatMap((t) => t.split('/').map((x) => x.trim())))])
    for (const t of slashed) {
      const hit = t.split('/').map((x) => x.trim()).find((x) => sides.has(x))
      if (hit) { const r = sides.get(hit); if (r) found.set(t, r) }
    }
  }
  const unknownMulti = tokens.filter((t) => !found.has(t) && t.includes(' '))

  // Token collé (virgule perdue à l'OCR) : toutes les sous-phrases contiguës,
  // puis couverture gloutonne de gauche à droite par le plus long nom connu.
  const splits = new Map<string, string[]>()
  if (unknownMulti.length > 0) {
    const candidates = new Set<string>()
    for (const t of unknownMulti) {
      const w = t.split(' ')
      if (w.length > 8) continue
      for (let i = 0; i < w.length; i++) for (let j = i + 1; j <= w.length; j++) {
        if (j - i === w.length) continue
        candidates.add(w.slice(i, j).join(' '))
      }
    }
    const sub = await lookup(knex, [...candidates])
    for (const t of unknownMulti) {
      const w = t.split(' ')
      const parts: string[] = []
      let i = 0
      let ok = true
      while (i < w.length) {
        let best = 0
        for (let j = w.length; j > i; j--) {
          if (sub.has(w.slice(i, j).join(' '))) { best = j; break }
        }
        if (best === 0) { ok = false; break }
        parts.push(w.slice(i, best).join(' '))
        i = best
      }
      if (ok && parts.length > 1) {
        splits.set(t, parts)
        for (const p of parts) { const r = sub.get(p); if (r) found.set(p, r) }
      }
    }
  }

  const matched: InciMatch['matched'] = []
  const unknown: string[] = []
  let rank = 0
  for (const t of tokens) {
    const parts = splits.get(t) ?? [t]
    for (const p of parts) {
      rank++
      const r = found.get(p)
      if (!r) { unknown.push(p); continue }
      matched.push({
        id: r.id, inci_name: r.inci_name, name_fr: r.name_fr, raw_text: p, rank,
        risk_level: (r.risk_level ?? 'unknown') as CosmeticRiskLevel,
        risk_types: asArray(r.risk_types), risk_status: r.risk_status,
      })
    }
  }
  return { matched, unknown }
}

export interface CosmeticProductLike {
  id: string
  name_fr?: string | null
  inci_text?: string | null
  cosmetic_category?: string | null
}

export interface CosmeticRiskJson extends Omit<CosmeticScoreResult, 'worst'> {
  worst: Array<{ inci_name: string; name_fr: string | null; risk_level: CosmeticRiskLevel; risk_types: string[]; risk_status: string | null }>
  unknown: string[]
  matched_count: number
  token_count: number
  rinse_off: boolean
  scored_at: string
}

export function isRinseOff(p: CosmeticProductLike): boolean {
  return RINSE_OFF_CATEGORIES.has(String(p.cosmetic_category ?? '')) || RINSE_OFF_NAME_RE.test(String(p.name_fr ?? ''))
}

/** Score + persistance. Sans liste INCI : score NULL, fiche « incomplète ». */
export async function scoreCosmeticProduct(knex: KnexRaw, p: CosmeticProductLike): Promise<CosmeticRiskJson> {
  const tokens = parseInci(p.inci_text)
  const { matched, unknown } = await matchInci(knex, tokens)
  const ings: MatchedIngredient[] = [
    ...matched.map((m) => ({ inci_name: m.inci_name, risk_level: m.risk_level, risk_types: m.risk_types, rank: m.rank })),
    ...unknown.map((u, i) => ({ inci_name: u, risk_level: 'unknown' as CosmeticRiskLevel, rank: tokens.length + i + 1 })),
  ]
  const rinseOff = isRinseOff(p)
  const score = computeCosmeticScore({ ingredients: ings, rinseOff })
  const byName = new Map(matched.map((m) => [m.inci_name, m]))
  const risk: CosmeticRiskJson = {
    ...score,
    worst: score.worst.map((w) => {
      const m = byName.get(w.inci_name)
      return { inci_name: w.inci_name, name_fr: m?.name_fr ?? null, risk_level: w.risk_level, risk_types: m?.risk_types ?? [], risk_status: m?.risk_status ?? null }
    }),
    unknown, matched_count: matched.length, token_count: tokens.length, rinse_off: rinseOff,
    scored_at: new Date().toISOString(),
  }

  await knex.raw(
    `UPDATE products SET scan_score = ?, score_label = ?, cosmetic_risk = ?::jsonb WHERE id = ?`,
    [score.total, score.label, JSON.stringify(risk), p.id])
  await knex.raw(`DELETE FROM products_cosmetic_ingredients WHERE products_id = ?`, [p.id])
  if (matched.length > 0) {
    const values = matched.map(() => '(?, ?, ?, ?)').join(',')
    const bind: unknown[] = []
    for (const m of matched) bind.push(p.id, m.id, m.rank, m.raw_text.slice(0, 200))
    await knex.raw(`INSERT INTO products_cosmetic_ingredients (products_id, ingredient_id, rank, raw_text) VALUES ${values}`, bind)
  }
  return risk
}

/** Catégorie beauté Bayen depuis les categories_tags Open Beauty Facts. */
const OBF_CATEGORY_RULES: Array<{ id: string; re: RegExp }> = [
  { id: 'eclaircissant', re: /lightening|whitening|eclaircissant|depigment|anti-taches|anti-dark-spot/ },
  { id: 'bebe', re: /baby|babies|bebe|infant|enfant|kids/ },
  { id: 'solaire', re: /sun|solaire|spf|after-sun|tanning/ },
  { id: 'dents', re: /tooth|dental|mouthwash|bucco|dentifrice/ },
  { id: 'cheveux', re: /hair|shampoo|conditioner|capillaire|cheveux|coiff/ },
  { id: 'homme', re: /shav|rasage|barbe|beard|after-shave|men$|for-men|homme/ },
  { id: 'ongles', re: /nail|ongle|manicure/ },
  { id: 'parfum', re: /perfume|parfum|fragrance|eau-de-toilette|eau-de-cologne/ },
  { id: 'maquillage', re: /make-?up|maquillage|lipstick|mascara|foundation|eyeshadow|blush|eyeliner|rouge-a-levres|fond-de-teint|khol|kohl/ },
  { id: 'hygiene', re: /deodorant|shower|douche|soap|savon|body-wash|intimate|hygiene|bath|bain/ },
  { id: 'visage', re: /face|facial|visage|eye-contour|serum|anti-aging|anti-age|cleanser|toner|mask|masque/ },
  { id: 'corps', re: /body|corps|hand|main|foot|pied|lotion|massage|oil|huile|cream|creme/ },
]

export function mapObfCategory(tags: string[], name: string): string | undefined {
  const hay = [...tags.map((t) => t.replace(/^[a-z]{2}:/, '').toLowerCase()), name.toLowerCase().replace(/\s+/g, '-')]
  for (const rule of OBF_CATEGORY_RULES) if (hay.some((h) => rule.re.test(h))) return rule.id
  return undefined
}

function isAdmin(req: Request): boolean {
  return (req as unknown as { accountability?: { admin?: boolean } }).accountability?.admin === true
}

export function registerCosmeticEndpoints(router: Router, context: { database: unknown }): void {
  const knex = context.database as KnexRaw

  // Autocomplétion INCI (wizard) — nom ou synonyme, préfixe d'abord
  router.get('/cosmetic-ingredients', async (req, res) => {
    try {
      const q = String(req.query.q ?? '').trim().toUpperCase().slice(0, 60)
      if (q.length < 2) { res.json({ data: [] }); return }
      const result = await knex.raw(
        `SELECT id, inci_name, name_fr, risk_level, risk_types
         FROM cosmetic_ingredients
         WHERE status = 'published' AND (inci_name ILIKE ? OR inci_name ILIKE ? OR name_fr ILIKE ?)
         ORDER BY (inci_name ILIKE ?) DESC, (risk_level <> 'none') DESC, length(inci_name) ASC
         LIMIT 12`, [`${q}%`, `% ${q}%`, `%${q}%`, `${q}%`])
      res.set('Cache-Control', 'public, max-age=3600')
      res.json({ data: result.rows })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })

  // Recalcul admin — un produit ou tout l'univers beauté
  router.post('/cosmetic-score', async (req, res) => {
    try {
      if (!isAdmin(req)) { res.status(403).json({ error: 'admin_only' }); return }
      const { barcode, all } = (req.body ?? {}) as { barcode?: string; all?: boolean }
      const rows = barcode
        ? (await knex.raw(`SELECT id, name_fr, inci_text, cosmetic_category FROM products WHERE barcode = ? AND product_type = 'cosmetic'`, [barcode])).rows
        : all
          ? (await knex.raw(`SELECT id, name_fr, inci_text, cosmetic_category FROM products WHERE product_type = 'cosmetic' AND status = 'published'`)).rows
          : []
      const out: Array<{ id: string; total: number | null; incomplete: boolean }> = []
      for (const r of rows) {
        const risk = await scoreCosmeticProduct(knex, r as unknown as CosmeticProductLike)
        out.push({ id: String(r.id), total: risk.total, incomplete: risk.incomplete })
      }
      res.json({ scored: out.length, results: barcode ? out : undefined })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
