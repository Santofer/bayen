/**
 * Algorithme de scoring déterministe Bayen (0–100)
 *
 * Miroir de directus/extensions/bayen-api/src/scoring.ts
 * Le score final est TOUJOURS calculé par cet algorithme — jamais par le LLM
 *
 * Formule : Score = NutriScore (50 pts max) + NOVA (30 pts max) + Additifs (20 pts max)
 *
 * Référence : SPEC.md §11
 */

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

export type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type NovaGroup = 1 | 2 | 3 | 4
export type RiskLevel = 'safe' | 'limited' | 'avoid' | 'banned_ma'
export type ScoreLabel = 'excellent' | 'bon' | 'médiocre' | 'mauvais'

export interface NutritionData {
  energy_kcal?: number | null
  fat_saturated?: number | null
  sugars?: number | null
  salt?: number | null
  fiber?: number | null
  proteins?: number | null
  /** Points fruits/légumes/noix (0–10), fourni par le LLM ou saisi manuellement */
  fruits_vegetables_nuts_points?: number | null
  /** Indique si le produit est une boisson (barèmes NutriScore différents) */
  is_beverage?: boolean
}

export interface AdditiveResult {
  code: string
  risk_level: RiskLevel
  deduction: number
}

export interface ScoreResult {
  /** null si le produit n'a aucune donnée exploitable (non évalué) */
  total: number | null
  /** null si non évalué */
  label: ScoreLabel | null
  color: string
  /** null si non évalué */
  nutriscore_grade: NutriScoreGrade | null
  nutriscore_points: number
  nova_group: NovaGroup | null
  nova_points: number
  additives_points: number
  additives_detail: AdditiveResult[]
  fsa_score: number | null
  incomplete: boolean
  /** true = aucune donnée pour scorer (ni nutrition, ni NOVA, ni ingrédients) */
  unscored: boolean
}

// ────────────────────────────────────────────────────────────────
// A. Nutri-Score → 0 à 50 points
// Méthode FSA officielle : points négatifs A − points positifs C
// ────────────────────────────────────────────────────────────────

// ── Seuils aliments solides ──
const ENERGY_THRESHOLDS = [80, 160, 240, 320, 400, 480, 560, 640, 720]
const SATURATED_FAT_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const SUGARS_THRESHOLDS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40]
const SALT_THRESHOLDS = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7]

const FIBER_THRESHOLDS = [0.9, 1.9, 2.8, 3.7, 4.7]
const PROTEIN_THRESHOLDS = [1.6, 3.2, 4.8, 6.4, 8.0]

// ── Seuils boissons (barèmes plus stricts) ──
const BEV_ENERGY_THRESHOLDS = [7, 14, 21, 29, 36, 43, 50, 57, 64]
const BEV_SUGARS_THRESHOLDS = [1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5]
// Graisses saturées et sel : mêmes seuils que les aliments solides

function computeNegativePoints(value: number, thresholds: number[]): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return i
  }
  return thresholds.length
}

function computePositivePoints(value: number, thresholds: number[]): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return i
  }
  return thresholds.length
}

