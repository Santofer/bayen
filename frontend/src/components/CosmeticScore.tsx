/**
 * Score beauté (C23) — panneau de la fiche cosmétique.
 *
 * Même anneau 0–100 que l'alimentaire, mais la lecture est différente : pas
 * de Nutri-Score ni de NOVA, le score est PLAFONNÉ par le pire ingrédient de
 * la liste INCI. On explique donc d'abord ce plafond (« contient un
 * ingrédient interdit »), puis les ingrédients à surveiller avec leur type de
 * risque et son statut (suspecté / avéré), puis les alertes du profil santé.
 *
 * Aucune IA ici : tout vient de `cosmetic_risk` calculé par scoring-cosmetic.ts.
 */

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { getProfile, onProfileChange, type HealthProfile } from '@/lib/health-profile'
import type { CosmeticRiskSummary } from '@/lib/types'

export interface InciIngredient {
  id: number | null
  inci_name: string
  name_fr: string | null
  risk_level: string
  risk_types: string[]
  risk_status: string | null
  restriction_fr: string | null
  note_fr: string | null
  source_label: string | null
  source_url: string | null
  rank: number
  raw_text: string | null
}

interface Props {
  risk: CosmeticRiskSummary | null
  ingredients: InciIngredient[]
  hasInciText: boolean
  barcode: string
  className?: string
}

const LEVEL_COLOR: Record<string, string> = {
  banned: '#ef4444',
  high: '#ef4444',
  moderate: '#f97316',
  low: '#b1cf3a',
  none: '#476a32',
  unknown: '#a1a1aa',
}

const LEVEL_VARIANT: Record<string, 'safe' | 'limited' | 'avoid' | 'banned' | 'outline'> = {
  banned: 'banned', high: 'avoid', moderate: 'limited', low: 'safe', none: 'safe', unknown: 'outline',
}

type LevelKey = 'beauty.risk.banned' | 'beauty.risk.high' | 'beauty.risk.moderate' | 'beauty.risk.low' | 'beauty.risk.none' | 'beauty.risk.unknown'
type TypeKey = 'beauty.type.endocrine' | 'beauty.type.cmr' | 'beauty.type.allergen' | 'beauty.type.irritant' | 'beauty.type.environment' | 'beauty.type.restricted'

export function levelKey(level: string): LevelKey {
  return (['banned', 'high', 'moderate', 'low', 'none'].includes(level) ? `beauty.risk.${level}` : 'beauty.risk.unknown') as LevelKey
}

function typeKey(type: string): TypeKey | null {
  return ['endocrine', 'cmr', 'allergen', 'irritant', 'environment', 'restricted'].includes(type) ? (`beauty.type.${type}` as TypeKey) : null
}

