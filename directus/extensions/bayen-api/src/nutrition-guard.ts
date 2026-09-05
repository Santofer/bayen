/**
 * Garde-fous nutritionnels (par 100 g) — détection des valeurs impossibles.
 *
 * Les erreurs viennent des saisies OFF (kJ tapés en kcal, sodium en mg mis dans
 * « sel », valeur par portion), de l'OCR et des estimations IA. Une valeur fausse
 * fausse le score et les filtres (« 73 g de protéines » dans des flocons de blé,
 * « 3 625 g de sel » dans un dentifrice). Ici on ne devine pas : ce qui est
 * physiquement impossible est signalé, et `sanitizeNutrition` retire le champ
 * fautif (ou convertit les kJ) — la fiche redevient « incomplète » plutôt que fausse.
 *
 * Copie identique côté extension : directus/extensions/bayen-api/src/nutrition-guard.ts
 */

export interface NutritionInput {
  energy_kcal?: number | null
  fat_total?: number | null
  fat_saturated?: number | null
  carbs_total?: number | null
  sugars?: number | null
  fiber?: number | null
  proteins?: number | null
  salt?: number | null
}

export type NutritionField = keyof NutritionInput

export interface NutritionIssue {
  field: NutritionField
  code: 'out_of_range' | 'sum_over_100' | 'sugars_over_carbs' | 'saturated_over_fat' | 'macro_over_energy'
    | 'energy_in_kj' | 'energy_mismatch' | 'salt_implausible' | 'energy_zero'
  message: string
}

const MAX: Record<NutritionField, number> = {
  energy_kcal: 950, fat_total: 100, fat_saturated: 100, carbs_total: 100, sugars: 100, fiber: 60, proteins: 100, salt: 100,
}
/** Produits dont le sel dépasse légitimement 30 g/100 g */
const SALTY_RE = /\b(sel|salt|ملح|levure chimique|baking powder|backpulver|poudre à lever|bicarbonate|bouillon|cube|sauce soja|soy sauce|assaisonnement|seasoning|épice|epice|spice|édulcorant|edulcorant|sweetener|süßstoff|stevia|nuoc|fond de)\b/i
/** Poudres et concentrés : plus de 45 g de protéines est plausible */
const PROTEIN_POWDER_RE = /whey|prot[ée]in|colag|collag|isolat|levure|spirulin|g[ée]latin|poudre|powder|cas[ée]in|parmesan|parmigiano|grana|pecorino|blanc d'œuf|egg white/i

