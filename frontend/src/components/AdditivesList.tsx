/**
 * Liste filtrable des additifs alimentaires
 * Composant React interactif pour la page /additifs
 */

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import type { Additive, RiskLevel } from '@/lib/types'
import { RISK_LABEL_KEYS } from '@/components/AdditiveTag'

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

// Couleurs hexadécimales des risques (bordure latérale + badge plein — maquette v2)
const RISK_HEX: Record<RiskLevel, string> = {
  safe: '#3f7d31',
  limited: '#e59a1a',
  avoid: '#ef4444',
  banned_ma: '#7f1d1d',
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
              style={
                isActive && risk !== 'all'
                  ? { backgroundColor: RISK_HEX[risk], borderColor: RISK_HEX[risk], color: '#fff' }
                  : undefined
              }
            >
              {label}
              <span className={cn('text-xs rounded-full px-1.5 py-0.5', isActive ? 'bg-white/20' : 'bg-muted')}>
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

      {/* Grille de cards à bordure latérale colorée (maquette v2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sorted.map((additive) => (
          <a
            key={additive.id}
            href={`/additifs/${additive.id}`}
            className="add-card"
            style={{ borderInlineStartColor: RISK_HEX[additive.risk_level] }}
          >
            <div className="top">
              <span className="code">{additive.id}</span>
              <span className="risk" style={{ backgroundColor: RISK_HEX[additive.risk_level] }}>
                {t(RISK_LABEL_KEYS[additive.risk_level])}
              </span>
            </div>
            <h3>{(locale === 'ary' && (additive as any).name_ar) || additive.name_fr}</h3>
            <p className="capitalize">{(locale === 'ary' && (additive as any).function_ar) || additive.function}</p>
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
