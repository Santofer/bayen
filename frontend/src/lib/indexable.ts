/**
 * Porte d'indexation des fiches produit — UNE seule règle, partagée par la fiche
 * (meta robots noindex) et par le sitemap (fiche retirée tant qu'elle est mince).
 * La fiche reste visible pour les utilisateurs ; elle revient d'elle-même dans
 * l'index et le sitemap dès que les données sont complètes.
 *
 * La règle lit les champs STOCKÉS dans Directus (pas le score recalculé à
 * l'affichage) : la fiche et le sitemap voient exactement les mêmes valeurs.
 */

/** Champs Directus nécessaires à la règle (à demander dans `fields=`) */
export const INDEXABLE_FIELDS = 'product_type,data_source,scan_score,nutriscore_grade,energy_kcal,sugars,salt,inci_text,cosmetic_risk'

export interface IndexableInput {
  product_type?: unknown
  data_source?: unknown
  scan_score?: unknown
  nutriscore_grade?: unknown
  energy_kcal?: unknown
  sugars?: unknown
  salt?: unknown
  inci_text?: unknown
  cosmetic_risk?: unknown
}

const isNum = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v)

/** true = la fiche peut être indexée et figurer dans le sitemap */
export function isIndexableProduct(p: IndexableInput): boolean {
  // Estimation IA : jamais indexée, même complète (chiffres non lus sur l'emballage)
  if (p.data_source === 'ai_estimate') return false

  if (p.product_type === 'cosmetic') {
    // Beauté : liste INCI présente ET score beauté calculé (ni « non noté » ni « données insuffisantes »)
    const risk = p.cosmetic_risk && typeof p.cosmetic_risk === 'object' ? p.cosmetic_risk as Record<string, unknown> : null
    return typeof p.inci_text === 'string' && p.inci_text.trim() !== ''
      && risk != null && isNum(risk.total) && !risk.unscored && !risk.insufficient
  }

  // Alimentaire : score Bayen, Nutri-Score et nutriments clés (énergie, sucres, sel)
  return isNum(p.scan_score)
    && typeof p.nutriscore_grade === 'string' && p.nutriscore_grade !== ''
    && isNum(p.energy_kcal) && isNum(p.sugars) && isNum(p.salt)
}

/** Première marque d'un champ « Marque A, Marque B » (celle des liens /marque/…) */
export function firstBrand(brand: unknown): string {
  return typeof brand === 'string' ? brand.split(',')[0].trim() : ''
}

/** Clé de regroupement d'une marque (insensible à la casse) */
export const brandKey = (brand: string): string => brand.toLocaleLowerCase('fr')

/**
 * Graphie canonique d'une marque : la plus fréquente parmi ses fiches
 * (« Jaouda » ×65 l'emporte sur « jaouda » ×12), égalité départagée par ordre alphabétique.
 * Utilisée par l'URL canonique de /marque/… et par le sitemap.
 */
export function canonicalBrand(spellings: string[]): string {
  const counts = new Map<string, number>()
  for (const s of spellings) if (s) counts.set(s, (counts.get(s) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? ''
}
