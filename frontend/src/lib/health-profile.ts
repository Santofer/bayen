/**
 * Profil santé Bayen — 100% client (localStorage), aucun compte requis.
 *
 * L'utilisateur déclare ce qu'il évite (allergènes, additifs, huile de palme) ;
 * la fiche produit affiche une alerte quand un produit scanné le contient.
 * C'est l'équivalent gratuit des « alertes personnalisées » que Yuka réserve à
 * sa version payante — et ça reste privé : rien ne quitte le navigateur.
 *
 * Pub/sub via CustomEvent + `storage` (même pattern que cart.ts).
 */

export interface HealthProfile {
  /** Clés canoniques d'allergènes (voir ALLERGENS) */
  allergens: string[]
  /** Codes E exacts à éviter (E621, E102…) */
  avoidAdditives: string[]
  avoidPalmOil: boolean
  /** Beauté (C23) : alerte si un cosmétique contient un PE suspecté/avéré */
  avoidEndocrine: boolean
  /** Beauté : alerte sur les 26 allergènes parfumants */
  avoidFragranceAllergens: boolean
}

const KEY = 'bayen_health_profile'
const EVT = 'bayen-profile-change'

export const EMPTY_PROFILE: HealthProfile = {
  allergens: [],
  avoidAdditives: [],
  avoidPalmOil: false,
  avoidEndocrine: false,
  avoidFragranceAllergens: false,
}

/** Les 14 allergènes à déclaration obligatoire (UE / ONSSA) + synonymes FR. */
export const ALLERGENS: Array<{ key: string; label: string; labelAr: string; synonyms: RegExp }> = [
  { key: 'gluten', label: 'Gluten', labelAr: 'الغلوتين', synonyms: /\b(gluten|bl[ée]|froment|orge|seigle|[ée]peautre|malt|semoule|farine de bl[ée])\b/i },
  { key: 'lait', label: 'Lait', labelAr: 'الحليب', synonyms: /\b(lait|lactos[ée]rum|lactose|cr[èe]me|beurre|fromage|caséinate|cas[ée]ine|petit-lait|yaourt|yoghourt)\b/i },
  { key: 'oeufs', label: 'Œufs', labelAr: 'البيض', synonyms: /\b(œufs?|oeufs?|ovoproduit|blanc d'œuf|jaune d'œuf|albumine)\b/i },
  { key: 'arachide', label: 'Arachide', labelAr: 'الفول السوداني', synonyms: /\b(arachides?|cacahu[èe]tes?|peanut)\b/i },
  { key: 'fruits_coque', label: 'Fruits à coque', labelAr: 'الفواكه الجافة', synonyms: /\b(noix|noisettes?|amandes?|pistaches?|cajou|p[ée]can|macadamia|fruits? [àa] coques?)\b/i },
  { key: 'soja', label: 'Soja', labelAr: 'الصويا', synonyms: /\b(soja|soya|l[ée]cithine de soja)\b/i },
  { key: 'poisson', label: 'Poisson', labelAr: 'الحوت', synonyms: /\b(poissons?|thon|sardines?|anchois|saumon|maquereau)\b/i },
  { key: 'crustaces', label: 'Crustacés', labelAr: 'القشريات', synonyms: /\b(crustac[ée]s?|crevettes?|crabes?|homard|langouste)\b/i },
  { key: 'mollusques', label: 'Mollusques', labelAr: 'الرخويات', synonyms: /\b(mollusques?|moules?|hu[îi]tres?|calmar|poulpe|seiche)\b/i },
  { key: 'sesame', label: 'Sésame', labelAr: 'الجلجلان', synonyms: /\b(s[ée]same|t[ae]hini|sesamum)\b/i },
  { key: 'moutarde', label: 'Moutarde', labelAr: 'الخردل', synonyms: /\b(moutarde|sinapis)\b/i },
  { key: 'celeri', label: 'Céleri', labelAr: 'الكرفس', synonyms: /\b(c[ée]leri)\b/i },
  { key: 'lupin', label: 'Lupin', labelAr: 'الترمس', synonyms: /\b(lupin)\b/i },
  { key: 'sulfites', label: 'Sulfites', labelAr: 'الكبريتيت', synonyms: /\b(sulfites?|anhydride sulfureux|E22[0-8])\b/i },
]

