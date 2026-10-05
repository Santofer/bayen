/**
 * Composant React : prise/upload de photo de repas → estimation IA
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
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n'
import { shrinkToFile } from '@/lib/image'
import { getAccessToken, isAuthenticated } from '@/lib/auth'
import { addMealToHistory } from '@/lib/meal-history'
import MealFeedback from '@/components/MealFeedback.tsx'
import { Camera, Loader2, CheckCircle, AlertCircle, Upload, RotateCcw, BookmarkPlus, Flame, Lightbulb, Leaf, BookOpen } from 'lucide-react'

const DIRECTUS_URL = '/api/directus'

type Confiance = 'faible' | 'moyenne' | 'elevee'
type Verdict = 'sain' | 'equilibre' | 'a_limiter' | 'occasionnel'

interface MealAnalysis {
  plat: string | null
  ingredients: string[]
  portion_estimee_g: number | null
  calories_kcal: { min: number | null; max: number | null }
  macros_g: { proteines: number | null; glucides: number | null; lipides: number | null }
  verdict: Verdict
  caracteristiques: string[]
  conseil: string
  alternatives: string[]
  confiance: Confiance
  remarques: string
  /** Fiche du référentiel marocain sur laquelle l'estimation a été calée. */
  reference?: { dish_id: number; name_fr: string; recalibrated: boolean }
}

/** Aplat + emoji du verdict (4 niveaux qualitatifs, échelle de score, texte encre). */
const VERDICT_META: Record<Verdict, { fill: string; emoji: string }> = {
  sain:        { fill: 'bg-score-excellent', emoji: '🥗' },
  equilibre:   { fill: 'bg-score-bon', emoji: '👍' },
  a_limiter:   { fill: 'bg-score-mediocre', emoji: '⚠️' },
  occasionnel: { fill: 'bg-score-mauvais', emoji: '🍔' },
}

interface VlmResponse {
  job_status: 'done' | 'not_a_meal' | 'error'
  duration_ms?: number
  analysis?: MealAnalysis
  message?: string
  error?: string
}

type Screen = 'idle' | 'preview' | 'analyzing' | 'result' | 'error'

/** Pastille de fiabilité : aplat franc, texte encre */
const CONFIANCE_STYLE: Record<Confiance, string> = {
  faible: 'bg-score-mediocre',
  moyenne: 'bg-citron',
  elevee: 'bg-menthe',
}

