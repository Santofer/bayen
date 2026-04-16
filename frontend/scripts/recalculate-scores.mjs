/**
 * Recalcule les scores Bayen de tous les produits dans Directus
 * + importe les images manquantes depuis Open Food Facts.
 *
 * Usage: node scripts/recalculate-scores.mjs
 *
 * Supporte les barèmes NutriScore spécifiques aux boissons (catégories 5 & 6).
 */

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'https://api.bayen.ma'
const ADMIN_TOKEN = process.env.DIRECTUS_TOKEN || ''

// Catégories boissons (5 = Boissons sucrées, 6 = Eaux & jus)
const BEVERAGE_CATEGORY_IDS = [5, 6]

// ── Scoring algorithm (miroir de scoring.ts) ──────────────────

// Seuils aliments solides
const ENERGY_THRESHOLDS = [80, 160, 240, 320, 400, 480, 560, 640, 720]
const SATURATED_FAT_THRESHOLDS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const SUGARS_THRESHOLDS = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40]
const SALT_THRESHOLDS = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4, 2.7]
const FIBER_THRESHOLDS = [0.9, 1.9, 2.8, 3.7, 4.7]
const PROTEIN_THRESHOLDS = [1.6, 3.2, 4.8, 6.4, 8.0]

// Seuils boissons (plus stricts)
const BEV_ENERGY_THRESHOLDS = [7, 14, 21, 29, 36, 43, 50, 57, 64]
const BEV_SUGARS_THRESHOLDS = [1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12, 13.5]

function computeNegativePoints(value, thresholds) {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return i
  }
  return thresholds.length
}

function computePositivePoints(value, thresholds) {
  for (let i = 0; i < thresholds.length; i++) {
    if (value <= thresholds[i]) return i
  }
  return thresholds.length
}

function isWater(nutrition) {
  return (nutrition.energy_kcal ?? 0) <= 1 &&
         (nutrition.sugars ?? 0) <= 0.5 &&
         (nutrition.fat_saturated ?? 0) <= 0.1
}

function computeNutriScore(nutrition, isBeverage) {
  if (
    nutrition.energy_kcal == null &&
    nutrition.fat_saturated == null &&
    nutrition.sugars == null &&
    nutrition.salt == null
  ) {
    return null
  }

  const energyPts = nutrition.energy_kcal != null
    ? computeNegativePoints(nutrition.energy_kcal, isBeverage ? BEV_ENERGY_THRESHOLDS : ENERGY_THRESHOLDS) : 0
  const satFatPts = nutrition.fat_saturated != null
    ? computeNegativePoints(nutrition.fat_saturated, SATURATED_FAT_THRESHOLDS) : 0
  const sugarsPts = nutrition.sugars != null
    ? computeNegativePoints(nutrition.sugars, isBeverage ? BEV_SUGARS_THRESHOLDS : SUGARS_THRESHOLDS) : 0
  const saltPts = nutrition.salt != null
    ? computeNegativePoints(nutrition.salt, SALT_THRESHOLDS) : 0

  const totalA = energyPts + satFatPts + sugarsPts + saltPts

  const fiberPts = nutrition.fiber != null ? computePositivePoints(nutrition.fiber, FIBER_THRESHOLDS) : 0
  const proteinPts = nutrition.proteins != null ? computePositivePoints(nutrition.proteins, PROTEIN_THRESHOLDS) : 0
  const fruitPts = nutrition.fruits_vegetables_nuts_points ?? 0
  const totalC = fiberPts + proteinPts + fruitPts

  let fsaScore
  if (isBeverage) {
    fsaScore = totalA - totalC
  } else if (totalA < 11) {
    fsaScore = totalA - totalC
  } else if (fruitPts < 5) {
    fsaScore = totalA - (fiberPts + fruitPts)
  } else {
    fsaScore = totalA - totalC
  }

  let grade, bayenPoints
  if (isBeverage) {
    if (isWater(nutrition)) { grade = 'A'; bayenPoints = 50 }
    else if (fsaScore <= 1) { grade = 'B'; bayenPoints = 40 }
    else if (fsaScore <= 5) { grade = 'C'; bayenPoints = 30 }
    else if (fsaScore <= 9) { grade = 'D'; bayenPoints = 15 }
    else { grade = 'E'; bayenPoints = 0 }
  } else {
    if (fsaScore <= -1) { grade = 'A'; bayenPoints = 50 }
    else if (fsaScore <= 2) { grade = 'B'; bayenPoints = 40 }
    else if (fsaScore <= 10) { grade = 'C'; bayenPoints = 30 }
    else if (fsaScore <= 18) { grade = 'D'; bayenPoints = 15 }
    else { grade = 'E'; bayenPoints = 0 }
  }

  return { fsaScore, grade, bayenPoints }
}

const NOVA_POINTS = { 1: 30, 2: 20, 3: 10, 4: 0 }
function computeNovaPoints(novaGroup) {
  if (novaGroup == null || !(novaGroup in NOVA_POINTS)) return 0
  return NOVA_POINTS[novaGroup]
}

