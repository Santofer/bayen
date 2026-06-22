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
import { getAccessToken, isAuthenticated } from '@/lib/auth'
import { Camera, Loader2, CheckCircle, AlertCircle, Upload, RotateCcw, BookmarkPlus, Flame } from 'lucide-react'

const DIRECTUS_URL = '/api/directus'

type Confiance = 'faible' | 'moyenne' | 'elevee'

interface MealAnalysis {
  plat: string | null
  ingredients: string[]
  portion_estimee_g: number | null
  calories_kcal: { min: number | null; max: number | null }
  macros_g: { proteines: number | null; glucides: number | null; lipides: number | null }
  confiance: Confiance
  remarques: string
}

interface VlmResponse {
  job_status: 'done' | 'not_a_meal' | 'error'
  duration_ms?: number
  analysis?: MealAnalysis
  message?: string
  error?: string
}

type Screen = 'idle' | 'preview' | 'analyzing' | 'result' | 'error'

const CONFIANCE_STYLE: Record<Confiance, string> = {
  faible: 'text-amber-700 border-amber-300 bg-amber-50 dark:text-amber-300 dark:border-amber-800 dark:bg-amber-950/40',
  moyenne: 'text-blue-700 border-blue-300 bg-blue-50 dark:text-blue-300 dark:border-blue-800 dark:bg-blue-950/40',
  elevee: 'text-green-700 border-green-300 bg-green-50 dark:text-green-300 dark:border-green-800 dark:bg-green-950/40',
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

  const handleFile = (f: File | null | undefined) => {
    if (!f) return
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
      const data = (await res.json()) as VlmResponse

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
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('meal.error.generic'))
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

      // 2. Enregistrer le scan (nouveau schéma : estimation calories/macros)
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
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
        <h2 className="text-xl font-bold">{t('meal.analyzing')}</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('meal.analyzingHint')}</p>
        <div className="text-xs font-mono text-muted-foreground">{elapsed}s</div>
      </div>
    )
  }

  if (screen === 'error') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 p-6 space-y-3">
        <div className="flex items-start gap-2 text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold">{t('meal.error.title')}</h3>
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

    return (
      <div className="space-y-6">
        {/* Photo */}
        <div className="relative rounded-2xl overflow-hidden border bg-muted aspect-[4/3]">
          {previewUrl && (
            <img src={previewUrl} alt={analysis.plat ?? 'Repas'} className="w-full h-full object-cover" />
          )}
        </div>

        {/* Titre */}
        <div className="text-center">
          <h2 className="text-2xl font-bold">{analysis.plat}</h2>
        </div>

        {/* Hero calories (fourchette) */}
        <div className="rounded-2xl border bg-card p-6 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-1">
            <Flame className="h-4 w-4 text-orange-500" />
            {t('meal.caloriesTitle')}
          </div>
          {kcalRange ? (
            <p className="text-4xl font-bold text-foreground">
              {kcalRange} <span className="text-xl font-medium text-muted-foreground">{t('meal.kcal')}</span>
            </p>
          ) : (
            <p className="text-2xl font-bold text-muted-foreground">—</p>
          )}
          {analysis.portion_estimee_g != null && (
            <p className="text-xs text-muted-foreground mt-1">
              {t('meal.forPortion')} {analysis.portion_estimee_g} g
            </p>
          )}
          <div className="mt-3">
            <Badge variant="outline" className={CONFIANCE_STYLE[confiance]}>
              {t('meal.confianceLabel')} : {t(`meal.confiance.${confiance}`)}
            </Badge>
          </div>
        </div>

        {/* Macros */}
        {(m.proteines != null || m.glucides != null || m.lipides != null) && (
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">{t('meal.macrosTitle')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {([
                ['proteines', m.proteines, t('meal.proteines')],
                ['glucides', m.glucides, t('meal.glucides')],
                ['lipides', m.lipides, t('meal.lipides')],
              ] as const).map(([key, val, label]) => (
                <div key={key} className="rounded-xl bg-muted/50 p-3 text-center">
                  <p className="text-xl font-bold text-foreground">{val != null ? `${val}` : '—'}<span className="text-sm font-medium text-muted-foreground"> g</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>
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
            <div className="flex-1 rounded-md bg-green-50 border border-green-200 dark:bg-green-950/40 dark:border-green-900 px-4 py-2 flex items-center gap-2 text-green-800 dark:text-green-200 text-sm">
              <CheckCircle className="h-4 w-4" />
              {t('meal.savedOk')}{' '}
              <a href="/compte/journal" className="ml-auto underline text-sm font-medium">{t('meal.seeJournal')}</a>
            </div>
          )}
          {!loggedIn && (
            <a
              href="/connexion"
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent"
            >
              <BookmarkPlus className="h-4 w-4" />
              {t('meal.loginToSave')}
            </a>
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
          <div className="rounded-2xl overflow-hidden border bg-muted aspect-[4/3]">
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
            className="w-full rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors p-10 flex flex-col items-center gap-3 text-primary"
          >
            <Camera className="h-10 w-10" />
            <span className="font-semibold text-lg">{t('meal.takePhoto')}</span>
            <span className="text-xs text-muted-foreground max-w-xs text-center">{t('meal.takePhotoHint')}</span>
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
            className="w-full rounded-xl border bg-card hover:bg-accent transition-colors p-4 flex items-center justify-center gap-2 text-sm font-medium"
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
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <input
            ref={inputFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </>
      )}
    </div>
  )
}
