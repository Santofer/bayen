/**
 * Algorithme de scoring déterministe Bayen (0–100)
 *
 * Source de vérité — miroir dans frontend/src/lib/scoring.ts
 * Le score final est TOUJOURS calculé ici — jamais par le LLM
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

// Seuils points négatifs A (pour 100g)
// Index = nombre de points (0–9), valeur = seuil max (≤)
const ENERGY_THRESHOLDS = [80, 160, 240, 320, 400, 480, 560, 640, 720]
const SATURATED_FAT_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const SUGARS_THRESHOLDS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40]
const SALT_THRESHOLDS = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7]

// Seuils points positifs C (fibres et protéines pour 100g)
const FIBER_THRESHOLDS = [0.9, 1.9, 2.8, 3.7, 4.7]
const PROTEIN_THRESHOLDS = [1.6, 3.2, 4.8, 6.4, 8.0]

/**
 * Calcule le nombre de points négatifs pour un nutriment donné
 * en comparant la valeur aux seuils croissants.
 */
function computeNegativePoints(value: number, thresholds: number[]): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return i
  }
  // Au-delà du dernier seuil → score max (9 pour les négatifs, 5 pour les positifs)
  return thresholds.length
}

/**
 * Calcule le nombre de points positifs pour un nutriment donné.
 */
function computePositivePoints(value: number, thresholds: number[]): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return i
  }
  return thresholds.length
}

/**
 * Calcule le score FSA et le grade Nutri-Score.
 * Retourne null si les données nutritionnelles sont absentes.
 */
export function computeNutriScore(
  nutrition: NutritionData
): { fsaScore: number; grade: NutriScoreGrade; bayenPoints: number } | null {
  // Vérifier qu'on a au minimum énergie, AGS, sucres et sel
  if (
    nutrition.energy_kcal == null &&
    nutrition.fat_saturated == null &&
    nutrition.sugars == null &&
    nutrition.salt == null
  ) {
    return null
  }

  // Points négatifs A
  const energyPts = nutrition.energy_kcal != null
    ? computeNegativePoints(nutrition.energy_kcal, ENERGY_THRESHOLDS)
    : 0
  const satFatPts = nutrition.fat_saturated != null
    ? computeNegativePoints(nutrition.fat_saturated, SATURATED_FAT_THRESHOLDS)
    : 0
  const sugarsPts = nutrition.sugars != null
    ? computeNegativePoints(nutrition.sugars, SUGARS_THRESHOLDS)
    : 0
  const saltPts = nutrition.salt != null
    ? computeNegativePoints(nutrition.salt, SALT_THRESHOLDS)
    : 0

  const totalA = energyPts + satFatPts + sugarsPts + saltPts

  // Points positifs C
  const fiberPts = nutrition.fiber != null
    ? computePositivePoints(nutrition.fiber, FIBER_THRESHOLDS)
    : 0
  const proteinPts = nutrition.proteins != null
    ? computePositivePoints(nutrition.proteins, PROTEIN_THRESHOLDS)
    : 0
  const fruitPts = nutrition.fruits_vegetables_nuts_points ?? 0

  const totalC = fiberPts + proteinPts + fruitPts

  // Score FSA
  // Si A < 11 : FSA = A − C
  // Si A ≥ 11 et fruits < 5 pts : FSA = A − (fibres + fruits) — protéines exclues
  let fsaScore: number
  if (totalA < 11) {
    fsaScore = totalA - totalC
  } else if (fruitPts < 5) {
    fsaScore = totalA - (fiberPts + fruitPts)
  } else {
    fsaScore = totalA - totalC
  }

  // Conversion FSA → grade → points Bayen
  let grade: NutriScoreGrade
  let bayenPoints: number

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

  return { fsaScore, grade, bayenPoints }
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

/**
 * Retourne les points NOVA pour un groupe donné.
 */
export function computeNovaPoints(novaGroup: NovaGroup | null | undefined): number {
  if (novaGroup == null || !(novaGroup in NOVA_POINTS)) return 0
  return NOVA_POINTS[novaGroup]
}

// Marqueurs NOVA 4 (ultra-transformé) — détection par règles (fallback LLM)
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

// Patterns E4xx (émulsifiants) pour la détection NOVA 4
const E4XX_PATTERN = /E4\d{2}/i

/**
 * Détecte le groupe NOVA par règles à partir du texte des ingrédients.
 * Utilisé en fallback si le LLM n'a pas fourni de valeur.
 */
export function detectNovaFromIngredients(ingredientsText: string | null | undefined): NovaGroup {
  if (!ingredientsText) return 3 // Par défaut, transformé

  const lower = ingredientsText.toLowerCase()

  // NOVA 4 : présence de marqueurs ultra-transformés
  const hasNova4Marker = NOVA4_MARKERS.some((marker) => lower.includes(marker))
  const hasE4xx = E4XX_PATTERN.test(ingredientsText)

  if (hasNova4Marker || hasE4xx) return 4

  // NOVA 3 : sel + sucre/huile + transformation
  const hasSalt = lower.includes('sel')
  const hasSugar = lower.includes('sucre') || lower.includes('sirop')
  const hasOil = lower.includes('huile') || lower.includes('beurre') || lower.includes('graisse')
  if (hasSalt && (hasSugar || hasOil)) return 3

  // NOVA 1–2 : peu d'ingrédients et ingrédients simples
  const ingredientCount = ingredientsText.split(',').length
  if (ingredientCount <= 3) return 1

  return 2
}

// ────────────────────────────────────────────────────────────────
// C. Additifs → 0 à 20 points
// Score départ : 20 pts. Déductions selon le risque. Plancher à 0.
// ────────────────────────────────────────────────────────────────

const RISK_DEDUCTIONS: Record<RiskLevel, number> = {
  safe: 0,
  limited: 2,
  avoid: 5,
  banned_ma: 10,
}

/**
 * Calcule le score additifs à partir de la liste des additifs avec leurs niveaux de risque.
 */
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

  // Plancher à 0
  const points = Math.max(0, 20 - totalDeduction)

  return { points, detail }
}

