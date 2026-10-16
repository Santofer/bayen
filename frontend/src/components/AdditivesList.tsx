/**
 * Liste filtrable des additifs alimentaires
 * Composant React interactif pour la page /additifs
 */

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import type { Additive, RiskLevel } from '@/lib/types'
import { RISK_LABEL_KEYS, RISK_FILL } from '@/components/AdditiveTag'

/** Additif avec ses traductions darija éventuelles (colonnes optionnelles) */
type AdditiveAr = Additive & { name_ar?: string | null; function_ar?: string | null }

interface AdditivesListProps {
  additives: AdditiveAr[]
}

const RISK_ORDER: RiskLevel[] = ['banned_ma', 'avoid', 'limited', 'safe']

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
          (a.name_ar || '').includes(q) ||
          (a.function_ar || '').includes(q)
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
      {/* Barre de recherche — héroïque (maquette v2) */}
      <div className="search-hero">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder={t('additives.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Filtres par risque — pills maquette */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...RISK_ORDER] as const).map((risk) => {
          const label = risk === 'all' ? t('additives.all') : t(RISK_LABEL_KEYS[risk])
          const count = counts[risk] ?? 0
          const isActive = filterRisk === risk
          return (
            <button
              key={risk}
              type="button"
              onClick={() => setFilterRisk(risk)}
              className={cn('filter-pill inline-flex items-center gap-1.5', isActive && 'on')}
              // Filtre actif : aplat du niveau de risque, texte encre (.on fournit déjà encre + contour)
              style={isActive && risk !== 'all' ? { backgroundColor: RISK_FILL[risk] } : undefined}
            >
              {label}
              <span className={cn('text-xs rounded-full px-1.5 py-0.5', isActive ? 'bg-encre/15' : 'bg-muted')}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Résultats */}
      <p className="text-sm text-muted-foreground">
        {sorted.length} {t('additives.found')}
      </p>

      {/* Grille de cartes : contour encre, pastille de risque en aplat */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((additive) => (
          <a
            key={additive.id}
            href={`/additifs/${additive.id}`}
            className="add-card"
          >
            <div className="top">
              <span className="code">{additive.id}</span>
              <span className="risk" style={{ backgroundColor: RISK_FILL[additive.risk_level] }}>
                {t(RISK_LABEL_KEYS[additive.risk_level])}
              </span>
            </div>
            <h3>{(locale === 'ary' && additive.name_ar) || additive.name_fr}</h3>
            <p className="capitalize">{(locale === 'ary' && additive.function_ar) || additive.function}</p>
          </a>
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="naanaa justify-center py-12">
          <img src="/mascotte/naanaa-loupe.webp" alt="" width="72" height="106" />
          <p className="bubble text-muted-foreground">{t('additives.noResult')}</p>
        </div>
      )}
    </div>
  )
}
