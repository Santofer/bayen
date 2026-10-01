/**
 * Bouton « Compléter avec l'IA » — fiches sans score ou incomplètes.
 *
 * /bayen-api/estimate-and-score déroule une cascade (Open Food Facts relu →
 * lecture du tableau nutritionnel en photo → identification par la photo de
 * face → estimation par type de produit) ; le score reste calculé par l'algo
 * déterministe. Une analyse prend 10 à 60 s : on montre les étapes plutôt
 * qu'un sablier muet, et quand rien n'aboutit on propose l'action utile
 * (photographier le tableau) au lieu d'une ligne grise.
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n'
import { Sparkles, Loader2, Camera, PackageX } from 'lucide-react'

const DIRECTUS_URL = '/api/directus'

interface EstimateWithAIProps {
  barcode: string
}

type State = 'idle' | 'loading' | 'not_estimable' | 'not_food' | 'error'

const STEPS = ['estimate.step1', 'estimate.step2', 'estimate.step3', 'estimate.step4'] as const

export default function EstimateWithAI({ barcode }: EstimateWithAIProps) {
  const { t } = useLocale()
  const [state, setState] = useState<State>('idle')
  const [step, setStep] = useState(0)

  // Étapes affichées au rythme réel moyen de la cascade
  useEffect(() => {
    if (state !== 'loading') return
    setStep(0)
    const id = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 9000)
    return () => window.clearInterval(id)
  }, [state])

  async function handleEstimate() {
    setState('loading')
    try {
      const res = await fetch(`${DIRECTUS_URL}/bayen-api/estimate-and-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode }),
      })
      const data = (await res.json().catch(() => ({}))) as { estimated?: boolean; reason?: string }
      if (res.ok && (data.estimated || data.reason === 'complete')) {
        window.location.reload()
        return
      }
      if (data.reason === 'not_food') return setState('not_food')
      setState(res.ok ? 'not_estimable' : 'error')
    } catch {
      setState('error')
    }
  }

  if (state === 'not_food') {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <PackageX className="h-5 w-5 text-muted-foreground" />
        <p className="max-w-xs text-sm text-muted-foreground">{t('estimate.notFood')}</p>
      </div>
    )
  }

  if (state === 'not_estimable') {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-primary/40 p-4 text-center">
        <p className="max-w-xs text-sm font-semibold">{t('estimate.notEstimable')}</p>
        <a
          href={`/contribuer/${barcode}`}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
        >
          <Camera className="h-4 w-4" />
          {t('estimate.addPhoto')}
        </a>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        onClick={handleEstimate}
        disabled={state === 'loading'}
        variant="outline"
        size="sm"
        className="border-primary/30 text-primary hover:bg-primary/10"
      >
        {state === 'loading' ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t(STEPS[step])}</>
        ) : (
          <><Sparkles className="mr-2 h-4 w-4" />{t('estimate.button')}</>
        )}
      </Button>
      {state === 'error' && (
        <p className="text-sm font-semibold text-destructive">{t('estimate.error')}</p>
      )}
      <p className="max-w-xs text-center text-[11px] text-muted-foreground">{t('estimate.hint')}</p>
    </div>
  )
}
