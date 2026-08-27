/**
 * Historique de scans (page /mes-scans et section « Scans récents » de /scan).
 * Lit le localStorage — aucun compte, aucune requête réseau.
 */

import { useEffect, useState } from 'react'
import { History, Trash2, ScanLine } from 'lucide-react'
import ProductCard from '@/components/ProductCard'
import { useLocale } from '@/lib/i18n'
import { clearHistory, getHistory, onHistoryChange, type ScanHistoryEntry } from '@/lib/scan-history'
import type { Product } from '@/lib/types'

interface ScanHistoryProps {
  /** Nombre max d'entrées (section « récents » de /scan) — illimité si absent */
  limit?: number
  /** Mode compact : pas de bouton « tout effacer » ni d'état vide verbeux */
  compact?: boolean
  /** En-tête de section rendu par le composant (masqué si l'historique est vide) */
  heading?: string
  seeAllLabel?: string
}

/** L'entrée d'historique a le même shape qu'un produit de liste. */
function toProduct(e: ScanHistoryEntry): Product {
  return {
    id: e.barcode,
    barcode: e.barcode,
    name_fr: e.name_fr,
    brand: e.brand,
    image_front: e.image_front,
    scan_score: e.scan_score,
    score_label: e.score_label,
  } as unknown as Product
}

export default function ScanHistory({ limit, compact = false, heading, seeAllLabel }: ScanHistoryProps) {
  const { t } = useLocale()
  const [entries, setEntries] = useState<ScanHistoryEntry[] | null>(null)

  useEffect(() => {
    const load = (): void => setEntries(getHistory())
    load()
    return onHistoryChange(load)
  }, [])

  // null = pas encore lu (évite un flash d'état vide au montage)
  if (entries === null) return null

  const shown = limit ? entries.slice(0, limit) : entries

  if (shown.length === 0) {
    if (compact) return null
    return (
      <div className="rounded-3xl border bg-card p-10 text-center shadow-card">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <History size={26} />
        </div>
        <p className="font-semibold text-foreground mt-4">{t('history.empty')}</p>
        <a
          href="/scan"
          className="inline-flex items-center gap-2 mt-4 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90"
        >
          <ScanLine size={16} /> {t('nav.scan')}
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {heading && (
        <div className="sec-head-v2">
          <h2>{heading}</h2>
          {seeAllLabel && <a href="/mes-scans">{seeAllLabel} →</a>}
        </div>
      )}
      {!compact && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {entries.length} {entries.length > 1 ? t('history.itemsPlural') : t('history.itemSingular')}
          </p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t('history.clearConfirm'))) clearHistory()
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={15} /> {t('history.clear')}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {shown.map((e) => (
          <ProductCard key={e.barcode} product={toProduct(e)} variant="grid" />
        ))}
      </div>
    </div>
  )
}
