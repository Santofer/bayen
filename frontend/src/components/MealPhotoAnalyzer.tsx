/**
 * Composant React : prise/upload de photo de repas → estimation IA (maquette « Repas »)
 *
 * Flux :
 * 1. L'utilisateur choisit ou prend une photo
 * 2. Preview local + bouton "Analyser"
 * 3. POST /api/meal-score (proxy → tesseract-api /meal-analyze, ~5s vLLM)
 * 4. Affiche : calories estimées (fourchette), macros, ingrédients, confiance
 * 5. Si connecté : "Sauver au journal" → POST /bayen-api/meal-scan
 *
 * Les valeurs sont des ESTIMATIONS d'après la portion visible (fourchettes
 * + niveau de confiance). Pas de score santé, pas d'avis médical.
 *
 * Rendu en `<section class="section">` successives : le composant se pose
 * directement dans `<main class="screen">` (l'îlot Astro est en display: contents).
 */

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useLocale } from '@/lib/i18n'
import { shrinkToFile } from '@/lib/image'
import { getAccessToken, isAuthenticated } from '@/lib/auth'
import { addMealToHistory } from '@/lib/meal-history'
import MealFeedback from '@/components/MealFeedback.tsx'
import { Camera, Check, Loader2, CheckCircle, AlertCircle, Upload, RotateCcw, BookmarkPlus, Lightbulb, Leaf, BookOpen } from 'lucide-react'

const DIRECTUS_URL = '/api/directus'

type Confiance = 'faible' | 'moyenne' | 'elevee'
type Verdict = 'sain' | 'equilibre' | 'a_limiter' | 'occasionnel'

interface MealAnalysis {
  plat: string | null
  ingredients: string[]
  portion_estimee_g: number | null
  calories_kcal: { min: number | null; max: number | null }
  macros_g: { proteines: number | null; glucides: number | null; lipides: number | null }
  verdict?: Verdict | null
  caracteristiques: string[]
  conseil: string
  alternatives: string[]
  confiance: Confiance
  remarques: string
  /** Fiche du référentiel marocain sur laquelle l'estimation a été calée. */
  reference?: { dish_id: number; name_fr: string; recalibrated: boolean }
}

/** Pastille du verdict qualitatif (échelle de score, posée dans une puce crème) */
const VERDICT_FILL: Record<Verdict, string> = {
  sain: 'bg-score-excellent',
  equilibre: 'bg-score-bon',
  a_limiter: 'bg-score-mediocre',
  occasionnel: 'bg-score-mauvais',
}

interface VlmResponse {
  job_status: 'done' | 'not_a_meal' | 'error'
  duration_ms?: number
  analysis?: MealAnalysis
  message?: string
  error?: string
}

type Screen = 'idle' | 'preview' | 'analyzing' | 'result' | 'error'

/** Puce de confiance : aplat franc, texte encre */
const CONFIANCE_FILL: Record<Confiance, string> = {
  faible: 'bg-score-mediocre',
  moyenne: 'bg-citron',
  elevee: 'bg-score-excellent',
}

function formatKcalRange(cal: { min: number | null; max: number | null }): string | null {
  const { min, max } = cal
  if (min != null && max != null) return min === max ? `${min}` : `${min} – ${max}`
  if (max != null) return `${max}`
  if (min != null) return `${min}`
  return null
}

/** Vignette 300 px de la photo de l'utilisateur, puce « Ta photo » (maquette Repas) */
function PhotoTile({ src, alt }: { src: string; alt: string }) {
  const { t } = useLocale()
  return (
    <div className="relative">
      <div className="tile tint-figue h-[300px] rounded-[28px] shadow-[5px_5px_0_var(--color-hard)] md:h-[420px]">
        <img src={src} alt={alt} />
      </div>
      <span className="chip absolute start-3.5 top-3.5 border-encre bg-creme text-encre">
        <Camera aria-hidden="true" /> {t('meal.yourPhoto')}
      </span>
    </div>
  )
}

