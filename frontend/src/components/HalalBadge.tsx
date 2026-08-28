/**
 * Badge halal sourcé (C17).
 *
 * L'ancien badge affichait « Halal » sans dire d'où venait l'information.
 * Or Open Food Facts ne renseigne quasiment jamais ce label sur les produits
 * marocains : la source utile, c'est la personne qui tient le paquet. Ce badge
 * affiche donc la provenance et permet de confirmer en un geste.
 */

import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import halalLogo from '@/assets/halal-logo.svg?raw'

const API = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

export type HalalSource = 'off' | 'packaging_user' | 'vision' | null

interface Props {
  barcode: string
  isHalal: boolean
  source: HalalSource
  confirmations: number
}

/** Une seule confirmation par produit et par session. */
function alreadyConfirmed(barcode: string): boolean {
  try {
    return sessionStorage.getItem(`bayen_halal_${barcode}`) === '1'
  } catch {
    return false
  }
}

export default function HalalBadge({ barcode, isHalal, source, confirmations }: Props) {
  const { t } = useLocale()
  const [count, setCount] = useState(confirmations)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setDone(alreadyConfirmed(barcode))
  }, [barcode])

  if (!isHalal) return null

  const sourceLabel =
    source === 'packaging_user' ? t('halal.sourceUser')
      : source === 'vision' ? t('halal.sourceVision')
        : t('halal.sourceOff')

  const confirm = async (): Promise<void> => {
    if (busy || done) return
    setBusy(true)
    try {
      const res = await fetch(`${API}/bayen-api/confirm-halal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode, present: true }),
      })
      if (res.ok) {
        const data = (await res.json()) as { halal_confirmations?: number }
        setCount(data.halal_confirmations ?? count + 1)
        setDone(true)
        try {
          sessionStorage.setItem(`bayen_halal_${barcode}`, '1')
        } catch { /* navigation privée */ }
      }
    } catch { /* silencieux : la confirmation est un bonus */ } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 border-t pt-3">
      <div className="flex items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.09] py-1 pl-1.5 pr-2.5 text-primary"
        aria-label={t('halal.badge')}
      >
        <span
          className="block h-5 w-5 flex-shrink-0"
          // Logo halal officiel recoloré : ses aplats verts utilisent
          // currentColor et prennent donc la couleur de la charte.
          dangerouslySetInnerHTML={{ __html: halalLogo }}
        />
        <span className="text-xs font-extrabold">{t('halal.badge')}</span>
      </span>

      <button
        type="button"
        onClick={confirm}
        disabled={busy || done}
        className="ms-auto inline-flex min-h-[44px] flex-shrink-0 items-center px-3 -me-3 text-xs font-bold text-primary disabled:text-muted-foreground"
      >
        {done ? t('halal.confirmed') : t('halal.confirm')}
      </button>
      </div>

      <span className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck size={13} className="mt-0.5 flex-shrink-0" />
        <span>
        {sourceLabel}
        {count > 0 && (
          <>
            {' — '}
            {t('halal.confirmedBy')} {count} {count > 1 ? t('halal.people') : t('halal.person')}
          </>
        )}
        </span>
      </span>
    </div>
  )
}
