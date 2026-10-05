/**
 * Badge additif avec indicateur de risque coloré
 * Utilisé dans la liste des additifs et les fiches produit
 */

import { useLocale } from '@/lib/i18n'
import type { RiskLevel } from '@/lib/types'
import type { TranslationKey } from '@/lib/translations'

interface AdditiveTagProps {
  code: string
  name?: string
  riskLevel: RiskLevel
  showName?: boolean
  className?: string
}

const RISK_VARIANTS: Record<RiskLevel, 'safe' | 'limited' | 'avoid' | 'banned'> = {
  safe: 'safe',
  limited: 'limited',
  avoid: 'avoid',
  banned_ma: 'banned',
}

/**
 * Aplat Marché Pop par niveau de risque (texte encre posé dessus), du plus
 * sûr au plus grave : menthe, citron, orange, tomate. Variables CSS : valables
 * en style inline (fond, bordure) et identiques dans les deux thèmes.
 */
const RISK_FILL: Record<RiskLevel, string> = {
  safe: 'var(--color-score-excellent)',
  limited: 'var(--color-citron)',
  avoid: 'var(--color-score-mediocre)',
  banned_ma: 'var(--color-score-mauvais)',
}

const RISK_LABEL_KEYS: Record<RiskLevel, TranslationKey> = {
  safe: 'additives.safe',
  limited: 'additives.limited',
  avoid: 'additives.avoid',
  banned_ma: 'additives.banned',
}

const RISK_ICONS: Record<RiskLevel, string> = {
  safe: '✓',
  limited: '⚠',
  avoid: '✗',
  banned_ma: '⛔',
}

export default function AdditiveTag({
  code,
  name,
  riskLevel,
  showName = false,
  className,
}: AdditiveTagProps) {
  const { t } = useLocale()

  // `!` : .pop-chip est une règle globale hors calque Tailwind
  return (
    <span
      className={`pop-chip border-encre! text-encre! ${className ?? ''}`}
      style={{ backgroundColor: RISK_FILL[riskLevel] }}
      title={t(RISK_LABEL_KEYS[riskLevel])}
    >
      <span className="font-bold">{code}</span>
      {showName && name && (
        <span className="font-normal opacity-80">— {name}</span>
      )}
      <span className="text-[10px] opacity-70" aria-hidden="true">{RISK_ICONS[riskLevel]}</span>
    </span>
  )
}

export { RISK_VARIANTS, RISK_ICONS, RISK_LABEL_KEYS, RISK_FILL }
