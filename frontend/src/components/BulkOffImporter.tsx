/**
 * Import massif de produits depuis Open Food Facts (Maroc)
 * Parcourt les pages OFF filtrées par pays=Maroc, importe les produits complets
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getAccessToken } from '@/lib/auth'
import { computeScore, type RiskLevel } from '@/lib/scoring'
import {
  Download,
  Square,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react'

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

const DIRECTUS_URL = '/api/directus'

interface OffNutriments {
  'energy-kcal_100g'?: number
  fat_100g?: number
  'saturated-fat_100g'?: number
  carbohydrates_100g?: number
  sugars_100g?: number
  fiber_100g?: number
  proteins_100g?: number
  salt_100g?: number
}

interface OffIngredient {
  id: string
  text: string
  percent?: number
  percent_estimate?: number
}

interface OffSearchProduct {
  code: string
  product_name_fr?: string
  product_name?: string
  brands?: string
  nutriscore_grade?: string
  nova_group?: number
  nutriments?: OffNutriments
  ingredients_text_fr?: string
  ingredients_text?: string
  additives_tags?: string[]
  image_front_url?: string
  image_nutrition_url?: string
  image_ingredients_url?: string
  categories_tags?: string[]
  traces_tags?: string[]
  ingredients?: OffIngredient[]
}

interface OffSearchResponse {
  count: number
  page: number
  page_count: number
  page_size: number
  products: OffSearchProduct[]
}

type LogLevel = 'imported' | 'skipped' | 'exists' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
}

interface ImportStats {
  pagesScanned: number
  pageCount: number
  foundOnOff: number
  filtered: number
  alreadyInBayen: number
  imported: number
  errors: number
}

// ────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────

// Proxy Directus (avec cache + throttle + retry) : plus stable qu'un
// Worker Cloudflare Pages, et partage le cache entre tous les clients.
// Voir bayen-api/src/off-search.ts.
function buildOffUrl(page: number): string {
  return `/api/directus/bayen-api/off-search?page=${page}&country=morocco&page_size=100`
}

/** Traduction des traces OFF vers le français */
const TRACES_FR: Record<string, string> = {
  nuts: 'fruits a coque',
  milk: 'lait',
  eggs: 'oeufs',
  gluten: 'gluten',
  soybeans: 'soja',
  peanuts: 'arachide',
  'sesame-seeds': 'sesame',
  fish: 'poisson',
  crustaceans: 'crustaces',
  celery: 'celeri',
  mustard: 'moutarde',
  lupin: 'lupin',
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

/** Filtre un produit OFF : toutes les données requises doivent exister */
function isProductComplete(p: OffSearchProduct): boolean {
  const hasImage = Boolean(p.image_front_url)
  const hasEnergy = p.nutriments?.['energy-kcal_100g'] != null
  const hasIngredients = Boolean(p.ingredients_text_fr || p.ingredients_text)
  const hasName = Boolean(p.product_name_fr || p.product_name)
  const hasBrand = Boolean(p.brands)
  return hasImage && hasEnergy && hasIngredients && hasName && hasBrand
}

/** Extrait les codes additifs depuis les tags OFF ("en:e100" -> "E100") */
function extractAdditives(tags: string[]): string[] {
  return tags
    .map((tag) => {
      const match = tag.match(/e(\d+[a-z]?)/i)
      return match ? `E${match[1].toUpperCase()}` : null
    })
    .filter((v): v is string => v !== null)
}

/** Nettoie les traces_tags OFF */
function cleanTraces(tracesTags: string[]): string[] {
  return tracesTags.map((tag) => {
    const key = tag.replace(/^en:/, '')
    return TRACES_FR[key] ?? key
  })
}

// ────────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────────

// Clé localStorage pour la reprise d'import interrompu.
// Contient la dernière page COMPLÉTÉE avec succès et les stats cumulées.
const RESUME_KEY = 'bayen_bulkoff_resume'

interface ResumeState {
  nextPage: number // page à laquelle reprendre
  stats: ImportStats
  updatedAt: number
}

function loadResume(): ResumeState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(RESUME_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ResumeState
    // Expiration : 24 h (au-delà, on repart de zéro)
    if (Date.now() - parsed.updatedAt > 24 * 3600 * 1000) return null
    return parsed
  } catch {
    return null
  }
}

