/**
 * Liste INCI complète d'un cosmétique (C23) — chaque ingrédient avec sa
 * pastille de risque, dans l'ordre de l'étiquette (le premier est le plus
 * concentré). Repliée au-delà de 12 lignes. Le texte brut reste consultable.
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { parseInci } from '@/lib/inci'
import { levelKey, type InciIngredient } from '@/components/CosmeticScore'

interface Props {
  ingredients: InciIngredient[]
  inciText: string
}

const DOT: Record<string, string> = {
  banned: 'bg-[#ef4444]', high: 'bg-[#ef4444]', moderate: 'bg-[#f97316]', low: 'bg-[#b1cf3a]', none: 'bg-[#476a32]', unknown: 'bg-muted-foreground/40',
}

export default function InciList({ ingredients, inciText }: Props) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState(false)

  // Jointure absente (fiche pas encore rescorée) → simple découpage du texte
  const rows: InciIngredient[] = ingredients.length > 0
    ? ingredients
    : parseInci(inciText).map((n, i) => ({ id: null, inci_name: n, name_fr: null, risk_level: 'unknown', risk_types: [], risk_status: null, restriction_fr: null, note_fr: null, source_label: null, source_url: null, rank: i + 1, raw_text: null }))
  const shown = open ? rows : rows.slice(0, 12)

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-medium text-foreground">{t('inci.title')} <span className="text-muted-foreground">({rows.length} {t('inci.count')})</span></h2>
        <button type="button" onClick={() => setRaw(!raw)} className="text-xs font-semibold text-muted-foreground hover:text-primary">
          {t('inci.raw')}
        </button>
      </div>
      {raw ? (
        <p className="text-xs leading-relaxed text-muted-foreground break-words">{inciText}</p>
      ) : (
        <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {shown.map((i) => (
            <li key={`${i.rank}-${i.inci_name}`} className="flex items-start gap-2 text-sm">
              <span className={cn('mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full', DOT[i.risk_level] ?? DOT.unknown)} title={t(levelKey(i.risk_level))} />
              <span className="min-w-0">
                {i.id != null ? (
                  <a href={`/ingredients-cosmetiques/${encodeURIComponent(i.inci_name)}`} className="hover:text-primary hover:underline">{i.inci_name}</a>
                ) : (
                  <span className="text-muted-foreground">{i.inci_name}</span>
                )}
                {i.name_fr && <span className="ms-1.5 text-xs text-muted-foreground">{i.name_fr}</span>}
              </span>
            </li>
          ))}
        </ol>
      )}
      {!raw && rows.length > 12 && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-4 text-sm font-semibold text-primary hover:underline">
          {open ? t('inci.hide') : `${t('inci.showAll')} (${rows.length})`}
        </button>
      )}
    </div>
  )
}
