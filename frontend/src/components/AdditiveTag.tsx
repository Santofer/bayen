/**
 * Badge additif avec indicateur de risque coloré
 * Utilisé dans la liste des additifs et les fiches produit
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { RiskLevel } from '@/lib/types'

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

const RISK_LABELS: Record<RiskLevel, string> = {
  safe: 'Sûr',
  limited: 'Limité',
  avoid: 'À éviter',
  banned_ma: 'Interdit MA',
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

export { RISK_LABELS, RISK_VARIANTS, RISK_ICONS }
