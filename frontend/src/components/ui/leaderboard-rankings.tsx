/**
 * Liste classée du leaderboard Bayen.
 * Chaque ligne : position, avatar initiales, nom + byline (rang), valeur.
 * La ligne de l'utilisateur courant est mise en évidence.
 * Pagination optionnelle.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface LeaderboardRankingItem {
  userId: string
  rank: number
  userName: string
  byline?: string
  value: number
  displayed?: boolean
  /** Couleur d'accent (ex: couleur du rang Bayen) */
  accentColor?: string
}

interface LeaderboardRankingsProps extends React.HTMLAttributes<HTMLDivElement> {
  rankings: LeaderboardRankingItem[]
  currentUserId?: string
  showPagination?: boolean
  defaultPageSize?: number
  valueSuffix?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function formatValue(v: number): string {
  return v.toLocaleString('fr-FR')
}

const LeaderboardRankings = React.forwardRef<HTMLDivElement, LeaderboardRankingsProps>(
  (
    {
      className,
      rankings,
      currentUserId,
      showPagination = false,
      defaultPageSize = 10,
      valueSuffix,
      ...props
    },
    ref
  ) => {
    const [page, setPage] = React.useState(0)
    const visible = rankings.filter((r) => r.displayed !== false)
    const pageSize = showPagination ? defaultPageSize : visible.length
    const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
    const safePage = Math.min(page, pageCount - 1)
    const slice = showPagination
      ? visible.slice(safePage * pageSize, safePage * pageSize + pageSize)
      : visible

    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {slice.map((item) => {
          const isCurrent = currentUserId && item.userId === currentUserId
          const accent = item.accentColor ?? 'var(--color-primary, #476a32)'
          return (
            <div
              key={item.userId}
              className={cn(
                'flex items-center gap-3 rounded-xl border p-3 transition-colors',
                isCurrent
                  ? 'border-primary/40 bg-primary/10 ring-1 ring-primary/20'
                  : 'bg-card hover:bg-accent/40'
              )}
            >
              {/* Position */}
              <div className="w-7 flex-shrink-0 text-center text-sm font-bold text-muted-foreground">
                {item.rank}
              </div>

              {/* Avatar */}
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: accent }}
              >
                {initials(item.userName)}
              </div>

              {/* Nom + byline */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{item.userName}</p>
                  {isCurrent && (
                    <span className="flex-shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      Toi
                    </span>
                  )}
                </div>
                {item.byline && (
                  <p className="truncate text-xs text-muted-foreground">{item.byline}</p>
                )}
              </div>

              {/* Valeur */}
              <div className="flex-shrink-0 text-right">
                <p className="text-base font-bold text-primary">{formatValue(item.value)}</p>
                {valueSuffix && (
                  <p className="text-[10px] text-muted-foreground">{valueSuffix}</p>
                )}
              </div>
            </div>
          )
        })}

        {/* Pagination */}
        {showPagination && pageCount > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-40"
            >
              ‹
            </button>
            <span className="text-xs text-muted-foreground">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-40"
            >
              ›
            </button>
          </div>
        )}
      </div>
    )
  }
)

LeaderboardRankings.displayName = 'LeaderboardRankings'

export { LeaderboardRankings }