/** Anneau animé — même rendu que ScoreDisplay, sans dépendre de ses props alimentaires */
function Ring({ score, label, color }: { score: number; label: string; color: string }) {
  const [animated, setAnimated] = useState(0)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const tick = (now: number): void => {
      const t = Math.min((now - start) / 800, 1)
      setAnimated(Math.round(score * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [score])
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference - (animated / 100) * circumference}
            style={{ transition: 'stroke-dashoffset 0.1s ease-out' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>{animated}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span className="text-sm font-semibold uppercase tracking-wide" style={{ color }}>{label}</span>
    </div>
  )
}

export default function CosmeticScore({ risk, ingredients, hasInciText, barcode, className }: Props) {
  const { t } = useLocale()
  const [profile, setProfile] = useState<HealthProfile | null>(null)
  useEffect(() => {
    setProfile(getProfile())
    return onProfileChange(() => setProfile(getProfile()))
  }, [])

  // Pas de liste INCI → rien à noter, on dit quoi faire
  if (!hasInciText || !risk || risk.total == null || risk.label == null) {
    return (
      <div className={cn('flex flex-col items-center text-center gap-4 py-4', className)}>
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M16 13H8" /><path d="M16 17H8" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-bold text-foreground">{t('beauty.noInci')}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">{t('beauty.noInciDesc')}</p>
        </div>
        <a href={`/contribuer/${barcode}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
          {t('score.contributeData')}
        </a>
      </div>
    )
  }

  const color = LEVEL_COLOR[risk.cap_reason?.risk_level ?? 'none'] ?? '#476a32'
  const scoreLabelKeys: Record<string, 'score.excellent' | 'score.bon' | 'score.mediocre' | 'score.mauvais'> = {
    excellent: 'score.excellent', bon: 'score.bon', 'médiocre': 'score.mediocre', mauvais: 'score.mauvais',
  }
  const label = scoreLabelKeys[risk.label] ? t(scoreLabelKeys[risk.label]) : risk.label
  const capKey = risk.cap_reason
    ? ({ banned: 'beauty.capBanned', high: 'beauty.capHigh', moderate: 'beauty.capModerate', low: 'beauty.capLow' } as const)[risk.cap_reason.risk_level as 'banned' | 'high' | 'moderate' | 'low']
    : null

  // Ingrédients à surveiller : la jointure (détails complets) sinon le résumé persisté
  const flagged = ingredients.length > 0
    ? ingredients.filter((i) => i.risk_level !== 'none' && i.risk_level !== 'unknown')
    : risk.worst.map((w) => ({ id: null, inci_name: w.inci_name, name_fr: w.name_fr, risk_level: w.risk_level, risk_types: w.risk_types, risk_status: w.risk_status, restriction_fr: null, note_fr: null, source_label: null, source_url: null, rank: 0, raw_text: null }))
  const order = ['banned', 'high', 'moderate', 'low']
  flagged.sort((a, b) => order.indexOf(a.risk_level) - order.indexOf(b.risk_level) || a.rank - b.rank)

  const hasEndocrine = flagged.some((i) => i.risk_types.includes('endocrine'))
  const hasFragranceAllergen = flagged.some((i) => i.risk_types.includes('allergen') && i.risk_level === 'low')

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge variant="outline" className="text-beauty border-beauty/40 bg-beauty/10">{t('beauty.badge')}</Badge>
        {risk.incomplete && (
          <Badge variant="outline" className="text-orange-600 dark:text-orange-300 border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/40">
            {t('score.incomplete')}
          </Badge>
        )}
        {risk.rinse_off && <Badge variant="outline">{t('beauty.rinseOff')}</Badge>}
      </div>

      <div className="flex flex-col md:grid md:grid-cols-[auto_1fr] md:items-center gap-6 md:gap-8">
        <Ring score={risk.total} label={label} color={color} />
        <div className="space-y-3">
          <p className="text-base font-bold" style={{ color }}>
            {capKey ? t(capKey) : t('beauty.clean')}
          </p>
          {risk.cap_reason && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{risk.cap_reason.inci_name}</span>
              {' — '}{t(levelKey(risk.cap_reason.risk_level))}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t('beauty.scoreHint')}</p>
          {risk.incomplete && <p className="text-xs text-orange-600 dark:text-orange-300">{t('beauty.incompleteDesc')}</p>}
          <p className="text-xs text-muted-foreground">
            {risk.matched_count}/{risk.token_count} {t('inci.count')}
          </p>
        </div>
      </div>

      {/* Alertes profil santé */}
      {profile && ((profile.avoidEndocrine && hasEndocrine) || (profile.avoidFragranceAllergens && hasFragranceAllergen)) && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-4 space-y-1">
          {profile.avoidEndocrine && hasEndocrine && (
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">{t('beauty.profileEndocrine')}</p>
          )}
          {profile.avoidFragranceAllergens && hasFragranceAllergen && (
            <p className="text-sm font-semibold text-red-800 dark:text-red-200">{t('beauty.profileAllergen')}</p>
          )}
        </div>
      )}

      {/* Ingrédients à surveiller */}
      {flagged.length > 0 && (
        <div className="space-y-2 border-t pt-5">
          <h3 className="text-sm font-medium text-foreground">{t('beauty.worst')} ({flagged.length})</h3>
          <ul className="space-y-2">
            {flagged.map((i) => (
              <li key={`${i.inci_name}-${i.rank}`} className="rounded-xl border bg-background/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={`/ingredients-cosmetiques/${encodeURIComponent(i.inci_name)}`} className="font-semibold text-sm hover:text-primary hover:underline">
                    {i.inci_name}
                  </a>
                  {i.name_fr && <span className="text-xs text-muted-foreground">{i.name_fr}</span>}
                  <Badge variant={LEVEL_VARIANT[i.risk_level] ?? 'outline'} className="ms-auto">{t(levelKey(i.risk_level))}</Badge>
                </div>
                {(i.risk_types.length > 0 || i.risk_status) && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {i.risk_types.map((ty) => { const k = typeKey(ty); return k ? t(k) : ty }).join(' · ')}
                    {i.risk_status && (i.risk_status === 'suspected' || i.risk_status === 'confirmed') && (
                      <> — {t(`beauty.status.${i.risk_status}` as 'beauty.status.suspected' | 'beauty.status.confirmed')}</>
                    )}
                  </p>
                )}
                {i.note_fr && <p className="mt-1 text-xs text-foreground/80">{i.note_fr}</p>}
                {i.restriction_fr && <p className="mt-1 text-[11px] text-muted-foreground">{t('beauty.restriction')} : {i.restriction_fr}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {risk.unknown.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">{t('beauty.unknown')} ({risk.unknown.length})</h3>
          <p className="text-xs text-muted-foreground">{risk.unknown.join(', ')}</p>
          <p className="text-[11px] text-muted-foreground">{t('beauty.unknownHint')}</p>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground border-t pt-4">{t('beauty.disclaimer')}</p>
    </div>
  )
}
