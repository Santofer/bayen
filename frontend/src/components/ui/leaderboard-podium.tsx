/**
 * Podium top 3 du leaderboard Bayen.
 * Design : avatars à initiales (pas de dépendance), 1er au centre surélevé
 * avec couronne, 2e à gauche, 3e à droite. Palette Bayen (vert/crème).
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

// Couleurs de médaille par position
const MEDAL = {
  1: { ring: '#d4af37', bg: 'linear-gradient(135deg,#f5d976,#d4af37)', label: 'text-[#8a6d1b]' },
  2: { ring: '#9ca3af', bg: 'linear-gradient(135deg,#e5e7eb,#9ca3af)', label: 'text-[#6b7280]' },
  3: { ring: '#cd7f32', bg: 'linear-gradient(135deg,#e0a878,#cd7f32)', label: 'text-[#8a5523]' },
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
            className="absolute -top-5 h-6 w-6 text-[#d4af37]"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M2 7l4.5 4L12 4l5.5 7L22 7l-2 12H4L2 7z" />
          </svg>
        )}
        <div
          className={cn(
            'flex items-center justify-center rounded-full font-bold text-white shadow-md ring-2',
            avatarSize
          )}
          style={{ background: medal.bg, boxShadow: `0 0 0 2px ${medal.ring}` }}
        >
          {initials(ranking.userName)}
        </div>
        <span
          className={cn(
            'mt-1 flex h-5 w-5 items-center justify-center rounded-full bg-card text-[11px] font-bold shadow',
            medal.label
          )}
        >
          {ranking.rank}
        </span>
      </div>

      {/* Nom + valeur */}
      <p className="max-w-[6.5rem] truncate text-center text-xs font-semibold text-foreground">
        {ranking.userName}
      </p>
      <p className="text-center text-xs font-bold text-primary">{formatValue(ranking.value)}</p>

      {/* Socle */}
      <div
        className={cn(
          'w-full max-w-[5.5rem] rounded-t-lg border border-b-0 bg-gradient-to-b from-primary/15 to-primary/5',
          heightClass
        )}
      />
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
        className={cn('flex items-end justify-center gap-2 px-2 pt-6', className)}
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
