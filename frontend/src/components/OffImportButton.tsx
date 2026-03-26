/**
 * Bouton d'import d'un produit Open Food Facts dans Bayen
 *
 * Visible uniquement pour les utilisateurs authentifiés.
 * Calcule le score Bayen avant de sauvegarder dans Directus.
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { getAccessToken, isAuthenticated } from '@/lib/auth'
import { computeScore, type RiskLevel, type NovaGroup, type NutritionData } from '@/lib/scoring'

const DIRECTUS_PROXY = '/api/directus'

interface OffImportButtonProps {
  barcode: string
  productData: Record<string, unknown>
}

export default function OffImportButton({ barcode, productData }: OffImportButtonProps) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    setLoggedIn(isAuthenticated())
  }, [])

  if (!loggedIn) return null

  const handleImport = async () => {
    setSubmitting(true)
    setFeedback(null)

    try {
      const token = await getAccessToken()
      if (!token) {
        setFeedback({ type: 'error', message: 'Session expirée. Veuillez vous reconnecter.' })
        setSubmitting(false)
        return
      }

      // Préparer les données nutritionnelles pour le scoring
      const nutrition: NutritionData = {
        energy_kcal: (productData.energy_kcal as number | null) ?? null,
        fat_saturated: (productData.fat_saturated as number | null) ?? null,
        sugars: (productData.sugars as number | null) ?? null,
        salt: (productData.salt as number | null) ?? null,
        fiber: (productData.fiber as number | null) ?? null,
        proteins: (productData.proteins as number | null) ?? null,
      }

      // Préparer les additifs
      const additiveCodes = Array.isArray(productData.additives)
        ? (productData.additives as string[])
        : []
      const additiveRisks: Array<{ code: string; risk_level: RiskLevel }> = additiveCodes.map(
        (code) => ({ code, risk_level: 'limited' as RiskLevel })
      )

      // Calculer le score Bayen
      const scoreResult = computeScore({
        nutrition,
        novaGroup: (productData.nova_group as NovaGroup | null) ?? null,
        ingredientsText: (productData.ingredients_text as string | null) ?? null,
        additives: additiveRisks,
      })

      // Envoyer vers Directus
      const payload = {
        barcode,
        name_fr: productData.name_fr ?? 'Inconnu',
        brand: productData.brand ?? 'Inconnu',
        nutriscore_grade: scoreResult.nutriscore_grade,
        nova_group: scoreResult.nova_group,
        scan_score: scoreResult.total,
        score_label: scoreResult.label,
        energy_kcal: nutrition.energy_kcal,
        fat_total: (productData.fat_total as number | null) ?? null,
        fat_saturated: nutrition.fat_saturated,
        carbs_total: (productData.carbs_total as number | null) ?? null,
        sugars: nutrition.sugars,
        fiber: nutrition.fiber,
        proteins: nutrition.proteins,
        salt: nutrition.salt,
        ingredients_text: (productData.ingredients_text as string | null) ?? null,
        additives: additiveCodes,
        is_organic: (productData.is_organic as boolean) ?? false,
        is_halal: (productData.is_halal as boolean) ?? false,
        image_front: (productData.image_front as string | null) ?? null,
        data_source: 'off' as const,
        status: 'published' as const,
        confidence_score: scoreResult.incomplete ? 0.5 : 0.8,
        scan_count: 0,
      }

      const res = await fetch(`${DIRECTUS_PROXY}/items/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        const errorMsg =
          (errorData as { errors?: Array<{ message: string }> })?.errors?.[0]?.message ??
          `Erreur ${res.status}`
        throw new Error(errorMsg)
      }

      setFeedback({ type: 'success', message: 'Produit sauvegard\u00e9 dans Bayen !' })

      // Recharger la page pour afficher depuis Directus
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setFeedback({ type: 'error', message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleImport}
        disabled={submitting}
        className="w-full"
      >
        {submitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Sauvegarde en cours...
          </>
        ) : (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-2"
            >
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            Sauvegarder dans Bayen
          </>
        )}
      </Button>

      {feedback && (
        <div
          className={
            feedback.type === 'success'
              ? 'rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800'
              : 'rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800'
          }
        >
          {feedback.message}
        </div>
      )}
    </div>
  )
}
