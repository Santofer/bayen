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
    <>
      {/* Rang + Naânaa (côte à côte sur ordinateur) */}
      <section className="section gap-5 md:grid-cols-2 md:items-center md:gap-8">
        <div className="card relative overflow-hidden border-encre bg-menthe p-5 text-encre">
          <Trophy
            size={150}
            className="pointer-events-none absolute -bottom-10 -right-8 opacity-[0.12]"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow text-encre/75">{t('points.rank')}</p>
              <p className="disp d-l mt-1 capitalize">
                {loggedIn === false ? '—' : currentRank}
              </p>
            </div>
            <div className="text-end">
              <p className="disp d-xl num">{points}</p>
              <p className="text-xs font-bold opacity-75">{t('points.points')}</p>
            </div>
          </div>

          {loggedIn === false ? (
            <p className="mt-4 text-sm font-semibold opacity-90">
              {t('points.loginToEarn')}{' '}
              <a href="/connexion?redirect=%2Fcompte%2Fpoints" className="underline underline-offset-2">
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
              <div className="h-2.5 overflow-hidden rounded-full border-[1.5px] border-encre bg-creme">
                <div className="h-full bg-encre" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Naânaa applaudit dès le premier point */}
        {points > 0 && (
          <div className="naanaa">
            <div className="m"><img src="/mascotte/naanaa-bravo.webp" alt="Naânaa qui applaudit" /></div>
            <p className="bubble">
              <b>{t('points.earned')} : +{points}</b>
            </p>
          </div>
        )}
      </section>

      {/* Barème */}
      <section className="section">
        <div className="sec-head"><h2 className="disp d-m">{t('points.howTo')}</h2></div>
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-4">
          {ACTIONS.map(({ type, key, points: pts, Icon }) => (
            <div key={type} className="card grid content-start gap-2 p-3.5">
              <span className="tile tint-menthe size-9 rounded-xl border-[1.5px]">
                <Icon size={18} aria-hidden="true" />
              </span>
              <span className="text-sm font-bold leading-tight">{t(key)}</span>
              <span className="disp d-s text-brand-ink">
                +{pts} {pts > 1 ? 'pts' : 'pt'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Activité récente */}
      <section className="section">
        <div className="sec-head"><h2 className="disp d-m">{t('points.recent')}</h2></div>
        <div className="card grid overflow-hidden">
          {loggedIn === false ? (
            <p className="p-4 text-sm text-muted-foreground">
              <a href="/connexion?redirect=%2Fcompte%2Fpoints" className="font-bold text-brand-ink">
                {t('nav.account')}
              </a>{' '}
              — {t('contrib.anonNote')}
            </p>
          ) : !stats?.activity || stats.activity.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t('points.noActivity')}</p>
          ) : (
            stats.activity.map((a, i) => (
              <div
                key={`${a.type}-${a.date}-${i}`}
                className="flex items-center gap-3 border-b-[1.5px] border-line px-4 py-3.5 last:border-b-0"
              >
                <span className="min-w-0 flex-1 text-[13.5px] font-semibold">
                  {labelFor(a.type)}
                  {a.label && <span className="text-muted-foreground"> — {a.label}</span>}
                </span>
                <span className="chip fill num flex-shrink-0 bg-citron font-display font-extrabold">
                  +{pointsFor(a.type)}
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  )
}
