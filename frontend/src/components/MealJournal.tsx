/**
 * Composant journal des analyses de repas — utilisateur connecté.
 * Liste paginée des meal_scans, triée date desc.
 */

import { useState, useEffect } from 'react'
import { useLocale } from '@/lib/i18n'
import { getAccessToken } from '@/lib/auth'
import { Loader2, Camera } from 'lucide-react'

const DIRECTUS_URL = '/api/directus'
const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'

interface MealScanRow {
  id: string
  image: string | null
  plat: string | null
  meal_score: number | null
  score_label: string | null
  estimated_kcal: number | null
  estimated_portion: string | null
  ingredients: string[] | null
  date_created: string
}

const LABEL_COLORS: Record<string, string> = {
  excellent: '#476a32',
  bon: '#b1cf3a',
  'médiocre': '#f97316',
  mauvais: '#ef4444',
}

export default function MealJournal() {
  const { t, locale } = useLocale()
  const [loading, setLoading] = useState(true)
  const [scans, setScans] = useState<MealScanRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getAccessToken()
        if (!token) {
          window.location.href = '/connexion?next=/compte/journal'
          return
        }
        const res = await fetch(
          `${DIRECTUS_URL}/items/meal_scans?sort=-date_created&limit=50&fields=id,image,plat,meal_score,score_label,estimated_kcal,estimated_portion,ingredients,date_created`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as { data: MealScanRow[] }
        if (!cancelled) setScans(json.data ?? [])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'ary' ? 'ar-MA' : 'fr-MA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        {error}
      </div>
    )
  }

  if (scans.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="h-8 w-8 text-primary" />
        </div>
        <p className="text-muted-foreground">{t('journal.empty')}</p>
        <a
          href="/analyser-repas"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          {t('journal.emptyCta')}
        </a>
      </div>
    )
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {scans.map((s) => {
        const color = s.score_label ? LABEL_COLORS[s.score_label] ?? '#a1a1aa' : '#a1a1aa'
        return (
          <article key={s.id} className="rounded-2xl border bg-card overflow-hidden">
            <div className="relative aspect-[4/3] bg-muted overflow-hidden">
              {s.image ? (
                <img
                  src={`${CDN_URL}/${s.image}`}
                  alt={s.plat ?? 'Repas'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Camera className="h-8 w-8" />
                </div>
              )}
              {s.meal_score != null && (
                <div
                  className="absolute top-2 right-2 w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"
                  style={{ backgroundColor: color }}
                >
                  {s.meal_score}
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-foreground line-clamp-1">
                {s.plat ?? '—'}
              </h3>
              <p className="text-xs text-muted-foreground">
                {s.estimated_kcal != null && (
                  <span className="font-medium text-foreground">
                    {s.estimated_kcal} {t('journal.kcal')}
                  </span>
                )}
                {s.estimated_kcal != null && s.estimated_portion && (
                  <span className="mx-1.5">·</span>
                )}
                {s.estimated_portion && <span>{s.estimated_portion}</span>}
              </p>
              <p className="text-[11px] text-muted-foreground">{formatDate(s.date_created)}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