const RISK_DEDUCTIONS = { safe: 0, limited: 2, avoid: 5, banned_ma: 10 }
function computeAdditivesScore(additives) {
  let totalDeduction = 0
  for (const a of additives) totalDeduction += RISK_DEDUCTIONS[a.risk_level] ?? 0
  return { points: Math.max(0, 20 - totalDeduction) }
}

function scoreToLabel(score) {
  if (score >= 75) return 'excellent'
  if (score >= 50) return 'bon'
  if (score >= 25) return 'médiocre'
  return 'mauvais'
}

function computeScore({ nutrition, novaGroup, additives, isBeverage }) {
  const nutriResult = computeNutriScore(nutrition, isBeverage)
  const nutriscoreGrade = nutriResult?.grade ?? 'E'
  const nutriscorePoints = nutriResult?.bayenPoints ?? 0
  const fsaScore = nutriResult?.fsaScore ?? null

  const novaPoints = computeNovaPoints(novaGroup)
  const additivesResult = computeAdditivesScore(additives)

  const total = nutriscorePoints + novaPoints + additivesResult.points
  const label = scoreToLabel(total)

  return { total, label, nutriscore_grade: nutriscoreGrade, nutriscore_points: nutriscorePoints,
    nova_points: novaPoints, additives_points: additivesResult.points, fsa_score: fsaScore }
}

// ── API helpers ──────────────────────────────────────────────────

async function fetchJSON(url, options = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (ADMIN_TOKEN) headers['Authorization'] = `Bearer ${ADMIN_TOKEN}`
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json()
}

async function patchProduct(id, data) {
  return fetchJSON(`${DIRECTUS_URL}/items/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

// ── Main ──────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📦 Récupération des produits depuis ${DIRECTUS_URL}...\n`)

  const productsRes = await fetchJSON(
    `${DIRECTUS_URL}/items/products?fields=id,name_fr,barcode,category_id,nutriscore_grade,nova_group,energy_kcal,fat_saturated,sugars,salt,fiber,proteins,ingredients_text,additives,scan_score,score_label&limit=-1`
  )
  const products = productsRes.data ?? []
  console.log(`📋 ${products.length} produits trouvés.`)

  const additivesRes = await fetchJSON(
    `${DIRECTUS_URL}/items/additives?fields=id,risk_level&limit=-1`
  )
  const additivesMap = {}
  for (const a of (additivesRes.data ?? [])) {
    additivesMap[a.id.toUpperCase()] = a.risk_level ?? 'limited'
  }
  console.log(`🧪 ${Object.keys(additivesMap).length} additifs chargés.\n`)

  let scoreUpdated = 0
  let errors = 0

  for (const product of products) {
    try {
      const isBeverage = BEVERAGE_CATEGORY_IDS.includes(product.category_id)

      // ── Score ──
      const nutrition = {
        energy_kcal: product.energy_kcal,
        fat_saturated: product.fat_saturated,
        sugars: product.sugars,
        salt: product.salt,
        fiber: product.fiber,
        proteins: product.proteins,
      }

      const productAdditives = []
      if (product.additives && Array.isArray(product.additives)) {
        for (const code of product.additives) {
          const upper = String(code).toUpperCase()
          productAdditives.push({ code: upper, risk_level: additivesMap[upper] ?? 'limited' })
        }
      }

      const novaGroup = product.nova_group ? Number(product.nova_group) : null
      const result = computeScore({ nutrition, novaGroup, additives: productAdditives, isBeverage })

      const patchData = {}
      const name = product.name_fr || product.barcode

      // Vérifier si score a changé
      if (product.scan_score !== result.total || product.score_label !== result.label ||
          (product.nutriscore_grade && product.nutriscore_grade.toUpperCase() !== result.nutriscore_grade)) {
        patchData.scan_score = result.total
        patchData.score_label = result.label
        patchData.nutriscore_grade = result.nutriscore_grade

        console.log(`🔄 ${name}${isBeverage ? ' 🥤' : ''}`)
        console.log(`   NS: ${product.nutriscore_grade || '?'} → ${result.nutriscore_grade} (${result.nutriscore_points} pts, FSA=${result.fsa_score})`)
        console.log(`   NOVA: ${novaGroup ?? '?'} → ${result.nova_points} pts | Additifs: ${productAdditives.length} → ${result.additives_points} pts`)
        console.log(`   Score: ${product.scan_score ?? 'null'} → ${result.total} (${result.label})`)
        scoreUpdated++
      }

      // Appliquer les modifications
      if (Object.keys(patchData).length > 0) {
        await patchProduct(product.id, patchData)
      }
    } catch (err) {
      console.error(`❌ ${product.name_fr || product.barcode}: ${err.message}`)
      errors++
    }
  }

  console.log(`\n═══════════════════════════════════════`)
  console.log(`🔄 ${scoreUpdated} score(s) mis à jour`)
  console.log(`❌ ${errors} erreur(s)`)
  console.log(`═══════════════════════════════════════\n`)
}

main().catch(err => {
  console.error('Erreur fatale:', err)
  process.exit(1)
})
