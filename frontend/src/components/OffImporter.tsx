/**
 * Composant d'import de produits depuis Open Food Facts
 * Saisie de code-barres → preview OFF → import dans Directus
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getAccessToken } from '@/lib/auth'
import { computeScore, type RiskLevel } from '@/lib/scoring'

const DIRECTUS_URL = '/api/directus'

/** Ingrédient structuré provenant d'OFF */
interface OffStructuredIngredient {
  id: string
  text: string
  percent?: number
  percent_estimate?: number
}

/** Traduction des traces OFF → français */
const TRACES_FR: Record<string, string> = {
  'nuts': 'fruits à coque',
  'milk': 'lait',
  'eggs': 'œufs',
  'gluten': 'gluten',
  'soybeans': 'soja',
  'peanuts': 'arachide',
  'sesame-seeds': 'sésame',
  'fish': 'poisson',
  'crustaceans': 'crustacés',
  'celery': 'céleri',
  'mustard': 'moutarde',
  'lupin': 'lupin',
}

/** Nettoie les traces_tags OFF et traduit en français */
function cleanTraces(tracesTags: string[]): string[] {
  return tracesTags.map(tag => {
    const key = tag.replace(/^en:/, '')
    return TRACES_FR[key] ?? key
  })
}

interface OffProduct {
  barcode: string
  name: string
  brand: string
  categoryId: number | null
  nutriscore: string | null
  nova: number | null
  image: string | null
  energy: number | null
  fat: number | null
  saturated: number | null
  carbs: number | null
  sugars: number | null
  fiber: number | null
  proteins: number | null
  salt: number | null
  ingredients: string
  additives: string[]
  structuredIngredients: OffStructuredIngredient[]
  traces: string[]
  imageNutrition: string | null
  imageIngredients: string | null
  raw: Record<string, unknown>
}

type ImportState = 'idle' | 'searching' | 'preview' | 'importing' | 'done' | 'error' | 'exists'

