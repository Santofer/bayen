/**
 * Classement des contributeurs Bayen (langage Marché Pop).
 * Reçoit les données SSR (top contributeurs), récupère la position de
 * l'utilisateur connecté via /bayen-api/my-stats, puis rend un podium (top 3)
 * et des lignes de carte avec pastilles rondes de rang. La ligne de
 * l'utilisateur est mise en évidence, ajoutée en bas s'il est hors du top.
 */

import { useState, useEffect } from 'react'
import { getAccessToken } from '@/lib/auth'
import { t } from '@/lib/i18n'
import type { Locale } from '@/lib/translations'
import { cn } from '@/lib/utils'

const DIRECTUS_URL = '/api/directus'
/** Lignes visibles avant « voir tout » */
const PAGE = 10

export interface LeaderboardEntry {
  userId: string
  userName: string
  points: number
  rankTier: string // nouveau | contributeur | expert | vérifié
  contributions: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  /** labels de rang traduits (clé tier → label affiché) */
  tierLabels?: Record<string, string>
  contributionsLabel?: string
  pointsSuffix?: string
  /** Langue des textes (rendu serveur : locale du cookie, passée par la page) */
  locale?: Locale
}

// Aplat d'avatar par rang (mêmes couleurs que le compte ; texte encre dessus)
const RANK_COLORS: Record<string, string> = {
  nouveau: 'var(--color-framboise)',
  contributeur: 'var(--color-menthe)',
  expert: 'var(--color-citron)',
  'vérifié': 'var(--color-myrtille)',
}

// Pastille de rang du podium (médailles)
const MEDAL = ['bg-rank-1', 'bg-rank-2', 'bg-rank-3']

interface MyStats {
  profile: {
    id: string
    points: number
    rank: string
    contributions_count: number
    display_name: string | null
    position: number
  }
}

interface Row {
  userId: string
  rank: number
  userName: string
  tier: string
  contributions: number
  points: number
}

const fmt = (n: number) => n.toLocaleString('fr-FR')

/** Pastille ronde : rang (médaille pour le top 3) */
function RankDot({ rank, className, locale }: { rank: number; className?: string; locale?: Locale }) {
  return (
    <span
      className={cn(
        'grid size-9 flex-none place-items-center rounded-full border-2 font-display text-[13px] font-extrabold num',
        rank <= 3 ? `${MEDAL[rank - 1]} border-encre text-encre` : 'border-line bg-muted',
        className
      )}
      aria-label={t('rankPage.rankAria', locale).replace('{n}', String(rank))}
    >
      {rank}
    </span>
  )
}

/** Avatar initiale sur l'aplat du niveau */
function Avatar({ name, tier, size = 'size-10' }: { name: string; tier: string; size?: string }) {
  return (
    <span
      className={cn('grid flex-none place-items-center rounded-full border-2 border-encre font-display font-extrabold text-encre', size)}
      style={{ background: RANK_COLORS[tier] ?? RANK_COLORS.nouveau }}
      aria-hidden="true"
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  )
}

export default function Leaderboard({
  entries,
  tierLabels,
  contributionsLabel = 'contributions',
  pointsSuffix = 'pts',
  locale,
}: LeaderboardProps) {
  const [me, setMe] = useState<MyStats['profile'] | null>(null)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getAccessToken()
        if (!token) return
        const res = await fetch(`${DIRECTUS_URL}/bayen-api/my-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = (await res.json()) as MyStats
        if (!cancelled) setMe(data.profile)
      } catch {
        /* silencieux */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const tierLabel = (tier: string) => tierLabels?.[tier] ?? tier

  const rows: Row[] = entries.map((e, i) => ({
    userId: e.userId,
    rank: i + 1,
    userName: e.userName,
    tier: e.rankTier,
    contributions: e.contributions,
    points: e.points,
  }))

  // Si l'utilisateur connecté n'est pas dans le top affiché, on ajoute sa ligne
  if (me && me.points > 0 && !rows.some((r) => r.userId === me.id)) {
    rows.push({
      userId: me.id,
      rank: me.position,
      userName: me.display_name ?? t('rankPage.you', locale),
      tier: me.rank,
      contributions: me.contributions_count,
      points: me.points,
    })
  }

  const podium = rows.slice(0, 3)
  // Lignes repliées : les PAGE premières, plus la ligne de l'utilisateur si elle est plus bas
  const meIndex = me ? rows.findIndex((r) => r.userId === me.id) : -1
  const visible = showAll ? rows : rows.slice(0, PAGE)
  const meHidden = !showAll && meIndex >= PAGE

  const line = (r: Row) => {
    const isMe = me?.id === r.userId
    return (
      <li
        key={r.userId}
        className={cn(
          'flex items-center gap-3 border-b-[1.5px] border-line px-3.5 py-3 last:border-b-0 md:px-4',
          isMe && 'tint-menthe'
        )}
        aria-current={isMe ? 'true' : undefined}
      >
        <RankDot rank={r.rank} locale={locale} />
        <Avatar name={r.userName} tier={r.tier} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{r.userName}{isMe && ` · ${t('rankPage.youTag', locale)}`}</span>
          <span className="muted block truncate text-[12px]">
            {tierLabel(r.tier)} · {fmt(r.contributions)} {contributionsLabel}
          </span>
        </span>
        <b className="num flex-none font-display text-[15px]">
          {fmt(r.points)} <span className="text-[11px] font-semibold">{pointsSuffix}</span>
        </b>
      </li>
    )
  }

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-start md:gap-[18px]">
      {/* Podium : 2 · 1 · 3, le premier plus haut */}
      {podium.length > 0 && (
        <ol className="grid grid-cols-3 items-end gap-2.5" aria-label={t('rankPage.podium', locale)}>
          {podium.map((r) => (
            <li
              key={r.userId}
              className={cn(
                'card grid justify-items-center gap-2 px-2 pb-3 text-center',
                r.rank === 1 ? 'order-2 bg-citron pt-5 text-encre' : 'pt-3.5',
                r.rank === 2 && 'order-1',
                r.rank === 3 && 'order-3'
              )}
            >
              <RankDot rank={r.rank} className="-rotate-8" locale={locale} />
              <Avatar name={r.userName} tier={r.tier} size={r.rank === 1 ? 'size-14 text-xl' : 'size-11'} />
              <span className="w-full truncate text-[13px] font-bold">{r.userName}</span>
              <b className="num font-display text-[15px]">
                {fmt(r.points)} <span className="text-[10px] font-semibold">{pointsSuffix}</span>
              </b>
            </li>
          ))}
        </ol>
      )}

      {/* Lignes du classement */}
      <div className="grid gap-3">
        <ol className="card overflow-hidden" aria-label={t('nav.ranking', locale)}>
          {visible.map(line)}
          {meHidden && (
            <>
              <li className="muted border-b-[1.5px] border-line py-1 text-center" aria-hidden="true">…</li>
              {line(rows[meIndex])}
            </>
          )}
        </ol>
        {rows.length > PAGE && (
          <button type="button" className="btn sm w-max" onClick={() => setShowAll((v) => !v)}>
            {showAll ? t('inci.hide', locale) : t('rankPage.seeAll', locale).replace('{n}', String(rows.length))}
          </button>
        )}
      </div>
    </div>
  )
}
