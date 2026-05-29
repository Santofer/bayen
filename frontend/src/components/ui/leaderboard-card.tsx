/**
 * Carte leaderboard Bayen — titre, période, podium top 3, classement complet.
 * Adapté de l'API fournie (21st.dev) au design system Bayen.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  LeaderboardPodium,
  type LeaderboardRanking as LeaderboardPodiumRanking,
} from '@/components/ui/leaderboard-podium'
import {
  LeaderboardRankings,
  type LeaderboardRankingItem,
} from '@/components/ui/leaderboard-rankings'

interface LeaderboardRunOption {
  id: string
  label: string
}

interface LeaderboardCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  fromDate?: string | Date
  toDate?: string | Date
  podiumRankings: LeaderboardPodiumRanking[]
  rankings: LeaderboardRankingItem[]
  currentUserId?: string
  valueSuffix?: string
  runOptions?: LeaderboardRunOption[]
  selectedRunId?: string
  onRunChange?: (runId: string) => void
}

function formatRangeDate(date: string | Date) {
  const parsed = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })
}

const LeaderboardCard = React.forwardRef<HTMLDivElement, LeaderboardCardProps>(
  (
    {
      className,
      title = 'Classement',
      subtitle,
      fromDate,
      toDate,
      podiumRankings,
      rankings,
      currentUserId,
      valueSuffix,
      runOptions,
      selectedRunId,
      onRunChange,
      ...props
    },
    ref
  ) => {
    const rangeLabel =
      fromDate && toDate ? `${formatRangeDate(fromDate)} – ${formatRangeDate(toDate)}` : subtitle

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl border bg-card p-5 shadow-sm sm:p-6', className)}
        {...props}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {rangeLabel && <p className="text-sm text-muted-foreground">{rangeLabel}</p>}
          </div>

          {runOptions && runOptions.length > 0 && (
            <select
              aria-label="Choisir la période"
              value={selectedRunId ?? runOptions[0]?.id}
              onChange={(e) => onRunChange?.(e.target.value)}
              className="rounded-md border bg-background px-3 py-1.5 text-sm text-foreground"
            >
              {runOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {podiumRankings.length > 0 && (
          <LeaderboardPodium rankings={podiumRankings} className="mb-6" />
        )}

        <LeaderboardRankings
          rankings={rankings}
          currentUserId={currentUserId}
          valueSuffix={valueSuffix}
          showPagination={rankings.length > 10}
          defaultPageSize={10}
        />
      </div>
    )
  }
)

LeaderboardCard.displayName = 'LeaderboardCard'

export { LeaderboardCard }
export type { LeaderboardCardProps, LeaderboardRunOption }
