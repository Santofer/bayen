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
import { cn } from '@/lib/utils'
import { SCORE_FILL, SCORE_NONE } from '@/lib/score-colors'
import { ScoreSticker } from '@/components/ProductCard'
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

/**
 * Aplat Marché Pop par niveau de risque INCI (texte encre posé dessus) :
 * l'échelle de la maquette — menthe (aucun), citron (faible), orange (modéré),
 * tomate (élevé / interdit). Le score beauté garde ses 4 niveaux.
 */
const LEVEL_FILL: Record<string, string> = {
  banned: SCORE_FILL.mauvais,
  high: SCORE_FILL.mauvais,
  moderate: SCORE_FILL.mediocre,
  low: 'var(--color-citron)',
  none: SCORE_FILL.excellent,
  unknown: SCORE_NONE,
}

/** Même échelle, lisible en TEXTE sur la surface courante (suit le thème) */
const LEVEL_INK: Record<string, string> = {
  banned: 'var(--color-score-mauvais-ink)',
  high: 'var(--color-score-mauvais-ink)',
  moderate: 'var(--color-score-mediocre-ink)',
  low: 'var(--color-foreground)',
  none: 'var(--color-score-excellent-ink)',
}

// Puce posée sur un aplat (.pop-chip est hors calque Tailwind → `!` ; pas de cn())
const FILL_CHIP = 'pop-chip border-encre! text-encre!'

type LevelKey = 'beauty.risk.banned' | 'beauty.risk.high' | 'beauty.risk.moderate' | 'beauty.risk.low' | 'beauty.risk.none' | 'beauty.risk.unknown'
type TypeKey = 'beauty.type.endocrine' | 'beauty.type.cmr' | 'beauty.type.allergen' | 'beauty.type.irritant' | 'beauty.type.environment' | 'beauty.type.restricted'

export function levelKey(level: string): LevelKey {
  return (['banned', 'high', 'moderate', 'low', 'none'].includes(level) ? `beauty.risk.${level}` : 'beauty.risk.unknown') as LevelKey
}

function typeKey(type: string): TypeKey | null {
  return ['endocrine', 'cmr', 'allergen', 'irritant', 'environment', 'restricted'].includes(type) ? (`beauty.type.${type}` as TypeKey) : null
}

