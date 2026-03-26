/**
 * Bouton "Enrichir depuis OFF" — complète un produit existant avec les données Open Food Facts
 * Apparaît quand le produit manque de données nutritionnelles ou d'image
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { getAccessToken } from '@/lib/auth'
import { computeScore, type RiskLevel } from '@/lib/scoring'

const DIRECTUS_URL = '/api/directus'

interface EnrichFromOffProps {
  productId: string
  barcode: string
  /** Champs déjà renseignés — pour savoir ce qui manque */
  existing: {
    hasImage: boolean
    hasNutrition: boolean
    hasIngredients: boolean
    hasScore: boolean
  }
}

type EnrichState = 'idle' | 'loading' | 'done' | 'not_found' | 'error'

export default function EnrichFromOff({ productId, barcode, existing }: EnrichFromOffProps) {
  const [state, setState] = useState<EnrichState>('idle')
  const [enriched, setEnriched] = useState<string[]>([])
  const [error, setError] = useState('')

  // Ne rien afficher si tout est déjà complet
  const missingCount = [!existing.hasImage, !existing.hasNutrition, !existing.hasIngredients, !existing.hasScore].filter(Boolean).length
  if (missingCount === 0) return null

  async function handleEnrich() {
    setState('loading')
    setError('')

    try {
      const token = await getAccessToken()
      if (!token) { setError('Connectez-vous d\'abord'); setState('error'); return }

      // Fetch OFF
      const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}`, {
        headers: { 'User-Agent': 'Bayen/1.0 (contact@n0.ma)' },
      })
      if (!offRes.ok) { setState('not_found'); return }
      const offData = await offRes.json()
      if (offData.status !== 1 || !offData.product) { setState('not_found'); return }

      const p = offData.product
      const patchData: Record<string, unknown> = {}
      const enrichedFields: string[] = []

      // Nutrition
      if (!existing.hasNutrition && p.nutriments) {
        const fields: Array<[string, string]> = [
          ['energy_kcal', 'energy-kcal_100g'],
          ['fat_total', 'fat_100g'],
          ['fat_saturated', 'saturated-fat_100g'],
          ['carbs_total', 'carbohydrates_100g'],
          ['sugars', 'sugars_100g'],
          ['fiber', 'fiber_100g'],
          ['proteins', 'proteins_100g'],
          ['salt', 'salt_100g'],
        ]
        for (const [local, off] of fields) {
          if (p.nutriments[off] != null) patchData[local] = p.nutriments[off]
        }
        if (Object.keys(patchData).length > 0) enrichedFields.push('Valeurs nutritionnelles')
      }

      // Ingrédients
      if (!existing.hasIngredients) {
        const text = p.ingredients_text_fr || p.ingredients_text
        if (text) { patchData.ingredients_text = text; enrichedFields.push('Ingrédients') }
      }

      // Additifs — toujours mettre à jour depuis OFF (plus complet)
      const additiveTags: string[] = p.additives_tags ?? []
      const additives = additiveTags
        .map((t: string) => { const m = t.match(/e(\d+[a-z]?)/i); return m ? `E${m[1].toUpperCase()}` : null })
        .filter(Boolean) as string[]
      if (additives.length > 0) { patchData.additives = additives; enrichedFields.push(`${additives.length} additifs`) }

      // Allergènes
      const allergenTags: string[] = p.allergens_tags ?? []
      const allergens = allergenTags.map((t: string) => t.replace(/^en:/, '')).filter(Boolean)
      if (allergens.length > 0) { patchData.allergens = allergens }

      // Nutri-Score / NOVA
      if (p.nutriscore_grade) { patchData.nutriscore_grade = p.nutriscore_grade.toUpperCase() }
      if (p.nova_group) { patchData.nova_group = p.nova_group }

      // Calculer le score
      if (!existing.hasScore) {
        const additiveRisks = additives.map(code => ({ code: code as string, risk_level: 'limited' as RiskLevel }))
        const scoreResult = computeScore({
          nutrition: {
            energy_kcal: (patchData.energy_kcal as number) ?? null,
            fat_saturated: (patchData.fat_saturated as number) ?? null,
            sugars: (patchData.sugars as number) ?? null,
            salt: (patchData.salt as number) ?? null,
            fiber: (patchData.fiber as number) ?? null,
            proteins: (patchData.proteins as number) ?? null,
          },
          novaGroup: (patchData.nova_group ?? p.nova_group) as 1 | 2 | 3 | 4 | null,
          ingredientsText: (patchData.ingredients_text as string) ?? '',
          additives: additiveRisks,
        })
        patchData.scan_score = scoreResult.total
        patchData.score_label = scoreResult.label
        patchData.nutriscore_grade = scoreResult.nutriscore_grade
        patchData.nova_group = scoreResult.nova_group
        enrichedFields.push('Score Bayen')
      }

      // Image
      if (!existing.hasImage && p.image_front_url) {
        try {
          const imgRes = await fetch(`/api/proxy-image?url=${encodeURIComponent(p.image_front_url)}`)
          if (imgRes.ok) {
            const blob = await imgRes.blob()
            const formData = new FormData()
            formData.append('file', blob, `${barcode}-front.jpg`)
            const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            })
            if (uploadRes.ok) {
              const uploadData = await uploadRes.json() as { data?: { id: string } }
              if (uploadData?.data?.id) {
                patchData.image_front = uploadData.data.id
                enrichedFields.push('Photo')
              }
            }
          }
        } catch { /* image optionnelle */ }
      }

      if (Object.keys(patchData).length === 0) {
        setState('not_found')
        return
      }

      // PATCH le produit
      patchData.off_id = barcode
      const patchRes = await fetch(`${DIRECTUS_URL}/items/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patchData),
      })

      if (!patchRes.ok) throw new Error(`Erreur ${patchRes.status}`)

      setEnriched(enrichedFields)
      setState('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
      setState('error')
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      {state === 'idle' && (
        <>
          <div className="flex items-start gap-3">
            <span className="text-xl">🔄</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Données incomplètes</p>
              <p className="text-xs text-blue-700 mt-0.5">
                {!existing.hasNutrition && 'Valeurs nutritionnelles · '}
                {!existing.hasIngredients && 'Ingrédients · '}
                {!existing.hasImage && 'Photo · '}
                {!existing.hasScore && 'Score · '}
                manquant{missingCount > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button size="sm" className="mt-3 w-full" onClick={handleEnrich}>
            Enrichir depuis Open Food Facts
          </Button>
        </>
      )}

      {state === 'loading' && (
        <div className="flex items-center gap-3 text-sm text-blue-800">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Recherche sur Open Food Facts...
        </div>
      )}

      {state === 'done' && (
        <div className="text-center">
          <p className="text-sm font-medium text-green-800">✅ Produit enrichi !</p>
          <p className="text-xs text-green-700 mt-1">{enriched.join(' · ')}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => window.location.reload()}>
            Recharger la page
          </Button>
        </div>
      )}

      {state === 'not_found' && (
        <p className="text-sm text-blue-800">Ce produit n'a pas été trouvé sur Open Food Facts, ou n'a pas de données supplémentaires.</p>
      )}

      {state === 'error' && (
        <div>
          <p className="text-sm text-red-800">{error}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => setState('idle')}>Réessayer</Button>
        </div>
      )}
    </div>
  )
}
