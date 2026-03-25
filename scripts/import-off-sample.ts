/**
 * Import d'un échantillon de produits marocains depuis Open Food Facts
 *
 * Usage :
 *   DIRECTUS_URL=http://localhost:8056 DIRECTUS_ADMIN_TOKEN=xxx npx tsx scripts/import-off-sample.ts
 *
 * Importe des produits populaires marocains via l'API OFF,
 * les mappe vers le schéma Directus et calcule le score Bayen.
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://localhost:8056'
const DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN

if (!DIRECTUS_ADMIN_TOKEN) {
  console.error('DIRECTUS_ADMIN_TOKEN requis.')
  process.exit(1)
}

// Utiliser l'API v0 (plus permissive et mieux documentée par code-barres)
const OFF_API = 'https://world.openfoodfacts.net/api/v0'
const USER_AGENT = 'Bayen/1.0 (contact@n0.ma)'

// ────────────────────────────────────────────────────────────
// Codes-barres de produits marocains populaires
// ────────────────────────────────────────────────────────────

const MOROCCAN_BARCODES = [
  // Bimo
  '6111080016394', // Bimo Choco Prince
  '6111080016400', // Bimo
  '6111080000225', // Bimo Tango
  '6111080000232', // Bimo Best of
  '6111080000218', // Bimo
  // Centrale Laitière
  '6111245001009', // Danone Activia
  '6111245200049', // Centrale Laitière Assiri
  '6111245100097', // Danone Nature
  '6111245300022', // Yawmy
  // Lesieur Cristal
  '6111001001019', // Huile Lesieur
  '6111001000012', // Huile de table
  // Boissons
  '6111246001008', // Coca-Cola Maroc
  '5449000000996', // Coca-Cola
  '5449000131805', // Fanta Orange
  '5000112602791', // Coca-Cola Zero
  '5449000000439', // Sprite
  '5449000131812', // Fanta
  // Produits laitiers
  '6111249001016', // Fromage Kiri
  '3073781069457', // Kiri
  '3073780980746', // Vache qui rit
  '7622300441937', // Milka
  // Céréales
  '3033710065967', // Corn Flakes
  '3033710074549', // Special K
  '5053827174404', // Kelloggs
  // Conserves
  '6111003001016', // Sardines Maroc
  '3380390027502', // Sardines
  // Confiserie
  '6111050001003', // Confiserie Maroc
  '7622210449283', // Oreo
  '7622300710927', // Milka Oreo
  '3017620422003', // Nutella
  '7622210449276', // Oreo
  // Eau
  '6111131001009', // Sidi Ali
  '6111131001016', // Sidi Harazem
  '6111131002006', // Ain Saiss
  '6111131001023', // Oulmès
  // Snacks
  '6111130001000', // Chips Maroc
  '3168930010265', // Pringles
  '5000159484428', // Pringles Original
  '8410199010247', // Lay's
  // Pâtes & riz
  '6111003005014', // Pâtes Maroc
  '8076809513753', // Barilla Spaghetti
  '8076809575850', // Barilla Penne
  // Jus
  '6111240001003', // Valencia Jus
  '6111240001010', // Miami Jus
  '3124480186706', // Tropicana
  '5449000011527', // Minute Maid
  // Chocolat
  '7613034626844', // Nescafé
  '7613036271868', // Kit Kat
  '5000159461122', // Mars
  '5000159459228', // Snickers
  '40084015',      // M&M's
  // Boulangerie
  '3228857000166', // Pain de mie Harry's
  // Condiments
  '87157277',      // Heinz Ketchup
  '3608580744856', // Moutarde
]

// ────────────────────────────────────────────────────────────
// Fonctions utilitaires
// ────────────────────────────────────────────────────────────

interface OffProduct {
  product_name?: string
  product_name_fr?: string
  brands?: string
  nutriscore_grade?: string
  nova_group?: number
  nutriments?: Record<string, number>
  ingredients_text?: string
  ingredients_text_fr?: string
  additives_tags?: string[]
  allergens_tags?: string[]
  labels?: string
  countries?: string
  image_front_url?: string
}

function extractAdditiveCodes(tags: string[]): string[] {
  const seen = new Set<string>()
  return tags
    .map((tag) => {
      // Format OFF : "en:e150d", "en:e322i" — extraire le code de base (E322, E150d)
      const match = tag.match(/e(\d+[a-z]?)/i)
      if (!match) return null
      const code = `E${match[1]}`.toUpperCase()
      // Dédupliquer (E322 et E322I → un seul E322)
      const base = code.replace(/[A-Z]$/, '')
      if (seen.has(base)) return null
      seen.add(base)
      return base
    })
    .filter((c): c is string => c !== null)
}

function mapToDirectus(offProduct: OffProduct, barcode: string) {
  const n = offProduct.nutriments ?? {}

  return {
    barcode,
    name_fr: (offProduct.product_name_fr || offProduct.product_name || 'Produit sans nom').slice(0, 255),
    brand: (offProduct.brands || 'Marque inconnue').slice(0, 255),
    nutriscore_grade: offProduct.nutriscore_grade?.toUpperCase() || null,
    nova_group: offProduct.nova_group && offProduct.nova_group >= 1 && offProduct.nova_group <= 4
      ? offProduct.nova_group : null,
    energy_kcal: n['energy-kcal_100g'] ?? null,
    fat_total: n['fat_100g'] ?? null,
    fat_saturated: n['saturated-fat_100g'] ?? null,
    carbs_total: n['carbohydrates_100g'] ?? null,
    sugars: n['sugars_100g'] ?? null,
    fiber: n['fiber_100g'] ?? null,
    proteins: n['proteins_100g'] ?? null,
    salt: n['salt_100g'] ?? null,
    ingredients_text: offProduct.ingredients_text_fr || offProduct.ingredients_text || null,
    additives: extractAdditiveCodes(offProduct.additives_tags ?? []),
    allergens: (offProduct.allergens_tags ?? []).map((t) => t.replace(/^en:/, '')),
    is_organic: (offProduct.labels ?? '').toLowerCase().includes('bio'),
    is_halal: false,
    origin_country: (offProduct.countries ?? '').slice(0, 100) || null,
    off_id: barcode,
    data_source: 'off',
    status: 'published',
    confidence_score: 0.7,
    scan_count: 0,
  }
}

// ────────────────────────────────────────────────────────────
// Import
// ────────────────────────────────────────────────────────────

async function importProducts() {
  console.log(`Import de ${MOROCCAN_BARCODES.length} produits marocains depuis Open Food Facts...\n`)

  let imported = 0
  let skipped = 0
  let notFound = 0
  let errors = 0

  for (const barcode of MOROCCAN_BARCODES) {
    // Vérifier si déjà en base
    try {
      const checkRes = await fetch(
        `${DIRECTUS_URL}/items/products?filter[barcode][_eq]=${barcode}&limit=1`,
        { headers: { Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}` } }
      )
      if (checkRes.ok) {
        const checkData = await checkRes.json()
        if (checkData.data?.length > 0) {
          console.log(`  ⏭️  ${barcode} — déjà en base`)
          skipped++
          continue
        }
      }
    } catch { /* continue */ }

    // Fetch depuis OFF
    try {
      const offRes = await fetch(
        `${OFF_API}/product/${barcode}.json`,
        {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(10000),
        }
      )

      if (offRes.status === 429) {
        console.log(`  ⏳ ${barcode} — rate limited, attente 5s...`)
        await new Promise((r) => setTimeout(r, 5000))
        // Retry une fois
        const retry = await fetch(`${OFF_API}/product/${barcode}.json`, {
          headers: { 'User-Agent': USER_AGENT },
          signal: AbortSignal.timeout(10000),
        })
        if (!retry.ok) {
          console.log(`  ❌ ${barcode} — retry échoué ${retry.status}`)
          errors++
          continue
        }
        const retryData = await retry.json()
        if (retryData.status !== 1 || !retryData.product) {
          console.log(`  🔍 ${barcode} — non trouvé sur OFF`)
          notFound++
          continue
        }
        // Continuer avec retryData
        var offProduct = retryData.product as OffProduct
      } else if (!offRes.ok) {
        console.log(`  ❌ ${barcode} — erreur OFF ${offRes.status}`)
        notFound++
        continue
      } else {
        const offData = await offRes.json()
        if (offData.status !== 1 || !offData.product) {
          console.log(`  🔍 ${barcode} — non trouvé sur OFF`)
          notFound++
          continue
        }
        var offProduct = offData.product as OffProduct
      }

      const product = mapToDirectus(offProduct, barcode)

      // Sauvegarder additives/allergens pour le PATCH
      const productAdditives = product.additives
      const productAllergens = product.allergens

      // Préparer le payload — omettre additives/allergens dans le CREATE, les ajouter via PATCH ensuite
      const { additives: _a, allergens: _al, ...productPayload } = product as Record<string, unknown>

      const createRes = await fetch(`${DIRECTUS_URL}/items/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
        },
        body: JSON.stringify(productPayload),
      })

      if (createRes.ok) {
        const created = await createRes.json() as { data: { id: string } }
        const productId = created.data.id

        // PATCH additives/allergens séparément (contournement bug validation Directus 11)
        if (productAdditives.length > 0 || productAllergens.length > 0) {
          await fetch(`${DIRECTUS_URL}/items/products/${productId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
            },
            body: JSON.stringify({
              additives: productAdditives.length > 0 ? productAdditives : null,
              allergens: productAllergens.length > 0 ? productAllergens : null,
            }),
          })
        }

        const grade = product.nutriscore_grade ?? '?'
        const nova = product.nova_group ?? '?'
        console.log(`  ✅ ${barcode} — ${product.name_fr} (${product.brand}) [Nutri:${grade} NOVA:${nova}]`)
        imported++
      } else {
        const err = await createRes.text()
        console.log(`  ❌ ${barcode} — erreur Directus: ${err.slice(0, 100)}`)
        // Debug: afficher le payload envoyé
        const debugPayload = JSON.stringify(productPayload)
        console.log(`     additives: ${JSON.stringify(productPayload.additives)} allergens: ${JSON.stringify(productPayload.allergens)}`)
        console.log(`     body length: ${debugPayload.length} ingredients length: ${(productPayload.ingredients_text ?? '').length}`)
        errors++
      }
    } catch (e) {
      console.log(`  ❌ ${barcode} — erreur réseau: ${(e as Error).message}`)
      errors++
    }

    // Pause longue pour respecter le rate limit OFF (2 req/s max)
    await new Promise((r) => setTimeout(r, 1500))
  }

  console.log(`\n═══ Résultat ═══`)
  console.log(`  ✅ Importés  : ${imported}`)
  console.log(`  ⏭️  Existants : ${skipped}`)
  console.log(`  🔍 Non trouvés: ${notFound}`)
  console.log(`  ❌ Erreurs   : ${errors}`)
  console.log(`  📦 Total     : ${MOROCCAN_BARCODES.length}`)
}

importProducts().catch(console.error)
