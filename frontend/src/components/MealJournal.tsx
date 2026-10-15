/**
 * Journal des analyses de repas — connecté : meal_scans (50 derniers, date desc) ;
 * sans compte : journal local de l'appareil. Rend des sections d'écran.
 */

import { useState, useEffect } from 'react'
import { useLocale } from '@/lib/i18n'
import type { TranslationKey } from '@/lib/translations'
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

// Pastille de fiabilité (aplats Marché Pop)
const CONFIANCE_DOT: Record<string, string> = {
  faible: 'var(--color-score-mediocre)',
  moyenne: 'var(--color-citron)',
  elevee: 'var(--color-menthe)',
}

// Verdict qualitatif : aplat de l'échelle de score, texte encre posé dessus
const VERDICT_META: Record<string, { color: string; label: TranslationKey }> = {
  sain:        { color: 'var(--color-score-excellent)', label: 'journal.verdict.sain' },
  equilibre:   { color: 'var(--color-score-bon)', label: 'journal.verdict.equilibre' },
  a_limiter:   { color: 'var(--color-score-mediocre)', label: 'journal.verdict.a_limiter' },
  occasionnel: { color: 'var(--color-score-mauvais)', label: 'journal.verdict.occasionnel' },
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
      <section className="section">
        <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          <span>…</span>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="section">
        <div className="naanaa">
          <div className="m"><img src="/mascotte/naanaa-oups.webp" alt="" /></div>
          <p className="bubble">{t('common.error')}</p>
        </div>
      </section>
    )
  }

  // ── Journal local (utilisateur non connecté) ──
  if (localEntries !== null) {
    const stats = todayStats(localEntries)
    return (
      <>
        <section className="section">
          <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="disp d-s">{t('meal.localTitle')}</p>
              <p className="muted mt-1 text-xs">{t('meal.localHint')}</p>
            </div>
            {stats.count > 0 && (
              <p className="text-sm">
                {t('meal.localToday')} :{' '}
                <b className="disp d-m num text-brand-ink">
                  {stats.kcalMin === stats.kcalMax ? stats.kcalMax : `${stats.kcalMin}–${stats.kcalMax}`}
                </b>{' '}
                <span className="muted text-xs">{t('journal.kcal')}</span>
              </p>
            )}
          </div>
        </section>

        <section className="section">
          {localEntries.length === 0 ? (
            <div className="card grid justify-items-start gap-4 p-4">
              <div className="naanaa">
                <div className="m"><img src="/mascotte/naanaa-courses.webp" alt="" /></div>
                <p className="bubble">{t('meal.localEmpty')}</p>
              </div>
              <a href="/analyser-repas" className="btn primary">
                <Camera aria-hidden="true" /> {t('meal.analyzeCta')}
              </a>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
              {localEntries.map((e) => {
                const kcal = e.kcal_min != null && e.kcal_max != null && e.kcal_min !== e.kcal_max
                  ? `${e.kcal_min}–${e.kcal_max}`
                  : String(e.kcal_max ?? e.kcal_min ?? '—')
                return (
                  <article key={e.id} className="card grid gap-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 font-bold">{e.plat}</h3>
                      <span className="chip fill num flex-none bg-ai font-display font-bold">
                        {kcal} {t('journal.kcal')}
                      </span>
                    </div>
                    <p className="muted text-xs">
                      {[
                        e.proteines_g != null ? `${t('journal.macroP')} ${e.proteines_g} g` : null,
                        e.lipides_g != null ? `${t('journal.macroL')} ${e.lipides_g} g` : null,
                        e.glucides_g != null ? `${t('journal.macroG')} ${e.glucides_g} g` : null,
                      ].filter(Boolean).join(' · ')}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="muted text-[11px]">{formatDate(new Date(e.at).toISOString())}</p>
                      <button
                        type="button"
                        onClick={() => removeMealFromHistory(e.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={12} aria-hidden="true" /> {t('meal.localDelete')}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="section">
          <a href="/connexion?redirect=%2Fcompte%2Fjournal" className="btn w-full md:w-max">
            {t('meal.loginToSave')} <span className="inline-block rtl:rotate-180" aria-hidden="true">→</span>
          </a>
        </section>
      </>
    )
  }

  if (scans.length === 0) {
    return (
      <section className="section">
        <div className="card grid justify-items-start gap-4 p-4">
          <div className="naanaa">
            <div className="m"><img src="/mascotte/naanaa-courses.webp" alt="" /></div>
            <p className="bubble">{t('journal.empty')}</p>
          </div>
          <a href="/analyser-repas" className="btn primary">
            <Camera aria-hidden="true" /> {t('journal.emptyCta')}
          </a>
        </div>
      </section>
    )
  }

  return (
    <section className="section">
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
        {scans.map((s) => {
          const kcal = kcalLabel(s)
          const dot = s.confiance ? CONFIANCE_DOT[s.confiance] : null
          const vmeta = s.verdict ? VERDICT_META[s.verdict] : null
          return (
            <article key={s.id} className="card grid content-start overflow-hidden">
              {/* La photo du plat remplit le cadre ; la teinte figue ne se voit que sans photo */}
              <div className="tile tint-figue aspect-[4/3] rounded-none border-0 border-b-2">
                <Camera className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                {s.image && <img src={`${CDN_URL}/${s.image}`} alt={s.plat ?? t('meal.fallbackName')} loading="lazy" />}
                {/* Verdict qualitatif */}
                {vmeta && (
                  <span className="chip fill absolute start-2 top-2 z-10" style={{ backgroundColor: vmeta.color }}>
                    {t(vmeta.label)}
                  </span>
                )}
                {kcal && (
                  <span className="chip fill num absolute end-2 top-2 z-10 bg-creme font-display font-bold">
                    {kcal} {t('journal.kcal')}
                  </span>
                )}
              </div>
              <div className="grid gap-1.5 p-4">
                <h3 className="line-clamp-1 font-bold">{s.plat ?? '—'}</h3>
                <p className="muted flex items-center gap-1.5 text-xs">
                  {dot && <span className="inline-block size-2.5 rounded-full border border-line" style={{ backgroundColor: dot }} />}
                  {s.portion_g != null && <span>≈ {s.portion_g} g</span>}
                </p>
                <p className="muted text-[11px]">{formatDate(s.date_created)}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
