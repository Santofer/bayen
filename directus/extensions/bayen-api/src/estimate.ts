/**
 * Endpoint POST /bayen-api/estimate-and-score — compléter une fiche alimentaire.
 *
 * Cascade, de la source la plus fiable à la moins fiable. Chaque étape ne
 * remplit que les champs MANQUANTS (une donnée réelle n'est jamais écrasée),
 * passe par les garde-fous nutritionnels, puis le score est recalculé par
 * l'algorithme DÉTERMINISTE (règle CLAUDE.md : l'IA n'invente jamais le score) :
 *
 *   1. score   — les données suffisent déjà, le score n'avait jamais été posé
 *   2. off     — Open Food Facts relu (la fiche a pu y être complétée)
 *   3. photo   — lecture vision du tableau nutritionnel (photo Bayen ou OFF)
 *   4. identify— la photo de face nomme un produit « sans nom » et écarte les
 *                non-aliments
 *   5. estimate— estimation par archétype (nom + marque + catégorie + ingrédients),
 *                marquée data_source='ai_estimate' et confiance basse
 *
 * Appelé par le bouton « Estimer avec l'IA » (anonyme, rate-limité) et par le
 * cron nightly scripts/estimate-scores.py (token admin, sans limite).
 */

import type { Router, Request } from 'express'
import { scoreProduct } from './scan.js'
import { sanitizeNutrition, type NutritionInput, type NutritionField } from './nutrition-guard.js'

const OCR_URL = (process.env.OCR_INTERNAL_URL ?? 'http://bayen-tesseract:5000').replace(/\/$/, '')
const OFF_API_URL = process.env.OFF_API_URL ?? 'https://world.openfoodfacts.org/api/v2'
const OFF_USER_AGENT = process.env.OFF_USER_AGENT ?? 'Bayen/1.0 (contact@n0.ma)'
// Les assets Directus se lisent en interne (l'extension tourne dans le container Directus)
const ASSETS_URL = 'http://127.0.0.1:8055/assets' // pas « localhost » : résolu en IPv6, Directus écoute en IPv4

// Rate limit : 20 estimations / 10 min / IP (appels IA coûteux)
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 20
const ipHits = new Map<string, number[]>()

function checkRate(ip: string): boolean {
  const now = Date.now()
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_MAX) return false
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

// Confiance IA → confidence_score (< 0.8 → badge « Estimation IA » / non vérifié)
const CONF_MAP: Record<string, number> = { faible: 0.3, moyenne: 0.4, elevee: 0.5 }
const FIELDS: NutritionField[] = ['energy_kcal', 'fat_total', 'fat_saturated', 'carbs_total', 'sugars', 'fiber', 'proteins', 'salt']
const OFF_KEYS: Record<NutritionField, string> = {
  energy_kcal: 'energy-kcal_100g', fat_total: 'fat_100g', fat_saturated: 'saturated-fat_100g', carbs_total: 'carbohydrates_100g',
  sugars: 'sugars_100g', fiber: 'fiber_100g', proteins: 'proteins_100g', salt: 'salt_100g',
}
const BAD_NAME = /^\s*$|^produit sans nom|^[0-9]{8,14}$|^inconnu|^unknown/i

type Method = 'score' | 'off' | 'photo' | 'identify' | 'estimate'
type Row = Record<string, unknown>
interface KnexLike {
  (table: string): {
    where(cond: Record<string, unknown>): {
      first(): Promise<Row | undefined>
      update(data: Record<string, unknown>): Promise<unknown>
    }
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : (v == null || v === '' ? null : (Number.isFinite(Number(v)) ? Number(v) : null)))

/** Champs nutritionnels manquants (null) d'une fiche. */
const missing = (p: Row): NutritionField[] => FIELDS.filter((f) => num(p[f]) == null)

/**
 * Fusionne une source dans la fiche : seulement les champs manquants, après
 * garde-fous sur l'ensemble (une source incohérente est rejetée en bloc).
 * Renvoie le patch, ou null si la source n'apporte rien d'exploitable.
 */
function mergeMissing(p: Row, src: NutritionInput, name: string): Record<string, number> | null {
  const merged: NutritionInput = {}
  for (const f of FIELDS) merged[f] = num(p[f]) ?? num(src[f])
  const guard = sanitizeNutrition(merged, name)
  if (guard.changed.length > 0) return null // la source introduit une valeur impossible
  const patch: Record<string, number> = {}
  for (const f of missing(p)) {
    const v = num(src[f])
    if (v != null) patch[f] = v
  }
  return Object.keys(patch).length > 0 ? patch : null
}

async function fetchJson(url: string, init: RequestInit, ms: number): Promise<Row | null> {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(ms) })
    if (!r.ok) return null
    return (await r.json()) as Row
  } catch {
    return null
  }
}

