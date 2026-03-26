/**
 * Badge NOVA officiel (SVG Open Food Facts)
 * Groupes : 1, 2, 3, 4
 */

interface NovaBadgeProps {
  group: number | null | undefined
  /** Hauteur en pixels (défaut: 48) */
  height?: number
  className?: string
}

export default function NovaBadge({ group, height = 48, className }: NovaBadgeProps) {
  if (!group || group < 1 || group > 4) return null

  return (
    <img
      src={`/badges/nova-group-${group}.svg`}
      alt={`NOVA ${group}`}
      height={height}
      style={{ height: `${height}px`, width: 'auto' }}
      className={className}
      loading="lazy"
    />
  )
}
