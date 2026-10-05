/**
 * Affichage du score Bayen (0–100) — composant complet
 *
 * - Pastille de score 0–100 (chiffre animé + mot), aplat selon niveau
 * - Barre Nutri-Score A→E
 * - Pastilles NOVA 1→4
 * - Liste additifs avec badge risque
 * - Points positifs / négatifs
 * - Badge "Non vérifié" si confidence_score < 0.8
 *
 * Couleurs : système « Marché Pop » de score-colors.ts (aplats + texte encre),
 * pastille inclinée `.score-sticker.lg`, barres à contour encre.
 *
 * Référence : SPEC.md §9
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { SCORE_FILL } from '@/lib/score-colors'
import { ScoreSticker } from '@/components/ProductCard'
import { RISK_FILL } from '@/components/AdditiveTag'
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
  /** La pastille est déjà affichée ailleurs (en-tête de la fiche) : ne pas la répéter */
  hideBadge?: boolean
}

// ────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────

// Puce de statut posée sur un aplat : texte et contour encre (règle globale
// .pop-chip hors calque → `!` ; ne pas passer dans cn())
const STATUS_CHIP = 'pop-chip border-encre! text-encre!'

// ────────────────────────────────────────────────────────────────
// Sous-composants
// ────────────────────────────────────────────────────────────────

/** Pastille Marché Pop du score global : chiffre animé au montage + mot */
function ScoreBadge({ score, label }: { score: number; label: string }) {
  const [animatedScore, setAnimatedScore] = useState(0)

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

  // La couleur suit le score final (pas le chiffre animé, sinon elle clignote)
  return (
    <div className="flex justify-center md:px-2">
      <ScoreSticker score={score} value={animatedScore} word={label} size="lg" />
    </div>
  )
}

/** Badge Nutri-Score officiel (SVG Open Food Facts) */
function NutriScoreBar({ grade }: { grade: NutriScoreGrade | null }) {
  const { t } = useLocale()
  const nutriscoreKeys: Record<NutriScoreGrade, 'nutriscore.a' | 'nutriscore.b' | 'nutriscore.c' | 'nutriscore.d' | 'nutriscore.e'> = {
    A: 'nutriscore.a', B: 'nutriscore.b', C: 'nutriscore.c', D: 'nutriscore.d', E: 'nutriscore.e',
  }
  // Pas de données nutritionnelles → pas de Nutri-Score (on n'invente pas un E).
  if (grade == null) {
    return (
      <div className="space-y-1.5">
        <h3 className="text-sm font-medium text-foreground">{t('nutriscore.title')}</h3>
        <p className="text-xs text-muted-foreground">{t('nutriscore.unavailable')}</p>
      </div>
    )
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
          <span
            key={additive.code}
            className="pop-chip border-encre! text-encre!"
            style={{ backgroundColor: RISK_FILL[additive.risk_level] }}
          >
            <b>{additive.code}</b>
            <span className="opacity-80">{t(riskKeys[additive.risk_level])}</span>
          </span>
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
    <div className="space-y-3.5">
      <h3 className="text-sm font-medium text-foreground">{t('product.scoreDetail')}</h3>
      {items.map((item) => {
        const ratio = item.points / item.max
        // Aplat gradué (mêmes seuils qu'avant) : menthe → vert pomme → orange → tomate
        const barColor =
          ratio >= 0.7 ? SCORE_FILL.excellent : ratio >= 0.45 ? SCORE_FILL.bon : ratio >= 0.2 ? SCORE_FILL.mediocre : SCORE_FILL.mauvais
        return (
          <div key={item.label} className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1">
            <span className="text-sm font-semibold text-foreground">{item.label}</span>
            <span className="text-[13px] tabular-nums text-muted-foreground">
              <b className="text-foreground">{item.points}</b> / {item.max} pts
            </span>
            {/* Barre à contour encre (maquette FichePop) */}
            <div className="col-span-2 h-2.5 overflow-hidden rounded-full border-[1.5px] border-line bg-muted">
              <div
                className="h-full transition-all duration-500"
                style={{ width: `${Math.max(ratio * 100, 2)}%`, backgroundColor: barColor }}
              />
            </div>
          </div>
        )
      })}
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
  hideBadge = false,
}: ScoreDisplayProps) {
  const { t } = useLocale()

  // Non évalué : aucune donnée exploitable → on n'invente pas de score.
  if (score.unscored || score.total == null || score.label == null) {
    return (
      <div className={cn('flex flex-col items-center text-center gap-4 py-4', className)}>
        {/* Naânaa à la loupe : la fiche existe mais les données manquent */}
        <div className="naanaa text-start">
          <img src="/mascotte/naanaa-loupe.webp" alt="" width="72" height="106" />
          <div className="bubble">
            <p className="font-display text-base font-bold text-foreground">{t('score.notEvaluated')}</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t('score.notEvaluatedDesc')}</p>
          </div>
        </div>
        <a href="/contribuer" className="btn-pop">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {t('score.contributeData')}
        </a>
      </div>
    )
  }

  // Badge "Vérifié" : données confirmées 3× par la communauté (confidence ≥ 0.8)
  const isVerified = confidenceScore != null && confidenceScore >= 0.8
  // Badge "Non vérifié" : uniquement pour les contributions manuelles/OCR
  // non encore confirmées. Pas affiché pour les imports OFF qui sont la
  // source de référence (sinon le badge apparaît partout → bruit).
  const isAiEstimate = dataSource === 'ai_estimate'
  const isCommunityUnverified =
    !isVerified &&
    !isAiEstimate &&
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
        {isAiEstimate && (
          <span className={`${STATUS_CHIP} bg-ai!`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/></svg>
            {t('score.aiEstimate')}
          </span>
        )}
        {score.incomplete && !isAiEstimate && (
          <span className={`${STATUS_CHIP} bg-citron!`}>{t('score.incomplete')}</span>
        )}
        {isVerified && (
          <span className={`${STATUS_CHIP} bg-menthe!`}>{t('score.verified')}</span>
        )}
        {isCommunityUnverified && (
          <span className={`${STATUS_CHIP} bg-framboise!`}>{t('score.unverified')}</span>
        )}
      </div>

      {/* Panneau score façon maquette : grosse pastille à gauche, barres détaillées à droite */}
      <div className={hideBadge ? 'flex flex-col gap-6' : 'flex flex-col md:grid md:grid-cols-[auto_1fr] md:items-center gap-6 md:gap-8'}>
        {!hideBadge && <ScoreBadge score={score.total} label={translatedLabel} />}
        <ScoreBreakdown score={score} />
      </div>

      {/* Nutri-Score + NOVA côte à côte */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t pt-5">
        <NutriScoreBar grade={score.nutriscore_grade} />
        <NovaDisplay group={score.nova_group} />
      </div>

      {/* Additifs */}
      <AdditivesList additives={score.additives_detail ?? []} />
    </div>
  )
}
