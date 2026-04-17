/**
 * Endpoint POST /custom/scan
 *
 * Orchestration complète Chemin A :
 * 1. Query Directus (barcode + status=published)
 * 2. Trouvé → scorer → incrémenter scan_count → log scan → retourner
 * 3. Non trouvé → fetch Open Food Facts
 * 4. Trouvé OFF → importer (data_source=off, status=published) → scorer → retourner
 * 5. Non trouvé nulle part → retourner { found: false }
 *
 * Référence : SPEC.md §8
 */

import type { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { computeScore, type RiskLevel, type ScoreResult } from './scoring.js'
import { notifyNewProduct } from './notify.js'

// User-Agent requis par l'API Open Food Facts
const OFF_USER_AGENT = process.env.OFF_USER_AGENT ?? 'Bayen/1.0 (contact@n0.ma)'
const OFF_API_URL = process.env.OFF_API_URL ?? 'https://world.openfoodfacts.org/api/v2'

// ────────────────────────────────────────────────────────────────
// Interfaces internes
// ────────────────────────────────────────────────────────────────

interface ScanRequest {
  barcode: string
  session_id: string
  user_id?: string
}

interface ProductRecord {
  id: string
  barcode: string
  name_fr: string
  name_ar?: string
  brand: string
  category_id?: number
  nutriscore_grade?: string
  nova_group?: number
  scan_score?: number
  score_label?: string
  energy_kcal?: number
  fat_total?: number
  fat_saturated?: number
  carbs_total?: number
  sugars?: number
  fiber?: number
  proteins?: number
  salt?: number
  ingredients_text?: string
  additives?: string[]
  allergens?: string[]
  is_organic?: boolean
  is_halal?: boolean
  origin_country?: string
  off_id?: string
  data_source: string
  status: string
  confidence_score?: number
  scan_count: number
  [key: string]: unknown
}

interface AdditiveRecord {
  id: string
  risk_level: RiskLevel
}

// ────────────────────────────────────────────────────────────────
// Mapping Open Food Facts → schéma Directus
// ────────────────────────────────────────────────────────────────

function mapOffProduct(offData: Record<string, unknown>, barcode: string): Record<string, unknown> {
  const product = offData.product as Record<string, unknown> | undefined
  if (!product) return {}

  // Extraction des additifs sous forme de codes E-xxx
  const additiveTags = (product.additives_tags as string[] | undefined) ?? []
  const additives = additiveTags
    .map((tag: string) => {
      // Format OFF : "en:e100" → "E100"
      const match = tag.match(/e(\d+[a-z]?)/i)
      return match ? `E${match[1]}`.toUpperCase() : null
    })
    .filter((code): code is string => code !== null)

  // Extraction des allergènes
  const allergenTags = (product.allergens_tags as string[] | undefined) ?? []
  const allergens = allergenTags.map((tag: string) => tag.replace(/^en:/, ''))

  // Grade Nutri-Score — colonne varchar(1), accepte uniquement A-E
  // OFF renvoie parfois "unknown", "not-applicable", etc. → on filtre
  const nutriscoreGrade = typeof product.nutriscore_grade === 'string'
    && /^[a-eA-E]$/.test(product.nutriscore_grade)
    ? product.nutriscore_grade.toUpperCase()
    : undefined

  // Groupe NOVA
  const novaRaw = product.nova_group
  const novaGroup = typeof novaRaw === 'number' && novaRaw >= 1 && novaRaw <= 4
    ? novaRaw
    : undefined

  // Nutriments (pour 100g)
  const nutriments = (product.nutriments as Record<string, unknown>) ?? {}
  const num = (key: string): number | undefined => {
    const val = nutriments[key]
    return typeof val === 'number' ? val : undefined
  }

  return {
    barcode,
    name_fr: (product.product_name_fr as string)
      || (product.product_name as string)
      || 'Produit sans nom',
    brand: (product.brands as string) ?? 'Marque inconnue',
    nutriscore_grade: nutriscoreGrade as ProductRecord['nutriscore_grade'],
    nova_group: novaGroup,
    energy_kcal: num('energy-kcal_100g'),
    fat_total: num('fat_100g'),
    fat_saturated: num('saturated-fat_100g'),
    carbs_total: num('carbohydrates_100g'),
    sugars: num('sugars_100g'),
    fiber: num('fiber_100g'),
    proteins: num('proteins_100g'),
    salt: num('salt_100g'),
    ingredients_text: (product.ingredients_text_fr as string)
      || (product.ingredients_text as string)
      || undefined,
    // additives/allergens écrits via Knex après createOne (ItemsService bug
    // sur les colonnes JSON in-process — voir post-create UPDATE plus bas)
    _additives_raw: additives,
    _allergens_raw: allergens,
    is_organic: typeof product.labels === 'string'
      ? product.labels.toLowerCase().includes('bio')
      : false,
    // OFF renvoie souvent une liste très longue ; on garde le 1er pays
    // pour ne pas dépasser varchar(100).
    origin_country: typeof product.countries === 'string'
      ? product.countries.split(',')[0]?.trim().slice(0, 100)
      : undefined,
    off_id: barcode,
    data_source: 'off',
    status: 'published',
    confidence_score: 0.7, // Données OFF non vérifiées localement
    scan_count: 1,
  }
}

// ────────────────────────────────────────────────────────────────
// Score helper — résoudre les risk_levels des additifs via la DB
// ────────────────────────────────────────────────────────────────

async function resolveAdditiveRisks(
  additiveCodes: string[],
  database: Record<string, (...args: unknown[]) => unknown>
): Promise<Array<{ code: string; risk_level: RiskLevel }>> {
  if (additiveCodes.length === 0) return []

  try {
    // Query la collection additives pour récupérer les risk_level
    const knex = database as unknown as {
      (table: string): {
        whereIn(col: string, vals: string[]): {
          select(col1: string, col2: string): Promise<AdditiveRecord[]>
        }
      }
    }
    const rows: AdditiveRecord[] = await knex('additives')
      .whereIn('id', additiveCodes)
      .select('id', 'risk_level')

    const riskMap = new Map(rows.map((r) => [r.id, r.risk_level]))

    return additiveCodes.map((code) => ({
      code,
      // Si l'additif n'est pas dans notre base, traiter comme "limited"
      risk_level: riskMap.get(code) ?? 'limited',
    }))
  } catch {
    // Fallback si la query échoue : tout traiter comme "limited"
    return additiveCodes.map((code) => ({
      code,
      risk_level: 'limited' as RiskLevel,
    }))
  }
}

// ────────────────────────────────────────────────────────────────
// Score un produit et retourne le ScoreResult
// ────────────────────────────────────────────────────────────────

async function scoreProduct(
  product: ProductRecord,
  database: Record<string, (...args: unknown[]) => unknown>
): Promise<ScoreResult> {
  const additiveRisks = await resolveAdditiveRisks(product.additives ?? [], database)

  return computeScore({
    nutrition: {
      energy_kcal: product.energy_kcal,
      fat_saturated: product.fat_saturated,
      sugars: product.sugars,
      salt: product.salt,
      fiber: product.fiber,
      proteins: product.proteins,
    },
    novaGroup: product.nova_group as 1 | 2 | 3 | 4 | null ?? null,
    ingredientsText: product.ingredients_text,
    additives: additiveRisks,
  })
}

// ────────────────────────────────────────────────────────────────
// Enregistrement du handler sur le router Express
// ────────────────────────────────────────────────────────────────

export function registerScanEndpoint(router: Router, context: {
  services: Record<string, unknown>
  database: Record<string, (...args: unknown[]) => unknown>
  getSchema: () => Promise<unknown>
}): void {
  router.post('/scan', async (req, res) => {
    try {
      const { barcode, session_id, user_id } = req.body as ScanRequest

      // Validation
      if (!barcode || !session_id) {
        res.status(400).json({
          error: 'barcode et session_id sont requis',
        })
        return
      }

      // Valider le format EAN (8 ou 13 chiffres)
      if (!/^\d{8}$|^\d{13}$/.test(barcode)) {
        res.status(400).json({
          error: 'Format code-barres invalide. EAN-8 ou EAN-13 attendu.',
        })
        return
      }

      const { database } = context
      const schema = await context.getSchema()
      const { ItemsService } = context.services as {
        ItemsService: new (collection: string, opts: { database: unknown; schema: unknown; accountability?: { admin: boolean } }) => {
          readByQuery(query: Record<string, unknown>): Promise<ProductRecord[]>
          createOne(data: Record<string, unknown>): Promise<string>
          updateOne(id: string, data: Record<string, unknown>): Promise<string>
        }
      }

      const serviceOpts = { database, schema, accountability: { admin: true } }
      const productsService = new ItemsService('products', serviceOpts)
      const scansService = new ItemsService('scans', serviceOpts)

      // ──────────────────────────────────────────
      // 1. Chercher dans Directus
      // ──────────────────────────────────────────
      const existing = await productsService.readByQuery({
        filter: { barcode: { _eq: barcode }, status: { _eq: 'published' } },
        limit: 1,
      })

      if (existing.length > 0) {
        const product = existing[0]
        const score = await scoreProduct(product, database as Record<string, (...args: unknown[]) => unknown>)

        // Incrémenter scan_count
        await productsService.updateOne(product.id, {
          scan_count: (product.scan_count ?? 0) + 1,
          scan_score: score.total,
          score_label: score.label,
          nutriscore_grade: score.nutriscore_grade,
        })

        // Log le scan
        await scansService.createOne({
          product_id: product.id,
          user_id: user_id ?? null,
          session_id,
        })

        res.json({
          found: true,
          source: 'database',
          product,
          score,
        })
        return
      }

      // ──────────────────────────────────────────
      // 2. Chercher sur Open Food Facts
      // ──────────────────────────────────────────
      let offProduct: Partial<ProductRecord> | null = null

      try {
        const offResponse = await fetch(
          `${OFF_API_URL}/product/${barcode}.json`,
          {
            headers: { 'User-Agent': OFF_USER_AGENT },
            signal: AbortSignal.timeout(5000),
          }
        )

        if (offResponse.ok) {
          const offData = await offResponse.json() as Record<string, unknown>
          if (offData.status === 1) {
            offProduct = mapOffProduct(offData, barcode)
          }
        }
      } catch {
        // Timeout ou erreur réseau OFF — on continue vers "non trouvé"
      }

      // ──────────────────────────────────────────
      // 3. Importer le produit OFF si trouvé
      //    INSERT direct via Knex (ItemsService a un cache de schéma obsolète
      //    qui rejette des valeurs valides — bug connu, contournement par
      //    bypass complet d'ItemsService pour la création produit OFF).
      // ──────────────────────────────────────────
      if (offProduct && offProduct.name_fr) {
        const knex = database as unknown as {
          (table: string): {
            insert(data: Record<string, unknown>, returning?: string | string[]): Promise<Array<{ id: string }>>
            where(col: string, val: string): {
              update(data: Record<string, unknown>): Promise<unknown>
              first(): Promise<Record<string, unknown> | undefined>
            }
          }
        }

        // Extraire les arrays pour stringification JSON séparée
        const rawAdditives = (offProduct as Record<string, unknown>)._additives_raw as string[] | undefined
        const rawAllergens = (offProduct as Record<string, unknown>)._allergens_raw as string[] | undefined
        const productPayload: Record<string, unknown> = { ...offProduct }
        delete productPayload._additives_raw
        delete productPayload._allergens_raw

        // UUID + timestamps que Directus aurait générés via ItemsService
        const newId = randomUUID()
        productPayload.id = newId
        productPayload.date_created = new Date()
        if (rawAdditives && rawAdditives.length > 0) productPayload.additives = JSON.stringify(rawAdditives)
        if (rawAllergens && rawAllergens.length > 0) productPayload.allergens = JSON.stringify(rawAllergens)

        await knex('products').insert(productPayload)

        // Re-lire pour scoring
        const imported = (await knex('products').where('id', newId).first()) as ProductRecord | undefined
        if (!imported) throw new Error('Failed to read imported product')

        // Parser les colonnes JSON re-lues (Postgres renvoie déjà des arrays via JSON parse natif)
        if (typeof imported.additives === 'string') imported.additives = JSON.parse(imported.additives) as string[]
        if (typeof imported.allergens === 'string') imported.allergens = JSON.parse(imported.allergens) as string[]

        const score = await scoreProduct(imported, database as Record<string, (...args: unknown[]) => unknown>)

        // Update score via Knex aussi
        await knex('products').where('id', newId).update({
          scan_score: score.total,
          score_label: score.label,
          nutriscore_grade: score.nutriscore_grade,
        })

        // Log le scan via ItemsService (déclenche les hooks bayen-hooks pour points utilisateur)
        await scansService.createOne({
          product_id: newId,
          user_id: user_id ?? null,
          session_id,
        })

        // Notification admin (in-app + webhook optionnel)
        await notifyNewProduct(context.database as Record<string, (...args: unknown[]) => unknown>, {
          id: newId,
          barcode,
          name_fr: imported.name_fr,
          brand: imported.brand,
          data_source: 'off',
        })

        res.json({
          found: true,
          source: 'open_food_facts',
          product: { ...imported, scan_score: score.total, score_label: score.label },
          score,
        })
        return
      }

      // ──────────────────────────────────────────
      // 4. Non trouvé nulle part
      // ──────────────────────────────────────────
      res.json({
        found: false,
        barcode,
        message: "Ce produit n'est pas encore dans notre base.",
        contribute_url: `/contribuer?barcode=${barcode}`,
      })
    } catch (err) {
      console.error('[bayen-api] /scan error:', err)
      res.status(500).json({
        error: 'Erreur interne lors du scan',
      })
    }
  })
}