/** Envoie une image (octets) à un endpoint vision multipart. */
async function vision(path: string, field: string, bytes: ArrayBuffer, ms: number): Promise<Row | null> {
  const form = new FormData()
  form.append(field, new Blob([bytes], { type: 'image/jpeg' }), 'photo.jpg')
  return fetchJson(`${OCR_URL}${path}`, { method: 'POST', body: form }, ms)
}

async function fetchBytes(url: string): Promise<ArrayBuffer | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': OFF_USER_AGENT }, signal: AbortSignal.timeout(20_000) })
    return r.ok ? await r.arrayBuffer() : null
  } catch {
    return null
  }
}

export interface EnrichResult {
  estimated: boolean
  method?: Method
  reason?: 'not_estimable' | 'not_food' | 'ai_unavailable' | 'complete'
  filled?: string[]
}

/** Cascade d'enrichissement — exportée pour les usages admin. */
export async function enrichProduct(database: unknown, barcode: string): Promise<EnrichResult> {
  const knex = database as unknown as KnexLike
  const p = await knex('products').where({ barcode }).first()
  if (!p) return { estimated: false, reason: 'not_estimable' }
  const name = () => `${p.name_fr ?? ''} ${p.brand ?? ''}`
  const patch: Record<string, unknown> = {}
  const methods: Method[] = []
  const apply = (fields: Record<string, unknown>, m: Method) => {
    Object.assign(patch, fields); Object.assign(p, fields); methods.push(m)
  }

  const off = await fetchJson(`${OFF_API_URL}/product/${barcode}.json?fields=product_name,product_name_fr,brands,nutriments,nova_group,ingredients_text_fr,ingredients_text,image_nutrition_url,categories`,
    { headers: { 'User-Agent': OFF_USER_AGENT } }, 8000)
  const offProduct = (off?.status === 1 ? off.product : null) as Row | null

  // ── 2. Open Food Facts relu
  if (offProduct && missing(p).length > 0) {
    const n = (offProduct.nutriments ?? {}) as Row
    const src: NutritionInput = {}
    for (const f of FIELDS) src[f] = num(n[OFF_KEYS[f]])
    const m = mergeMissing(p, src, name())
    if (m) apply(m, 'off')
    if (p.nova_group == null && num(offProduct.nova_group) != null) apply({ nova_group: num(offProduct.nova_group) }, 'off')
    const ing = (offProduct.ingredients_text_fr || offProduct.ingredients_text) as string | undefined
    if (!p.ingredients_text && ing && ing.trim().length > 3) apply({ ingredients_text: ing.trim().slice(0, 5000) }, 'off')
  }

  // ── 3. Tableau nutritionnel en photo (Bayen d'abord, sinon OFF)
  if (num(p.energy_kcal) == null || missing(p).length >= 3) {
    const bytes = p.image_nutrition
      ? await fetchBytes(`${ASSETS_URL}/${p.image_nutrition}?width=1600&quality=88`)
      : (offProduct?.image_nutrition_url ? await fetchBytes(String(offProduct.image_nutrition_url).replace(/\.\d+\.jpg$/, '.full.jpg')) : null)
    if (bytes) {
      const r = await vision('/pipeline', 'image_nutrition', bytes, 120_000)
      if (r?.job_status === 'done' && r.parsed_data) {
        const d = r.parsed_data as Row
        const src: NutritionInput = {}
        for (const f of FIELDS) src[f] = num(d[f])
        const m = mergeMissing(p, src, name())
        if (m) apply(m, 'photo')
      }
    }
  }

  // ── 4. Photo de face : nommer un produit « sans nom », écarter les non-aliments
  let kind: string | null = null
  if (num(p.energy_kcal) == null && p.image_front) {
    const bytes = await fetchBytes(`${ASSETS_URL}/${p.image_front}?width=1024&quality=85`)
    const r = bytes ? await vision('/identify-product', 'image', bytes, 90_000) : null
    if (r && r.confiance !== 'faible') {
      kind = typeof r.kind === 'string' ? r.kind : null
      const fix: Record<string, unknown> = {}
      if (BAD_NAME.test(String(p.name_fr ?? '')) && typeof r.name_fr === 'string' && r.name_fr.length >= 2) fix.name_fr = r.name_fr.slice(0, 200)
      if (/^\s*$|^marque inconnue|^inconnu/i.test(String(p.brand ?? '')) && typeof r.brand === 'string' && r.brand.length >= 2) fix.brand = r.brand.slice(0, 100)
      // Type générique lu sur l'emballage : lève l'ambiguïté d'un nom commercial
      // (« VIP Classique » → « café soluble »), indispensable à l'estimation
      const generic = typeof r.generic === 'string' ? r.generic : (typeof r.name_fr === 'string' ? r.name_fr : '')
      if (generic) (p as Row)._identified = generic
      if (Object.keys(fix).length > 0) apply(fix, 'identify')
    }
  }
  if (kind && kind !== 'food') {
    if (Object.keys(patch).length > 0) await knex('products').where({ barcode }).update(patch)
    return { estimated: false, reason: 'not_food' }
  }

  // ── 5. Estimation par archétype (dernier recours, seulement sans énergie)
  if (num(p.energy_kcal) == null) {
    let categoryName = ''
    if (p.category_id != null) {
      try { categoryName = String((await knex('categories').where({ id: p.category_id }).first())?.name_fr ?? '') } catch { /* facultatif */ }
    }
    const ai = await fetchJson(`${OCR_URL}/estimate-nutrition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: [p.name_fr, p._identified && p._identified !== p.name_fr ? `(${p._identified})` : ''].filter(Boolean).join(' '),
        brand: p.brand ?? '',
        category: categoryName,
        ingredients: String(p.ingredients_text ?? '').slice(0, 600),
      }),
    }, 60_000)
    if (ai == null) {
      if (Object.keys(patch).length === 0) return { estimated: false, reason: 'ai_unavailable' }
    } else if (ai.estimable && ai.nutrition_100g) {
      const src = ai.nutrition_100g as NutritionInput
      const m = mergeMissing(p, src, name())
      if (m) {
        apply({ ...m, data_source: 'ai_estimate', confidence_score: CONF_MAP[String(ai.confiance)] ?? 0.4 }, 'estimate')
        if (p.nova_group == null && num(ai.nova_group) != null) apply({ nova_group: num(ai.nova_group) }, 'estimate')
      }
    }
  }

  delete (p as Row)._identified
  // ── 1. Score (toujours recalculé par l'algorithme déterministe)
  const fresh = { ...p }
  if (typeof fresh.additives === 'string') { try { fresh.additives = JSON.parse(fresh.additives as string) } catch { fresh.additives = [] } }
  const score = await scoreProduct(fresh as Parameters<typeof scoreProduct>[0], database as Record<string, (...args: unknown[]) => unknown>)
  const scoreChanged = score.total != null && score.total !== p.scan_score
  if (scoreChanged) {
    Object.assign(patch, { scan_score: score.total, score_label: score.label, nutriscore_grade: score.nutriscore_grade ?? null })
    if (methods.length === 0) methods.push('score')
  }
  if (Object.keys(patch).length === 0) return { estimated: false, reason: score.total != null ? 'complete' : 'not_estimable' }

  await knex('products').where({ barcode }).update(patch)
  return {
    estimated: score.total != null,
    method: methods[0],
    reason: score.total != null ? undefined : 'not_estimable',
    filled: Object.keys(patch).filter((k) => !['scan_score', 'score_label', 'nutriscore_grade', 'data_source', 'confidence_score'].includes(k)),
  }
}

export function registerEstimateEndpoint(
  router: Router,
  context: { database: Record<string, (...args: unknown[]) => unknown> }
): void {
  router.post('/estimate-and-score', async (req, res) => {
    try {
      // Le batch nightly s'authentifie en admin (token statique) → pas de limite
      const isAdmin = (req as unknown as { accountability?: { admin?: boolean } }).accountability?.admin === true
      if (!isAdmin && !checkRate(clientIp(req))) {
        res.status(429).json({ error: 'Trop de demandes, réessaie dans quelques minutes.' })
        return
      }
      const barcode = String((req.body as { barcode?: unknown })?.barcode ?? '').trim()
      if (!/^\d{8}$|^\d{13}$/.test(barcode)) {
        res.status(400).json({ error: 'Code-barres invalide.' })
        return
      }
      const result = await enrichProduct(context.database, barcode)
      if (result.reason === 'ai_unavailable') {
        res.status(502).json({ ...result, error: "L'estimation IA est indisponible pour le moment." })
        return
      }
      res.json(result)
    } catch (err) {
      console.error('[bayen-api/estimate-and-score] error:', err)
      res.status(502).json({ error: "L'estimation IA est indisponible pour le moment." })
    }
  })
}
