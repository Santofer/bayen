/**
 * « Mes contributions » — rang, barème et activité récente (C20).
 *
 * Le système de points existait côté serveur mais restait invisible : rien
 * n'indiquait ce qui rapportait quoi. Cette page rend le barème explicite,
 * façon Waze, pour que contribuer devienne un geste évident.
 */

import { useEffect, useState } from 'react'
import {
  Plus, Camera, Pencil, Check, Tag, ScanLine, Trophy,
} from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { getAccessToken, isAuthenticated } from '@/lib/auth'

const DIRECTUS_URL = '/api/directus'

interface Activity {
  type: string
  label: string
  date: string
}

interface Stats {
  activity?: Activity[]
  profile: {
    points: number
    rank: string
    contributions_count: number
    position: number
  }
}

/** Barème identique à `bayen-hooks` et `bayen-api/points.ts`. */
const ACTIONS = [
  { type: 'new_product', key: 'points.actionProduct', points: 50, Icon: Plus },
  { type: 'add_image', key: 'points.actionImage', points: 20, Icon: Camera },
  { type: 'fix_data', key: 'points.actionFix', points: 15, Icon: Pencil },
  { type: 'confirm', key: 'points.actionConfirm', points: 10, Icon: Check },
  { type: 'fix_meal', key: 'points.actionMeal', points: 10, Icon: Pencil },
  { type: 'add_price', key: 'points.actionPrice', points: 5, Icon: Tag },
  { type: 'scan', key: 'points.actionScan', points: 1, Icon: ScanLine },
] as const

const RANKS = [
  { rank: 'nouveau', min: 0, next: 100, nextLabel: 'contributeur' },
  { rank: 'contributeur', min: 100, next: 500, nextLabel: 'expert' },
  { rank: 'expert', min: 500, next: 2000, nextLabel: 'vérifié' },
  { rank: 'vérifié', min: 2000, next: null, nextLabel: null },
]

export default function PointsDashboard() {
  const { t } = useLocale()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    const authed = isAuthenticated()
    setLoggedIn(authed)
    if (!authed) return
    void (async () => {
      try {
        const token = await getAccessToken()
        const res = await fetch(`${DIRECTUS_URL}/bayen-api/my-stats`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) setStats((await res.json()) as Stats)
      } catch { /* section non critique */ }
    })()
  }, [])

  const points = stats?.profile.points ?? 0
  const currentRank = stats?.profile.rank ?? 'nouveau'
  const rankInfo = RANKS.find((r) => r.rank === currentRank) ?? RANKS[0]
  const progress = rankInfo.next
    ? Math.min(100, Math.round(((points - rankInfo.min) / (rankInfo.next - rankInfo.min)) * 100))
    : 100

  const labelFor = (type: string): string => {
    const found = ACTIONS.find((a) => a.type === type)
    return found ? t(found.key) : type
  }
  const pointsFor = (type: string): number => ACTIONS.find((a) => a.type === type)?.points ?? 0

  return (
    <div className="flex flex-col gap-4">
      {/* Carte rang */}
      <div className="relative overflow-hidden rounded-3xl bg-primary p-5 text-primary-foreground shadow-[0_12px_32px_hsl(97_40%_20%/0.3)]">
        <Trophy
          size={150}
          className="pointer-events-none absolute -bottom-10 -right-8 opacity-[0.07]"
          aria-hidden="true"
        />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.08em] opacity-75">{t('points.rank')}</p>
            <p className="mt-0.5 font-display text-2xl font-extrabold capitalize">
              {loggedIn === false ? '—' : currentRank}
            </p>
          </div>
          <div className="text-end">
            <p className="font-display text-3xl font-extrabold leading-none">{points}</p>
            <p className="text-xs font-bold opacity-75">{t('points.points')}</p>
          </div>
        </div>

        {loggedIn === false ? (
          <p className="mt-4 text-sm font-semibold opacity-90">
            {t('points.loginToEarn')}{' '}
            <a href="/connexion" className="underline underline-offset-2">
              {t('nav.account')}
            </a>
          </p>
        ) : rankInfo.next && (
          <div className="mt-4">
            <div className="mb-1.5 flex justify-between text-xs font-semibold opacity-85">
              <span className="capitalize">
                {rankInfo.nextLabel} — {rankInfo.next} {t('points.points')}
              </span>
              <span>
                {Math.max(0, rankInfo.next - points)} {t('points.toNext')}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-primary-foreground/20">
              <div className="h-full rounded-full bg-primary-foreground" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Barème */}
      <h2 className="mt-1 font-display text-lg font-bold">{t('points.howTo')}</h2>
      <div className="grid grid-cols-2 gap-2.5">
        {ACTIONS.map(({ type, key, points: pts, Icon }) => (
          <div key={type} className="flex flex-col gap-2 rounded-[18px] border bg-card p-3.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/[0.09] text-primary">
              <Icon size={18} />
            </span>
            <span className="text-sm font-bold leading-tight">{t(key)}</span>
            <span className="text-[15px] font-extrabold text-primary">
              +{pts} {pts > 1 ? 'pts' : 'pt'}
            </span>
          </div>
        ))}
      </div>

      {/* Activité récente */}
      <h2 className="mt-1 font-display text-lg font-bold">{t('points.recent')}</h2>
      <div className="rounded-[18px] border bg-card px-4">
        {loggedIn === false ? (
          <p className="py-4 text-sm text-muted-foreground">
            <a href="/connexion" className="font-bold text-primary">
              {t('nav.account')}
            </a>{' '}
            — {t('contrib.anonNote')}
          </p>
        ) : !stats?.activity || stats.activity.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{t('points.noActivity')}</p>
        ) : (
          stats.activity.map((a, i) => (
            <div
              key={`${a.type}-${a.date}-${i}`}
              className={
                i < (stats.activity?.length ?? 0) - 1
                  ? 'flex items-center gap-3 border-b py-3'
                  : 'flex items-center gap-3 py-3'
              }
            >
              <span className="min-w-0 flex-1 text-[13.5px] font-semibold">
                {labelFor(a.type)}
                {a.label && <span className="text-muted-foreground"> — {a.label}</span>}
              </span>
              <span className="flex-shrink-0 text-[13px] font-extrabold text-primary">
                +{pointsFor(a.type)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