function saveResume(state: ResumeState): void {
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify(state))
  } catch { /* quota / privé */ }
}

function clearResume(): void {
  try { localStorage.removeItem(RESUME_KEY) } catch { /* idem */ }
}

export default function BulkOffImporter() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const [stats, setStats] = useState<ImportStats>({
    pagesScanned: 0,
    pageCount: 0,
    foundOnOff: 0,
    filtered: 0,
    alreadyInBayen: 0,
    imported: 0,
    errors: 0,
  })
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [resume, setResume] = useState<ResumeState | null>(null)

  const stopRef = useRef(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  // Détecter un import interrompu au montage
  useEffect(() => {
    setResume(loadResume())
  }, [])

  // Auto-scroll le log vers le bas
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Vérifier que l'utilisateur est admin
  useEffect(() => {
    async function checkAdmin() {
      const token = await getAccessToken()
      if (!token) {
        setIsAdmin(false)
        return
      }
      try {
        const userRes = await fetch(`${DIRECTUS_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!userRes.ok) { setIsAdmin(false); return }
        const userData = (await userRes.json()) as { data: { role?: string } }
        const roleId = userData.data?.role
        if (!roleId) { setIsAdmin(false); return }

        const roleRes = await fetch(`${DIRECTUS_URL}/roles/${roleId}?fields=name`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!roleRes.ok) { setIsAdmin(false); return }
        const roleData = (await roleRes.json()) as { data: { name?: string } }
        setIsAdmin(roleData.data?.name === 'Administrator')
      } catch {
        setIsAdmin(false)
      }
    }
    checkAdmin()
  }, [])

  /** Ajouter une ligne au log */
  const addLog = useCallback((level: LogLevel, message: string) => {
    setLogs((prev) => [...prev, { level, message }])
  }, [])

  /** Vérifier si un code-barres existe déjà dans Directus */
  async function checkExists(code: string): Promise<boolean> {
    try {
      const res = await fetch(
        `${DIRECTUS_URL}/items/products?filter[barcode][_eq]=${code}&limit=1`
      )
      if (!res.ok) return false
      const data = (await res.json()) as { data?: Array<{ id: string }> }
      return (data.data?.length ?? 0) > 0
    } catch {
      return false
    }
  }

  /** Importer un seul produit OFF dans Directus
   *  Récupère un token frais à chaque appel pour éviter TOKEN_EXPIRED
   *  (le JWT Directus expire ~15 min, un import massif dure plus que ça).
   */
  async function importSingleProduct(p: OffSearchProduct): Promise<boolean> {
    const token = await getAccessToken()
    if (!token) throw new Error('Session expirée — merci de te reconnecter')
    const name = p.product_name_fr || p.product_name || 'Inconnu'
    const brand = (p.brands || 'Inconnu').split(',')[0].trim()
    const nutriments = p.nutriments ?? ({} as OffNutriments)
    const additivesTags = p.additives_tags ?? []
    const additives = extractAdditives(additivesTags)
    const ingredientsText = p.ingredients_text_fr || p.ingredients_text || ''
    const traces = cleanTraces(p.traces_tags ?? [])

    // Calculer le score Bayen
    const additiveRisks = additives.map((code) => ({
      code,
      risk_level: 'limited' as RiskLevel,
    }))
    const novaGroup = (p.nova_group ?? null) as 1 | 2 | 3 | 4 | null
    const scoreResult = computeScore({
      nutrition: {
        energy_kcal: nutriments['energy-kcal_100g'] ?? null,
        fat_saturated: nutriments['saturated-fat_100g'] ?? null,
        sugars: nutriments.sugars_100g ?? null,
        salt: nutriments.salt_100g ?? null,
        fiber: nutriments.fiber_100g ?? null,
        proteins: nutriments.proteins_100g ?? null,
      },
      novaGroup,
      ingredientsText,
      additives: additiveRisks,
    })

    const productData: Record<string, unknown> = {
      barcode: p.code,
      name_fr: name,
      brand,
      nutriscore_grade: scoreResult.nutriscore_grade,
      nova_group: scoreResult.nova_group,
      scan_score: scoreResult.total,
      score_label: scoreResult.label,
      energy_kcal: nutriments['energy-kcal_100g'] ?? null,
      fat_total: nutriments.fat_100g ?? null,
      fat_saturated: nutriments['saturated-fat_100g'] ?? null,
      carbs_total: nutriments.carbohydrates_100g ?? null,
      sugars: nutriments.sugars_100g ?? null,
      fiber: nutriments.fiber_100g ?? null,
      proteins: nutriments.proteins_100g ?? null,
      salt: nutriments.salt_100g ?? null,
      ingredients_text: ingredientsText,
      additives,
      traces,
      off_id: p.code,
      data_source: 'off',
      status: 'published',
      confidence_score: scoreResult.incomplete ? 0.5 : 0.8,
    }

    // Creer le produit
    const createRes = await fetch(`${DIRECTUS_URL}/items/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(productData),
    })

    if (!createRes.ok) {
      const errBody = await createRes.text()
      throw new Error(`Directus ${createRes.status}: ${errBody.slice(0, 200)}`)
    }

    const created = (await createRes.json()) as {
      data?: { id: string }
    }
    const productId = created?.data?.id

    // Uploader l'image front
    if (productId && p.image_front_url) {
      try {
        const imgRes = await fetch(
          `/api/proxy-image?url=${encodeURIComponent(p.image_front_url)}`
        )
        if (imgRes.ok) {
          const blob = await imgRes.blob()
          const formData = new FormData()
          formData.append('file', blob, `${p.code}-front.jpg`)
          formData.append('title', `${name} - front`)

          const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          })
          if (uploadRes.ok) {
            const uploadData = (await uploadRes.json()) as {
              data?: { id: string }
            }
            if (uploadData?.data?.id) {
              await fetch(`${DIRECTUS_URL}/items/products/${productId}`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ image_front: uploadData.data.id }),
              })
            }
          }
        }
      } catch {
        // Image optionnelle — ne pas bloquer l'import
      }
    }

    return true
  }

  /** Lancer l'import massif
   *  @param fromResume si true, reprend depuis l'état sauvegardé en localStorage
   */
  async function startImport(fromResume = false) {
    stopRef.current = false
    setIsRunning(true)
    setIsDone(false)
    setLogs([])

    // Stats initiales : soit fraîches, soit cumulatives depuis la reprise
    const resumeState = fromResume ? loadResume() : null
    const initialStats: ImportStats = resumeState?.stats ?? {
      pagesScanned: 0,
      pageCount: 0,
      foundOnOff: 0,
      filtered: 0,
      alreadyInBayen: 0,
      imported: 0,
      errors: 0,
    }
    setStats(initialStats)

    if (!fromResume) {
      clearResume()
      setResume(null)
    }

    const token = await getAccessToken()
    if (!token) {
      addLog('error', 'Non connecte — impossible de continuer')
      setIsRunning(false)
      return
    }

    let page = resumeState?.nextPage ?? 1
    if (resumeState) {
      addLog('skipped', `Reprise à la page ${page} (${initialStats.imported} produits déjà importés)`)
    }
    let totalPageCount = initialStats.pageCount
    const localStats: ImportStats = { ...initialStats }

    // Parcourir les pages OFF
    while (!stopRef.current) {
      addLog('skipped', `--- Page ${page} ---`)

      // Le proxy /bayen-api/off-search gère cache (15min), throttle 10s,
      // et backoff 20s/60s côté serveur (plafond tunnel Cloudflare). Si le
      // serveur abandonne, on retry 2× côté client avec pause 2 min pour
      // laisser OFF décanter après un bannissement sévère.
      let offData: OffSearchResponse | null = null
      let lastError = ''
      for (let attempt = 1; attempt <= 3; attempt++) {
        if (stopRef.current) break
        try {
          const res = await fetch(buildOffUrl(page))
          if (res.ok) {
            offData = (await res.json()) as OffSearchResponse
            if (attempt > 1) addLog('skipped', `(réussi après ${attempt} tentatives)`)
            break
          }
          lastError = `HTTP ${res.status}`
        } catch (err) {
          lastError = err instanceof Error ? err.message : 'inconnu'
        }
        if (attempt < 3) {
          const pauseSec = 120 // 2 min pour laisser OFF relâcher le blacklist
          addLog('skipped', `Page ${page} : ${lastError}, pause ${pauseSec}s puis retry...`)
          await new Promise((r) => setTimeout(r, pauseSec * 1000))
        }
      }

      if (!offData) {
        addLog('error', `Page ${page} impossible après 3 tentatives (${lastError}) — import stoppé`)
        break
      }

      if (page === 1) {
        totalPageCount = offData.page_count
        localStats.pageCount = totalPageCount
        addLog(
          'skipped',
          `${offData.count} produits sur OFF Maroc — ${totalPageCount} pages`
        )
      }

      localStats.pagesScanned = page
      localStats.foundOnOff += offData.products.length

      // Filtrer les produits complets
      const completeProducts = offData.products.filter(isProductComplete)
      const incompleteCount = offData.products.length - completeProducts.length
      localStats.filtered += completeProducts.length

      if (incompleteCount > 0) {
        addLog(
          'skipped',
          `Ignores (incomplets): ${incompleteCount} produits sur cette page`
        )
      }

      // Importer chaque produit complet
      for (const product of completeProducts) {
        if (stopRef.current) break

        const code = product.code
        const name =
          product.product_name_fr || product.product_name || code

        // Verifier si deja dans Bayen
        const exists = await checkExists(code)
        if (exists) {
          localStats.alreadyInBayen += 1
          addLog('exists', `Existe deja: ${code}`)
          setStats({ ...localStats })
          continue
        }

        // Importer — le token frais est résolu dans importSingleProduct
        try {
          await importSingleProduct(product)
          localStats.imported += 1
          addLog('imported', `Importe: ${name} (${code})`)
        } catch (err) {
          localStats.errors += 1
          addLog(
            'error',
            `Erreur: ${code} — ${err instanceof Error ? err.message : 'inconnu'}`
          )
        }

        setStats({ ...localStats })

        // Delai entre les imports
        await new Promise((r) => setTimeout(r, 300))
      }

      setStats({ ...localStats })

      // Sauvegarder l'état pour reprise éventuelle (page suivante)
      const resumeSnapshot: ResumeState = {
        nextPage: page + 1,
        stats: { ...localStats },
        updatedAt: Date.now(),
      }
      saveResume(resumeSnapshot)
      setResume(resumeSnapshot)

      // Derniere page ou arret demande
      if (page >= totalPageCount || offData.products.length === 0) {
        break
      }

      page += 1
    }

    setIsRunning(false)
    setIsDone(true)

    // Arrêt naturel (toutes les pages ont été traitées) → clear resume
    const completedAll = !stopRef.current && totalPageCount > 0 && page >= totalPageCount
    if (completedAll) {
      clearResume()
      setResume(null)
      addLog('imported', '--- Import termine ---')
    } else if (stopRef.current) {
      addLog('skipped', '--- Import arrete par l\'utilisateur — reprise possible ---')
    } else {
      addLog('skipped', '--- Import interrompu — reprise possible ---')
    }
  }

  /** Arreter l'import */
  function stopImport() {
    stopRef.current = true
  }

  // ────────────────────────────────────────────────────────────────
  // Rendu
  // ────────────────────────────────────────────────────────────────

  // Chargement de la verification admin
  if (isAdmin === null) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Verification des droits...
      </div>
    )
  }

  // Pas admin
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30 p-6 text-red-800 dark:text-red-200">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <span>Acces reserve aux administrateurs.</span>
      </div>
    )
  }

  const progressPercent =
    stats.filtered > 0
      ? Math.round((stats.imported / stats.filtered) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div>
        <h1 className="text-2xl font-bold">
          Import massif — Open Food Facts Maroc
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importe automatiquement les produits vendus au Maroc depuis OFF
        </p>
      </div>

      {/* Bandeau de reprise si import interrompu */}
      {resume && !isRunning && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 space-y-2">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
            Import interrompu détecté
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            Dernier arrêt : page <strong>{resume.nextPage - 1}</strong> terminée ·
            {' '}<strong>{resume.stats.imported}</strong> produits importés ·
            {' '}<strong>{resume.stats.errors}</strong> erreurs ·
            {' '}il y a {Math.round((Date.now() - resume.updatedAt) / 60000)} min
          </p>
        </div>
      )}

      {/* Boutons d'action */}
      <div className="flex flex-wrap gap-3">
        {resume && !isRunning ? (
          <>
            <Button
              onClick={() => startImport(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              Reprendre à la page {resume.nextPage}
            </Button>
            <Button
              onClick={() => startImport(false)}
              variant="outline"
              size="lg"
            >
              Recommencer depuis le début
            </Button>
          </>
        ) : (
          <Button
            onClick={() => startImport(false)}
            disabled={isRunning}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Import en cours...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Lancer l&apos;import
              </>
            )}
          </Button>
        )}

        {isRunning && (
          <Button
            onClick={stopImport}
            variant="destructive"
            size="lg"
          >
            <Square className="mr-2 h-4 w-4" />
            Arreter
          </Button>
        )}
      </div>

      {/* Statistiques */}
      {(isRunning || isDone || stats.pagesScanned > 0) && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Pages scannees"
            value={stats.pagesScanned}
            extra={stats.pageCount > 0 ? `/ ${stats.pageCount}` : undefined}
          />
          <StatCard label="Trouves sur OFF" value={stats.foundOnOff} />
          <StatCard label="Filtres (complets)" value={stats.filtered} />
          <StatCard label="Deja dans Bayen" value={stats.alreadyInBayen} />
          <StatCard
            label="Importes"
            value={stats.imported}
            variant="success"
          />
          <StatCard label="Erreurs" value={stats.errors} variant="error" />
        </div>
      )}

      {/* Barre de progression */}
      {(isRunning || isDone) && stats.filtered > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {stats.imported} / {stats.filtered} importes
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Log */}
      {logs.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <span className="text-sm font-medium">Journal d&apos;import</span>
            <Badge variant="outline">{logs.length} lignes</Badge>
          </div>
          <div className="max-h-96 overflow-y-auto p-3 font-mono text-xs leading-relaxed space-y-0.5">
            {logs.map((entry, i) => (
              <LogLine key={i} entry={entry} />
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Resume */}
      {isDone && (
        <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 text-sm text-green-800 dark:text-green-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="h-4 w-4" />
            Import termine
          </div>
          <p className="mt-1">
            {stats.imported} produits importes, {stats.alreadyInBayen} deja
            presents, {stats.errors} erreurs.
          </p>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Sous-composants
// ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  extra,
  variant,
}: {
  label: string
  value: number
  extra?: string
  variant?: 'success' | 'error'
}) {
  const valueColor =
    variant === 'success'
      ? 'text-green-600'
      : variant === 'error'
        ? 'text-red-600'
        : 'text-foreground'

  return (
    <div className="rounded-xl border bg-card p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${valueColor}`}>
        {value}
        {extra && (
          <span className="text-xs font-normal text-muted-foreground ml-1">
            {extra}
          </span>
        )}
      </p>
    </div>
  )
}

function LogLine({ entry }: { entry: LogEntry }) {
  switch (entry.level) {
    case 'imported':
      return (
        <div className="flex items-start gap-1.5 text-green-700">
          <CheckCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{entry.message}</span>
        </div>
      )
    case 'skipped':
      return (
        <div className="flex items-start gap-1.5 text-muted-foreground">
          <span className="w-3.5 text-center flex-shrink-0 mt-0.5">-</span>
          <span>{entry.message}</span>
        </div>
      )
    case 'exists':
      return (
        <div className="flex items-start gap-1.5 text-blue-600">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{entry.message}</span>
        </div>
      )
    case 'error':
      return (
        <div className="flex items-start gap-1.5 text-red-600">
          <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>{entry.message}</span>
        </div>
      )
  }
}