export function computeNutriScore(
  nutrition: NutritionData
): { fsaScore: number; grade: NutriScoreGrade; bayenPoints: number } | null {
  if (
    nutrition.energy_kcal == null &&
    nutrition.fat_saturated == null &&
    nutrition.sugars == null &&
    nutrition.salt == null
  ) {
    return null
  }

  const isBev = nutrition.is_beverage === true

  // Points négatifs — seuils différents pour les boissons
  const energyPts = nutrition.energy_kcal != null
    ? computeNegativePoints(nutrition.energy_kcal, isBev ? BEV_ENERGY_THRESHOLDS : ENERGY_THRESHOLDS)
    : 0
  const satFatPts = nutrition.fat_saturated != null
    ? computeNegativePoints(nutrition.fat_saturated, SATURATED_FAT_THRESHOLDS)
    : 0
  const sugarsPts = nutrition.sugars != null
    ? computeNegativePoints(nutrition.sugars, isBev ? BEV_SUGARS_THRESHOLDS : SUGARS_THRESHOLDS)
    : 0
  const saltPts = nutrition.salt != null
    ? computeNegativePoints(nutrition.salt, SALT_THRESHOLDS)
    : 0

  const totalA = energyPts + satFatPts + sugarsPts + saltPts

  const fiberPts = nutrition.fiber != null
    ? computePositivePoints(nutrition.fiber, FIBER_THRESHOLDS)
    : 0
  const proteinPts = nutrition.proteins != null
    ? computePositivePoints(nutrition.proteins, PROTEIN_THRESHOLDS)
    : 0
  const fruitPts = nutrition.fruits_vegetables_nuts_points ?? 0

  const totalC = fiberPts + proteinPts + fruitPts

  let fsaScore: number
  if (isBev) {
    // Boissons : les fruits/légumes comptent toujours (pas de cap à totalA >= 11)
    fsaScore = totalA - totalC
  } else if (totalA < 11) {
    fsaScore = totalA - totalC
  } else if (fruitPts < 5) {
    fsaScore = totalA - (fiberPts + fruitPts)
  } else {
    fsaScore = totalA - totalC
  }

  let grade: NutriScoreGrade
  let bayenPoints: number

  if (isBev) {
    // Barème boissons : eau = A, sinon B à E (seuils plus stricts)
    if (isWater(nutrition)) {
      grade = 'A'
      bayenPoints = 50
    } else if (fsaScore <= 1) {
      grade = 'B'
      bayenPoints = 40
    } else if (fsaScore <= 5) {
      grade = 'C'
      bayenPoints = 30
    } else if (fsaScore <= 9) {
      grade = 'D'
      bayenPoints = 15
    } else {
      grade = 'E'
      bayenPoints = 0
    }
  } else {
    // Barème aliments solides
    if (fsaScore <= -1) {
      grade = 'A'
      bayenPoints = 50
    } else if (fsaScore <= 2) {
      grade = 'B'
      bayenPoints = 40
    } else if (fsaScore <= 10) {
      grade = 'C'
      bayenPoints = 30
    } else if (fsaScore <= 18) {
      grade = 'D'
      bayenPoints = 15
    } else {
      grade = 'E'
      bayenPoints = 0
    }
  }

  return { fsaScore, grade, bayenPoints }
}

/** Détecte si les valeurs nutritionnelles correspondent à de l'eau (tout ~0) */
function isWater(nutrition: NutritionData): boolean {
  const e = nutrition.energy_kcal ?? 0
  const s = nutrition.sugars ?? 0
  const f = nutrition.fat_saturated ?? 0
  return e <= 1 && s <= 0.5 && f <= 0.1
}

// ────────────────────────────────────────────────────────────────
// B. NOVA → 0 à 30 points
// ────────────────────────────────────────────────────────────────

const NOVA_POINTS: Record<NovaGroup, number> = {
  1: 30,
  2: 20,
  3: 10,
  4: 0,
}

export function computeNovaPoints(novaGroup: NovaGroup | null | undefined): number {
  if (novaGroup == null || !(novaGroup in NOVA_POINTS)) return 0
  return NOVA_POINTS[novaGroup]
}

const NOVA4_MARKERS = [
  'arôme artificiel',
  'arômes artificiels',
  'arôme',
  'arômes',
  'colorant artificiel',
  'colorants artificiels',
  'sirop de glucose',
  'sirop de glucose-fructose',
  'sirop de fructose',
  'protéines hydrolysées',
  'protéine hydrolysée',
  'maltodextrine',
  'dextrose',
  'isoglucose',
  'huile hydrogénée',
  'huiles hydrogénées',
  'graisse hydrogénée',
  'graisses hydrogénées',
  'isolat de protéine',
  'isolat de protéines',
  'amidon modifié',
  'caséine',
  'caséinate',
  'lactose',
  'gluten',
  'inverti',
  'sucre inverti',
]

const E4XX_PATTERN = /E4\d{2}/i

export function detectNovaFromIngredients(ingredientsText: string | null | undefined): NovaGroup {
  if (!ingredientsText) return 3

  const lower = ingredientsText.toLowerCase()

  const hasNova4Marker = NOVA4_MARKERS.some((marker) => lower.includes(marker))
  const hasE4xx = E4XX_PATTERN.test(ingredientsText)

  if (hasNova4Marker || hasE4xx) return 4

  const hasSalt = lower.includes('sel')
  const hasSugar = lower.includes('sucre') || lower.includes('sirop')
  const hasOil = lower.includes('huile') || lower.includes('beurre') || lower.includes('graisse')
  if (hasSalt && (hasSugar || hasOil)) return 3

  const ingredientCount = ingredientsText.split(',').length
  if (ingredientCount <= 3) return 1

  return 2
}