/** Naânaa dans son médaillon 56 px + bulle */
function Naanaa({ pose, children }: { pose: 'astuce' | 'oups'; children: ReactNode }) {
  return (
    <div className="naanaa grid-cols-[56px_minmax(0,1fr)]">
      <div className="m size-14"><img src={`/mascotte/naanaa-${pose}.webp`} alt="" width="56" height="56" /></div>
      {children}
    </div>
  )
}

export default function MealPhotoAnalyzer() {
  const { t } = useLocale()
  const [screen, setScreen] = useState<Screen>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const inputFileRef = useRef<HTMLInputElement>(null)
  const inputCameraRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setLoggedIn(isAuthenticated())
  }, [])

  useEffect(() => {
    if (screen !== 'analyzing') {
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
      return
    }
    setElapsed(0)
    timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [screen])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleFile = async (picked: File | null | undefined) => {
    if (!picked) return
    // Photo de téléphone (3 à 12 Mo, parfois HEIC) → JPEG ≤ 1280 px avant tout
    // (le serveur vision redescend à 768 px). Si le navigateur ne sait pas la décoder, on tente l'originale.
    const f = await shrinkToFile(picked).catch(() => picked)
    if (f.size > 8 * 1024 * 1024) {
      setErrorMsg(t('meal.error.tooLarge'))
      setScreen('error')
      return
    }
    setFile(f)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(f))
    setScreen('preview')
    setErrorMsg(null)
    setAnalysis(null)
    setSaved(false)
  }

  const handleAnalyze = useCallback(async () => {
    if (!file) return
    setScreen('analyzing')
    setErrorMsg(null)

    try {
      const form = new FormData()
      form.append('image', file)

      const res = await fetch('/api/meal-score', { method: 'POST', body: form })
      const data = (await res.json().catch(() => ({ job_status: 'error' }))) as VlmResponse

      if (data.job_status === 'not_a_meal') {
        setErrorMsg(data.message ?? t('meal.error.notAMeal'))
        setScreen('error')
        return
      }
      if (!res.ok || data.job_status !== 'done' || !data.analysis) {
        setErrorMsg(data.message ?? data.error ?? t('meal.error.generic'))
        setScreen('error')
        return
      }

      setAnalysis(data.analysis)
      setScreen('result')
    } catch {
      // Réseau coupé ou délai dépassé : le message technique du navigateur n'aide personne
      setErrorMsg(t('meal.error.generic'))
      setScreen('error')
    }
  }, [file, t])

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setFile(null)
    setPreviewUrl(null)
    setAnalysis(null)
    setErrorMsg(null)
    setSaved(false)
    setScreen('idle')
  }

  /** Sauvegarde locale (sans compte) — le journal vit dans le navigateur. */
  const handleSaveLocal = () => {
    if (!analysis) return
    addMealToHistory({
      plat: analysis.plat ?? t('meal.fallbackName'),
      kcal_min: analysis.calories_kcal?.min ?? null,
      kcal_max: analysis.calories_kcal?.max ?? null,
      proteines_g: analysis.macros_g?.proteines ?? null,
      lipides_g: analysis.macros_g?.lipides ?? null,
      glucides_g: analysis.macros_g?.glucides ?? null,
      confiance: analysis.confiance ?? null,
    })
    setSaved(true)
  }

  const handleSave = async () => {
    if (!analysis || !file) return
    setSaving(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setErrorMsg(t('meal.error.loginRequired'))
        setSaving(false)
        return
      }

      // 1. Upload photo vers Directus /files
      const up = new FormData()
      up.append('file', file, `meal-${Date.now()}.jpg`)
      up.append('title', analysis.plat ?? 'Repas')
      const upRes = await fetch(`${DIRECTUS_URL}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: up,
      })
      let fileId: string | null = null
      if (upRes.ok) {
        const upData = (await upRes.json()) as { data?: { id: string } }
        fileId = upData.data?.id ?? null
      }

      // 2. Enregistrer le scan : estimation calories + verdict + conseil
      const saveRes = await fetch(`${DIRECTUS_URL}/bayen-api/meal-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image_file_id: fileId, analysis }),
      })
      if (!saveRes.ok) {
        const errData = (await saveRes.json().catch(() => null)) as { error?: string } | null
        throw new Error(errData?.error ?? `HTTP ${saveRes.status}`)
      }
      setSaved(true)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('meal.error.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  // ─── Rendu ─────────────────────────────────────────────────────────

  if (screen === 'analyzing') {
    return (
      <section className="section gap-3.5 md:grid-cols-2 md:items-center md:gap-10">
        {previewUrl && <PhotoTile src={previewUrl} alt={t('meal.previewAlt')} />}
        <div className="card grid justify-items-center gap-3 p-6 text-center" role="status">
          {/* Naânaa inspecte l'assiette pendant l'analyse IA */}
          <img src="/mascotte/naanaa-loupe.webp" alt="" width="80" height="118" className="naanaa-bob h-auto w-20" />
          <p className="disp d-s flex items-center gap-2">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            {t('meal.analyzing')}
          </p>
          <p className="muted max-w-sm text-sm">{t('meal.analyzingHint')}</p>
          <span className="chip num">{elapsed}s</span>
        </div>
      </section>
    )
  }

  if (screen === 'error') {
    return (
      <section className="section gap-3.5 md:max-w-2xl">
        <Naanaa pose="oups">
          <div className="bubble" role="alert">
            <p className="flex items-center gap-1.5 font-bold">
              <AlertCircle className="size-4 flex-none text-destructive" aria-hidden="true" />
              {t('meal.error.title')}
            </p>
            <p className="mt-1 text-sm">{errorMsg}</p>
          </div>
        </Naanaa>
        <button type="button" onClick={handleReset} className="btn w-max">
          <RotateCcw aria-hidden="true" />
          {t('meal.retry')}
        </button>
      </section>
    )
  }

  if (screen === 'result' && analysis) {
    const plat = analysis.plat ?? t('meal.fallbackName')
    const kcalRange = formatKcalRange(analysis.calories_kcal)
    const ingredients = analysis.ingredients ?? []
    const m = analysis.macros_g
    const confiance = analysis.confiance ?? 'moyenne'
    const verdict = analysis.verdict && VERDICT_FILL[analysis.verdict] ? analysis.verdict : null
    const caracteristiques = analysis.caracteristiques ?? []
    const alternatives = analysis.alternatives ?? []
    const hasMacros = m != null && (m.proteines != null || m.glucides != null || m.lipides != null)

    return (
      <>
        <div className="grid gap-[26px] md:grid-cols-2 md:items-start md:gap-10">
          {/* Photo + plat reconnu + confiance */}
          <section className="section gap-3.5">
            {previewUrl && <PhotoTile src={previewUrl} alt={plat} />}
            <div className="grid gap-1.5">
              <p className="eyebrow">{t('meal.weThink')}</p>
              <h1 className="disp d-l md:text-[40px]">{plat}</h1>
              <div className="chips">
                <span className={`chip fill ${CONFIANCE_FILL[confiance]}`}>
                  <Check aria-hidden="true" /> {t('meal.confidence')} {t(`meal.confiance.${confiance}`).toLowerCase()}
                </span>
                {analysis.portion_estimee_g != null && <span className="chip num">≈ {analysis.portion_estimee_g} g</span>}
              </div>
            </div>
          </section>

          <div className="grid content-start gap-[26px]">
            {/* Carte d'estimation : aplat figue, fourchette en Unbounded 40 px */}
            <section className="section">
              <div className="card grid gap-3.5 border-encre bg-ai p-[18px] text-encre">
                <p className="font-semibold">{t('meal.plateEstimate')}</p>
                <p className="disp num text-[40px] leading-none">
                  {kcalRange ?? '—'} {kcalRange && <span className="text-lg">{t('meal.kcal')}</span>}
                </p>
                {hasMacros && (
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['proteines', m.proteines, t('meal.proteines')],
                      ['glucides', m.glucides, t('meal.glucides')],
                      ['lipides', m.lipides, t('meal.lipides')],
                    ] as const).map(([key, val, label]) => (
                      <div key={key} className="rounded-[14px] border-2 border-encre bg-creme p-2.5">
                        <p className="text-[11px]">{label}</p>
                        <b className="num">{val != null ? `≈ ${val} g` : '—'}</b>
                      </div>
                    ))}
                  </div>
                )}
                {(verdict || caracteristiques.length > 0) && (
                  <div className="chips">
                    {verdict && (
                      <span className="chip border-encre bg-creme text-encre">
                        <span className={`size-2.5 flex-none rounded-full border border-encre ${VERDICT_FILL[verdict]}`} aria-hidden="true" />
                        {t(`meal.verdict.${verdict}`)}
                      </span>
                    )}
                    {caracteristiques.map((c, i) => (
                      <span key={i} className="chip h-auto min-h-[26px] whitespace-normal border-encre bg-creme py-1 text-encre">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Avertissement : estimation, pas un avis médical */}
            <section className="section">
              <Naanaa pose="astuce">
                <p className="bubble">
                  {t('meal.estimateCaveat')}
                  {confiance === 'faible' && <> {t('meal.lowConfidence')}</>}
                </p>
              </Naanaa>
            </section>

            {/* « C'est le bon plat ? » (C21) */}
            <section className="section">
              <MealFeedback
                photo={file}
                plat={analysis.plat}
                confiance={analysis.confiance}
                portionEstimee={analysis.portion_estimee_g}
                caloriesEstimees={
                  analysis.calories_kcal.min != null && analysis.calories_kcal.max != null
                    ? Math.round((analysis.calories_kcal.min + analysis.calories_kcal.max) / 2)
                    : null
                }
              />
            </section>

            <section className="section gap-2.5">
              {saved ? (
                <div className="card flex items-center gap-2 p-3.5 text-sm font-semibold">
                  <CheckCircle className="size-4 flex-none text-brand-ink" aria-hidden="true" />
                  {t('meal.savedOk')}
                  <a href="/compte/journal" className="ms-auto font-bold underline">{t('meal.seeJournal')}</a>
                </div>
              ) : (
                <button type="button" onClick={loggedIn ? () => void handleSave() : handleSaveLocal} disabled={saving} className="btn">
                  {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <BookmarkPlus aria-hidden="true" />}
                  {saving ? t('meal.saving') : loggedIn ? t('meal.saveToJournal') : t('meal.saveLocal')}
                </button>
              )}
              {errorMsg && <p role="alert" className="text-sm text-destructive">{errorMsg}</p>}
              <button type="button" onClick={handleReset} className="btn primary">
                <Camera aria-hidden="true" />
                {t('meal.another')}
              </button>
            </section>
          </div>
        </div>

        {/* Détails de l'analyse (hors maquette) : conseil, alternatives, ingrédients, remarques */}
        {(analysis.conseil || alternatives.length > 0 || ingredients.length > 0 || analysis.remarques || analysis.reference) && (
          <div className="grid gap-[26px] md:grid-cols-2 md:gap-6">
            {analysis.conseil && (
              <section className="section">
                <div className="card grid gap-1.5 p-4">
                  <h2 className="flex items-center gap-1.5 text-sm font-bold">
                    <Lightbulb className="size-4 text-ai-ink" aria-hidden="true" />
                    {t('meal.conseilTitle')}
                  </h2>
                  <p className="text-sm leading-relaxed">{analysis.conseil}</p>
                </div>
              </section>
            )}

            {alternatives.length > 0 && (
              <section className="section">
                <div className="card grid gap-3 p-4">
                  <h2 className="flex items-center gap-2 text-sm font-bold">
                    <Leaf className="size-4 text-brand-ink" aria-hidden="true" />
                    {t('meal.alternativesTitle')}
                  </h2>
                  <ul className="grid gap-2">
                    {alternatives.map((alt, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="flex-none font-bold text-brand-ink rtl:rotate-180" aria-hidden="true">→</span>
                        <span>{alt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {ingredients.length > 0 && (
              <section className="section">
                <div className="card grid gap-3 p-4">
                  <h2 className="text-sm font-bold">
                    {t('meal.ingredients')} <span className="muted text-xs font-normal">({ingredients.length})</span>
                  </h2>
                  <div className="chips">
                    {ingredients.map((ing, i) => (
                      <span key={i} className="chip">{ing}</span>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {analysis.remarques && (
              <section className="section">
                <div className="card grid gap-1 p-4">
                  <h2 className="text-sm font-bold">{t('meal.remarques')}</h2>
                  <p className="muted text-sm leading-relaxed">{analysis.remarques}</p>
                </div>
              </section>
            )}

            {/* Référentiel marocain : dire sur quoi l'estimation s'appuie */}
            {analysis.reference && (
              <section className="section">
                <p className="muted flex items-start gap-2 text-xs">
                  <BookOpen size={14} className="mt-0.5 flex-none" aria-hidden="true" />
                  <span>
                    {t('mealfb.reference')} « {analysis.reference.name_fr} » {t('mealfb.referenceEnd')}
                  </span>
                </p>
              </section>
            )}
          </div>
        )}
      </>
    )
  }

  // Écrans 'idle' et 'preview'
  return (
    <>
      <section className="section gap-2.5">
        <h1 className="disp d-l md:text-[44px]">{t('meal.pageTitle')}</h1>
        <p className="muted text-[15px] md:max-w-2xl md:text-lg">{t('meal.pageSubtitle')}</p>
      </section>

      <section className="section gap-3.5 md:max-w-2xl">
        {screen === 'preview' && previewUrl ? (
          <>
            <PhotoTile src={previewUrl} alt={t('meal.previewAlt')} />
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
              <button type="button" onClick={() => void handleAnalyze()} className="btn primary">
                <Camera aria-hidden="true" />
                {t('meal.analyze')}
              </button>
              <button type="button" onClick={handleReset} className="btn">
                <RotateCcw aria-hidden="true" />
                {t('meal.retake')}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Zone de prise de photo : tuile 300 px pointillée sur aplat figue */}
            <button
              type="button"
              onClick={() => inputCameraRef.current?.click()}
              className="tile tint-figue h-[300px] w-full content-center gap-3 rounded-[28px] border-dashed px-6 text-center shadow-[5px_5px_0_var(--color-hard)] md:h-[360px]"
            >
              <span className="grid size-16 place-items-center rounded-full border-2 border-encre bg-ai text-encre shadow-[3px_3px_0_var(--color-hard)]">
                <Camera className="size-8" aria-hidden="true" />
              </span>
              <span className="disp d-s">{t('meal.takePhoto')}</span>
              <span className="muted max-w-xs text-xs">{t('meal.takePhotoHint')}</span>
            </button>
            <button type="button" onClick={() => inputFileRef.current?.click()} className="btn">
              <Upload aria-hidden="true" />
              {t('meal.uploadFile')}
            </button>
          </>
        )}
        <input
          ref={inputCameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
        <input
          ref={inputFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0])}
        />
      </section>

      <section className="section md:max-w-2xl">
        <Naanaa pose="astuce">
          <p className="bubble">{t('meal.estimateCaveat')}</p>
        </Naanaa>
      </section>
    </>
  )
}
