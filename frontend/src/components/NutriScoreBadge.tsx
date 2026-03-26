/**
 * Badge Nutri-Score officiel (SVG Open Food Facts)
 * Grades : A, B, C, D, E
 */

interface NutriScoreBadgeProps {
  grade: string | null | undefined
  /** Hauteur en pixels (défaut: 48) */
  height?: number
  className?: string
}

export default function NutriScoreBadge({ grade, height = 48, className }: NutriScoreBadgeProps) {
  const g = grade?.toUpperCase()
  if (!g || !['A', 'B', 'C', 'D', 'E'].includes(g)) return null

  return (
    <img
      src={`/badges/nutriscore-${g.toLowerCase()}.svg`}
      alt={`Nutri-Score ${g}`}
      height={height}
      style={{ height: `${height}px`, width: 'auto' }}
      className={className}
      loading="lazy"
    />
  )
}
