/**
 * Retour de l'utilisateur sur une estimation de repas (C21).
 *
 * Une estimation par IA se trompe parfois de plat ou de portion, et personne
 * ne pouvait le signaler. Le pouce mesure la fiabilité perçue ; la correction,
 * elle, alimente le référentiel des plats (script de revue hebdomadaire). Si
 * l'utilisateur coche la case, la photo est jointe à la correction : ces couples
 * photo + bonne réponse servent à mesurer l'IA, puis à l'entraîner (LoRA).
 * Rien n'est jamais publié, et sans case cochée aucune photo n'est gardée.
 *
 * Anonyme par défaut, un seul retour par analyse.
 */

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { authHeader } from '@/lib/auth'
import { useAntibot } from '@/lib/antibot'
import { shrink } from '@/lib/image'

const API = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

interface Props {
  plat: string | null
  confiance?: string
  portionEstimee?: number | null
  caloriesEstimees?: number | null
  mealScanId?: string | null
  /** Photo analysée (déjà réduite) : jointe à une correction si l'utilisateur l'accepte */
  photo?: File | null
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
  plat, confiance, portionEstimee, caloriesEstimees, mealScanId, photo,
}: Props) {
  const { t } = useLocale()
  const [rating, setRating] = useState<'up' | 'down' | null>(null)
  const antibot = useAntibot('mealfb-gotcha')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  const [dish, setDish] = useState(plat ?? '')
  const [portion, setPortion] = useState(portionEstimee ? String(portionEstimee) : '')
  const [kcal, setKcal] = useState(caloriesEstimees ? String(caloriesEstimees) : '')
  const [sharePhoto, setSharePhoto] = useState(false)
  const [dishNames, setDishNames] = useState<string[]>([])

  // Référentiel des plats proposé en saisie : des corrections homogènes (« Harira »,
  // pas « hrira »/« soupe ») sont directement exploitables
  useEffect(() => {
    if (rating !== 'down' || dishNames.length > 0) return
    fetch('/api/directus/items/moroccan_dishes?fields=name_fr&sort=name_fr&limit=-1')
      .then((r) => r.json())
      .then((j: { data?: Array<{ name_fr: string }> }) => setDishNames((j.data ?? []).map((d) => d.name_fr)))
      .catch(() => { /* saisie libre */ })
  }, [rating, dishNames.length])

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

      // Photo jointe seulement si correction ET case cochée
      let photoId: string | undefined
      if (withCorrection && sharePhoto && photo && Object.keys(correction).length > 0) {
        photoId = await shrink(photo)
          .then((image) => fetch(`${API}/bayen-api/upload-photo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image, kind: 'meal' }),
          }))
          .then((r) => (r.ok ? r.json() : null))
          .then((d: { file_id?: string } | null) => d?.file_id)
          .catch(() => undefined)
      }

      await fetch(`${API}/bayen-api/meal-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          ...antibot.fields,
          rating: value,
          plat_detecte: plat,
          confiance_ia: confiance,
          meal_scan_id: mealScanId ?? undefined,
          session_id: sessionId(),
          correction: Object.keys(correction).length > 0 ? correction : undefined,
          photo_id: photoId,
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
      <div className="naanaa grid-cols-[56px_minmax(0,1fr)]">
        <div className="m size-14"><img src="/mascotte/naanaa-bravo.webp" alt="" width="56" height="56" /></div>
        <p className="bubble flex items-center gap-2 font-bold">
          <Check size={17} className="flex-none text-brand-ink" aria-hidden="true" /> {t('mealfb.thanks')}
        </p>
      </div>
    )
  }

  // Champ de correction : libellé | saisie | unité
  const FIELD = 'flex items-center gap-3 rounded-[14px] border-2 border-line bg-card px-3.5 py-3'
  const LABEL = 'w-[70px] flex-none text-[13px] font-semibold text-muted-foreground'
  const INPUT = 'min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] font-bold outline-none'

  // Carte « C'est le bon plat ? » (maquette Repas) : Oui / Corriger
  return (
    <div className="card grid gap-3 p-4">
      <p className="font-bold">C'est le bon plat ?</p>
      <div className="grid grid-cols-2 gap-2.5">
        <button type="button" onClick={() => void send('up', false)} disabled={busy} className="btn">
          {busy && rating === null ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          Oui, c'est ça
        </button>
        <button
          type="button"
          onClick={() => setRating('down')}
          disabled={busy}
          aria-expanded={rating === 'down'}
          className={rating === 'down' ? 'btn border-encre bg-ai text-encre' : 'btn'}
        >
          Corriger
        </button>
      </div>
      <p className="muted text-[12.5px]">Tes corrections améliorent les estimations des plats marocains.</p>

      {rating === 'down' && (
        <div className="grid gap-3 rounded-[14px] border-2 border-line bg-muted p-4">
          {antibot.honeypot}
          <p className="font-bold">{t('mealfb.correctTitle')}</p>

          <label className={FIELD}>
            <span className={LABEL}>{t('mealfb.dish')}</span>
            <input type="text" value={dish} onChange={(e) => setDish(e.target.value)} list="mealfb-dishes" className={INPUT} />
            <datalist id="mealfb-dishes">
              {dishNames.map((n) => <option key={n} value={n} />)}
            </datalist>
          </label>

          <label className={FIELD}>
            <span className={LABEL}>{t('mealfb.portion')}</span>
            <input
              type="text"
              inputMode="numeric"
              value={portion}
              onChange={(e) => setPortion(e.target.value.replace(/[^\d]/g, ''))}
              className={INPUT}
            />
            <span className="flex-none text-[13px] font-semibold text-muted-foreground">g</span>
          </label>

          <label className={FIELD}>
            <span className={LABEL}>{t('mealfb.calories')}</span>
            <input
              type="text"
              inputMode="numeric"
              value={kcal}
              onChange={(e) => setKcal(e.target.value.replace(/[^\d]/g, ''))}
              className={INPUT}
            />
            <span className="flex-none text-[13px] font-semibold text-muted-foreground">kcal</span>
          </label>

          {photo && (
            <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-snug text-muted-foreground">
              <input
                type="checkbox"
                checked={sharePhoto}
                onChange={(e) => setSharePhoto(e.target.checked)}
                className="mt-0.5 size-4 flex-none accent-[var(--color-primary)]"
              />
              <span>{t('mealfb.sharePhoto')}</span>
            </label>
          )}

          <button type="button" onClick={() => void send('down', true)} disabled={busy} className="btn primary w-full">
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            {t('mealfb.send')}
          </button>

          <p className="text-center text-xs text-muted-foreground">
            <span className="font-bold text-brand-ink">+10 {t('points.points')}</span> — {t('mealfb.anonNote')}
          </p>
        </div>
      )}
    </div>
  )
}
