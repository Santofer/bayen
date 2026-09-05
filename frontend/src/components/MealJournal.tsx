/**
 * Composant journal des analyses de repas — utilisateur connecté.
 * Liste paginée des meal_scans, triée date desc.
 */

import { useState, useEffect } from 'react'
import { useLocale } from '@/lib/i18n'
import { getAccessToken } from '@/lib/auth'
import { Loader2, Camera, Trash2 } from 'lucide-react'
import {
  getMealHistory, onMealHistoryChange, removeMealFromHistory, todayStats,
  type LocalMealEntry,
} from '@/lib/meal-history'

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
  verdict: 'sain' | 'equilibre' | 'a_limiter' | 'occasionnel' | null
  ingredients: string[] | null
  date_created: string
}

const CONFIANCE_DOT: Record<string, string> = {
  faible: '#f59e0b',
  moyenne: '#3b82f6',
  elevee: '#16a34a',
}

const VERDICT_META: Record<string, { color: string; label: string }> = {
  sain:        { color: '#476a32', label: 'Sain' },
  equilibre:   { color: '#7a9e3a', label: 'Équilibré' },
  a_limiter:   { color: '#f97316', label: 'À limiter' },
  occasionnel: { color: '#ef4444', label: 'Occasionnel' },
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
  /** Journal local (sans compte) : rempli quand l'utilisateur n'est pas connecté */
  const [localEntries, setLocalEntries] = useState<LocalMealEntry[] | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const token = await getAccessToken()
        if (!token) {
          // Pas de compte : on affiche le journal LOCAL au lieu de rediriger.
          if (!cancelled) {
            setLocalEntries(getMealHistory())
            setLoading(false)
          }
          return
        }
        const res = await fetch(
          `${DIRECTUS_URL}/items/meal_scans?sort=-date_created&limit=50&fields=id,image,plat,calories_min,calories_max,estimated_kcal,portion_g,confiance,verdict,ingredients,date_created`,
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
    const unsub = onMealHistoryChange(() => setLocalEntries(getMealHistory()))
    return () => {
      cancelled = true
      unsub()
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
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
        {error}
      </div>
    )
  }

  // ── Journal local (utilisateur non connecté) ──
  if (localEntries !== null) {
    const stats = todayStats(localEntries)
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
          <div>
            <p className="font-display font-bold text-foreground">{t('meal.localTitle')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('meal.localHint')}</p>
          </div>
          {stats.count > 0 && (
            <p className="text-sm">
              {t('meal.localToday')} :{' '}
              <b className="font-display text-xl font-extrabold text-primary">
                {stats.kcalMin === stats.kcalMax ? stats.kcalMax : `${stats.kcalMin}–${stats.kcalMax}`}
              </b>{' '}
              <span className="text-xs text-muted-foreground">{t('journal.kcal')}</span>
            </p>
          )}
        </div>

        {localEntries.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground">{t('meal.localEmpty')}</p>
            <a
              href="/analyser-repas"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90"
            >
              {t('meal.analyzeCta')}
            </a>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {localEntries.map((e) => {
              const kcal = e.kcal_min != null && e.kcal_max != null && e.kcal_min !== e.kcal_max
                ? `${e.kcal_min}–${e.kcal_max}`
                : String(e.kcal_max ?? e.kcal_min ?? '—')
              return (
                <article key={e.id} className="rounded-2xl border bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-foreground line-clamp-2">{e.plat}</h3>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary whitespace-nowrap">
                      {kcal} {t('journal.kcal')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {[
                      e.proteines_g != null ? `P ${e.proteines_g} g` : null,
                      e.lipides_g != null ? `L ${e.lipides_g} g` : null,
                      e.glucides_g != null ? `G ${e.glucides_g} g` : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-[11px] text-muted-foreground">{formatDate(new Date(e.at).toISOString())}</p>
                    <button
                      type="button"
                      onClick={() => removeMealFromHistory(e.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={12} /> {t('meal.localDelete')}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        <div className="rounded-2xl border border-dashed bg-card/50 p-4 text-center">
          <a href="/connexion?next=/compte/journal" className="text-sm font-semibold text-primary hover:underline">
            {t('meal.loginToSave')} →
          </a>
        </div>
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
        const vmeta = s.verdict ? VERDICT_META[s.verdict] : null
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
              {/* Verdict qualitatif */}
              {vmeta && (
                <div
                  className="absolute top-2 left-2 rounded-full text-white text-[11px] font-bold px-2.5 py-1 shadow-lg"
                  style={{ backgroundColor: vmeta.color }}
                >
                  {vmeta.label}
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
