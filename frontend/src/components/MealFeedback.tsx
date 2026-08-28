/**
 * Retour de l'utilisateur sur une estimation de repas (C21).
 *
 * Une estimation par IA se trompe parfois de plat ou de portion, et personne
 * ne pouvait le signaler. Le pouce mesure la fiabilité perçue ; la correction,
 * elle, alimente le référentiel des plats marocains (via un script de revue
 * hebdomadaire — les retours ne réentraînent pas le modèle).
 *
 * Anonyme par défaut, un seul retour par analyse.
 */

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react'
import { useLocale } from '@/lib/i18n'

const API = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

interface Props {
  plat: string | null
  confiance?: string
  portionEstimee?: number | null
  caloriesEstimees?: number | null
  mealScanId?: string | null
}

function sessionId(): string {
  try {
    let id = localStorage.getItem('bayen_session_id')
    if (!id) {
      id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem('bayen_session_id', id)
    }
    return id
  } catch {
    return 'anon'
  }
}

export default function MealFeedback({
  plat, confiance, portionEstimee, caloriesEstimees, mealScanId,
}: Props) {
  const { t } = useLocale()
  const [rating, setRating] = useState<'up' | 'down' | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const [dish, setDish] = useState(plat ?? '')
  const [portion, setPortion] = useState(portionEstimee ? String(portionEstimee) : '')
  const [kcal, setKcal] = useState(caloriesEstimees ? String(caloriesEstimees) : '')

  const send = async (value: 'up' | 'down', withCorrection: boolean): Promise<void> => {
    setBusy(true)
    try {
      const correction: Record<string, unknown> = {}
      if (withCorrection) {
        if (dish.trim() && dish.trim() !== (plat ?? '')) correction.plat = dish.trim()
        const p = Number(portion)
        if (Number.isFinite(p) && p > 0 && p !== portionEstimee) correction.portion_g = p
        const k = Number(kcal)
        if (Number.isFinite(k) && k > 0 && k !== caloriesEstimees) correction.calories_kcal = k
      }

      await fetch(`${API}/bayen-api/meal-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: value,
          plat_detecte: plat,
          confiance_ia: confiance,
          meal_scan_id: mealScanId ?? undefined,
          session_id: sessionId(),
          correction: Object.keys(correction).length > 0 ? correction : undefined,
        }),
      })
      setSent(true)
    } catch {
      // Un retour perdu ne doit pas inquiéter : on remercie quand même.
      setSent(true)
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <p className="flex items-center gap-2 font-bold text-primary">
          <Check size={17} /> {t('mealfb.thanks')}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-card)] sm:p-5">
      <p className="font-bold">{t('mealfb.question')}</p>
      <p className="mt-0.5 text-[13px] text-muted-foreground">{t('mealfb.why')}</p>

      <div className="mt-3.5 flex gap-2.5">
        <button
          type="button"
          onClick={() => void send('up', false)}
          disabled={busy}
          className={
            rating === 'up'
              ? 'flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-primary/[0.09] text-sm font-bold text-primary'
              : 'flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-primary/[0.09] text-sm font-bold text-primary disabled:opacity-60'
          }
        >
          {busy && rating === null ? <Loader2 size={18} className="animate-spin" /> : <ThumbsUp size={18} />}
          {t('mealfb.yes')}
        </button>
        <button
          type="button"
          onClick={() => setRating('down')}
          disabled={busy}
          className={
            rating === 'down'
              ? 'flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-primary bg-primary/[0.09] text-sm font-bold text-primary'
              : 'flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl border bg-card text-sm font-bold text-muted-foreground'
          }
        >
          <ThumbsDown size={18} />
          {t('mealfb.no')}
        </button>
      </div>

      {rating === 'down' && (
        <div className="mt-4 rounded-2xl border bg-popover p-4">
          <p className="font-bold">{t('mealfb.correctTitle')}</p>

          <div className="mt-3 flex flex-col gap-2.5">
            <label className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
              <span className="w-[70px] flex-shrink-0 text-[13px] font-semibold text-muted-foreground">
                {t('mealfb.dish')}
              </span>
              <input
                type="text"
                value={dish}
                onChange={(e) => setDish(e.target.value)}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-bold outline-none"
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
              <span className="w-[70px] flex-shrink-0 text-[13px] font-semibold text-muted-foreground">
                {t('mealfb.portion')}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={portion}
                onChange={(e) => setPortion(e.target.value.replace(/[^\d]/g, ''))}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-bold outline-none"
              />
              <span className="flex-shrink-0 text-[13px] font-semibold text-muted-foreground">g</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3">
              <span className="w-[70px] flex-shrink-0 text-[13px] font-semibold text-muted-foreground">
                {t('mealfb.calories')}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={kcal}
                onChange={(e) => setKcal(e.target.value.replace(/[^\d]/g, ''))}
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-bold outline-none"
              />
              <span className="flex-shrink-0 text-[13px] font-semibold text-muted-foreground">kcal</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void send('down', true)}
            disabled={busy}
            className="mt-3.5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : null}
            {t('mealfb.send')}
          </button>

          <p className="mt-2.5 text-center text-xs text-muted-foreground">
            <span className="font-bold text-primary">+10 {t('points.points')}</span> — {t('mealfb.anonNote')}
          </p>
        </div>
      )}
    </div>
  )
}
