/**
 * Normalisation d'une liste INCI (cosmétiques).
 *
 * Le parsing d'Open Beauty Facts est inutilisable tel quel : sur des fiches
 * marocaines réelles, le texte marketing (« Crème hydratante et rafraîchissante
 * avec une texture légère… ») est découpé comme s'il s'agissait d'ingrédients.
 * Ce module ne garde que ce qui ressemble à un nom INCI : tokens courts, sans
 * verbe ni phrase, coupés sur les séparateurs d'étiquette.
 *
 * Copie identique côté extension : directus/extensions/bayen-api/src/inci.ts
 */

const PREFIX_RE = /^\s*(ingredients?|ingr[ée]dients?|inci|composition|المكونات|componentes|ingredienti)\s*[:：/-]?\s*/i
/** Mots qui trahissent une phrase marketing ou un mode d'emploi, pas un ingrédient. */
const MARKETING_RE = /\b(hydrat|nourri|pénètr|penetr|formul|texture|riche en|enrichi|protège|protege|apaise|lisse|repulp|éclat|eclat|convient|utilis|appliqu|peau|cheveux|skin|hair|helps|leaves|provides|gently|softly|avoid|keep|rinse|brush|apply|store|contact|children|enfants|eyes|yeux|utilice|antes|preferentemente|regular use|mode d'emploi|usage|conserver|fabriqu|made in|distribu|importé|imported)\w*/i
/** Coordonnées, codes de lot, adresses : jamais des ingrédients. */
const NOISE_RE = /(@|https?:|www\.|\b(fax|tel|tél|e-?mail|lot|batch|exp|pao)\b|\d{5,}|\d+\s?(ml|g|oz|fl)\b|^\d{1,2}\s?m$)/i

/** Découpe brute d'une liste INCI en tokens normalisés (majuscules). */
export function parseInci(text: string | null | undefined): string[] {
  if (!text) return []
  // Entités HTML héritées d'Open Beauty Facts (« &quot; », « &gt; »)
  let t = text.replace(/\r/g, '\n').replace(/&(quot|gt|lt|amp|#39|nbsp);?/gi, ' ')
  // Retirer les préfixes multilingues et les astérisques/mentions de bio
  t = t.replace(PREFIX_RE, '').replace(/[*±†‡]/g, '')
  // « INGREDIENTS/COCTAS: AQUA, … » : tout ce qui précède un deux-points en tête est un libellé
  t = t.replace(/^[^,;\n]{0,60}?:\s*/, '')
  // « INGREDIENTS: » peut réapparaître au milieu (étiquette multilingue) : c'est un séparateur
  t = t.replace(/\b(ingredients?|ingr[ée]dients?|inci|composition|componentes|ingredienti|المكونات)\s*[:：]/gi, ',')
  // Parenthèses (synonymes « (PARFUM) », concentrations) et crochets (codes de lot
  // « [BI 442] ») ne sont jamais des ingrédients
  t = t.replace(/\([^)]*\)/g, ' ').replace(/\[[^\]]*\]/g, ' ')
  // Parenthèse jamais refermée (lecture tronquée) : simple séparateur
  t = t.replace(/[()]/g, ',')
  // « 1,2-HEXANEDIOL », « 2,4-… » : la virgule entre deux chiffres fait partie du nom
  t = t.replace(/(\d),(\d)/g, '$1\u0001$2')

  const rawTokens = t.split(/[,;•\n]+/)
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of rawTokens) {
    let tok = raw.trim().replace(/\.$/, '').replace(/\s+/g, ' ')
    if (!tok) continue
    // « AQUA/WATER » garde ses deux formes : « PEG-6 CAPRYLIC/CAPRIC GLYCERIDES »
    // est UN ingrédient, l'appariement (cosmetic.ts) essaie chaque côté au besoin
    tok = tok.replace(/\u0001/g, ',').replace(/\s*\/\s*/g, '/').replace(/^[\s.:-]+|[\s.:-]+$/g, '')
    // Colour Index : « C1 77891 », « CI77891 », « Cl 42090 » → « CI 77891 »
    tok = tok.replace(/^C[Il1]\s*(\d{5})$/i, 'CI $1')
    const upper = tok.toUpperCase()
    if (upper.length < 2 || upper.length > 60) continue
    // (un Colour Index « CI 77891 » a cinq chiffres mais n'est pas du bruit)
    if (MARKETING_RE.test(tok) || (!/^CI \d{5}$/.test(upper) && NOISE_RE.test(tok))) continue
    if ((tok.match(/\s/g) ?? []).length > 6) continue // une phrase, pas un ingrédient
    if (!/[A-Z]/i.test(upper)) continue
    if (seen.has(upper)) continue
    seen.add(upper)
    out.push(upper)
  }
  return out.slice(0, 80)
}

/** Nom INCI canonique pour le matching (sans ponctuation superflue, espaces uniques). */
export function canonicalInci(name: string): string {
  return name.toUpperCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim()
}
