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
 *   75–100 : #16a34a (excellent)
 *   50–74  : #84cc16 (bon)
 *   25–49  : #f97316 (médiocre)
 *   0–24   : #ef4444 (mauvais)
 *
 * Référence : SPEC.md §9
 */

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ScoreResult, RiskLevel, NutriScoreGrade, NovaGroup, AdditiveResult } from '@/lib/types'

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface ScoreDisplayProps {
  score: ScoreResult
  /** Score de confiance des données (0–1). Badge "Non vérifié" si < 0.8 */
  confidenceScore?: number | null
  /** Classes CSS additionnelles */
  className?: string
}

// ────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────

const SCORE_COLORS: Record<string, string> = {
  excellent: '#16a34a',
  bon: '#84cc16',
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
  1: '#16a34a',
  2: '#84cc16',
  3: '#f97316',
  4: '#ef4444',
}

const RISK_LABELS: Record<RiskLevel, string> = {
  safe: 'Sûr',
  limited: 'Limité',
  avoid: 'À éviter',
  banned_ma: 'Interdit MA',
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

/** Barre Nutri-Score A→E */
function NutriScoreBar({ grade }: { grade: NutriScoreGrade }) {
  const grades: NutriScoreGrade[] = ['A', 'B', 'C', 'D', 'E']

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium text-foreground">Nutri-Score</h3>
      <div className="flex gap-1">
        {grades.map((g) => {
          const isActive = g === grade
          return (
            <div
              key={g}
              className={cn(
                'flex-1 flex items-center justify-center rounded-md py-1.5 text-xs font-bold transition-all',
                isActive ? 'scale-110 shadow-md' : 'opacity-40'
              )}
              style={{
                backgroundColor: NUTRISCORE_COLORS[g],
                color: g === 'C' && isActive ? '#000' : '#fff',
              }}
            >
              {g}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{NUTRISCORE_LABELS[grade]}</p>
    </div>
  )
}

/** Pastilles NOVA 1→4 */
function NovaDisplay({ group }: { group: NovaGroup | null }) {
  if (group == null) {
    return (
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium text-foreground">NOVA</h3>
        <p className="text-xs text-muted-foreground">Groupe NOVA non déterminé</p>
      </div>
    )
  }

  const groups: NovaGroup[] = [1, 2, 3, 4]

  return (
    <div className="space-y-1.5">
      <h3 className="text-sm font-medium text-foreground">Transformation NOVA</h3>
      <div className="flex gap-1.5">
        {groups.map((g) => {
          const isActive = g === group
          return (
            <div
              key={g}
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-full text-xs font-bold transition-all',
                isActive ? 'scale-110 shadow-md ring-2 ring-offset-2' : 'opacity-30'
              )}
              style={{
                backgroundColor: NOVA_COLORS[g],
                color: '#fff',
                ringColor: isActive ? NOVA_COLORS[g] : undefined,
              }}
            >
              {g}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">{NOVA_LABELS[group]}</p>
    </div>
  )
}

/** Liste des additifs avec badges de risque */
function AdditivesList({ additives }: { additives: AdditiveResult[] }) {
  if (additives.length === 0) {
    return (
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium text-foreground">Additifs</h3>
        <p className="text-xs text-muted-foreground">Aucun additif détecté</p>
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
        Additifs ({additives.length})
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {sorted.map((additive) => (
          <Badge
            key={additive.code}
            variant={RISK_VARIANTS[additive.risk_level]}
          >
            {additive.code}
            <span className="ml-1 opacity-75">
              {RISK_LABELS[additive.risk_level]}
            </span>
          </Badge>
        ))}
      </div>
    </div>
  )
}

/** Points positifs / négatifs du score */
function ScoreBreakdown({ score }: { score: ScoreResult }) {
  const items = [
    {
      label: 'Nutri-Score',
      points: score.nutriscore_points,
      max: 50,
      positive: score.nutriscore_points >= 30,
    },
    {
      label: 'Transformation (NOVA)',
      points: score.nova_points,
      max: 30,
      positive: score.nova_points >= 20,
    },
    {
      label: 'Additifs',
      points: score.additives_points,
      max: 20,
      positive: score.additives_points >= 14,
    },
  ]

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-foreground">Détail du score</h3>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            {/* Indicateur +/- */}
            <span
              className={cn(
                'w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold text-white',
                item.positive ? 'bg-green-500' : 'bg-red-500'
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
                  backgroundColor: item.positive ? '#16a34a' : '#ef4444',
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
  className,
}: ScoreDisplayProps) {
  const color = SCORE_COLORS[score.label] ?? SCORE_COLORS.mauvais
  const isUnverified = confidenceScore != null && confidenceScore < 0.8

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Badges d'avertissement */}
      <div className="flex flex-wrap gap-2 justify-center">
        {score.incomplete && (
          <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
            Score incomplet
          </Badge>
        )}
        {isUnverified && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
            Non vérifié
          </Badge>
        )}
      </div>

      {/* Cercle de score */}
      <ScoreCircle
        score={score.total}
        label={score.label}
        color={color}
      />

      {/* Nutri-Score */}
      <NutriScoreBar grade={score.nutriscore_grade} />

      {/* NOVA */}
      <NovaDisplay group={score.nova_group} />

      {/* Détail du score */}
      <ScoreBreakdown score={score} />

      {/* Additifs */}
      <AdditivesList additives={score.additives_detail} />
    </div>
  )
}
