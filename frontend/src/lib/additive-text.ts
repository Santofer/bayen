/**
 * Textes des additifs (table Directus `additives`) tels qu'affichés sur /additifs et /additifs/[id].
 *
 * « Interdit au Maroc » : aucune source officielle marocaine n'a été trouvée (audit SEO du 18/10/2026).
 * La phrase est masquée à l'affichage sans toucher la base ; seule l'interdiction dans l'UE (règlement
 * 2022/63) reste. Ligne concernée en base : E171 (description_fr, description_ar, source « ONSSA »).
 * À corriger dans Directus, puis supprimer ce filtre.
 */

const MOROCCO_CLAIM = /\s*(Interdit au Maroc\.|ممنوع في المغرب\.)/g
const HIDDEN_SOURCES = new Set(['ONSSA'])

/** Liens des sources connues ; clé « code:libellé » quand le libellé seul est ambigu (« EFSA 2021 ») */
const SOURCE_URLS: Record<string, string> = {
  'E171:EFSA 2021': 'https://doi.org/10.2903/j.efsa.2021.6585',
  'Règlement UE 2022/63': 'https://eur-lex.europa.eu/eli/reg/2022/63/oj',
  'Southampton Study 2007': 'https://pubmed.ncbi.nlm.nih.gov/17825405/',
  'Nature 2015': 'https://doi.org/10.1038/nature14232',
  'CIRC 2023': 'https://www.iarc.who.int/news-events/aspartame-hazard-and-risk-assessment-results-released/',
  'OMS 2023': 'https://www.who.int/publications/i/item/9789240073616',
}

/** Description affichée, sans l'allégation marocaine non sourcée */
export function additiveDescription(text: string | null | undefined): string | null {
  const clean = (text ?? '').replace(MOROCCO_CLAIM, '').trim()
  return clean || null
}

/** Sources affichées, avec leur lien quand il est connu */
export function additiveSources(id: string, sources: unknown): Array<{ label: string; url: string | null }> {
  if (!Array.isArray(sources)) return []
  return sources
    .filter((s): s is string => typeof s === 'string' && !HIDDEN_SOURCES.has(s))
    .map((label) => ({ label, url: SOURCE_URLS[`${id}:${label}`] ?? SOURCE_URLS[label] ?? null }))
}
