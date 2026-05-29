/**
 * Calendrier de série Bayen — affiche les jours actifs (avec ≥1 scan).
 * view="week" : semaine en cours. view="month" : mois en cours.
 * startOfWeek : 0 (dimanche) ou 1 (lundi).
 * Un jour est "actif" s'il tombe dans une des périodes `streak`.
 */

import * as React from 'react'
import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StreakPeriod {
  periodStart: string // 'YYYY-MM-DD'
  periodEnd: string // 'YYYY-MM-DD'
}

interface StreakCalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  streak: StreakPeriod[]
  view?: 'week' | 'month'
  startOfWeek?: 0 | 1
  /** Date de référence "aujourd'hui" YYYY-MM-DD (sinon date locale) */
  today?: string
}

const DOW_LABELS_MON = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DOW_LABELS_SUN = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

function isoToday(): string {
  return new Date().toLocaleDateString('en-CA')
}

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function toIso(dt: Date): string {
  return dt.toISOString().slice(0, 10)
}

function shiftIso(iso: string, delta: number): string {
  const dt = parseIso(iso)
  dt.setUTCDate(dt.getUTCDate() + delta)
  return toIso(dt)
}

const StreakCalendar = React.forwardRef<HTMLDivElement, StreakCalendarProps>(
  ({ className, streak, view = 'week', startOfWeek = 1, today, ...props }, ref) => {
    const refToday = today ?? isoToday()

    // Ensemble des jours actifs
    const activeSet = React.useMemo(() => {
      const s = new Set<string>()
      for (const p of streak) {
        let cur = p.periodStart
        let guard = 0
        while (cur <= p.periodEnd && guard < 400) {
          s.add(cur)
          cur = shiftIso(cur, 1)
          guard++
        }
      }
      return s
    }, [streak])

    // Calcul des jours à afficher
    const days = React.useMemo(() => {
      const result: { iso: string; inView: boolean }[] = []

      if (view === 'week') {
        // Trouver le début de semaine contenant refToday
        const dt = parseIso(refToday)
        const dow = dt.getUTCDay() // 0=dim
        const offset = startOfWeek === 1 ? (dow === 0 ? 6 : dow - 1) : dow
        const weekStart = shiftIso(refToday, -offset)
        for (let i = 0; i < 7; i++) {
          result.push({ iso: shiftIso(weekStart, i), inView: true })
        }
      } else {
        // Mois en cours, grille alignée sur startOfWeek
        const dt = parseIso(refToday)
        const year = dt.getUTCFullYear()
        const month = dt.getUTCMonth()
        const first = new Date(Date.UTC(year, month, 1))
        const firstDow = first.getUTCDay()
        const lead = startOfWeek === 1 ? (firstDow === 0 ? 6 : firstDow - 1) : firstDow
        const gridStart = shiftIso(toIso(first), -lead)
        for (let i = 0; i < 42; i++) {
          const iso = shiftIso(gridStart, i)
          result.push({ iso, inView: parseIso(iso).getUTCMonth() === month })
        }
      }
      return result
    }, [view, startOfWeek, refToday])

    const dowLabels = startOfWeek === 1 ? DOW_LABELS_MON : DOW_LABELS_SUN

    return (
      <div ref={ref} className={cn('w-full', className)} {...props}>
        {/* En-têtes jours */}
        <div className="mb-1.5 grid grid-cols-7 gap-1.5">
          {dowLabels.map((d, i) => (
            <span key={i} className="text-muted-foreground text-center text-[10px] font-medium">
              {d}
            </span>
          ))}
        </div>

        {/* Cellules */}
        <div className="grid grid-cols-7 gap-1.5">
          {days.map(({ iso, inView }) => {
            const active = activeSet.has(iso)
            const isToday = iso === refToday
            const dayNum = parseIso(iso).getUTCDate()
            return (
              <div
                key={iso}
                title={iso}
                className={cn(
                  'flex aspect-square items-center justify-center rounded-lg text-xs transition-colors',
                  !inView && 'opacity-30',
                  active
                    ? 'bg-orange-500/20 text-orange-600'
                    : 'border border-dashed border-muted-foreground/30 text-muted-foreground',
                  isToday && 'ring-2 ring-primary/50'
                )}
              >
                {active ? (
                  <Flame className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <span className="text-[10px]">{view === 'month' ? dayNum : ''}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)

StreakCalendar.displayName = 'StreakCalendar'

export { StreakCalendar }
