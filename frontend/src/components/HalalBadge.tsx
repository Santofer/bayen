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
import { authHeader } from '@/lib/auth'

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
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
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

  // Rendu DANS la rangée de puces de la fiche (maquette FichePop) : la puce Halal
  // en tête, et la provenance + la confirmation sur une ligne à part, renvoyée en
  // fin de rangée (`order-last basis-full`) pour ne pas couper les autres puces.
  return (
    <>
      <span
        // Aplat menthe clair de la maquette, gardé clair en sombre : texte et logo encre
        className="chip fill bg-[#BFF0DC]"
        aria-label={t('halal.badge')}
      >
        {/* Coche de la maquette FichePop ; le logo halal est sur la pastille de la photo */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
        {t('halal.badge')}
      </span>

      <span className="order-last flex basis-full flex-wrap items-center gap-x-1.5 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck size={13} className="flex-none" />
        <span>
          {sourceLabel}
          {count > 0 && (
            <>
              {' — '}
              {t('halal.confirmedBy')} {count} {count > 1 ? t('halal.people') : t('halal.person')}
            </>
          )}
        </span>
        <button
          type="button"
          onClick={confirm}
          disabled={busy || done}
          className="-my-3 inline-flex min-h-[44px] items-center px-1 font-bold text-brand-ink disabled:text-muted-foreground"
        >
          {done ? t('halal.confirmed') : t('halal.confirm')}
        </button>
      </span>
    </>
  )
}