const PALM_OIL_RE = /\b(palme|palmiste|palm oil|huile de palme)\b/i

export function getProfile(): HealthProfile {
  if (typeof window === 'undefined') return EMPTY_PROFILE
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return EMPTY_PROFILE
    const p = JSON.parse(raw) as Partial<HealthProfile>
    return {
      allergens: Array.isArray(p.allergens) ? p.allergens : [],
      avoidAdditives: Array.isArray(p.avoidAdditives) ? p.avoidAdditives : [],
      avoidPalmOil: Boolean(p.avoidPalmOil),
      avoidEndocrine: Boolean(p.avoidEndocrine),
      avoidFragranceAllergens: Boolean(p.avoidFragranceAllergens),
    }
  } catch {
    return EMPTY_PROFILE
  }
}

export function saveProfile(profile: HealthProfile): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(profile))
  window.dispatchEvent(new CustomEvent(EVT))
}

export function isProfileEmpty(p: HealthProfile): boolean {
  return p.allergens.length === 0 && p.avoidAdditives.length === 0 && !p.avoidPalmOil
    && !p.avoidEndocrine && !p.avoidFragranceAllergens
}

export function onProfileChange(cb: () => void): () => void {
  const handler = (): void => cb()
  window.addEventListener(EVT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVT, handler)
    window.removeEventListener('storage', handler)
  }
}

// ────────────────────────────────────────────────────────────────
// Détection
// ────────────────────────────────────────────────────────────────

export interface ProductForCheck {
  additives?: string[] | null
  structured_ingredients?: Array<{
    name_fr?: string
    is_allergen?: boolean
    allergen_type?: string | null
  }> | null
  traces?: string[] | null
  ingredients_text?: string | null
}

export interface ProfileHit {
  type: 'allergen' | 'additive' | 'palm'
  label: string
  /** Libellé arabe (allergènes et huile de palme) — pour l'affichage en darija */
  labelAr?: string
  /** 'ingredient' = présent dans le produit · 'trace' = « peut contenir » */
  source: 'ingredient' | 'trace'
}

/**
 * Confronte un produit au profil. Retourne la liste des correspondances.
 * Les allergènes sont cherchés dans les ingrédients structurés (M2M, source la
 * plus fiable), puis en repli dans le texte brut ; les traces déclarées sont
 * signalées séparément (« peut contenir »).
 */
export function checkProduct(profile: HealthProfile, product: ProductForCheck): ProfileHit[] {
  if (isProfileEmpty(profile)) return []

  const hits: ProfileHit[] = []
  const seen = new Set<string>()
  const add = (hit: ProfileHit): void => {
    const k = `${hit.type}:${hit.label}:${hit.source}`
    if (!seen.has(k)) {
      seen.add(k)
      hits.push(hit)
    }
  }

  const ingredientNames = (product.structured_ingredients ?? [])
    .map((i) => i?.name_fr ?? '')
    .filter(Boolean)
    .join(' | ')
  const haystack = `${ingredientNames} ${product.ingredients_text ?? ''}`
  const tracesText = (product.traces ?? []).join(' | ')

  // Allergènes
  for (const key of profile.allergens) {
    const def = ALLERGENS.find((a) => a.key === key)
    if (!def) continue
    if (def.synonyms.test(haystack)) {
      add({ type: 'allergen', label: def.label, labelAr: def.labelAr, source: 'ingredient' })
    } else if (def.synonyms.test(tracesText)) {
      add({ type: 'allergen', label: def.label, labelAr: def.labelAr, source: 'trace' })
    }
  }

  // Additifs (comparaison stricte sur le code, insensible à la casse)
  const productAdditives = (product.additives ?? []).map((a) => String(a).toUpperCase())
  for (const code of profile.avoidAdditives) {
    if (productAdditives.includes(code.toUpperCase())) {
      add({ type: 'additive', label: code.toUpperCase(), source: 'ingredient' })
    }
  }

  // Huile de palme
  if (profile.avoidPalmOil && PALM_OIL_RE.test(haystack)) {
    add({ type: 'palm', label: 'Huile de palme', labelAr: 'زيت النخيل', source: 'ingredient' })
  }

  return hits
}
