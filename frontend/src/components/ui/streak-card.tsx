/**
 * Carte de série (streak) Bayen — version 21st.dev adaptée (labels FR).
 * Flamme + série actuelle, calendrier des jours actifs, record + total,
 * et un dépliant "Comment ça marche".
 */

import * as React from 'react'
import { CheckCircle2, ChevronDown, Flame, RefreshCcw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StreakCalendar, type StreakPeriod } from '@/components/ui/streak-calendar'

interface StreakCardProps extends React.HTMLAttributes<HTMLDivElement> {
  streak: StreakPeriod[]
  currentStreak: number
  longestStreak: number
  total: number
  /** Date de référence "aujourd'hui" YYYY-MM-DD (tz serveur Maroc) */
  today?: string
  title?: string
  actionLabel?: string
  onActionClick?: () => void
  view?: 'week' | 'month'
  showHowItWorks?: boolean
  howItWorksTitle?: string
  howItWorksItems?: string[]
  defaultHowItWorksOpen?: boolean
  labels?: {
    days?: string
    longest?: string
    total?: string
  }
}

const StreakCard = React.forwardRef<HTMLDivElement, StreakCardProps>(
  (
    {
      className,
      streak,
      currentStreak,
      longestStreak,
      total,
      today,
      title = 'Ta série',
      actionLabel = 'Détails',
      onActionClick,
      view = 'week',
      showHowItWorks = true,
      howItWorksTitle = 'Comment marchent les séries ?',
      howItWorksItems = [
        'Scanne au moins un produit chaque jour pour bâtir ta série.',
        'Chaque jour d’activité augmente ta série d’un point.',
        'Un jour manqué remet ta série à zéro.',
      ],
      defaultHowItWorksOpen = false,
      labels,
      ...props
    },
    ref
  ) => {
    const [isHowItWorksOpen, setIsHowItWorksOpen] = React.useState(defaultHowItWorksOpen)
    const howItWorksContentId = React.useId()

    const L = {
      days: labels?.days ?? 'jours',
      longest: labels?.longest ?? 'Record',
      total: labels?.total ?? 'Total scans',
    }

    return (
      <section
        ref={ref}
        aria-label="Carte de série"
        className={cn('bg-card rounded-2xl border p-6 shadow-sm', className)}
        {...props}
      >
        <header className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Flame className="text-orange-500 h-6 w-6" aria-hidden="true" />
            <h3 className="text-2xl leading-none font-semibold">{title}</h3>
          </div>
          {onActionClick && (
            <Button
              variant="link"
              size="sm"
              onClick={onActionClick}
              aria-label={actionLabel}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              {actionLabel}
            </Button>
          )}
        </header>

        <p className="mb-4 text-5xl leading-none font-semibold tracking-tight">
          {currentStreak}
          <span className="text-muted-foreground ml-2 text-2xl font-medium">{L.days}</span>
        </p>

        <StreakCalendar streak={streak} view={view} startOfWeek={1} today={today} className="max-w-none" />

        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-dashed pt-4" aria-label="Statistiques de série">
          <div>
            <p className="text-muted-foreground text-sm">{L.longest}</p>
            <p className="text-3xl leading-tight font-semibold">
              {longestStreak}
              <span className="ml-1 text-2xl font-medium">{L.days}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-sm">{L.total}</p>
            <p className="text-3xl leading-tight font-semibold">{total.toLocaleString('fr-FR')}</p>
          </div>
        </div>

        {showHowItWorks && (
          <div className="mt-4 border-t pt-4">
            <button
              type="button"
              className="bg-muted flex w-full items-center justify-between rounded-xl px-4 py-3 text-left"
              onClick={() => setIsHowItWorksOpen((prev) => !prev)}
              aria-expanded={isHowItWorksOpen}
              aria-controls={howItWorksContentId}
            >
              <span className="text-base font-semibold">{howItWorksTitle}</span>
              <ChevronDown
                className={cn(
                  'text-muted-foreground h-5 w-5 transition-transform',
                  isHowItWorksOpen && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </button>

            {isHowItWorksOpen && (
              <div id={howItWorksContentId} className="space-y-4 px-2 pt-4">
                {howItWorksItems.map((item, index) => {
                  const Icon = index === 0 ? CheckCircle2 : index === 1 ? Flame : RefreshCcw
                  return (
                    <div key={`${item}-${index}`} className="flex items-start gap-3">
                      <Icon className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                      <p className="text-muted-foreground text-sm leading-snug">{item}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </section>
    )
  }
)
StreakCard.displayName = 'StreakCard'

export { StreakCard }
export type { StreakCardProps }
