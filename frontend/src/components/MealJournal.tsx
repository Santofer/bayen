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
  calories_min: number | null
  calories_max: number | null
  estimated_kcal: number | null
  portion_g: number | null
  confiance: 'faible' | 'moyenne' | 'elevee' | null
  meal_score: number | null
  score_label: string | null
  ingredients: string[] | null
  date_created: string
}

const CONFIANCE_DOT: Record<string, string> = {
  faible: '#f59e0b',
  moyenne: '#3b82f6',
  elevee: '#16a34a',
}

const SCORE_COLORS: Record<string, string> = {
  excellent: '#476a32',
  bon: '#b1cf3a',
  'médiocre': '#f97316',
  mauvais: '#ef4444',
}

function kcalLabel(s: MealScanRow): string | null {
  if (s.calories_min != null && s.calories_max != null) {
    return s.calories_min === s.calories_max ? `${s.calories_min}` : `${s.calories_min}–${s.calories_max}`
  }
  if (s.estimated_kcal != null) return `${s.estimated_kcal}`
  return null
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
          `${DIRECTUS_URL}/items/meal_scans?sort=-date_created&limit=50&fields=id,image,plat,calories_min,calories_max,estimated_kcal,portion_g,confiance,meal_score,score_label,ingredients,date_created`,
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
        const kcal = kcalLabel(s)
        const dot = s.confiance ? CONFIANCE_DOT[s.confiance] : null
        const scoreColor = s.score_label ? SCORE_COLORS[s.score_label] ?? '#a1a1aa' : null
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
              {/* Score santé Bayen */}
              {s.meal_score != null && scoreColor && (
                <div
                  className="absolute top-2 left-2 w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg"
                  style={{ backgroundColor: scoreColor }}
                >
                  {s.meal_score}
                </div>
              )}
              {kcal && (
                <div className="absolute top-2 right-2 rounded-full bg-black/70 text-white text-xs font-bold px-3 py-1.5 shadow-lg backdrop-blur-sm">
                  {kcal} {t('journal.kcal')}
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-foreground line-clamp-1">
                {s.plat ?? '—'}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {dot && <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: dot }} />}
                {s.portion_g != null && <span>≈ {s.portion_g} g</span>}
              </p>
              <p className="text-[11px] text-muted-foreground">{formatDate(s.date_created)}</p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
