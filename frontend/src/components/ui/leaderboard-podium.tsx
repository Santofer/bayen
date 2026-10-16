/**
 * Podium top 3 du leaderboard Bayen.
 * Design : avatars à initiales (pas de dépendance), 1er au centre surélevé
 * avec couronne, 2e à gauche, 3e à droite. Marché Pop : or = citron,
 * argent = gris, bronze = orange (tokens rank-1/2/3), texte encre.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface LeaderboardRanking {
  userId: string
  userName: string
  rank: number
  value: number
}

interface LeaderboardPodiumProps extends React.HTMLAttributes<HTMLDivElement> {
  rankings: LeaderboardRanking[]
}

// Aplat de médaille par position (texte encre posé dessus)
const MEDAL = {
  1: 'bg-rank-1',
  2: 'bg-rank-2',
  3: 'bg-rank-3',
} as const

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatValue(v: number): string {
  return v.toLocaleString('fr-FR')
}

function PodiumColumn({
  ranking,
  heightClass,
  avatarSize,
  showCrown,
}: {
  ranking: LeaderboardRanking | undefined
  heightClass: string
  avatarSize: string
  showCrown?: boolean
}) {
  if (!ranking) return <div className="flex-1" />
  const medal = MEDAL[ranking.rank as 1 | 2 | 3] ?? MEDAL[3]

  return (
    <div className="flex flex-1 flex-col items-center justify-end gap-2">
      {/* Avatar + couronne */}
      <div className="relative flex flex-col items-center">
        {showCrown && (
          <svg
            className="absolute -top-6 h-7 w-7 -rotate-8 fill-rank-1 stroke-encre"
            viewBox="0 0 24 24"
            strokeWidth="1.8"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M2 7l4.5 4L12 4l5.5 7L22 7l-2 12H4L2 7z" />
          </svg>
        )}
        <div
          className={cn(
            'flex items-center justify-center rounded-full border-2 border-encre font-display font-extrabold text-encre shadow-[var(--shadow-card)]',
            medal,
            avatarSize
          )}
        >
          {initials(ranking.userName)}
        </div>
      </div>

      {/* Nom + valeur */}
      <p className="max-w-[6.5rem] truncate text-center text-xs font-semibold text-foreground">
        {ranking.userName}
      </p>
      <p className="font-display text-center text-xs font-bold text-foreground">{formatValue(ranking.value)} pts</p>

      {/* Socle : aplat de médaille, numéro en Unbounded */}
      <div
        className={cn(
          'flex w-full max-w-[5.5rem] items-start justify-center rounded-t-xl border-2 border-b-0 border-encre pt-1.5 font-display text-xl font-extrabold text-encre',
          medal,
          heightClass
        )}
      >
        {ranking.rank}
      </div>
    </div>
  )
}

const LeaderboardPodium = React.forwardRef<HTMLDivElement, LeaderboardPodiumProps>(
  ({ className, rankings, ...props }, ref) => {
    const byRank = (r: number) => rankings.find((x) => x.rank === r)
    const first = byRank(1)
    const second = byRank(2)
    const third = byRank(3)

    return (
      <div
        ref={ref}
        className={cn('flex items-end justify-center gap-2 border-b-2 border-line px-2 pt-8', className)}
        {...props}
      >
        <PodiumColumn ranking={second} heightClass="h-12" avatarSize="h-12 w-12 text-sm" />
        <PodiumColumn ranking={first} heightClass="h-20" avatarSize="h-16 w-16 text-base" showCrown />
        <PodiumColumn ranking={third} heightClass="h-8" avatarSize="h-12 w-12 text-sm" />
      </div>
    )
  }
)

LeaderboardPodium.displayName = 'LeaderboardPodium'

export { LeaderboardPodium }
