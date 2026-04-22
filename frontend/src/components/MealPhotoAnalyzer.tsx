/**
 * Composant React : prise/upload de photo de repas → analyse VLM → score Bayen
 *
 * Flux :
 * 1. L'utilisateur choisit ou prend une photo
 * 2. Preview local + bouton "Analyser"
 * 3. POST /api/meal-score (proxy → tesseract-api /meal-analyze, ~25s)
 * 4. Parse la réponse, calcule le score Bayen via scoring.ts (même algo que
 *    la page produit → une seule source de vérité)
 * 5. Affiche score + description + nutrition + ingrédients
 * 6. Si l'utilisateur est connecté : bouton "Sauver au journal"
 *    → POST /bayen-api/meal-scan (via Directus proxy)
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n'
import { getAccessToken, isAuthenticated } from '@/lib/auth'
import { computeScore, type NutritionData, type NovaGroup } from '@/lib/scoring'
import ScoreDisplay from './ScoreDisplay'
import { Camera, Loader2, CheckCircle, AlertCircle, Upload, RotateCcw, BookmarkPlus } from 'lucide-react'

const DIRECTUS_URL = '/api/directus'

interface MealAnalysis {
  plat?: string | null
  description?: string | null
  ingredients_detected?: string[]
  estimated_kcal?: number | null
  estimated_portion?: string | null
  nutrition_per_100g?: {
    energy_kcal?: number | null
    fat_total?: number | null
    fat_saturated?: number | null
    carbs_total?: number | null
    sugars?: number | null
    fiber?: number | null
    proteins?: number | null
    salt?: number | null
  }
  nova_group?: number | null
  is_beverage?: boolean
  confidence?: number | null
}

interface VlmResponse {
  job_status: 'done' | 'not_a_meal' | 'error'
  duration_ms?: number
  analysis?: MealAnalysis
  message?: string
  error?: string
}

type Screen = 'idle' | 'preview' | 'analyzing' | 'result' | 'error'

export default function MealPhotoAnalyzer() {
  const { t } = useLocale()
  const [screen, setScreen] = useState<Screen>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null)
  const [score, setScore] = useState<ReturnType<typeof computeScore> | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loggedIn, setLoggedIn] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const inputFileRef = useRef<HTMLInputElement>(null)
  const inputCameraRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<number | null>(null)

  // Check auth au montage (permet d'afficher le CTA "Sauver au journal")
  useEffect(() => {
    setLoggedIn(isAuthenticated())
  }, [])

  // Timer pendant l'analyse pour rassurer l'utilisateur
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

  // Libération mémoire de l'URL preview
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
    setScore(null)
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

      const a = data.analysis
      setAnalysis(a)

      // Calcul du score via l'algorithme déterministe (même que page produit)
      const nutrition: NutritionData = {
        energy_kcal: a.nutrition_per_100g?.energy_kcal ?? null,
        fat_saturated: a.nutrition_per_100g?.fat_saturated ?? null,
        sugars: a.nutrition_per_100g?.sugars ?? null,
        salt: a.nutrition_per_100g?.salt ?? null,
        fiber: a.nutrition_per_100g?.fiber ?? null,
        proteins: a.nutrition_per_100g?.proteins ?? null,
        is_beverage: a.is_beverage ?? false,
      }
      const novaGroup =
        a.nova_group && a.nova_group >= 1 && a.nova_group <= 4
          ? (a.nova_group as NovaGroup)
          : null

      const computed = computeScore({
        nutrition,
        novaGroup,
        ingredientsText: (a.ingredients_detected ?? []).join(', '),
        // Le VLM ne détecte pas les additifs industriels depuis une photo
        // (pas d'étiquette visible) → array vide, pas de pénalité additive.
        additives: [],
      })
      setScore(computed)
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
    setScore(null)
    setErrorMsg(null)
    setSaved(false)
    setScreen('idle')
  }

  const handleSave = async () => {
    if (!analysis || !score || !file) return
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

      // 2. Enregistrer le scan
      const saveRes = await fetch(`${DIRECTUS_URL}/bayen-api/meal-scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_file_id: fileId,
          analysis,
          meal_score: score.total,
          score_label: score.label,
          raw: { analysis, score },
        }),
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
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          {t('meal.analyzingHint')}
        </p>
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

  if (screen === 'result' && analysis && score) {
    const portion = analysis.estimated_portion ?? '—'
    const ingredients = analysis.ingredients_detected ?? []
    const kcal = analysis.estimated_kcal

    return (
      <div className="space-y-6">
        {/* Photo + overlay score */}
        <div className="relative rounded-2xl overflow-hidden border bg-muted aspect-[4/3]">
          {previewUrl && (
            <img
              src={previewUrl}
              alt={analysis.plat ?? 'Repas'}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Titre + portion + kcal */}
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">{analysis.plat}</h2>
          <p className="text-sm text-muted-foreground">
            {kcal != null && <span className="font-semibold text-foreground">{kcal} kcal</span>}
            {kcal != null && <span className="mx-2">·</span>}
            <span>{portion}</span>
          </p>
        </div>

        {/* Cercle de score */}
        <div className="rounded-2xl border bg-card p-6">
          <ScoreDisplay score={score} dataSource="meal_scan" />
        </div>

        {/* Description */}
        {analysis.description && (
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-2">{t('meal.description')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {analysis.description}
            </p>
          </div>
        )}

        {/* Ingrédients détectés */}
        {ingredients.length > 0 && (
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">
              {t('meal.ingredients')}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                ({ingredients.length})
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ing, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {ing}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Nutrition 100g */}
        {analysis.nutrition_per_100g && (
          <div className="rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold mb-3">{t('meal.nutritionPer100g')}</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {[
                ['energy_kcal', 'kcal', t('meal.energy')],
                ['fat_total', 'g', t('meal.fat')],
                ['fat_saturated', 'g', t('meal.fatSaturated')],
                ['carbs_total', 'g', t('meal.carbs')],
                ['sugars', 'g', t('meal.sugars')],
                ['fiber', 'g', t('meal.fiber')],
                ['proteins', 'g', t('meal.proteins')],
                ['salt', 'g', t('meal.salt')],
              ].map(([key, unit, label]) => {
                const val = analysis.nutrition_per_100g?.[
                  key as keyof typeof analysis.nutrition_per_100g
                ]
                if (val == null) return null
                return (
                  <div key={key} className="flex justify-between border-b border-border/50 py-1">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-medium">
                      {val}
                      {unit === 'g' ? ' g' : ''}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {loggedIn && !saved && (
            <Button onClick={handleSave} disabled={saving} size="lg" className="flex-1">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('meal.saving')}
                </>
              ) : (
                <>
                  <BookmarkPlus className="mr-2 h-4 w-4" />
                  {t('meal.saveToJournal')}
                </>
              )}
            </Button>
          )}
          {saved && (
            <div className="flex-1 rounded-md bg-green-50 border border-green-200 dark:bg-green-950/40 dark:border-green-900 px-4 py-2 flex items-center gap-2 text-green-800 dark:text-green-200 text-sm">
              <CheckCircle className="h-4 w-4" />
              {t('meal.savedOk')}{' '}
              <a href="/compte/journal" className="ml-auto underline text-sm font-medium">
                {t('meal.seeJournal')}
              </a>
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

        {/* Confidence note */}
        {typeof analysis.confidence === 'number' && analysis.confidence < 0.7 && (
          <p className="text-xs text-muted-foreground text-center italic">
            {t('meal.lowConfidence')}
          </p>
        )}
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
            <span className="text-xs text-muted-foreground max-w-xs text-center">
              {t('meal.takePhotoHint')}
            </span>
          </button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-muted-foreground">
                {t('meal.or')}
              </span>
            </div>
          </div>
          <button
            onClick={() => inputFileRef.current?.click()}
            className="w-full rounded-xl border bg-card hover:bg-accent transition-colors p-4 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Upload className="h-4 w-4" />
            {t('meal.uploadFile')}
          </button>
          {/* Inputs cachés */}
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
