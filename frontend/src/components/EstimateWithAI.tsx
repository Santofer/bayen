/**
 * Bouton « Estimer avec l'IA » — pour les produits sans données (non évalués).
 *
 * Appelle /bayen-api/estimate-and-score : l'IA locale (Qwen) estime les valeurs
 * nutritionnelles de référence pour un aliment générique (semoule, farine,
 * huile…), le score est calculé par l'algo déterministe, puis persisté. Marche
 * pour tout le monde (pas de login) et profite à tous les visiteurs suivants.
 *
 * Ne s'affiche que pour les produits Directus non évalués. Après succès, on
 * recharge la fiche pour afficher le nouveau score (badge « Estimation IA »).
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n'
import { Sparkles, Loader2, AlertCircle } from 'lucide-react'

const DIRECTUS_URL = '/api/directus'

interface EstimateWithAIProps {
  barcode: string
}

type State = 'idle' | 'loading' | 'not_estimable' | 'error'

export default function EstimateWithAI({ barcode }: EstimateWithAIProps) {
  const { t } = useLocale()
  const [state, setState] = useState<State>('idle')

  async function handleEstimate() {
    setState('loading')
    try {
      const res = await fetch(`${DIRECTUS_URL}/bayen-api/estimate-and-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode }),
      })
      const data = (await res.json()) as { estimated?: boolean; reason?: string }
      if (res.ok && data.estimated) {
        // Score persisté → recharger la fiche pour l'afficher
        window.location.reload()
        return
      }
      // estimable=false (produit de marque non estimable) ou déjà scoré
      setState(data.reason === 'not_estimable' ? 'not_estimable' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'not_estimable') {
    return (
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <AlertCircle className="h-3.5 w-3.5" />
        {t('estimate.notEstimable')}
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <Button
        onClick={handleEstimate}
        disabled={state === 'loading'}
        variant="outline"
        size="sm"
        className="border-primary/30 text-primary hover:bg-primary/10"
      >
        {state === 'loading' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('estimate.loading')}</>
        ) : (
          <><Sparkles className="mr-2 h-4 w-4" />{t('estimate.button')}</>
        )}
      </Button>
      {state === 'error' && (
        <p className="text-xs text-muted-foreground">{t('estimate.error')}</p>
      )}
      <p className="text-[11px] text-muted-foreground text-center max-w-xs">{t('estimate.hint')}</p>
    </div>
  )
}