function formatKcalRange(cal: { min: number | null; max: number | null }): string | null {
  const { min, max } = cal
  if (min != null && max != null) return min === max ? `${min}` : `${min}–${max}`
  if (max != null) return `${max}`
  if (min != null) return `${min}`
  return null
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
    // Photo de téléphone (3 à 12 Mo, parfois HEIC) → JPEG ≤ 1280 px avant tout.
    // Si le navigateur ne sait pas la décoder, on tente l'originale.
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
      plat: analysis.plat ?? 'Repas',
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
      <div className="rounded-2xl border bg-card p-8 text-center space-y-4">
        {/* Naânaa inspecte l'assiette pendant l'analyse IA */}
        <img
          src="/mascotte/naanaa-loupe.webp"
          alt=""
          width="96"
          height="141"
          className="naanaa-bob mx-auto h-auto w-24"
        />
        <h2 className="text-xl font-bold flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 text-ai-ink animate-spin" />
          {t('meal.analyzing')}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('meal.analyzingHint')}</p>
        <div className="pop-chip font-display">{elapsed}s</div>
      </div>
    )
  }

  if (screen === 'error') {
    return (
      <div className="rounded-2xl border bg-card p-6 space-y-4">
        <div className="naanaa items-start">
          <img src="/mascotte/naanaa-oups.webp" alt="" width="72" height="106" />
          <div className="bubble">
            <h3 className="font-semibold flex items-center gap-1.5 text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {t('meal.error.title')}
            </h3>
            <p className="text-sm mt-1">{errorMsg}</p>
          </div>
        </div>
        <Button onClick={handleReset} variant="outline" size="sm">
          <RotateCcw className="mr-2 h-4 w-4" />
          {t('meal.retry')}
        </Button>
      </div>
    )
  }

  if (screen === 'result' && analysis) {
    const kcalRange = formatKcalRange(analysis.calories_kcal)
    const ingredients = analysis.ingredients ?? []
    const m = analysis.macros_g
    const confiance = analysis.confiance ?? 'moyenne'
    const verdict = analysis.verdict ?? 'equilibre'
    const vmeta = VERDICT_META[verdict]
    const caracteristiques = analysis.caracteristiques ?? []
    const alternatives = analysis.alternatives ?? []

    return (
      <div className="space-y-6">
        {/* Photo (maquette Repas : vignette arrondie, ombre nette) */}
        <div className="relative rounded-[28px] overflow-hidden border-2 border-line tint-figue aspect-[4/3] shadow-[var(--shadow-lift)]">
          {previewUrl && (
            <img src={previewUrl} alt={analysis.plat ?? 'Repas'} className="w-full h-full object-cover" />
          )}
        </div>

        {/* Titre + verdict qualitatif (remplace le score 0-100, inadapté aux plats) + fiabilité */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{analysis.plat}</h2>
          <div className="flex flex-wrap gap-1.5">
            <span className={`pop-chip h-8 border-encre text-sm font-bold text-encre ${vmeta.fill}`}>
              <span aria-hidden="true">{vmeta.emoji}</span> {t(`meal.verdict.${verdict}`)}
            </span>
            <span className={`pop-chip h-8 border-encre text-encre ${CONFIANCE_STYLE[confiance]}`}>
              {t('meal.confianceLabel')} : {t(`meal.confiance.${confiance}`)}
            </span>
          </div>
        </div>

        {/* Carte d'estimation : aplat figue, fourchettes en Unbounded */}
        <div className="rounded-2xl border-2 border-encre bg-ai text-encre p-5 space-y-4 shadow-[var(--shadow-card)]">
          <p className="flex items-center gap-2 font-semibold">
            <Flame className="h-4 w-4" />
            {t('meal.caloriesTitle')}
          </p>
          {kcalRange ? (
            <p className="font-display text-4xl font-extrabold leading-none">
              {kcalRange} <span className="text-lg">{t('meal.kcal')}</span>
            </p>
          ) : (
            <p className="font-display text-2xl font-extrabold">—</p>
          )}
          {analysis.portion_estimee_g != null && (
            <p className="text-xs opacity-80">
              {t('meal.forPortion')} {analysis.portion_estimee_g} g
            </p>
          )}
          {(m.proteines != null || m.glucides != null || m.lipides != null) && (
            <div>
              <h3 className="sr-only">{t('meal.macrosTitle')}</h3>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['proteines', m.proteines, t('meal.proteines')],
                  ['glucides', m.glucides, t('meal.glucides')],
                  ['lipides', m.lipides, t('meal.lipides')],
                ] as const).map(([key, val, label]) => (
                  <div key={key} className="rounded-xl border-2 border-encre bg-creme p-2.5">
                    <p className="text-[11px]">{label}</p>
                    <p className="font-display text-base font-extrabold">{val != null ? `${val}` : '—'}<span className="text-xs font-medium"> g</span></p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {caracteristiques.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {caracteristiques.map((c, i) => (
                <span key={i} className="pop-chip border-encre bg-creme text-encre">
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Conseil : c'est Naânaa qui le donne */}
        {analysis.conseil && (
          <div className="naanaa items-start">
            <img src="/mascotte/naanaa-astuce.webp" alt="" width="64" height="94" />
            <div className="bubble">
              <h3 className="text-sm font-semibold mb-0.5 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-ai-ink" />
                {t('meal.conseilTitle')}
              </h3>
              <p className="text-sm leading-relaxed">{analysis.conseil}</p>
            </div>
          </div>
        )}

        {/* Alternatives plus saines */}
        {alternatives.length > 0 && (
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-brand-ink" />
              {t('meal.alternativesTitle')}
            </h3>
            <ul className="space-y-2">
              {alternatives.map((alt, i) => (
                <li key={i} className="flex gap-2 text-sm text-foreground/80">
                  <span className="text-brand-ink font-bold flex-shrink-0">→</span>
                  <span>{alt}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Ingrédients */}
        {ingredients.length > 0 && (
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">
              {t('meal.ingredients')}{' '}
              <span className="text-xs font-normal text-muted-foreground">({ingredients.length})</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing, i) => (
                <Badge key={i} variant="outline" className="text-xs">{ing}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Remarques */}
        {analysis.remarques && (
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-1">{t('meal.remarques')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{analysis.remarques}</p>
          </div>
        )}

        {/* Référentiel marocain : dire sur quoi l'estimation s'appuie */}
        {analysis.reference && (
          <p className="flex items-start gap-2 px-2 text-xs text-muted-foreground">
            <BookOpen size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              {t('mealfb.reference')} « {analysis.reference.name_fr} » {t('mealfb.referenceEnd')}
            </span>
          </p>
        )}

        {/* Retour sur la fiabilité de l'estimation (C21) */}
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

        {/* Caveat estimation */}
        <p className="text-xs text-muted-foreground text-center italic px-2">{t('meal.estimateCaveat')}</p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {loggedIn && !saved && (
            <Button onClick={handleSave} disabled={saving} size="lg" className="flex-1">
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('meal.saving')}</>
              ) : (
                <><BookmarkPlus className="mr-2 h-4 w-4" />{t('meal.saveToJournal')}</>
              )}
            </Button>
          )}
          {saved && (
            <div className="flex-1 rounded-full tint-menthe border-2 border-line px-4 py-2 flex items-center gap-2 text-foreground text-sm font-semibold">
              <CheckCircle className="h-4 w-4 text-brand-ink" />
              {t('meal.savedOk')}{' '}
              <a href="/compte/journal" className="ms-auto underline text-sm font-bold">{t('meal.seeJournal')}</a>
            </div>
          )}
          {!loggedIn && !saved && (
            <Button onClick={handleSaveLocal} variant="outline" size="lg" className="flex-1">
              <BookmarkPlus className="mr-2 h-4 w-4" />
              {t('meal.saveLocal')}
            </Button>
          )}
          <Button onClick={handleReset} variant="outline" size="lg">
            <RotateCcw className="mr-2 h-4 w-4" />
            {t('meal.another')}
          </Button>
        </div>
      </div>
    )
  }

  // screens 'idle' et 'preview'
  return (
    <div className="space-y-4">
      {screen === 'preview' && previewUrl ? (
        <>
          <div className="rounded-[28px] overflow-hidden border-2 border-line tint-figue aspect-[4/3] shadow-[var(--shadow-card)]">
            <img src={previewUrl} alt="aperçu" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAnalyze} size="lg" className="flex-1">
              <Camera className="mr-2 h-4 w-4" />
              {t('meal.analyze')}
            </Button>
            <Button onClick={handleReset} variant="outline" size="lg">
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('meal.retake')}
            </Button>
          </div>
        </>
      ) : (
        <>
          <button
            onClick={() => inputCameraRef.current?.click()}
            className="card-lift w-full rounded-[28px] border-2 border-dashed border-line tint-figue p-10 flex flex-col items-center gap-3 text-foreground"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-encre bg-ai text-encre shadow-[var(--shadow-card)]">
              <Camera className="h-8 w-8" />
            </span>
            <span className="font-semibold text-lg">{t('meal.takePhoto')}</span>
            <span className="text-xs text-foreground/75 max-w-xs text-center">{t('meal.takePhotoHint')}</span>
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">{t('meal.or')}</span>
            </div>
          </div>
          <button
            onClick={() => inputFileRef.current?.click()}
            className="card-lift w-full rounded-full border-2 border-line bg-card p-3.5 flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <Upload className="h-4 w-4" />
            {t('meal.uploadFile')}
          </button>
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
        </>
      )}
    </div>
  )
}
