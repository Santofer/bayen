/**
 * Dashboard nutrition quotidien — en tête du journal (/compte/journal).
 *
 * Affiche le récapitulatif du jour (kcal vs objectif éditable, macros) et un
 * graphe des 7 derniers jours, depuis /bayen-api/nutrition-summary.
 *
 * L'objectif calorique est stocké en localStorage (perso, pas de compte
 * requis côté serveur). Défaut 2000 kcal. Invisible si aucun repas enregistré
 * (pas de bruit pour les nouveaux comptes).
 */

import { useState, useEffect, useCallback } from 'react'
import { useLocale } from '@/lib/i18n'
import { getAccessToken } from '@/lib/auth'
import { Flame, Pencil, Check } from 'lucide-react'

const DIRECTUS_URL = '/api/directus'
const GOAL_KEY = 'bayen_kcal_goal'
const DEFAULT_GOAL = 2000

interface DayPoint {
  day: string
  kcal: number
  meals: number
}

interface NutritionSummary {
  today: string
  today_totals: { kcal: number; proteines: number; glucides: number; lipides: number; meals: number }
  week: DayPoint[]
  week_avg_kcal: number
  verdict_counts_7d: Record<string, number>
}

function readGoal(): number {
  if (typeof window === 'undefined') return DEFAULT_GOAL
  const v = parseInt(window.localStorage.getItem(GOAL_KEY) ?? '', 10)
  return isFinite(v) && v >= 800 && v <= 6000 ? v : DEFAULT_GOAL
}

/** Initiale du jour de la semaine (fr) pour l'axe du graphe. */
function dayInitial(iso: string, locale: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  return dt.toLocaleDateString(locale === 'ary' ? 'ar-MA' : 'fr-FR', {
    weekday: 'short',
    timeZone: 'UTC',
  }).slice(0, locale === 'ary' ? 3 : 1).toUpperCase()
}

export default function NutritionDashboard() {
  const { t, locale } = useLocale()
  const [data, setData] = useState<NutritionSummary | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [goal, setGoal] = useState<number>(DEFAULT_GOAL)
  const [editing, setEditing] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')

  useEffect(() => {
    setGoal(readGoal())
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getAccessToken()
        if (!token) {
          if (!cancelled) setLoaded(true)
          return
        }
        const res = await fetch(`${DIRECTUS_URL}/bayen-api/nutrition-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const json = (await res.json()) as NutritionSummary
          if (!cancelled) setData(json)
        }
      } catch {
        /* silencieux */
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const saveGoal = useCallback(() => {
    const v = parseInt(goalDraft, 10)
    if (isFinite(v) && v >= 800 && v <= 6000) {
      window.localStorage.setItem(GOAL_KEY, String(v))
      setGoal(v)
    }
    setEditing(false)
  }, [goalDraft])

  // Rien tant que pas chargé, ou si l'utilisateur n'a jamais enregistré de repas
  if (!loaded || !data) return null
  const hasHistory = data.week.some((d) => d.meals > 0)
  if (!hasHistory) return null

  const { today_totals: tt, week } = data
  const pct = Math.min(100, Math.round((tt.kcal / goal) * 100))
  const remaining = goal - tt.kcal
  const maxKcal = Math.max(goal, ...week.map((d) => d.kcal), 1)

  // Anneau de progression
  const R = 52
  const C = 2 * Math.PI * R
  const dash = (Math.min(100, pct) / 100) * C
  const ringColor = tt.kcal > goal ? '#f97316' : '#476a32'

  return (
    <section className="rounded-2xl border bg-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" />
          {t('nutri.todayTitle')}
        </h2>
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
              className="w-20 h-8 rounded-md border border-input bg-background px-2 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
            />
            <button onClick={saveGoal} className="p-1.5 rounded-md bg-primary text-primary-foreground" aria-label="OK">
              <Check className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setGoalDraft(String(goal)); setEditing(true) }}
            className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
          >
            {t('nutri.goal')} {goal.toLocaleString('fr-FR')} <Pencil className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Anneau kcal du jour + macros */}
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0" style={{ width: 128, height: 128 }}>
          <svg width="128" height="128" viewBox="0 0 128 128" className="-rotate-90">
            <circle cx="64" cy="64" r={R} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted" />
            <circle
              cx="64" cy="64" r={R} fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
              strokeDasharray={`${dash} ${C}`} className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground leading-none">{tt.kcal.toLocaleString('fr-FR')}</span>
            <span className="text-[11px] text-muted-foreground mt-0.5">/ {goal.toLocaleString('fr-FR')} {t('meal.kcal')}</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <p className="text-sm text-foreground">
            {remaining >= 0
              ? <>{t('nutri.remaining')} <span className="font-bold">{remaining.toLocaleString('fr-FR')}</span> {t('meal.kcal')}</>
              : <span className="text-orange-600 font-medium">{t('nutri.over')} {Math.abs(remaining).toLocaleString('fr-FR')} {t('meal.kcal')}</span>}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['proteines', tt.proteines, t('meal.proteines')],
              ['glucides', tt.glucides, t('meal.glucides')],
              ['lipides', tt.lipides, t('meal.lipides')],
            ] as const).map(([k, v, label]) => (
              <div key={k} className="rounded-lg bg-muted/50 p-2 text-center">
                <p className="text-sm font-bold text-foreground">{v}<span className="text-[11px] font-medium text-muted-foreground">g</span></p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {tt.meals > 0
              ? `${tt.meals} ${tt.meals > 1 ? t('nutri.mealsPlural') : t('nutri.mealSingular')} ${t('nutri.today')}`
              : t('nutri.noMealToday')}
          </p>
        </div>
      </div>

      {/* Graphe 7 jours */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">{t('nutri.weekTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('nutri.avg')} {data.week_avg_kcal.toLocaleString('fr-FR')} {t('meal.kcal')}</p>
        </div>
        <div className="flex items-end justify-between gap-1.5 h-28">
          {week.map((d) => {
            const h = Math.round((d.kcal / maxKcal) * 100)
            const isToday = d.day === data.today
            const over = d.kcal > goal
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                <span className="text-[9px] text-muted-foreground tabular-nums">{d.kcal > 0 ? d.kcal : ''}</span>
                <div className="w-full flex items-end justify-center" style={{ height: '100%' }}>
                  <div
                    className="w-full max-w-[28px] rounded-t transition-all duration-500"
                    style={{
                      height: `${Math.max(h, d.kcal > 0 ? 4 : 0)}%`,
                      backgroundColor: over ? '#f97316' : isToday ? '#476a32' : '#b1cf3a',
                      opacity: d.kcal > 0 ? 1 : 0.15,
                    }}
                  />
                </div>
                <span className={`text-[10px] ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                  {dayInitial(d.day, locale)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground text-center italic">{t('nutri.caveat')}</p>
    </section>
  )
}
