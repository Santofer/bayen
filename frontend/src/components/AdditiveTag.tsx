/**
 * Badge additif avec indicateur de risque coloré
 * Utilisé dans la liste des additifs et les fiches produit
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
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

  return (
    <Badge
      variant={RISK_VARIANTS[riskLevel]}
      className={cn('gap-1', className)}
    >
      <span className="font-bold">{code}</span>
      {showName && name && (
        <span className="font-normal opacity-80">— {name}</span>
      )}
      <span className="opacity-60 text-[10px]">{RISK_ICONS[riskLevel]}</span>
    </Badge>
  )
}

export { RISK_VARIANTS, RISK_ICONS, RISK_LABEL_KEYS }
