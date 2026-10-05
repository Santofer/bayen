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

// Pastille de niveau : même échelle Marché Pop que CosmeticScore (menthe → citron → orange → tomate)
const DOT: Record<string, string> = {
  banned: 'bg-score-mauvais', high: 'bg-score-mauvais', moderate: 'bg-score-mediocre', low: 'bg-citron', none: 'bg-score-excellent', unknown: 'bg-muted-foreground/40',
}

export default function InciList({ ingredients, inciText }: Props) {
  const { t } = useLocale()
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState(false)

  // Jointure absente (fiche pas encore rescorée) → simple découpage du texte
  const rows: InciIngredient[] = ingredients.length > 0
    ? ingredients
    : parseInci(inciText).map((n, i) => ({ id: null, inci_name: n, name_fr: null, risk_level: 'unknown', risk_types: [], risk_status: null, restriction_fr: null, note_fr: null, source_label: null, source_url: null, rank: i + 1, raw_text: null }))
  const shown = open ? rows : rows.slice(0, 10)

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-medium text-foreground">{t('inci.title')} <span className="text-muted-foreground">({rows.length} {t('inci.count')})</span></h2>
        <button type="button" onClick={() => setRaw(!raw)} className="text-xs font-semibold text-muted-foreground hover:text-brand-ink">
          {t('inci.raw')}
        </button>
      </div>
      {raw ? (
        <p className="text-xs leading-relaxed text-muted-foreground break-words">{inciText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {shown.map((i) => {
            const chip = cn('inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line/25 px-2.5 py-1 text-xs font-semibold', i.risk_level === 'low' && 'border-line bg-citron/15', (i.risk_level === 'moderate' || i.risk_level === 'high' || i.risk_level === 'banned') && 'border-line bg-tomate/15')
            const inner = <><span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full border border-encre', DOT[i.risk_level] ?? DOT.unknown)} />{i.inci_name}</>
            return i.id != null
              ? <a key={`${i.rank}-${i.inci_name}`} href={`/ingredients-cosmetiques/${encodeURIComponent(i.inci_name)}`} title={[i.name_fr, t(levelKey(i.risk_level))].filter(Boolean).join(' · ')} className={cn(chip, 'hover:border-line hover:bg-muted')}>{inner}</a>
              : <span key={`${i.rank}-${i.inci_name}`} className={cn(chip, 'text-muted-foreground')}>{inner}</span>
          })}
        </div>
      )}
      {!raw && rows.length > 10 && (
        <button type="button" onClick={() => setOpen(!open)} className="mt-4 text-sm font-semibold text-brand-ink hover:underline">
          {open ? t('inci.hide') : `${t('inci.showAll')} (${rows.length})`}
        </button>
      )}
    </div>
  )
}
