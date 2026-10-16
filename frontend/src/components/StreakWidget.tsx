/**
 * Widget de série (streak) — récupère /bayen-api/my-stats et rend StreakCard.
 * Affiché sur le tableau de bord du compte. Invisible si non connecté ou si
 * l'utilisateur n'a encore aucun scan (pas de bruit pour les nouveaux).
 */

import { useState, useEffect } from 'react'
import { getAccessToken } from '@/lib/auth'
import { useLocale } from '@/lib/i18n'
import { StreakCard } from '@/components/ui/streak-card'
import type { StreakPeriod } from '@/components/ui/streak-calendar'

const DIRECTUS_URL = '/api/directus'

interface MyStatsResponse {
  streak: {
    current: number
    longest: number
    total_scans: number
    total_scan_days: number
    active_days: StreakPeriod[]
    today: string
  }
}

interface StreakWidgetProps {
  labels?: {
    days?: string
    longest?: string
    total?: string
  }
}

export default function StreakWidget({ labels }: StreakWidgetProps) {
  const { t } = useLocale()
  const [data, setData] = useState<MyStatsResponse['streak'] | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getAccessToken()
        if (!token) {
          if (!cancelled) setLoaded(true)
          return
        }
        const res = await fetch(`${DIRECTUS_URL}/bayen-api/my-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const json = (await res.json()) as MyStatsResponse
          if (!cancelled) setData(json.streak)
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

  // Rien tant que pas chargé, ou si l'utilisateur n'a aucun scan
  if (!loaded || !data || data.total_scans === 0) return null

  // Section d'écran (maquette Compte) : se pose directement dans <main class="screen">
  return (
    <section className="section">
      <StreakCard
        streak={data.active_days}
        currentStreak={data.current}
        longestStreak={data.longest}
        total={data.total_scans}
        today={data.today}
        title={t('streak.title')}
        aria-label={t('streak.aria')}
        howItWorksTitle={t('streak.howTitle')}
        howItWorksItems={[t('streak.how1'), t('streak.how2'), t('streak.how3')]}
        labels={labels ?? { days: t('streak.days'), longest: t('streak.longest'), total: t('streak.total') }}
      />
    </section>
  )
}