// ────────────────────────────────────────────────────────────────
// Score global
// ────────────────────────────────────────────────────────────────

/**
 * Convertit un score total (0–100) en label et couleur.
 */
export function scoreToLabel(score: number): { label: ScoreLabel; color: string } {
  if (score >= 75) return { label: 'excellent', color: '#16a34a' }
  if (score >= 50) return { label: 'bon', color: '#84cc16' }
  if (score >= 25) return { label: 'médiocre', color: '#f97316' }
  return { label: 'mauvais', color: '#ef4444' }
}

/**
 * Calcule le score global Bayen (0–100).
 *
 * Paramètres :
 *   - nutrition : données nutritionnelles pour 100g
 *   - novaGroup : groupe NOVA (1–4), null si inconnu
 *   - ingredientsText : texte brut des ingrédients (pour fallback NOVA)
 *   - additives : liste des additifs avec leur niveau de risque
 */
export function computeScore(params: {
  nutrition: NutritionData
  novaGroup?: NovaGroup | null
  ingredientsText?: string | null
  additives: Array<{ code: string; risk_level: RiskLevel }>
}): ScoreResult {
  const { nutrition, additives } = params

  // Non évalué : aucun signal exploitable (ni nutrition, ni NOVA déclaré, ni
  // ingrédients). Sans ça, l'algo fabriquait un score « mauvais » (Nutri-Score
  // E par défaut + NOVA deviné) pour des produits dont on ne sait rien.
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

  // A. Nutri-Score (50 pts max)
  const nutriResult = computeNutriScore(nutrition)
  const nutriscoreGrade = nutriResult?.grade ?? null
  const nutriscorePoints = nutriResult?.bayenPoints ?? 0
  const fsaScore = nutriResult?.fsaScore ?? null

  // B. NOVA (30 pts max)
  // Utiliser le groupe NOVA fourni, sinon fallback détection par règles
  const novaGroup = params.novaGroup ?? detectNovaFromIngredients(params.ingredientsText)
  const novaPoints = computeNovaPoints(novaGroup)

  // C. Additifs (20 pts max)
  const additivesResult = computeAdditivesScore(additives)

  // Score total
  const total = nutriscorePoints + novaPoints + additivesResult.points
  const { label, color } = scoreToLabel(total)

  // Flag données incomplètes
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
