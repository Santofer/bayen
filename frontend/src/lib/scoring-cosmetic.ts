/**
 * Score cosmétique Bayen — déterministe, plafonné par le pire ingrédient.
 *
 * Un cosmétique n'a ni Nutri-Score ni NOVA : il se juge sur sa liste INCI, et
 * un seul ingrédient interdit ou à risque élevé suffit à disqualifier le
 * produit quelle que soit la qualité du reste. D'où un PLAFOND par niveau,
 * puis des malus cumulatifs pondérés par la position dans la liste (les
 * premiers ingrédients sont les plus concentrés).
 *
 * L'IA ne calcule jamais ce score (règle CLAUDE.md). Copie identique côté
 * extension : directus/extensions/bayen-api/src/scoring-cosmetic.ts
 */

export type CosmeticRiskLevel = 'none' | 'low' | 'moderate' | 'high' | 'banned' | 'unknown'

export interface MatchedIngredient {
  inci_name: string
  risk_level: CosmeticRiskLevel
  risk_types?: string[] | null
  risk_status?: string | null
  rank: number
}

export interface CosmeticScoreResult {
  total: number | null
  label: 'excellent' | 'bon' | 'médiocre' | 'mauvais' | null
  color: string
  /** Ingrédient qui plafonne le score, s'il y en a un */
  cap_reason: { inci_name: string; risk_level: CosmeticRiskLevel } | null
  worst: MatchedIngredient[]
  counts: Record<CosmeticRiskLevel, number>
  incomplete: boolean
  unscored: boolean
}

const CAP: Record<CosmeticRiskLevel, number> = { banned: 5, high: 25, moderate: 50, low: 75, none: 100, unknown: 100 }
const MALUS: Record<CosmeticRiskLevel, number> = { banned: 0, high: 8, moderate: 4, low: 2, none: 0, unknown: 0 }
const ORDER: CosmeticRiskLevel[] = ['banned', 'high', 'moderate', 'low', 'none', 'unknown']

export function cosmeticScoreToLabel(total: number): { label: CosmeticScoreResult['label']; color: string } {
  if (total >= 80) return { label: 'excellent', color: '#476a32' }
  if (total >= 60) return { label: 'bon', color: '#b1cf3a' }
  if (total >= 40) return { label: 'médiocre', color: '#f97316' }
  return { label: 'mauvais', color: '#ef4444' }
}

export function computeCosmeticScore(params: {
  ingredients: MatchedIngredient[]
  /** Produit rincé (shampooing, gel douche) : exposition brève, irritants atténués */
  rinseOff?: boolean
}): CosmeticScoreResult {
  const counts: Record<CosmeticRiskLevel, number> = { banned: 0, high: 0, moderate: 0, low: 0, none: 0, unknown: 0 }
  const ings = params.ingredients ?? []
  for (const i of ings) counts[i.risk_level] = (counts[i.risk_level] ?? 0) + 1

  if (ings.length === 0) {
    return { total: null, label: null, color: '#a1a1aa', cap_reason: null, worst: [], counts, incomplete: true, unscored: true }
  }

  // 1. Plafond = pire niveau présent (le rang n'y change rien : un PE reste un PE)
  const worstLevel = ORDER.find((lvl) => counts[lvl] > 0 && lvl !== 'unknown' && lvl !== 'none') ?? 'none'
  let total = CAP[worstLevel]
  const capIng = ings.filter((i) => i.risk_level === worstLevel).sort((a, b) => a.rank - b.rank)[0] ?? null

  // 2. Malus cumulatifs dans le plafond, hors ingrédient plafonnant, pondérés par la position
  for (const i of ings) {
    if (i === capIng) continue
    let malus = MALUS[i.risk_level]
    if (malus === 0) continue
    if (i.rank > 10) malus /= 2
    const irritantOnly = (i.risk_types ?? []).every((t) => t === 'irritant') && (i.risk_types ?? []).length > 0
    if (params.rinseOff && irritantOnly) malus /= 2
    total -= malus
  }
  total = Math.max(0, Math.round(total))

  const known = ings.length - counts.unknown
  const incomplete = known === 0 || counts.unknown / ings.length > 0.2
  const { label, color } = cosmeticScoreToLabel(total)
  const worst = ings
    .filter((i) => i.risk_level !== 'none' && i.risk_level !== 'unknown')
    .sort((a, b) => ORDER.indexOf(a.risk_level) - ORDER.indexOf(b.risk_level) || a.rank - b.rank)
    .slice(0, 6)

  return {
    total, label, color,
    cap_reason: capIng && worstLevel !== 'none' ? { inci_name: capIng.inci_name, risk_level: worstLevel } : null,
    worst, counts, incomplete, unscored: false,
  }
}