const num = (v: number | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Énergie théorique (Atwater) : 4 kcal/g protéines et glucides, 9 lipides, 2 fibres */
export function theoreticalEnergy(n: NutritionInput): number | null {
  const p = num(n.proteins), c = num(n.carbs_total), f = num(n.fat_total)
  if (p == null || c == null || f == null) return null
  return 4 * p + 4 * c + 9 * f + 2 * (num(n.fiber) ?? 0)
}

export function auditNutrition(n: NutritionInput, name = ''): NutritionIssue[] {
  const issues: NutritionIssue[] = []
  const e = num(n.energy_kcal)
  const p = num(n.proteins), c = num(n.carbs_total), f = num(n.fat_total)
  const s = num(n.sugars), sat = num(n.fat_saturated), salt = num(n.salt), fib = num(n.fiber)

  for (const field of Object.keys(MAX) as NutritionField[]) {
    const v = num(n[field])
    if (v == null) continue
    if (v < 0 || v > MAX[field]) {
      // 950+ kcal : souvent des kJ (voir plus bas), on laisse ce cas au test dédié
      if (field === 'energy_kcal' && v > 950 && v <= 4000) continue
      issues.push({ field, code: 'out_of_range', message: `${field} = ${v} hors plage (0–${MAX[field]})` })
    }
  }
  if ((p ?? 0) + (c ?? 0) + (f ?? 0) > 105) {
    // Un seul macro-nutriment aberrant (73 g de protéines dans des flocons) : c'est lui le fautif
    const macros = ['proteins', 'carbs_total', 'fat_total'] as const
    const culprits = macros.filter((field) => (num(n[field]) ?? 0) > 45)
    for (const field of culprits.length === 1 ? culprits : macros) {
      if (num(n[field]) != null) issues.push({ field, code: 'sum_over_100', message: `protéines + glucides + lipides = ${((p ?? 0) + (c ?? 0) + (f ?? 0)).toFixed(0)} g > 100 g` })
    }
  }
  if (s != null && c != null && s > c + 2) issues.push({ field: 'sugars', code: 'sugars_over_carbs', message: `sucres ${s} g > glucides ${c} g` })
  if (sat != null && f != null && sat > f + 0.5) issues.push({ field: 'fat_saturated', code: 'saturated_over_fat', message: `saturés ${sat} g > lipides ${f} g` })
  if (salt != null && salt > 30 && salt <= 100 && !SALTY_RE.test(name)) {
    issues.push({ field: 'salt', code: 'salt_implausible', message: `sel ${salt} g/100 g pour un produit qui n'est ni sel, ni levure, ni bouillon` })
  }
  if (p != null && p > 45 && !PROTEIN_POWDER_RE.test(name) && !issues.some((i) => i.field === 'proteins')) {
    issues.push({ field: 'proteins', code: 'out_of_range', message: `${p} g de protéines pour un produit qui n'est pas une poudre ni un fromage à pâte dure` })
  }

  const theo = theoreticalEnergy(n)
  if (e != null && e > 0) {
    // Chaque macro-nutriment ne peut pas dépasser l'énergie totale (polyols : 2,4 kcal/g)
    if (p != null && 4 * p > e * 1.1) issues.push({ field: 'proteins', code: 'macro_over_energy', message: `${p} g de protéines = ${4 * p} kcal > ${e} kcal` })
    if (c != null && 4 * c > e * 1.1 && 2.4 * c > e * 1.15) issues.push({ field: 'carbs_total', code: 'macro_over_energy', message: `${c} g de glucides = ${4 * c} kcal > ${e} kcal` })
    if (f != null && 9 * f > e * 1.15) issues.push({ field: 'fat_total', code: 'macro_over_energy', message: `${f} g de lipides = ${9 * f} kcal > ${e} kcal` })
    if (theo != null && theo > 40) {
      const ratio = e / theo
      if (ratio > 3.2 && ratio < 5.2) {
        issues.push({ field: 'energy_kcal', code: 'energy_in_kj', message: `${e} ressemble à des kJ (théorique ${theo.toFixed(0)} kcal)` })
      } else if (e > 950 || ratio > 1.5 || ratio < 0.55) {
        issues.push({ field: 'energy_kcal', code: 'energy_mismatch', message: `${e} kcal pour ${theo.toFixed(0)} kcal théoriques` })
      }
    } else if (e > 950) {
      issues.push({ field: 'energy_kcal', code: 'out_of_range', message: `${e} kcal > 950` })
    }
  } else if (e === 0 && (p ?? 0) + (c ?? 0) + (f ?? 0) > 5) {
    issues.push({ field: 'energy_kcal', code: 'energy_zero', message: 'énergie 0 avec des macro-nutriments' })
  }
  if (fib != null && c != null && fib > c + 5 && !issues.some((i) => i.field === 'fiber')) {
    issues.push({ field: 'fiber', code: 'out_of_range', message: `fibres ${fib} g > glucides ${c} g` })
  }
  return issues
}

/**
 * Corrige ce qui peut l'être sans deviner (kJ → kcal), retire le reste.
 * Retourne les valeurs nettoyées et la liste des champs touchés.
 */
export function sanitizeNutrition(n: NutritionInput, name = ''): { values: NutritionInput; issues: NutritionIssue[]; changed: NutritionField[] } {
  const values: NutritionInput = { ...n }
  const issues = auditNutrition(n, name)
  const changed = new Set<NutritionField>()
  for (const issue of issues) {
    if (issue.code === 'energy_in_kj' && num(values.energy_kcal) != null) {
      values.energy_kcal = Math.round((values.energy_kcal as number) / 4.184)
      changed.add('energy_kcal')
      continue
    }
    if (issue.code === 'energy_mismatch') continue // signalé, mais on ne sait pas quel champ est faux
    if (num(values[issue.field]) != null) {
      values[issue.field] = null
      changed.add(issue.field)
    }
  }
  // Un sucre sans glucides ou des saturés sans lipides ne veulent plus rien dire
  if (changed.has('carbs_total') && num(values.sugars) != null) { values.sugars = null; changed.add('sugars') }
  if (changed.has('fat_total') && num(values.fat_saturated) != null) { values.fat_saturated = null; changed.add('fat_saturated') }
  return { values, issues, changed: [...changed] }
}
