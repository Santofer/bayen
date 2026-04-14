/**
 * Liste filtrable des additifs alimentaires
 * Composant React interactif pour la page /additifs
 */

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import type { Additive, RiskLevel } from '@/lib/types'
import { RISK_VARIANTS, RISK_ICONS, RISK_LABEL_KEYS } from '@/components/AdditiveTag'

interface AdditivesListProps {
  additives: Additive[]
}

const RISK_ORDER: RiskLevel[] = ['banned_ma', 'avoid', 'limited', 'safe']

const RISK_COLORS: Record<RiskLevel, string> = {
  safe: 'bg-[#476a32]',
  limited: 'bg-orange-500',
  avoid: 'bg-red-500',
  banned_ma: 'bg-red-900',
}

export default function AdditivesList({ additives }: AdditivesListProps) {
  const { t, locale } = useLocale()
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState<RiskLevel | 'all'>('all')

  // Compteurs par risque
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: additives.length, safe: 0, limited: 0, avoid: 0, banned_ma: 0 }
    for (const a of additives) c[a.risk_level]++
    return c
  }, [additives])

  // Filtrage
  const filtered = useMemo(() => {
    return additives.filter((a) => {
      if (filterRisk !== 'all' && a.risk_level !== filterRisk) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          a.id.toLowerCase().includes(q) ||
          a.name_fr.toLowerCase().includes(q) ||
          a.function.toLowerCase().includes(q) ||
          ((a as any).name_ar || '').includes(q) ||
          ((a as any).function_ar || '').includes(q)
        )
      }
      return true
    })
  }, [additives, search, filterRisk])

  // Trier par risque décroissant puis par code
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const rA = RISK_ORDER.indexOf(a.risk_level)
      const rB = RISK_ORDER.indexOf(b.risk_level)
      if (rA !== rB) return rA - rB
      return a.id.localeCompare(b.id)
    })
  }, [filtered])

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground rtl:left-auto rtl:right-3"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder={t('additives.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 rounded-lg border border-input bg-background ps-10 pe-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Filtres par risque */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...RISK_ORDER] as const).map((risk) => {
          const label = risk === 'all' ? t('additives.all') : t(RISK_LABEL_KEYS[risk])
          const count = counts[risk] ?? 0
          const isActive = filterRisk === risk
          return (
            <Button
              key={risk}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterRisk(risk)}
              className={cn(
                'gap-1.5',
                isActive && risk !== 'all' && risk === 'safe' && 'bg-[#476a32] hover:bg-[#476a32]/90',
                isActive && risk === 'limited' && 'bg-orange-500 hover:bg-orange-600',
                isActive && risk === 'avoid' && 'bg-red-500 hover:bg-red-600',
                isActive && risk === 'banned_ma' && 'bg-red-900 hover:bg-red-950',
              )}
            >
              {label}
              <span className={cn(
                'text-xs rounded-full px-1.5 py-0.5',
                isActive ? 'bg-white/20' : 'bg-muted'
              )}>
                {count}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Résultats */}
      <p className="text-sm text-muted-foreground">
        {sorted.length} {t('additives.found')}
      </p>

      {/* Liste */}
      <div className="space-y-2">
        {sorted.map((additive) => (
          <a
            key={additive.id}
            href={`/additifs/${additive.id}`}
            className="flex items-start gap-3 rounded-lg border bg-card p-3 hover:shadow-md hover:border-primary/20 transition-all group"
          >
            {/* Indicateur risque */}
            <div className={cn(
              'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
              RISK_COLORS[additive.risk_level]
            )} />

            {/* Code + infos */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-foreground">{additive.id}</span>
                <Badge variant={RISK_VARIANTS[additive.risk_level]} className="text-[10px]">
                  {t(RISK_LABEL_KEYS[additive.risk_level])}
                </Badge>
              </div>
              <p className="text-sm text-foreground mt-0.5">{(locale === 'ary' && (additive as any).name_ar) || additive.name_fr}</p>
              <p className="text-xs text-muted-foreground capitalize">{(locale === 'ary' && (additive as any).function_ar) || additive.function}</p>
            </div>

            {/* Flèche */}
            <svg
              className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1 flex-shrink-0"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('additives.noResult')}</p>
        </div>
      )}
    </div>
  )
}