export default function OffImporter() {
  const [barcode, setBarcode] = useState('')
  const [barcodeList, setBarcodeList] = useState('')
  const [mode, setMode] = useState<'single' | 'batch'>('single')
  const [state, setState] = useState<ImportState>('idle')
  const [product, setProduct] = useState<OffProduct | null>(null)
  const [error, setError] = useState('')
  const [batchResults, setBatchResults] = useState<Array<{ barcode: string; status: string; name?: string }>>([])
  const [batchProgress, setBatchProgress] = useState(0)

  // Rechercher sur OFF
  async function searchOff(code: string): Promise<OffProduct | null> {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}`, {
      headers: { 'User-Agent': 'Bayen/1.0 (contact@n0.ma)' },
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data.status !== 1 || !data.product) return null

    const p = data.product
    const additiveTags: string[] = p.additives_tags ?? []
    const additives = additiveTags
      .map((t: string) => { const m = t.match(/e(\d+[a-z]?)/i); return m ? `E${m[1].toUpperCase()}` : null })
      .filter(Boolean) as string[]

    // Mapper la catégorie OFF vers nos catégories Bayen
    const offCategories: string[] = (p.categories_tags ?? []).map((c: string) => c.toLowerCase())
    let categoryId: number | null = null
    const categoryMap: Array<[string[], number]> = [
      [['biscuit', 'cookie', 'gateau', 'cake'], 1],
      [['cereal', 'breakfast', 'petit-dejeuner'], 2],
      [['dairy', 'laitier', 'fromage', 'yaourt', 'yogurt', 'milk', 'lait'], 3],
      [['meat', 'viande', 'charcuterie', 'saucisse'], 4],
      [['soda', 'soft-drink', 'boisson-sucree', 'cola', 'juice'], 5],
      [['water', 'eau', 'jus'], 6],
      [['conserve', 'canned'], 7],
      [['spice', 'condiment', 'sauce', 'epice'], 8],
      [['oil', 'huile', 'graisse', 'fat'], 9],
      [['snack', 'chip', 'crisp', 'apero'], 10],
      [['bread', 'pain', 'viennoiserie', 'boulangerie'], 11],
      [['meal', 'plat-prepare', 'ready-meal'], 12],
    ]
    for (const [keywords, catId] of categoryMap) {
      if (offCategories.some(c => keywords.some(k => c.includes(k)))) {
        categoryId = catId
        break
      }
    }

    return {
      barcode: code,
      name: p.product_name_fr || p.product_name || 'Inconnu',
      brand: (p.brands || 'Inconnu').split(',')[0].trim(),
      categoryId,
      nutriscore: p.nutriscore_grade?.toUpperCase() ?? null,
      nova: p.nova_group ?? null,
      image: p.image_front_url ?? null,
      imageNutrition: p.image_nutrition_url ?? null,
      imageIngredients: p.image_ingredients_url ?? null,
      energy: p.nutriments?.['energy-kcal_100g'] ?? null,
      fat: p.nutriments?.fat_100g ?? null,
      saturated: p.nutriments?.['saturated-fat_100g'] ?? null,
      carbs: p.nutriments?.carbohydrates_100g ?? null,
      sugars: p.nutriments?.sugars_100g ?? null,
      fiber: p.nutriments?.fiber_100g ?? null,
      proteins: p.nutriments?.proteins_100g ?? null,
      salt: p.nutriments?.salt_100g ?? null,
      ingredients: p.ingredients_text_fr || p.ingredients_text || '',
      additives,
      structuredIngredients: (p.ingredients ?? []).map((ing: Record<string, unknown>) => ({
        id: ing.id as string,
        text: ing.text as string,
        percent: ing.percent as number | undefined,
        percent_estimate: ing.percent_estimate as number | undefined,
      })),
      traces: cleanTraces(p.traces_tags ?? []),
      raw: p,
    }
  }

  // Vérifier si le produit existe déjà dans Directus
  async function checkExists(code: string): Promise<boolean> {
    const res = await fetch(`${DIRECTUS_URL}/items/products?filter[barcode][_eq]=${code}&fields=id&limit=1`)
    if (!res.ok) return false
    const data = await res.json()
    return (data.data?.length ?? 0) > 0
  }

  // Importer un produit OFF dans Directus
  async function importProduct(offProduct: OffProduct): Promise<boolean> {
    const token = await getAccessToken()
    if (!token) throw new Error('Non connecté')

    // Calculer le score
    const additiveRisks = offProduct.additives.map(code => ({ code, risk_level: 'limited' as RiskLevel }))
    const scoreResult = computeScore({
      nutrition: {
        energy_kcal: offProduct.energy,
        fat_saturated: offProduct.saturated,
        sugars: offProduct.sugars,
        salt: offProduct.salt,
        fiber: offProduct.fiber,
        proteins: offProduct.proteins,
      },
      novaGroup: offProduct.nova as 1 | 2 | 3 | 4 | null,
      ingredientsText: offProduct.ingredients,
      additives: additiveRisks,
    })

    const productData: Record<string, unknown> = {
      barcode: offProduct.barcode,
      name_fr: offProduct.name,
      brand: offProduct.brand,
      category_id: offProduct.categoryId,
      nutriscore_grade: scoreResult.nutriscore_grade,
      nova_group: scoreResult.nova_group,
      scan_score: scoreResult.total,
      score_label: scoreResult.label,
      energy_kcal: offProduct.energy,
      fat_total: offProduct.fat,
      fat_saturated: offProduct.saturated,
      carbs_total: offProduct.carbs,
      sugars: offProduct.sugars,
      fiber: offProduct.fiber,
      proteins: offProduct.proteins,
      salt: offProduct.salt,
      ingredients_text: offProduct.ingredients,
      additives: offProduct.additives,
      traces: offProduct.traces,
      off_id: offProduct.barcode,
      data_source: 'off',
      status: 'published',
      confidence_score: scoreResult.incomplete ? 0.5 : 0.8,
    }

    // Créer le produit (sans image_front — c'est un champ relation UUID)
    const res = await fetch(`${DIRECTUS_URL}/items/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(productData),
    })

    if (!res.ok) return false

    const createdProduct = await res.json() as { data?: { id: string } }
    const productId = createdProduct?.data?.id

    // Uploader les images OFF (front, nutrition, ingrédients)
    if (productId) {
      try {
        const imageUpdates: Record<string, string> = {}

        const imagesToUpload: Array<[string, string | null, string]> = [
          ['image_front', offProduct.image, 'front'],
          ['image_nutrition', offProduct.imageNutrition, 'nutrition'],
          ['image_ingredients', offProduct.imageIngredients, 'ingredients'],
        ]

        for (const [field, url, label] of imagesToUpload) {
          if (!url) continue
          try {
            const imgRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`)
            if (!imgRes.ok) continue
            const blob = await imgRes.blob()
            const formData = new FormData()
            formData.append('file', blob, `${offProduct.barcode}-${label}.jpg`)
            formData.append('title', `${offProduct.name} - ${label}`)

            const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            })
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json() as { data?: { id: string } }
              if (uploadData?.data?.id) imageUpdates[field] = uploadData.data.id
            }
          } catch { /* image individuelle optionnelle */ }
        }

        // PATCH le produit avec toutes les images uploadées
        if (Object.keys(imageUpdates).length > 0) {
          await fetch(`${DIRECTUS_URL}/items/products/${productId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(imageUpdates),
          })
        }
      } catch {
        // Images optionnelles
      }

      // Créer les liens M2M ingrédients structurés
      try {
        if (offProduct.structuredIngredients.length > 0) {
          for (let i = 0; i < offProduct.structuredIngredients.length; i++) {
            const ing = offProduct.structuredIngredients[i]
            const nameFr = ing.text?.trim()
            if (!nameFr) continue

            let ingredientId: string | null = null

            // Chercher l'ingrédient existant dans notre base
            try {
              const searchRes = await fetch(
                `${DIRECTUS_URL}/items/ingredients?filter[name_fr][_icontains]=${encodeURIComponent(nameFr)}&limit=1`,
                { headers: { Authorization: `Bearer ${token}` } },
              )
              if (searchRes.ok) {
                const searchData = await searchRes.json() as { data?: Array<{ id: string }> }
                if (searchData?.data?.[0]?.id) ingredientId = searchData.data[0].id
              }
            } catch { /* recherche optionnelle */ }

            // Créer l'ingrédient s'il n'existe pas
            if (!ingredientId) {
              try {
                const createRes = await fetch(`${DIRECTUS_URL}/items/ingredients`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ name_fr: nameFr, category: 'autre', icon: '🔹' }),
                })
                if (createRes.ok) {
                  const createData = await createRes.json() as { data?: { id: string } }
                  if (createData?.data?.id) ingredientId = createData.data.id
                }
              } catch { /* création optionnelle */ }
            }

            // Créer le lien M2M
            if (ingredientId) {
              try {
                await fetch(`${DIRECTUS_URL}/items/products_ingredients`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({
                    products_id: productId,
                    ingredients_id: ingredientId,
                    percent: ing.percent ?? ing.percent_estimate ?? null,
                    rank: i + 1,
                  }),
                })
              } catch { /* lien M2M optionnel */ }
            }
          }
        }
      } catch {
        // Ingrédients structurés optionnels
      }
    }

    return true
  }

  // Recherche single
  async function handleSearch() {
    const code = barcode.trim()
    if (!/^\d{8,13}$/.test(code)) { setError('Code-barres invalide (8 ou 13 chiffres)'); return }

    setState('searching')
    setError('')
    setProduct(null)

    try {
      const exists = await checkExists(code)
      if (exists) { setState('exists'); return }

      const offProduct = await searchOff(code)
      if (!offProduct) { setError('Produit non trouvé sur Open Food Facts'); setState('error'); return }

      setProduct(offProduct)
      setState('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
      setState('error')
    }
  }

  // Import single
  async function handleImport() {
    if (!product) return
    setState('importing')
    try {
      const ok = await importProduct(product)
      if (ok) setState('done')
      else { setError("Erreur lors de l'import"); setState('error') }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setState('error')
    }
  }

  // Import batch
  async function handleBatchImport() {
    const codes = barcodeList.split(/[\n,;\s]+/).map(c => c.trim()).filter(c => /^\d{8,13}$/.test(c))
    if (codes.length === 0) { setError('Aucun code-barres valide'); return }

    setState('importing')
    setBatchResults([])
    setBatchProgress(0)

    const results: Array<{ barcode: string; status: string; name?: string }> = []
    for (let i = 0; i < codes.length; i++) {
      const code = codes[i]
      try {
        const exists = await checkExists(code)
        if (exists) {
          results.push({ barcode: code, status: 'exists' })
        } else {
          const offProduct = await searchOff(code)
          if (offProduct) {
            const ok = await importProduct(offProduct)
            results.push({ barcode: code, status: ok ? 'imported' : 'error', name: offProduct.name })
          } else {
            results.push({ barcode: code, status: 'not_found' })
          }
        }
      } catch {
        results.push({ barcode: code, status: 'error' })
      }
      setBatchProgress(Math.round(((i + 1) / codes.length) * 100))
      setBatchResults([...results])
      // Petit délai pour ne pas surcharger l'API OFF
      if (i < codes.length - 1) await new Promise(r => setTimeout(r, 500))
    }

    setState('done')
  }

  return (
    <div className="space-y-6">
      {/* Toggle mode */}
      <div className="flex rounded-lg bg-muted p-1 w-fit">
        <button onClick={() => { setMode('single'); setState('idle') }} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${mode === 'single' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
          Un produit
        </button>
        <button onClick={() => { setMode('batch'); setState('idle') }} className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${mode === 'batch' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
          Import en masse
        </button>
      </div>

      {/* Mode single */}
      {mode === 'single' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Code-barres (ex: 6111080016394)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm"
              maxLength={13}
            />
            <Button onClick={handleSearch} disabled={state === 'searching' || state === 'importing'}>
              {state === 'searching' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : 'Rechercher'}
            </Button>
          </div>

          {state === 'exists' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">Ce produit existe déjà dans Bayen.</p>
              <a href={`/produit/${barcode}`} className="text-sm text-primary hover:underline mt-1 inline-block">Voir la fiche →</a>
            </div>
          )}

          {state === 'preview' && product && (
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <div className="flex gap-4">
                {product.image && (
                  <img src={product.image} alt={product.name} className="w-20 h-20 rounded-lg object-cover" />
                )}
                <div>
                  <h3 className="font-bold">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">{product.brand}</p>
                  <div className="flex gap-2 mt-1">
                    {product.nutriscore && <Badge>Nutri-Score {product.nutriscore}</Badge>}
                    {product.nova && <Badge variant="outline">NOVA {product.nova}</Badge>}
                    {product.additives.length > 0 && <Badge variant="outline">{product.additives.length} additifs</Badge>}
                  </div>
                </div>
              </div>

              {/* Nutrition preview */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { label: 'Énergie', value: product.energy, unit: 'kcal' },
                  { label: 'Lipides', value: product.fat, unit: 'g' },
                  { label: 'Sucres', value: product.sugars, unit: 'g' },
                  { label: 'Sel', value: product.salt, unit: 'g' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="rounded-lg bg-muted p-2">
                    <p className="text-muted-foreground">{label}</p>
                    <p className="font-bold">{value != null ? `${value} ${unit}` : '—'}</p>
                  </div>
                ))}
              </div>

              <Button onClick={handleImport} className="w-full" disabled={state === 'importing'}>
                {state === 'importing' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Import en cours...
                  </span>
                ) : 'Importer dans Bayen'}
              </Button>
            </div>
          )}

          {state === 'done' && product && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-sm text-green-800 font-medium">✅ {product.name} importé avec succès !</p>
              <a href={`/produit/${product.barcode}`} className="text-sm text-primary hover:underline mt-2 inline-block">Voir la fiche →</a>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => { setState('idle'); setBarcode(''); setProduct(null) }}>
                  Importer un autre
                </Button>
              </div>
            </div>
          )}

          {error && state === 'error' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setState('idle')}>Réessayer</Button>
            </div>
          )}
        </div>
      )}

      {/* Mode batch */}
      {mode === 'batch' && (
        <div className="space-y-4">
          <textarea
            rows={6}
            placeholder={"Collez une liste de codes-barres (un par ligne) :\n6111080016394\n3017620422003\n5449000131812"}
            value={barcodeList}
            onChange={(e) => setBarcodeList(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono resize-none"
          />
          <Button onClick={handleBatchImport} disabled={state === 'importing'} className="w-full">
            {state === 'importing' ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Import en cours... {batchProgress}%
              </span>
            ) : `Importer ${barcodeList.split(/[\n,;\s]+/).filter(c => /^\d{8,13}$/.test(c.trim())).length} produits`}
          </Button>

          {/* Barre de progression */}
          {state === 'importing' && (
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${batchProgress}%` }} />
            </div>
          )}

          {/* Résultats batch */}
          {batchResults.length > 0 && (
            <div className="rounded-xl border bg-card p-4 space-y-1 max-h-60 overflow-y-auto">
              {batchResults.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs py-1 border-b last:border-0">
                  <span className="font-mono text-muted-foreground w-28 flex-shrink-0">{r.barcode}</span>
                  {r.status === 'imported' && <span className="text-green-600">✅ {r.name}</span>}
                  {r.status === 'exists' && <span className="text-amber-600">⚠️ Déjà existant</span>}
                  {r.status === 'not_found' && <span className="text-muted-foreground">❌ Non trouvé sur OFF</span>}
                  {r.status === 'error' && <span className="text-red-600">❌ Erreur</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
