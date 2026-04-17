/**
 * Affichage du score Bayen (0–100) — composant complet
 *
 * - Cercle animé 0–100, coloré selon niveau
 * - Barre Nutri-Score A→E
 * - Pastilles NOVA 1→4
 * - Liste additifs avec badge risque
 * - Points positifs / négatifs
 * - Badge "Non vérifié" si confidence_score < 0.8
 *
 * Couleurs :
 *   75–100 : #476a32 (excellent)
 *   50–74  : #b1cf3a (bon)
 *   25–49  : #f97316 (médiocre)
 *   0–24   : #ef4444 (mauvais)
 *
 * Référence : SPEC.md §9
 */

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import type { ScoreResult, RiskLevel, NutriScoreGrade, NovaGroup, AdditiveResult } from '@/lib/types'

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface ScoreDisplayProps {
  score: ScoreResult
  /** Score de confiance des données (0–1) */
  confidenceScore?: number | null
  /** Origine de la donnée ('off', 'community', 'ocr_tesseract', 'manual') */
  dataSource?: string | null
  /** Classes CSS additionnelles */
  className?: string
}

// ────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────

const SCORE_COLORS: Record<string, string> = {
  excellent: '#476a32',
  bon: '#b1cf3a',
  'médiocre': '#f97316',
  mauvais: '#ef4444',
}

const NUTRISCORE_COLORS: Record<NutriScoreGrade, string> = {
  A: '#038141',
  B: '#85bb2f',
  C: '#fecb02',
  D: '#ee8100',
  E: '#e63e11',
}

const NUTRISCORE_LABELS: Record<NutriScoreGrade, string> = {
  A: 'Excellente qualité nutritionnelle',
  B: 'Bonne qualité nutritionnelle',
  C: 'Qualité nutritionnelle moyenne',
  D: 'Qualité nutritionnelle médiocre',
  E: 'Mauvaise qualité nutritionnelle',
}

const NOVA_LABELS: Record<NovaGroup, string> = {
  1: 'Non transformé',
  2: 'Ingrédient culinaire',
  3: 'Transformé',
  4: 'Ultra-transformé',
}

const NOVA_COLORS: Record<NovaGroup, string> = {
  1: '#476a32',
  2: '#b1cf3a',
  3: '#f97316',
  4: '#ef4444',
}

const RISK_VARIANTS: Record<RiskLevel, 'safe' | 'limited' | 'avoid' | 'banned'> = {
  safe: 'safe',
  limited: 'limited',
  avoid: 'avoid',
  banned_ma: 'banned',
}

// ────────────────────────────────────────────────────────────────
// Sous-composants
// ────────────────────────────────────────────────────────────────

/** Cercle animé du score global */
function ScoreCircle({ score, label, color }: { score: number; label: string; color: string }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = (animatedScore / 100) * circumference
  const strokeDashoffset = circumference - progress

  // Animation du score au montage
  useEffect(() => {
    let frame: number
    const start = performance.now()
    const duration = 800

    function animate(now: number) {
      const elapsed = now - start
      const t = Math.min(elapsed / duration, 1)
      // Easing out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setAnimatedScore(Math.round(score * eased))
      if (t < 1) {
        frame = requestAnimationFrame(animate)
      }
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [score])

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Cercle de fond */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/30"
          />
          {/* Cercle de progression */}
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
          />
        </svg>
        {/* Score au centre */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color }}>
            {animatedScore}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      {/* Label */}
      <span
        className="text-sm font-semibold uppercase tracking-wide"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  )
}

/** Badge Nutri-Score officiel (SVG Open Food Facts) */
function NutriScoreBar({ grade }: { grade: NutriScoreGrade }) {
  const { t } = useLocale()
  const nutriscoreKeys: Record<NutriScoreGrade, 'nutriscore.a' | 'nutriscore.b' | 'nutriscore.c' | 'nutriscore.d' | 'nutriscore.e'> = {
    A: 'nutriscore.a', B: 'nutriscore.b', C: 'nutriscore.c', D: 'nutriscore.d', E: 'nutriscore.e',
  }
  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium text-foreground">{t('nutriscore.title')}</h3>
      <img
        src={`/badges/nutriscore-${grade.toLowerCase()}.svg`}
        alt={`Nutri-Score ${grade}`}
        className="h-12 w-auto"
        loading="lazy"
      />
      <p className="text-xs text-muted-foreground">{t(nutriscoreKeys[grade])}</p>
    </div>
  )
}

