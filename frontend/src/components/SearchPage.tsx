/**
 * Page de recherche produits avec filtres, tri et pagination
 * Composant React client monté dans recherche.astro
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import ProductCard from '@/components/ProductCard'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import type { Product, Category, NutriScoreGrade } from '@/lib/types'

// ────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────

const DIRECTUS_URL = '/api/directus'

const PAGE_SIZE = 20

const SORT_OPTIONS = [
  { value: '-scan_count', labelKey: 'search.sortMostScanned' },
  { value: '-scan_score', labelKey: 'search.sortBestScore' },
  { value: '-date_created', labelKey: 'search.sortNewest' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']

const NUTRISCORE_GRADES: NutriScoreGrade[] = ['A', 'B', 'C', 'D', 'E']

const NUTRISCORE_COLORS: Record<NutriScoreGrade, string> = {
  A: 'bg-green-600',
  B: 'bg-lime-500',
  C: 'bg-yellow-400',
  D: 'bg-orange-500',
  E: 'bg-red-600',
}

// ────────────────────────────────────────────────────────────────
// Types internes
// ────────────────────────────────────────────────────────────────

interface Filters {
  query: string
  categoryId: number | null
  scoreMin: number
  nutriscoreGrades: NutriScoreGrade[]
  noAdditives: boolean
  halal: boolean
  bio: boolean
  sort: SortValue
}

const defaultFilters: Filters = {
  query: '',
  categoryId: null,
  scoreMin: 0,
  nutriscoreGrades: [],
  noAdditives: false,
  halal: false,
  bio: false,
  sort: '-scan_count',
}

// ────────────────────────────────────────────────────────────────
// Helpers pour construire la requête Directus
// ────────────────────────────────────────────────────────────────

function buildQueryParams(filters: Filters, offset: number): string {
  const params = new URLSearchParams()

  // Filtre status obligatoire
  params.set('filter[status][_eq]', 'published')

  // Recherche texte
  if (filters.query.trim()) {
    const q = filters.query.trim()
    // On utilise _or sur name_fr, brand et barcode
    params.set('filter[_or][0][name_fr][_icontains]', q)
    params.set('filter[_or][1][brand][_icontains]', q)
    params.set('filter[_or][2][barcode][_eq]', q)
  }

  // Catégorie
  if (filters.categoryId !== null) {
    params.set('filter[category_id][_eq]', String(filters.categoryId))
  }

  // Score minimum
  if (filters.scoreMin > 0) {
    params.set('filter[scan_score][_gte]', String(filters.scoreMin))
  }

  // Nutri-Score
  if (filters.nutriscoreGrades.length > 0) {
    filters.nutriscoreGrades.forEach((grade, i) => {
      params.set(`filter[nutriscore_grade][_in][${i}]`, grade)
    })
  }

  // Sans additifs à éviter — on filtre les produits sans additifs ou avec liste vide
  if (filters.noAdditives) {
    params.set('filter[additives][_null]', 'true')
  }

  // Halal
  if (filters.halal) {
    params.set('filter[is_halal][_eq]', 'true')
  }

  // Bio
  if (filters.bio) {
    params.set('filter[is_organic][_eq]', 'true')
  }

  // Tri
  params.set('sort', filters.sort)

  // Pagination
  params.set('limit', String(PAGE_SIZE))
  params.set('offset', String(offset))

  // Méta pour savoir s'il reste des résultats
  params.set('meta', 'filter_count')

  return params.toString()
}

// ────────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const { t } = useLocale()
  const [filters, setFilters] = useState<Filters>(defaultFilters)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [offResults, setOffResults] = useState<Product[]>([])
  const [searchingOff, setSearchingOff] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Charger les catégories au montage
  useEffect(() => {
    fetch(`${DIRECTUS_URL}/items/categories?sort=name_fr&limit=-1`)
      .then((res) => res.json())
      .then((json: { data: Category[] }) => setCategories(json.data))
      .catch(() => {
        /* Silencieux si l'API est indisponible */
      })
  }, [])

  // Debounce sur la saisie texte (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(filters.query)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters.query])

  // Recherche quand les filtres changent (sauf query qui est debounced)
  const fetchProducts = useCallback(
    async (currentOffset: number, append: boolean) => {
      const filtersWithDebouncedQuery = { ...filters, query: debouncedQuery }
      const url = `${DIRECTUS_URL}/items/products?${buildQueryParams(filtersWithDebouncedQuery, currentOffset)}`

      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        let localProducts: Product[] = []
        let localCount = 0

        const res = await fetch(url)
        if (res.ok) {
          const json = (await res.json()) as {
            data: Product[]
            meta?: { filter_count?: number }
          }
          localProducts = json.data ?? []
          localCount = json.meta?.filter_count ?? localProducts.length
        }
        // Si Directus retourne 403 ou erreur, localProducts reste []

        if (append) {
          setProducts((prev) => [...prev, ...localProducts])
        } else {
          setProducts(localProducts)
        }

        setTotalCount(localCount)

        // Recherche OFF si Directus n'a rien (ou est indisponible) et query ≥ 3 caractères
        if (!append && localProducts.length === 0 && debouncedQuery.trim().length >= 3) {
          setSearchingOff(true)
          try {
            const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(debouncedQuery.trim())}&json=1&page_size=20&lc=fr&cc=ma`
            const offRes = await fetch(offUrl)
            if (offRes.ok) {
              const offJson = await offRes.json()
              const offProducts: Product[] = (offJson.products || [])
                .filter((p: Record<string, unknown>) => p.code && p.product_name)
                .map((p: Record<string, unknown>) => ({
                  id: p.code as string,
                  barcode: p.code as string,
                  name_fr: (p.product_name_fr || p.product_name || 'Inconnu') as string,
                  brand: (p.brands || 'Inconnu') as string,
                  image_front: (p.image_front_small_url || p.image_front_url || null) as string | null,
                  scan_score: null,
                  score_label: null,
                  nutriscore_grade: p.nutriscore_grade ? (p.nutriscore_grade as string).toUpperCase() : null,
                  nova_group: (p.nova_group as number) || null,
                  additives: [],
                  scan_count: 0,
                  status: 'published',
                }))
              setOffResults(offProducts)
            }
          } catch {
            // Silencieux si OFF indisponible
          } finally {
            setSearchingOff(false)
          }
        } else if (!append) {
          setOffResults([])
        }
      } catch {
        if (!append) setProducts([])
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [filters, debouncedQuery]
  )

  // Déclencher la recherche quand les filtres (non-texte) ou la query debounced changent
  useEffect(() => {
    setOffset(0)
    fetchProducts(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedQuery,
    filters.categoryId,
    filters.scoreMin,
    filters.nutriscoreGrades,
    filters.noAdditives,
    filters.halal,
    filters.bio,
    filters.sort,
  ])

  // Charger plus
  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE
    setOffset(newOffset)
    fetchProducts(newOffset, true)
  }

  // Helpers de mise à jour des filtres
  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const toggleNutriscore = (grade: NutriScoreGrade) => {
    setFilters((prev) => {
      const grades = prev.nutriscoreGrades.includes(grade)
        ? prev.nutriscoreGrades.filter((g) => g !== grade)
        : [...prev.nutriscoreGrades, grade]
      return { ...prev, nutriscoreGrades: grades }
    })
  }

  const hasActiveFilters =
    filters.categoryId !== null ||
    filters.scoreMin > 0 ||
    filters.nutriscoreGrades.length > 0 ||
    filters.noAdditives ||
    filters.halal ||
    filters.bio

  const hasMore = products.length < totalCount

  // ────────────────────────────────────────────────────────────────
  // Rendu
  // ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Barre de recherche */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          placeholder={t('search.placeholder')}
          value={filters.query}
          onChange={(e) => updateFilter('query', e.target.value)}
          className="w-full rounded-xl border bg-background py-3 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* Barre tri + bouton filtres */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={filtersOpen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="gap-1.5"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {t('search.filters')}
            {hasActiveFilters && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-primary text-[10px] font-bold">
                {
                  [
                    filters.categoryId !== null,
                    filters.scoreMin > 0,
                    filters.nutriscoreGrades.length > 0,
                    filters.noAdditives,
                    filters.halal,
                    filters.bio,
                  ].filter(Boolean).length
                }
              </span>
            )}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({ ...defaultFilters, query: filters.query, sort: filters.sort })}
              className="text-xs text-muted-foreground"
            >
              {t('search.resetFilters')}
            </Button>
          )}
        </div>

        {/* Tri */}
        <select
          value={filters.sort}
          onChange={(e) => updateFilter('sort', e.target.value as SortValue)}
          className="rounded-lg border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
      </div>

      {/* Panneau de filtres (dépliable) */}
      {filtersOpen && (
        <div className="rounded-xl border bg-card p-4 space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">
          {/* Catégorie */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('search.category')}</label>
            <select
              value={filters.categoryId ?? ''}
              onChange={(e) =>
                updateFilter('categoryId', e.target.value ? Number(e.target.value) : null)
              }
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">{t('search.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon ? `${cat.icon} ` : ''}
                  {cat.name_fr}
                </option>
              ))}
            </select>
          </div>

          {/* Score minimum */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {t('search.scoreMin')} : <span className="font-bold text-primary">{filters.scoreMin}</span>
            </label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={filters.scoreMin}
              onChange={(e) => updateFilter('scoreMin', Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Nutri-Score */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t('nutriscore.title')}</label>
            <div className="flex gap-2">
              {NUTRISCORE_GRADES.map((grade) => {
                const active = filters.nutriscoreGrades.includes(grade)
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => toggleNutriscore(grade)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-all',
                      active
                        ? `${NUTRISCORE_COLORS[grade]} text-white shadow-sm`
                        : 'border bg-background text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {grade}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-2">
            <ToggleChip
              label={t('search.noAdditives')}
              active={filters.noAdditives}
              onClick={() => updateFilter('noAdditives', !filters.noAdditives)}
            />
            <ToggleChip
              label={t('search.halal')}
              active={filters.halal}
              onClick={() => updateFilter('halal', !filters.halal)}
            />
            <ToggleChip
              label={t('search.bio')}
              active={filters.bio}
              onClick={() => updateFilter('bio', !filters.bio)}
            />
          </div>
        </div>
      )}

      {/* Compteur de résultats */}
      {!loading && (
        <p className="text-sm text-muted-foreground">
          {totalCount > 0
            ? `${totalCount} ${t('search.results')}`
            : null}
        </p>
      )}

      {/* Squelette de chargement */}
      {loading && <LoadingSkeleton />}

      {/* Grille de résultats */}
      {!loading && products.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Résultats Open Food Facts (quand Directus est vide) */}
      {!loading && products.length === 0 && offResults.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2.5">
            <svg className="w-4 h-4 text-amber-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <p className="text-sm text-amber-800">
              {t('search.noLocalResults')} — <strong>{offResults.length}</strong> {t('search.offResults')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offResults.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Recherche OFF en cours */}
      {searchingOff && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t('search.searchingOff')}
        </div>
      )}

      {/* État vide (ni local ni OFF) */}
      {!loading && !searchingOff && products.length === 0 && offResults.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <svg
            className="mb-4 text-muted-foreground/40"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M8 11h6" />
          </svg>
          <p className="text-lg font-medium text-foreground">{t('search.noResults')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('search.noResultsDesc')}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setFilters(defaultFilters)}
            >
              {t('search.resetFilters')}
            </Button>
          )}
        </div>
      )}

      {/* Charger plus */}
      {!loading && hasMore && products.length > 0 && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="min-w-[200px]"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {t('common.loading')}
              </span>
            ) : (
              t('search.loadMore')
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Sous-composants
// ────────────────────────────────────────────────────────────────

/** Chip toggle pour les filtres booléens */
function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-background text-muted-foreground hover:bg-muted'
      )}
    >
      {active && (
        <svg
          className="mr-1 inline-block"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
      {label}
    </button>
  )
}

/** Squelette de chargement avec animation pulse */
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-xl border bg-card p-3 animate-pulse"
        >
          <div className="h-20 w-20 rounded-lg bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="flex gap-1.5">
              <div className="h-4 w-12 rounded-full bg-muted" />
              <div className="h-4 w-12 rounded-full bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
