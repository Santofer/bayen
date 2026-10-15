/**
 * Composant d'import de produits depuis Open Food Facts
 * Saisie de code-barres → preview OFF → import dans Directus
 */

import { useState } from 'react'
import { getAccessToken } from '@/lib/auth'
import { useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { productTint } from '@/components/ProductCard'
import { computeScore, type RiskLevel } from '@/lib/scoring'
import { CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react'

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
  quantity: string | null
  raw: Record<string, unknown>
}

type ImportState = 'idle' | 'searching' | 'preview' | 'importing' | 'done' | 'error' | 'exists'

export default function OffImporter() {
  const { t } = useLocale()
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
      nutriscore: (typeof p.nutriscore_grade === 'string' && /^[a-e]$/i.test(p.nutriscore_grade)) ? p.nutriscore_grade.toUpperCase() : null,
      nova: p.nova_group ?? null,
      image: p.image_front_url ?? null,
      imageNutrition: p.image_nutrition_url ?? null,
      imageIngredients: p.image_ingredients_url ?? null,
      quantity: p.quantity ?? null,
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
    if (!token) throw new Error(t('import.notLogged'))

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
      quantity: offProduct.quantity,
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
    if (!/^\d{8,13}$/.test(code)) { setError(t('import.invalidBarcode')); return }

    setState('searching')
    setError('')
    setProduct(null)

    try {
      const exists = await checkExists(code)
      if (exists) { setState('exists'); return }

      const offProduct = await searchOff(code)
      if (!offProduct) { setError(t('import.notFoundOff')); setState('error'); return }

      setProduct(offProduct)
      setState('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('import.networkError'))
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
      else { setError(t('import.importError')); setState('error') }
    } catch (e) {
      setError(e instanceof Error ? e.message : t('import.error'))
      setState('error')
    }
  }

  // Import batch
  async function handleBatchImport() {
    const codes = barcodeList.split(/[\n,;\s]+/).map(c => c.trim()).filter(c => /^\d{8,13}$/.test(c))
    if (codes.length === 0) { setError(t('import.noValid')); return }

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

  const busy = state === 'searching' || state === 'importing'
  const batchCount = barcodeList.split(/[\n,;\s]+/).filter(c => /^\d{8,13}$/.test(c.trim())).length

  return (
    <div className="grid gap-5 md:max-w-[760px]">
      {/* Mode : puces */}
      <div className="chips gap-2" role="group" aria-label={t('import.modeAria')}>
        {([['single', t('import.single')], ['batch', t('import.batch')]] as const).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => { setMode(m); setState('idle'); setError('') }}
            className={cn('chip h-10 px-4 text-sm', mode === m && 'fill bg-menthe')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mode single */}
      {mode === 'single' && (
        <div className="grid gap-4">
          <div className="flex gap-2">
            <label className="card flex h-[50px] min-w-0 flex-1 items-center rounded-full px-4 shadow-[3px_3px_0_var(--color-hard)]">
              <input
                type="text"
                inputMode="numeric"
                placeholder={t('import.barcodePh')}
                aria-label={t('fixForm.barcode')}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="num min-w-0 flex-1 border-0 bg-transparent text-[15px] font-medium outline-none"
                maxLength={13}
              />
            </label>
            <button type="button" className="btn primary min-h-[50px]" onClick={handleSearch} disabled={busy}>
              {state === 'searching' ? <Loader2 className="animate-spin" aria-label={t('import.searching')} /> : t('search.searchBtn')}
            </button>
          </div>

          {state === 'exists' && (
            <div className="card tint-citron grid gap-1 p-4">
              <p className="text-sm font-semibold">{t('import.exists')}</p>
              <a href={`/produit/${barcode}`} className="w-max text-sm font-bold underline underline-offset-[3px]">{t('import.seeProduct')}</a>
            </div>
          )}

          {(state === 'preview' || state === 'importing') && product && (
            <div className="card grid gap-4 p-4 md:p-5">
              <div className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-3">
                <div className={cn('tile size-[88px]', productTint(product.barcode))}>
                  {product.image && <img src={product.image} alt={product.name} />}
                </div>
                <div className="min-w-0">
                  <h3 className="disp d-s">{product.name}</h3>
                  <p className="muted text-sm">{product.brand}</p>
                  <div className="chips mt-2">
                    {product.nutriscore && <span className="chip">Nutri-Score {product.nutriscore}</span>}
                    {product.nova && <span className="chip">NOVA {product.nova}</span>}
                    {product.additives.length > 0 && <span className="chip">{product.additives.length} {t('card.additives')}</span>}
                  </div>
                </div>
              </div>

              {/* Aperçu nutritionnel (données OFF pour 100 g) */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: t('product.energy'), value: product.energy, unit: 'kcal' },
                  { label: t('product.fat'), value: product.fat, unit: 'g' },
                  { label: t('import.sugars'), value: product.sugars, unit: 'g' },
                  { label: t('product.salt'), value: product.salt, unit: 'g' },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="rounded-[14px] border-2 border-line px-1 py-2">
                    <b className="num block font-display text-[15px]">{value != null ? value : '—'}</b>
                    <span className="block text-[11px]">{value != null ? `${unit} · ` : ''}{label}</span>
                  </div>
                ))}
              </div>

              <button type="button" className="btn primary w-full" onClick={handleImport} disabled={state === 'importing'}>
                {state === 'importing' ? (
                  <><Loader2 className="animate-spin" aria-hidden="true" /> {t('import.importing')}</>
                ) : t('import.importBtn')}
              </button>
            </div>
          )}

          {state === 'done' && product && (
            <div className="card tint-menthe grid justify-items-center gap-2 p-4 text-center">
              <p className="flex items-center gap-1.5 text-sm font-semibold"><CheckCircle size={16} /> {t('import.success').replace('{name}', product.name)}</p>
              <a href={`/produit/${product.barcode}`} className="text-sm font-bold underline underline-offset-[3px]">{t('import.seeProduct')}</a>
              <button type="button" className="btn sm mt-1" onClick={() => { setState('idle'); setBarcode(''); setProduct(null) }}>
                {t('import.another')}
              </button>
            </div>
          )}

          {error && state === 'error' && (
            <div className="naanaa grid-cols-[56px_minmax(0,1fr)]" role="alert">
              <img src="/mascotte/naanaa-oups.webp" alt="" width="56" height="56" className="size-14" />
              <div className="bubble grid justify-items-start gap-2">
                <p className="text-sm">{error}</p>
                <button type="button" className="btn sm" onClick={() => setState('idle')}>{t('common.retry')}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode batch */}
      {mode === 'batch' && (
        <div className="grid gap-4">
          <textarea
            rows={6}
            placeholder={`${t('import.batchPh')}\n6111080016394\n3017620422003\n5449000131812`}
            aria-label={t('import.batchAria')}
            value={barcodeList}
            onChange={(e) => setBarcodeList(e.target.value)}
            className="w-full resize-none rounded-2xl border-2 border-line bg-background px-4 py-3 font-mono text-sm outline-none focus:border-brand-ink"
          />
          <button type="button" className="btn primary w-full" onClick={handleBatchImport} disabled={state === 'importing'}>
            {state === 'importing' ? (
              <><Loader2 className="animate-spin" aria-hidden="true" /> {t('import.importing')} {batchProgress}%</>
            ) : t('import.importN').replace('{n}', String(batchCount))}
          </button>

          {error && state !== 'importing' && batchResults.length === 0 && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          {/* Barre de progression (barre de la maquette Compte) */}
          {state === 'importing' && (
            <div className="h-2.5 overflow-hidden rounded-full border-[1.5px] border-line bg-muted">
              <div className="h-full bg-menthe transition-all" style={{ width: `${batchProgress}%` }} />
            </div>
          )}

          {/* Résultats batch : lignes de carte */}
          {batchResults.length > 0 && (
            <ul className="card max-h-72 overflow-y-auto">
              {batchResults.map((r, i) => (
                <li key={i} className="flex items-center gap-3 border-b-[1.5px] border-line px-4 py-2 text-xs last:border-b-0">
                  <span className="num w-28 flex-none font-mono">{r.barcode}</span>
                  {r.status === 'imported' && <span className="flex min-w-0 items-center gap-1 truncate font-semibold"><CheckCircle size={14} className="flex-none text-brand-ink" /> {r.name}</span>}
                  {r.status === 'exists' && <span className="chip fill bg-citron"><AlertTriangle /> {t('import.alreadyExists')}</span>}
                  {r.status === 'not_found' && <span className="muted flex items-center gap-1"><XCircle size={14} /> {t('import.notOnOff')}</span>}
                  {r.status === 'error' && <span className="flex items-center gap-1 text-destructive"><XCircle size={14} /> {t('import.error')}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