/** Badge NOVA officiel (SVG Open Food Facts) */
function NovaDisplay({ group }: { group: NovaGroup | null }) {
  const { t } = useLocale()
  const novaKeys: Record<NovaGroup, 'nova.1' | 'nova.2' | 'nova.3' | 'nova.4'> = {
    1: 'nova.1', 2: 'nova.2', 3: 'nova.3', 4: 'nova.4',
  }
  if (group == null) {
    return (
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium text-foreground">{t('nova.title')}</h3>
        <p className="text-xs text-muted-foreground">Groupe NOVA non déterminé</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium text-foreground">{t('nova.title')}</h3>
      <img
        src={`/badges/nova-group-${group}.svg`}
        alt={`NOVA ${group}`}
        className="h-20 w-auto"
        loading="lazy"
      />
      <p className="text-xs text-muted-foreground">{t(novaKeys[group])}</p>
    </div>
  )
}

/** Liste des additifs avec badges de risque */
function AdditivesList({ additives }: { additives: AdditiveResult[] }) {
  const { t } = useLocale()
  const riskKeys: Record<RiskLevel, 'additives.safe' | 'additives.limited' | 'additives.avoid' | 'additives.banned'> = {
    safe: 'additives.safe', limited: 'additives.limited', avoid: 'additives.avoid', banned_ma: 'additives.banned',
  }

  if (!additives || additives.length === 0) {
    return (
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium text-foreground">{t('additives.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('additives.none')}</p>
      </div>
    )
  }

  // Trier : les plus risqués d'abord
  const riskOrder: Record<RiskLevel, number> = {
    banned_ma: 0,
    avoid: 1,
    limited: 2,
    safe: 3,
  }
  const sorted = [...additives].sort(
    (a, b) => riskOrder[a.risk_level] - riskOrder[b.risk_level]
  )

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">
        {t('additives.title')} ({additives.length})
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((additive) => (
          <Badge
            key={additive.code}
            variant={RISK_VARIANTS[additive.risk_level]}
          >
            {additive.code}
            <span className="ml-1 opacity-75">
              {t(riskKeys[additive.risk_level])}
            </span>
          </Badge>
        ))}
      </div>
    </div>
  )
}

/** Points positifs / négatifs du score */
function ScoreBreakdown({ score }: { score: ScoreResult }) {
  const { t } = useLocale()
  const items = [
    {
      label: t('nutriscore.title'),
      points: score.nutriscore_points,
      max: 50,
      positive: score.nutriscore_points >= 30,
    },
    {
      label: `${t('nova.title')}`,
      points: score.nova_points,
      max: 30,
      positive: score.nova_points >= 20,
    },
    {
      label: t('additives.title'),
      points: score.additives_points,
      max: 20,
      positive: score.additives_points >= 14,
    },
  ]

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">{t('product.scoreDetail')}</h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            {/* Indicateur +/- */}
            <span
              className={cn(
                'w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-white',
                item.positive ? 'bg-[#476a32]' : 'bg-red-500'
              )}
            >
              {item.positive ? '+' : '−'}
            </span>
            {/* Label */}
            <span className="flex-1 text-sm text-foreground">{item.label}</span>
            {/* Barre de progression */}
            <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.points / item.max) * 100}%`,
                  backgroundColor: item.positive ? '#476a32' : '#ef4444',
                }}
              />
            </div>
            {/* Score */}
            <span className="text-xs font-mono text-muted-foreground w-10 text-right">
              {item.points}/{item.max}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────────

export default function ScoreDisplay({
  score,
  confidenceScore,
  dataSource,
  className,
}: ScoreDisplayProps) {
  const { t } = useLocale()
  const color = SCORE_COLORS[score.label] ?? SCORE_COLORS.mauvais

  // Badge "Vérifié" : données confirmées 3× par la communauté (confidence ≥ 0.8)
  const isVerified = confidenceScore != null && confidenceScore >= 0.8
  // Badge "Non vérifié" : uniquement pour les contributions manuelles/OCR
  // non encore confirmées. Pas affiché pour les imports OFF qui sont la
  // source de référence (sinon le badge apparaît partout → bruit).
  const isCommunityUnverified =
    !isVerified &&
    confidenceScore != null &&
    confidenceScore < 0.8 &&
    dataSource != null &&
    ['community', 'ocr_tesseract', 'manual'].includes(dataSource)

  // Traduire le label du score
  const scoreLabelKeys: Record<string, 'score.excellent' | 'score.bon' | 'score.mediocre' | 'score.mauvais'> = {
    excellent: 'score.excellent',
    bon: 'score.bon',
    'médiocre': 'score.mediocre',
    mauvais: 'score.mauvais',
  }
  const translatedLabel = scoreLabelKeys[score.label] ? t(scoreLabelKeys[score.label]) : score.label

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Badges d'avertissement */}
      <div className="flex flex-wrap gap-2 justify-center">
        {score.incomplete && (
          <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
            {t('score.incomplete')}
          </Badge>
        )}
        {isVerified && (
          <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
            {t('score.verified')}
          </Badge>
        )}
        {isCommunityUnverified && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            {t('score.unverified')}
          </Badge>
        )}
      </div>

      {/* Cercle de score */}
      <ScoreCircle
        score={score.total}
        label={translatedLabel}
        color={color}
      />

      {/* Nutri-Score */}
      <NutriScoreBar grade={score.nutriscore_grade} />

      {/* NOVA */}
      <NovaDisplay group={score.nova_group} />

      {/* Détail du score */}
      <ScoreBreakdown score={score} />

      {/* Additifs */}
      <AdditivesList additives={score.additives_detail ?? []} />
    </div>
  )
}