// ────────────────────────────────────────────────────────────────
// C. Additifs → 0 à 20 points
// ────────────────────────────────────────────────────────────────

const RISK_DEDUCTIONS: Record<RiskLevel, number> = {
  safe: 0,
  limited: 2,
  avoid: 5,
  banned_ma: 10,
}

export function computeAdditivesScore(
  additives: Array<{ code: string; risk_level: RiskLevel }>
): { points: number; detail: AdditiveResult[] } {
  const detail: AdditiveResult[] = []
  let totalDeduction = 0

  for (const additive of additives) {
    const deduction = RISK_DEDUCTIONS[additive.risk_level] ?? 0
    detail.push({
      code: additive.code,
      risk_level: additive.risk_level,
      deduction,
    })
    totalDeduction += deduction
  }

  const points = Math.max(0, 20 - totalDeduction)
  return { points, detail }
}

// ────────────────────────────────────────────────────────────────
// Score global
// ────────────────────────────────────────────────────────────────

export function scoreToLabel(score: number): { label: ScoreLabel; color: string } {
  if (score >= 75) return { label: 'excellent', color: '#476a32' }
  if (score >= 50) return { label: 'bon', color: '#b1cf3a' }
  if (score >= 25) return { label: 'médiocre', color: '#f97316' }
  return { label: 'mauvais', color: '#ef4444' }
}

export function computeScore(params: {
  nutrition: NutritionData
  novaGroup?: NovaGroup | null
  ingredientsText?: string | null
  additives: Array<{ code: string; risk_level: RiskLevel }>
  /** Catégorie du produit — permet de détecter les boissons */
  categoryId?: number | null
}): ScoreResult {
  const { nutrition, additives } = params

  // Non évalué : aucun signal exploitable (ni nutrition, ni NOVA déclaré, ni
  // ingrédients). Sans ça, l'algo fabriquait un score « mauvais » (Nutri-Score
  // E par défaut + NOVA deviné) pour des produits dont on ne sait rien — ex.
  // une simple semoule notée 30/100. On refuse de juger sans données.
  const hasNutrition =
    nutrition.energy_kcal != null ||
    nutrition.fat_saturated != null ||
    nutrition.sugars != null ||
    nutrition.salt != null
  const hasNova = params.novaGroup != null
  const hasIngredients = !!(params.ingredientsText && params.ingredientsText.trim())
  if (!hasNutrition && !hasNova && !hasIngredients) {
    return {
      total: null,
      label: null,
      color: '#a1a1aa',
      nutriscore_grade: null,
      nutriscore_points: 0,
      nova_group: null,
      nova_points: 0,
      additives_points: 0,
      additives_detail: [],
      fsa_score: null,
      incomplete: true,
      unscored: true,
    }
  }

  // Détecter automatiquement les boissons via la catégorie
  // 5 = Boissons sucrées, 6 = Eaux & jus
  const beverageCategoryIds = [5, 6]
  if (params.categoryId != null && beverageCategoryIds.includes(params.categoryId)) {
    nutrition.is_beverage = true
  }

  const nutriResult = computeNutriScore(nutrition)
  const nutriscoreGrade = nutriResult?.grade ?? null
  const nutriscorePoints = nutriResult?.bayenPoints ?? 0
  const fsaScore = nutriResult?.fsaScore ?? null

  const novaGroup = params.novaGroup ?? detectNovaFromIngredients(params.ingredientsText)
  const novaPoints = computeNovaPoints(novaGroup)

  const additivesResult = computeAdditivesScore(additives)

  const total = nutriscorePoints + novaPoints + additivesResult.points
  const { label, color } = scoreToLabel(total)

  const incomplete =
    nutrition.energy_kcal == null ||
    nutrition.fat_saturated == null ||
    nutrition.sugars == null ||
    nutrition.salt == null ||
    params.novaGroup == null

  return {
    total,
    label,
    color,
    nutriscore_grade: nutriscoreGrade,
    nutriscore_points: nutriscorePoints,
    nova_group: novaGroup,
    nova_points: novaPoints,
    additives_points: additivesResult.points,
    additives_detail: additivesResult.detail,
    fsa_score: fsaScore,
    incomplete,
    unscored: false,
  }
}