/** Pastille Marché Pop : chiffre animé au montage, aplat du niveau de risque plafonnant */
function Ring({ score, label, fill }: { score: number; label: string; fill: string }) {
  const [animated, setAnimated] = useState(0)
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
    <div className="flex justify-center md:px-2">
      <ScoreSticker score={score} value={animated} word={label} fill={fill} size="lg" />
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
        {/* Naânaa à la loupe : pas de liste INCI à lire */}
        <div className="naanaa text-start">
          <img src="/mascotte/naanaa-loupe.webp" alt="" width="72" height="106" />
          <div className="bubble">
            <p className="font-display text-base font-bold text-foreground">{t('beauty.noInci')}</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t('beauty.noInciDesc')}</p>
          </div>
        </div>
        <a href={`/contribuer/${barcode}`} className="btn-pop">
          {t('score.contributeData')}
        </a>
      </div>
    )
  }

  const capLevel = risk.cap_reason?.risk_level ?? 'none'
  const fill = LEVEL_FILL[capLevel] ?? SCORE_FILL.excellent
  const ink = LEVEL_INK[capLevel] ?? LEVEL_INK.none
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

  // Les « à surveiller » (allergènes parfumants, tensioactifs…) sont nombreux et
  // peu graves : en pastilles compactes, les cartes détaillées aux niveaux supérieurs.
  const detailed = flagged.filter((i) => i.risk_level !== 'low')
  const minor = flagged.filter((i) => i.risk_level === 'low')
  const hasEndocrine = flagged.some((i) => i.risk_types.includes('endocrine'))
  const hasFragranceAllergen = flagged.some((i) => i.risk_types.includes('allergen') && i.risk_level === 'low')

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <div className="flex flex-wrap gap-2 justify-center">
        <span className={`${FILL_CHIP} bg-beauty!`}>{t('beauty.badge')}</span>
        {risk.incomplete && (
          <span className={`${FILL_CHIP} bg-citron!`}>{t('score.incomplete')}</span>
        )}
        {risk.rinse_off && <span className="pop-chip">{t('beauty.rinseOff')}</span>}
      </div>

      <div className="flex flex-col md:grid md:grid-cols-[auto_1fr] md:items-center gap-6 md:gap-8">
        <Ring score={risk.total} label={label} fill={fill} />
        <div className="space-y-3">
          <p className="font-display text-base font-bold" style={{ color: ink }}>
            {capKey ? t(capKey) : t('beauty.clean')}
          </p>
          {risk.cap_reason && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{risk.cap_reason.inci_name}</span>
              {' — '}{t(levelKey(risk.cap_reason.risk_level))}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t('beauty.scoreHint')}</p>
          {risk.incomplete && <p className="text-xs font-semibold text-score-mediocre-ink">{t('beauty.incompleteDesc')}</p>}
        </div>
      </div>

      {/* Compteurs par niveau : la composition se lit d'un coup d'œil (maquette fiche mobile) */}
      <div className="grid grid-cols-4 gap-1.5">
        {([
          ['banned', risk.counts.banned ?? 0, 'beauty.tile.banned', LEVEL_FILL.banned],
          ['risk', (risk.counts.high ?? 0) + (risk.counts.moderate ?? 0), 'beauty.tile.risk', LEVEL_FILL.moderate],
          ['low', risk.counts.low ?? 0, 'beauty.tile.low', LEVEL_FILL.low],
          ['none', risk.counts.none ?? 0, 'beauty.tile.none', LEVEL_FILL.none],
        ] as const).map(([key, n, labelKey, tileFill]) => (
          // Tuile en aplat Marché Pop (texte encre) ; neutre quand le compteur est à zéro
          <div
            key={key}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-[14px] border-2 px-1 py-2',
              n > 0 ? 'border-encre text-encre' : 'border-line/30 bg-muted text-muted-foreground'
            )}
            style={n > 0 ? { backgroundColor: tileFill } : undefined}
          >
            <span className="font-display text-lg font-extrabold leading-none">{n}</span>
            <span className="text-center text-[10px] font-semibold leading-tight">{t(labelKey)}</span>
          </div>
        ))}
      </div>
      <p className="-mt-3 text-center text-xs text-muted-foreground">
        {risk.matched_count}/{risk.token_count} {t('inci.count')}
      </p>

      {/* Alertes profil santé */}
      {profile && ((profile.avoidEndocrine && hasEndocrine) || (profile.avoidFragranceAllergens && hasFragranceAllergen)) && (
        <div className="rounded-2xl border-2 border-encre bg-tomate p-4 space-y-1 text-encre shadow-[var(--shadow-card)]" role="alert">
          {profile.avoidEndocrine && hasEndocrine && (
            <p className="text-sm font-semibold">{t('beauty.profileEndocrine')}</p>
          )}
          {profile.avoidFragranceAllergens && hasFragranceAllergen && (
            <p className="text-sm font-semibold">{t('beauty.profileAllergen')}</p>
          )}
        </div>
      )}

      {/* Ingrédients à surveiller */}
      {flagged.length > 0 && (
        <div className="space-y-2 border-t pt-5">
          <h3 className="text-sm font-medium text-foreground">{t('beauty.worst')} ({flagged.length})</h3>
          <ul className="space-y-2">
            {detailed.map((i) => (
              <li key={`${i.inci_name}-${i.rank}`} className="rounded-xl border-[1.5px] border-line bg-background/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <a href={`/ingredients-cosmetiques/${encodeURIComponent(i.inci_name)}`} className="font-semibold text-sm hover:text-brand-ink hover:underline">
                    {i.inci_name}
                  </a>
                  {i.name_fr && <span className="text-xs text-muted-foreground">{i.name_fr}</span>}
                  <span className={`${FILL_CHIP} ms-auto`} style={{ backgroundColor: LEVEL_FILL[i.risk_level] ?? SCORE_NONE }}>{t(levelKey(i.risk_level))}</span>
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
          {minor.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {minor.map((i) => (
                <a
                  key={`${i.inci_name}-${i.rank}`}
                  href={`/ingredients-cosmetiques/${encodeURIComponent(i.inci_name)}`}
                  title={[i.name_fr, ...i.risk_types.map((ty) => { const k = typeKey(ty); return k ? t(k) : ty })].filter(Boolean).join(' · ')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-citron/10 px-2.5 py-1 text-xs font-semibold hover:bg-citron/25"
                >
                  <span className="h-2 w-2 rounded-full bg-citron" />
                  {i.inci_name}
                  {i.risk_types[0] && (() => { const k = typeKey(i.risk_types[0]); return k ? <span className="font-normal text-muted-foreground">{t(k)}</span> : null })()}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {risk.unknown.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">{t('beauty.unknown')} ({risk.unknown.length})</h3>
          <p className="text-xs text-muted-foreground">{risk.unknown.join(', ')}</p>
          <p className="text-[11px] text-muted-foreground">{t('beauty.unknownHint')}</p>
        </div>
      )}

      <a
        href={`/contribuer/${barcode}`}
        className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-encre bg-beauty px-5 text-sm font-bold text-beauty-foreground shadow-[var(--shadow-card)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
        {t('beauty.completeCta')}
      </a>

      <p className="text-[11px] text-muted-foreground border-t pt-4">{t('beauty.disclaimer')}</p>
    </div>
  )
}
