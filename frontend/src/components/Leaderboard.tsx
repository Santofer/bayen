/**
 * Wrapper "intelligent" du classement Bayen.
 * Reçoit les données SSR (top contributeurs), récupère la position de
 * l'utilisateur connecté via /bayen-api/my-stats, et rend LeaderboardCard
 * avec mise en évidence + ligne "ta position" si hors top.
 */

import { useState, useEffect } from 'react'
import { getAccessToken } from '@/lib/auth'
import { LeaderboardCard } from '@/components/ui/leaderboard-card'
import type { LeaderboardRankingItem } from '@/components/ui/leaderboard-rankings'
import type { LeaderboardRanking } from '@/components/ui/leaderboard-podium'

const DIRECTUS_URL = '/api/directus'

export interface LeaderboardEntry {
  userId: string
  userName: string
  points: number
  rankTier: string // nouveau | contributeur | expert | vérifié
  contributions: number
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  title?: string
  /** labels de rang traduits (clé tier → label affiché) */
  tierLabels?: Record<string, string>
  contributionsLabel?: string
  pointsSuffix?: string
}

const RANK_COLORS: Record<string, string> = {
  nouveau: '#a1a1aa',
  contributeur: '#b1cf3a',
  expert: '#f97316',
  'vérifié': '#476a32',
}

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

export default function Leaderboard({
  entries,
  title = 'Classement',
  tierLabels,
  contributionsLabel = 'contributions',
  pointsSuffix = 'pts',
}: LeaderboardProps) {
  const [me, setMe] = useState<MyStats['profile'] | null>(null)

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

  // Podium = top 3
  const podiumRankings: LeaderboardRanking[] = entries.slice(0, 3).map((e, i) => ({
    userId: e.userId,
    userName: e.userName,
    rank: i + 1,
    value: e.points,
  }))

  // Liste complète
  const rankings: LeaderboardRankingItem[] = entries.map((e, i) => ({
    userId: e.userId,
    rank: i + 1,
    userName: e.userName,
    byline: `${tierLabel(e.rankTier)} · ${e.contributions} ${contributionsLabel}`,
    value: e.points,
    accentColor: RANK_COLORS[e.rankTier] ?? RANK_COLORS.nouveau,
  }))

  // Si l'utilisateur connecté n'est pas dans le top affiché, on ajoute sa ligne
  const meInList = me && rankings.some((r) => r.userId === me.id)
  if (me && !meInList && me.points > 0) {
    rankings.push({
      userId: me.id,
      rank: me.position,
      userName: me.display_name ?? 'Toi',
      byline: `${tierLabel(me.rank)} · ${me.contributions_count} ${contributionsLabel}`,
      value: me.points,
      accentColor: RANK_COLORS[me.rank] ?? RANK_COLORS.nouveau,
    })
  }

  return (
    <LeaderboardCard
      title={title}
      podiumRankings={podiumRankings}
      rankings={rankings}
      currentUserId={me?.id}
    />
  )
}
