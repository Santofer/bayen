/**
 * Client Open Food Facts API
 *
 * Utilisé côté frontend uniquement pour l'affichage préliminaire
 * (ex: pré-remplissage du formulaire de contribution).
 * L'import officiel passe par l'endpoint /bayen-api/scan côté serveur.
 */

const OFF_API_URL = 'https://world.openfoodfacts.org/api/v2'
const USER_AGENT = 'Bayen/1.0 (contact@n0.ma)'

export { OFF_API_URL }

// ────────────────────────────────────────────────────────────────
// Types Open Food Facts
// ────────────────────────────────────────────────────────────────

export interface OffProduct {
  code: string
  product_name: string
  product_name_fr?: string
  brands?: string
  categories_tags?: string[]
  nutriscore_grade?: string
  nova_group?: number
  nutriments?: {
    'energy-kcal_100g'?: number
    'fat_100g'?: number
    'saturated-fat_100g'?: number
    'carbohydrates_100g'?: number
    'sugars_100g'?: number
    'fiber_100g'?: number
    'proteins_100g'?: number
    'salt_100g'?: number
  }
  ingredients_text?: string
  ingredients_text_fr?: string
  additives_tags?: string[]
  allergens_tags?: string[]
  labels?: string
  countries?: string
  image_front_url?: string
  image_nutrition_url?: string
  image_ingredients_url?: string
}

interface OffApiResponse {
  status: number
  product?: OffProduct
}

// ────────────────────────────────────────────────────────────────
// Fonctions
// ────────────────────────────────────────────────────────────────

/** Récupère un produit depuis l'API Open Food Facts par code-barres */
export async function fetchOffProduct(barcode: string): Promise<OffProduct | null> {
  try {
    const response = await fetch(`${OFF_API_URL}/product/${barcode}.json`, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return null

    const data = await response.json() as OffApiResponse

    if (data.status !== 1 || !data.product) return null

    return data.product
  } catch {
    return null
  }
}

/** Extrait les codes additifs (E-xxx) depuis les tags OFF */
export function extractAdditiveCodes(additiveTags: string[]): string[] {
  return additiveTags
    .map((tag) => {
      const match = tag.match(/e(\d+[a-z]?)/i)
      return match ? `E${match[1]}`.toUpperCase() : null
    })
    .filter((code): code is string => code !== null)
}

/** Extrait les allergènes depuis les tags OFF */
export function extractAllergens(allergenTags: string[]): string[] {
  return allergenTags.map((tag) => tag.replace(/^en:/, ''))
}
