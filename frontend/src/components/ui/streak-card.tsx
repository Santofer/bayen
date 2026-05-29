/**
 * Carte de série (streak) Bayen — encourage le scan quotidien.
 * Affiche : flamme + série actuelle, plus longue série, total, et une bande
 * des 7 derniers jours (actif/inactif) dérivée du tableau `streak`.
 * Design Bayen (vert/crème, dark mode). Aucune dépendance externe.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface StreakPeriod {
  periodStart: string // 'YYYY-MM-DD'
  periodEnd: string
}

interface StreakCardProps extends React.HTMLAttributes<HTMLDivElement> {
  streak: StreakPeriod[]
  currentStreak: number
  longestStreak: number
  total: number
  /** Date de référence "aujourd'hui" en YYYY-MM-DD (sinon date locale) */
  today?: string
  labels?: {
    title?: string
    current?: string
    longest?: string
    total?: string
    days?: string
    dayInitials?: [string, string, string, string, string, string, string]
  }
}

function isoToday(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local
}

function shiftIso(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return dt.toISOString().slice(0, 10)
}

const FlameIcon = ({ active }: { active: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={active ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth={active ? 0 : 1.8}
    aria-hidden="true"
    className="h-full w-full"
  >
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
  </svg>
)

const StreakCard = React.forwardRef<HTMLDivElement, StreakCardProps>(
  ({ className, streak, currentStreak, longestStreak, total, today, labels, ...props }, ref) => {
    const L = {
      title: labels?.title ?? 'Ta série',
      current: labels?.current ?? 'Série actuelle',
      longest: labels?.longest ?? 'Record',
      total: labels?.total ?? 'Total scans',
      days: labels?.days ?? 'jours',
      dayInitials: labels?.dayInitials ?? ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    }

    const refToday = today ?? isoToday()
    const activeSet = React.useMemo(() => {
      const s = new Set<string>()
      for (const p of streak) {
        // chaque période = 1 jour (single-day range), mais on gère les plages
        let cur = p.periodStart
        let guard = 0
        while (cur <= p.periodEnd && guard < 366) {
          s.add(cur)
          cur = shiftIso(cur, 1)
          guard++
        }
      }
      return s
    }, [streak])

    // 7 derniers jours calendaires (du plus ancien au plus récent)
    const last7 = React.useMemo(() => {
      const arr: { iso: string; active: boolean; isToday: boolean }[] = []
      for (let i = 6; i >= 0; i--) {
        const iso = shiftIso(refToday, -i)
        arr.push({ iso, active: activeSet.has(iso), isToday: iso === refToday })
      }
      return arr
    }, [refToday, activeSet])

    const dowInitial = (iso: string) => {
      const [y, m, d] = iso.split('-').map(Number)
      // getUTCDay : 0=dimanche … 6=samedi ; on mappe sur L M M J V S D
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
      const idx = dow === 0 ? 6 : dow - 1
      return L.dayInitials[idx]
    }

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl border bg-card p-5 shadow-sm', className)}
        {...props}
      >
        {/* En-tête : flamme + série actuelle */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl p-3.5',
              currentStreak > 0
                ? 'bg-orange-500/15 text-orange-500'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <FlameIcon active={currentStreak > 0} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{L.current}</p>
            <p className="text-3xl font-black leading-none text-foreground">
              {currentStreak}{' '}
              <span className="text-base font-semibold text-muted-foreground">{L.days}</span>
            </p>
          </div>
        </div>

        {/* Bande 7 jours */}
        <div className="mt-5 flex justify-between gap-1.5">
          {last7.map((d) => (
            <div key={d.iso} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-medium text-muted-foreground">
                {dowInitial(d.iso)}
              </span>
              <div
                className={cn(
                  'flex aspect-square w-full max-w-[2.25rem] items-center justify-center rounded-lg text-xs',
                  d.active
                    ? 'bg-orange-500/20 text-orange-600'
                    : 'border border-dashed border-muted-foreground/30 text-transparent',
                  d.isToday && 'ring-2 ring-primary/40'
                )}
              >
                {d.active ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                  </svg>
                ) : (
                  '·'
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Stats record + total */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xl font-bold text-foreground">{longestStreak}</p>
            <p className="text-xs text-muted-foreground">{L.longest}</p>
          </div>
          <div className="rounded-xl bg-muted/50 p-3 text-center">
            <p className="text-xl font-bold text-foreground">{total.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-muted-foreground">{L.total}</p>
          </div>
        </div>
      </div>
    )
  }
)

StreakCard.displayName = 'StreakCard'

export { StreakCard }
