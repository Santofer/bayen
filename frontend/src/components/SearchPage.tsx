/**
 * Page de recherche produits avec filtres, tri et pagination (maquette « Recherche »)
 * Composant React client monté dans recherche.astro (avec sa barre du haut) et beaute.astro.
 * Rend des `section.section` : à poser dans un `<main class="screen">`.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import ProductCard from '@/components/ProductCard'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { getProfile } from '@/lib/health-profile'
import type { Product, Category, NutriScoreGrade } from '@/lib/types'
import type { Locale } from '@/lib/translations'
import { SCORE_FILL, type ScoreLevel } from '@/lib/score-colors'

// ────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────

const DIRECTUS_URL = '/api/directus'

const PAGE_SIZE = 20

const SORT_OPTIONS = [
  { value: '-scan_count', labelKey: 'search.sortMostScanned' },
  { value: '-scan_score', labelKey: 'search.sortBestScore' },
  { value: '-date_created', labelKey: 'search.sortNewest' },
  { value: '-proteins', labelKey: 'protein.sort' },
] as const

type SortValue = (typeof SORT_OPTIONS)[number]['value']

const NUTRISCORE_GRADES: NutriScoreGrade[] = ['A', 'B', 'C', 'D', 'E']

// Couleurs officielles Nutri-Score (tokens), lettre et contour encre
const NUTRISCORE_COLORS: Record<NutriScoreGrade, string> = {
  A: 'bg-nutriscore-a',
  B: 'bg-nutriscore-b',
  C: 'bg-nutriscore-c',
  D: 'bg-nutriscore-d',
  E: 'bg-nutriscore-e',
}

// ────────────────────────────────────────────────────────────────
// Types internes
// ────────────────────────────────────────────────────────────────

type Universe = 'food' | 'cosmetic'
const COSMETIC_CATEGORIES = ['visage', 'corps', 'cheveux', 'hygiene', 'dents', 'maquillage', 'parfum', 'solaire', 'bebe', 'homme', 'eclaircissant', 'ongles'] as const

interface Filters {
  /** Univers (C23) : les deux ne se mélangent jamais dans une même liste */
  universe: Universe
  cosmeticCategory: string
  riskFree: boolean
  noEndocrine: boolean
  query: string
  categoryId: number | null
  scoreMin: number
  nutriscoreGrades: NutriScoreGrade[]
  noAdditives: boolean
  halal: boolean
  bio: boolean
  /** Codes E à exclure (produits qui NE contiennent PAS ces additifs) */
  excludeAdditives: string[]
  /** Seuil max de sucres g/100g (0.5 = sans sucres, 5 = faible) — null = off */
  sugarMax: number | null
  /** Seuil min de protéines g/100g (12 = source, 20 = riche) — null = off */
  proteinMin: number | null
  sort: SortValue
}

const defaultFilters: Filters = {
  universe: 'food',
  cosmeticCategory: '',
  riskFree: false,
  noEndocrine: false,
  query: '',
  categoryId: null,
  scoreMin: 0,
  nutriscoreGrades: [],
  noAdditives: false,
  halal: false,
  bio: false,
  excludeAdditives: [],
  sugarMax: null,
  proteinMin: null,
  sort: '-scan_count',
}

/** Additif risqué proposé en exclusion (collection additives) */
interface RiskyAdditive {
  id: string
  name_fr: string
  name_ar: string | null
  risk_level: string
}

/** Sélecteur en pilule (même contour que la recherche) */
const SELECT = 'h-11 w-full cursor-pointer rounded-full border-2 border-line bg-card px-4 text-sm font-semibold text-foreground shadow-[2px_2px_0_var(--color-hard)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
/** Paliers du score minimum : seuils de l'échelle Bayen (scoreToLabel) */
const SCORE_STEPS: Array<{ min: number; level: ScoreLevel | null }> = [
  { min: 0, level: null }, { min: 25, level: 'mediocre' }, { min: 50, level: 'bon' }, { min: 75, level: 'excellent' },
]
/** Pastille du niveau de risque d'un additif */
const RISK_DOT = { banned_ma: 'var(--color-tomate)', avoid: '#FFA24D', limited: 'var(--color-citron)' } as const

// ────────────────────────────────────────────────────────────────
// Helpers pour construire la requête Directus
// ────────────────────────────────────────────────────────────────

function buildQueryParams(filters: Filters, offset: number): string {
  const params = new URLSearchParams()

  // Filtre status obligatoire + univers alimentaire (la beauté passe par l'endpoint custom)
  params.set('filter[status][_eq]', 'published')
  params.set('filter[product_type][_eq]', 'food')

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

  // Sucres (diabète) : taux connu ET sous le seuil — jamais les fiches sans donnée
  if (filters.sugarMax !== null) {
    params.set('filter[sugars][_lte]', String(filters.sugarMax))
    params.set('filter[sugars][_nnull]', 'true')
  }

  // Protéines (sportifs) : taux connu ET au-dessus du seuil
  if (filters.proteinMin !== null) {
    params.set('filter[proteins][_gte]', String(filters.proteinMin))
    params.set('filter[proteins][_nnull]', 'true')
  }

  // Tri — Postgres range les NULL en tête d'un tri décroissant : sans ce filtre,
  // « meilleur score » commencerait par les fiches non notées
  params.set('sort', filters.sort)
  if (filters.sort === '-scan_score' && filters.scoreMin === 0) params.set('filter[scan_score][_nnull]', 'true')

  // Pagination
  params.set('limit', String(PAGE_SIZE))
  params.set('offset', String(offset))

  // Méta pour savoir s'il reste des résultats
  params.set('meta', 'filter_count')

  return params.toString()
}

/**
 * Params pour l'endpoint custom /bayen-api/search-products — requis dès
 * qu'une exclusion d'additifs est active (le champ JSON `additives` ne
 * supporte pas _ncontains via l'API items standard).
 */
function buildCustomParams(filters: Filters, offset: number): string {
  const p = new URLSearchParams()
  p.set('type', filters.universe)
  if (filters.universe === 'cosmetic') {
    if (filters.cosmeticCategory) p.set('cosmetic_category', filters.cosmeticCategory)
    if (filters.riskFree) p.set('risk_free', 'true')
    if (filters.noEndocrine) p.set('no_endocrine', 'true')
  }
  if (filters.query.trim()) p.set('q', filters.query.trim())
  if (filters.categoryId !== null) p.set('category_id', String(filters.categoryId))
  if (filters.scoreMin > 0) p.set('score_min', String(filters.scoreMin))
  if (filters.nutriscoreGrades.length > 0) p.set('nutriscore', filters.nutriscoreGrades.join(','))
  if (filters.noAdditives) p.set('no_additives', 'true')
  if (filters.halal) p.set('halal', 'true')
  if (filters.bio) p.set('bio', 'true')
  if (filters.sugarMax !== null) p.set('sugar_max', String(filters.sugarMax))
  if (filters.proteinMin !== null) p.set('protein_min', String(filters.proteinMin))
  p.set('exclude_additives', filters.excludeAdditives.join(','))
  p.set('sort', filters.sort)
  p.set('limit', String(PAGE_SIZE))
  p.set('offset', String(offset))
  return p.toString()
}

// ────────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────────

interface SearchPageProps {
  /** Page /beaute : univers cosmétique d'emblée */
  initialUniverse?: Universe
  initialCosmeticCategory?: string
  /** Barre du haut de la maquette Recherche (retour, titre, bouton filtres) — /recherche uniquement */
  showTopbar?: boolean
}

export default function SearchPage({ initialUniverse, initialCosmeticCategory, showTopbar = false }: SearchPageProps = {}) {
  const { t, locale } = useLocale()
  // État initial identique côté serveur et client (sinon l'hydratation garde
  // l'onglet rendu par le SSR) ; l'URL ?univers=beaute&cat=… est lue après montage.
  const [filters, setFilters] = useState<Filters>(() => ({
    ...defaultFilters,
    universe: initialUniverse ?? 'food',
    cosmeticCategory: initialUniverse === 'cosmetic' && (COSMETIC_CATEGORIES as readonly string[]).includes(initialCosmeticCategory ?? '')
      ? (initialCosmeticCategory as string)
      : '',
  }))
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search)
      const fromUrl: Universe | null = sp.get('univers') === 'beaute' ? 'cosmetic' : null
      // ?q= : recherche lancée depuis la barre de l'accueil
      const q = (sp.get('q') ?? '').trim().slice(0, 80)
      if (q) setFilters((prev) => ({ ...prev, query: q }))
      const prot = Number(sp.get('proteines'))
      if (prot === 12 || prot === 20) setFilters((prev) => ({ ...prev, proteinMin: prot, sort: '-proteins' }))
      // ?sort= : « Tout voir » des mieux notés (accueil) — seulement une option connue
      const sort = SORT_OPTIONS.find((o) => o.value === sp.get('sort'))?.value
      if (sort) setFilters((prev) => ({ ...prev, sort }))
      const c = sp.get('cat') ?? ''
      const cat = (COSMETIC_CATEGORIES as readonly string[]).includes(c) ? c : ''
      if (fromUrl && (fromUrl !== (initialUniverse ?? 'food') || cat)) {
        setFilters((prev) => ({ ...prev, universe: fromUrl, cosmeticCategory: cat || prev.cosmeticCategory }))
      }
    } catch { /* pas d'URL exploitable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [offset, setOffset] = useState(0)
  // true d'emblée : le rendu serveur montre le squelette, pas un faux « aucun résultat »
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [offResults, setOffResults] = useState<Product[]>([])
  const [searchingOff, setSearchingOff] = useState(false)
  const [riskyAdditives, setRiskyAdditives] = useState<RiskyAdditive[]>([])
  const [profileAdditives, setProfileAdditives] = useState<string[]>([])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Numéro de la dernière requête : une réponse plus ancienne arrivée en retard est ignorée
  const requestRef = useRef(0)

  // Charger les catégories au montage
  useEffect(() => {
    fetch(`${DIRECTUS_URL}/items/categories?sort=name_fr&limit=-1`)
      .then((res) => res.json())
      .then((json: { data: Category[] }) => setCategories(json.data))
      .catch(() => {
        /* Silencieux si l'API est indisponible */
      })
    // Profil santé local : permet le filtre « selon mon profil »
    setProfileAdditives(getProfile().avoidAdditives)
    // Additifs à risque proposés en exclusion (les pires d'abord)
    fetch(`${DIRECTUS_URL}/items/additives?filter[risk_level][_in]=banned_ma,avoid,limited&fields=id,name_fr,name_ar,risk_level&sort=risk_level,id&limit=-1`)
      .then((res) => res.json())
      .then((json: { data: RiskyAdditive[] }) => {
        const order: Record<string, number> = { banned_ma: 0, avoid: 1, limited: 2 }
        setRiskyAdditives((json.data ?? []).sort((a, b) => (order[a.risk_level] ?? 9) - (order[b.risk_level] ?? 9)))
      })
      .catch(() => { /* silencieux */ })
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
      const requestId = ++requestRef.current
      const filtersWithDebouncedQuery = { ...filters, query: debouncedQuery }
      // Exclusion d'additifs active ou univers beauté → endpoint custom SQL (voir buildCustomParams)
      // (le filtre protéines aussi : sa garde-fou d'énergie est en SQL)
      const url = filtersWithDebouncedQuery.excludeAdditives.length > 0 || filtersWithDebouncedQuery.universe === 'cosmetic' || filtersWithDebouncedQuery.proteinMin !== null
        ? `${DIRECTUS_URL}/bayen-api/search-products?${buildCustomParams(filtersWithDebouncedQuery, currentOffset)}`
        : `${DIRECTUS_URL}/items/products?${buildQueryParams(filtersWithDebouncedQuery, currentOffset)}`

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
            count?: number
            meta?: { filter_count?: number }
          }
          localProducts = json.data ?? []
          localCount = json.count ?? json.meta?.filter_count ?? localProducts.length
        }
        // Si Directus retourne 403 ou erreur, localProducts reste []
        if (requestId !== requestRef.current) return

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
            const isBeauty = filtersWithDebouncedQuery.universe === 'cosmetic'
            const offHost = isBeauty ? 'https://world.openbeautyfacts.org' : 'https://world.openfoodfacts.org'
            const offUrl = `${offHost}/cgi/search.pl?search_terms=${encodeURIComponent(debouncedQuery.trim())}&json=1&page_size=20&lc=fr&cc=ma`
            const offRes = await fetch(offUrl)
            if (offRes.ok) {
              const offJson = await offRes.json()
              const offProducts: Product[] = (offJson.products || [])
                .filter((p: Record<string, unknown>) => p.code && p.product_name)
                .map((p: Record<string, unknown>) => ({
                  id: p.code as string,
                  barcode: p.code as string,
                  name_fr: (p.product_name_fr || p.product_name || t('product.unknown')) as string,
                  brand: (p.brands || t('product.unknown')) as string,
                  image_front: (p.image_front_small_url || p.image_front_url || null) as string | null,
                  scan_score: null,
                  score_label: null,
                  nutriscore_grade: (typeof p.nutriscore_grade === 'string' && /^[a-e]$/i.test(p.nutriscore_grade)) ? p.nutriscore_grade.toUpperCase() : null,
                  nova_group: (p.nova_group as number) || null,
                  additives: [],
                  scan_count: 0,
                  status: 'published',
                  product_type: isBeauty ? 'cosmetic' : 'food',
                  cosmetic_risk: null,
                }))
              if (requestId === requestRef.current) setOffResults(offProducts)
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
        if (!append && requestId === requestRef.current) setProducts([])
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
    [filters, debouncedQuery, t]
  )

  // Déclencher la recherche quand les filtres (non-texte) ou la query debounced changent
  useEffect(() => {
    setOffset(0)
    fetchProducts(0, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedQuery,
    filters.universe,
    filters.cosmeticCategory,
    filters.riskFree,
    filters.noEndocrine,
    filters.categoryId,
    filters.scoreMin,
    filters.nutriscoreGrades,
    filters.noAdditives,
    filters.halal,
    filters.bio,
    filters.sugarMax,
    filters.proteinMin,
    filters.excludeAdditives,
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

  // Réinitialiser : on garde l'univers, la saisie et le tri
  const resetFilters = () => setFilters((prev) => ({ ...defaultFilters, universe: prev.universe, query: prev.query, sort: prev.sort }))

  const setUniverse = (u: Universe): void => {
    setFilters((prev) => ({ ...defaultFilters, universe: u, query: prev.query, sort: prev.sort }))
    setOffResults([])
    try {
      const url = new URL(window.location.href)
      if (u === 'cosmetic') url.searchParams.set('univers', 'beaute')
      else url.searchParams.delete('univers')
      url.searchParams.delete('cat')
      window.history.replaceState(null, '', url.toString())
    } catch { /* environnement sans history */ }
  }
  const isBeauty = filters.universe === 'cosmetic'

  const activeCount = [
    filters.cosmeticCategory !== '',
    filters.riskFree,
    filters.noEndocrine,
    filters.categoryId !== null,
    filters.scoreMin > 0,
    filters.nutriscoreGrades.length > 0,
    filters.noAdditives,
    filters.halal,
    filters.bio,
    filters.sugarMax !== null,
    filters.proteinMin !== null,
    filters.excludeAdditives.length > 0,
  ].filter(Boolean).length
  const hasActiveFilters = activeCount > 0

  const hasMore = products.length < totalCount

  // Nom de catégorie dans la langue courante (name_ar si présent)
  const catName = (c: Category | undefined): string | undefined => c && ((locale === 'ary' && c.name_ar) || c.name_fr)

  // Titre de la barre du haut : catégorie active, sinon « Recherche »
  const heading = isBeauty
    ? (filters.cosmeticCategory
        ? t(`beauty.cat.${filters.cosmeticCategory}` as `beauty.cat.${(typeof COSMETIC_CATEGORIES)[number]}`)
        : t('search.title'))
    : (catName(categories.find((c) => c.id === filters.categoryId)) ?? t('search.title'))

  // Puces de filtres (maquette) : les filtres booléens existants, appliqués par l'API
  const toggleProfile = () => {
    const allOn = profileAdditives.every((c) => filters.excludeAdditives.includes(c))
    updateFilter(
      'excludeAdditives',
      allOn
        ? filters.excludeAdditives.filter((c) => !profileAdditives.includes(c))
        : [...new Set([...filters.excludeAdditives, ...profileAdditives])]
    )
  }
  const chips: Array<{ label: string; active: boolean; onClick: () => void }> = isBeauty
    ? [
        { label: t('beauty.riskFree'), active: filters.riskFree, onClick: () => updateFilter('riskFree', !filters.riskFree) },
        { label: t('beauty.noEndocrine'), active: filters.noEndocrine, onClick: () => updateFilter('noEndocrine', !filters.noEndocrine) },
        { label: t('search.halal'), active: filters.halal, onClick: () => updateFilter('halal', !filters.halal) },
      ]
    : [
        { label: t('search.chipSugar5'), active: filters.sugarMax === 5, onClick: () => updateFilter('sugarMax', filters.sugarMax === 5 ? null : 5) },
        { label: t('product.noAdditive'), active: filters.noAdditives, onClick: () => updateFilter('noAdditives', !filters.noAdditives) },
        { label: t('search.halal'), active: filters.halal, onClick: () => updateFilter('halal', !filters.halal) },
        { label: t('search.bio'), active: filters.bio, onClick: () => updateFilter('bio', !filters.bio) },
        { label: t('search.sugarFree'), active: filters.sugarMax === 0.5, onClick: () => updateFilter('sugarMax', filters.sugarMax === 0.5 ? null : 0.5) },
        { label: t('protein.filter12'), active: filters.proteinMin === 12, onClick: () => updateFilter('proteinMin', filters.proteinMin === 12 ? null : 12) },
        { label: t('protein.filter20'), active: filters.proteinMin === 20, onClick: () => updateFilter('proteinMin', filters.proteinMin === 20 ? null : 20) },
        ...(profileAdditives.length > 0
          ? [{ label: t('profile.filterBy'), active: profileAdditives.every((c) => filters.excludeAdditives.includes(c)), onClick: toggleProfile }]
          : []),
      ]

  const filterIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>
  )

  // ────────────────────────────────────────────────────────────────
  // Rendu (maquette « Recherche ») : barre du haut, recherche, univers,
  // puces, compteur + tri, liste, bulle Naânaa
  // ────────────────────────────────────────────────────────────────

  return (
    <>
      {showTopbar && (
        <header className="topbar pb-0 md:p-0">
          <a className="icon-btn md:hidden" href="/" aria-label={t('nav.back')}>
            <svg className="rtl:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </a>
          <h1 className="disp d-m flex-1 md:text-[40px]">{heading}</h1>
          <button
            type="button"
            className={cn('icon-btn', filtersOpen && 'bg-citron text-encre')}
            aria-label={t('search.filters')}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((o) => !o)}
          >
            {filterIcon}
            {activeCount > 0 && (
              <span className="absolute -end-1 -top-1 grid size-5 place-items-center rounded-full bg-encre text-[10px] font-bold text-creme dark:bg-creme dark:text-encre">
                {activeCount}
              </span>
            )}
          </button>
          {/* Ouvre le menu du site (SiteMenu, rendu par le Layout) */}
          <button type="button" className="icon-btn md:hidden" data-open-menu="" aria-label={t('nav.menu')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
        </header>
      )}

      <section className="section gap-3 md:grid-cols-[minmax(0,1fr)_360px] md:items-center">
        {/* Recherche pilule */}
        <form
          role="search"
          className="card flex h-12 items-center gap-2.5 rounded-full px-4 shadow-[3px_3px_0_var(--color-hard)]"
          onSubmit={(e) => {
            e.preventDefault()
            // Entrée : referme le clavier, la recherche part déjà à la frappe
            e.currentTarget.querySelector('input')?.blur()
          }}
        >
          <svg className="size-[22px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
          <input
            type="search"
            aria-label={t('search.searchBtn')}
            placeholder={isBeauty ? t('beauty.searchPlaceholder') : t('search.placeholder')}
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="min-w-0 flex-1 border-0 bg-transparent text-[14.5px] font-medium text-foreground outline-none"
          />
        </form>

        {/* Univers (C23) : Alimentation | Beauté — deux bases, deux scores, jamais mélangés */}
        <div className="flex gap-1.5 rounded-full border-2 border-line bg-card p-1" role="tablist">
          {(['food', 'cosmetic'] as const).map((u) => (
            <button
              key={u}
              type="button"
              role="tab"
              aria-selected={filters.universe === u}
              onClick={() => setUniverse(u)}
              className={cn(
                'btn sm flat flex-1',
                filters.universe === u
                  ? u === 'cosmetic' ? 'border-encre bg-beauty text-encre' : 'border-encre bg-menthe text-encre'
                  : 'border-transparent bg-transparent'
              )}
            >
              {u === 'food' ? t('beauty.food') : t('beauty.cosmetic')}
            </button>
          ))}
        </div>

        {/* Puces de filtres */}
        <div className="chips md:col-span-2">
          {chips.map((c) => (
            <FilterChip key={c.label} {...c} />
          ))}
          {/* Sans barre du haut (page Beauté) : les filtres avancés s'ouvrent ici */}
          {!showTopbar && (
            <button type="button" className={cn('chip', filtersOpen && 'fill bg-citron')} aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
              {filterIcon}
              {t('search.filters')}
            </button>
          )}
          {hasActiveFilters && (
            <button type="button" className="chip" onClick={resetFilters}>
              <span aria-hidden="true">✕</span>
              {t('search.resetFilters')}
            </button>
          )}
        </div>

        {/* Filtres avancés (bouton filtres) : sections étiquetées, puces du vocabulaire Marché Pop */}
        {filtersOpen && (
          <div className="card grid animate-in gap-5 p-4 fade-in slide-in-from-top-2 duration-200 md:col-span-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] md:gap-x-8 md:p-6">
            <div className="grid content-start gap-2">
              <label htmlFor="f-cat" className="eyebrow">{isBeauty ? t('beauty.category') : t('search.category')}</label>
              {isBeauty ? (
                <select id="f-cat" value={filters.cosmeticCategory} onChange={(e) => updateFilter('cosmeticCategory', e.target.value)} className={SELECT}>
                  <option value="">{t('beauty.allCategories')}</option>
                  {COSMETIC_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{t(`beauty.cat.${c}` as `beauty.cat.${(typeof COSMETIC_CATEGORIES)[number]}`)}</option>
                  ))}
                </select>
              ) : (
                <select id="f-cat" value={filters.categoryId ?? ''} onChange={(e) => updateFilter('categoryId', e.target.value ? Number(e.target.value) : null)} className={SELECT}>
                  <option value="">{t('search.allCategories')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.icon ? `${cat.icon} ` : ''}{catName(cat)}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Score minimum : les paliers de l'échelle Bayen (25 / 50 / 75), à la couleur du niveau */}
            <div className="grid content-start gap-2">
              <span className="eyebrow">{t('search.scoreMin')}</span>
              <div className="chips">
                {SCORE_STEPS.map(({ min, level }) => {
                  const active = filters.scoreMin === min
                  return (
                    <button
                      key={min}
                      type="button"
                      aria-pressed={active}
                      onClick={() => updateFilter('scoreMin', min)}
                      className={cn('chip', active && 'fill')}
                      style={active ? { background: level ? SCORE_FILL[level] : 'var(--color-citron)', color: 'var(--color-encre)' } : undefined}
                    >
                      {level ? <><bdi>{min}+</bdi> {t(`score.${level}`)}</> : t('search.scoreAny')}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Nutri-Score : pastilles rondes, couleur officielle quand elles sont choisies */}
            {!isBeauty && (
              <div className="grid content-start gap-2">
                <span className="eyebrow">{t('nutriscore.title')}</span>
                <div className="flex gap-2" dir="ltr">
                  {NUTRISCORE_GRADES.map((grade) => {
                    const active = filters.nutriscoreGrades.includes(grade)
                    return (
                      <button
                        key={grade}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleNutriscore(grade)}
                        className={cn(
                          'grid size-10 place-items-center rounded-full border-2 border-line font-display text-sm font-extrabold transition-transform hover:-translate-y-px',
                          active ? `${NUTRISCORE_COLORS[grade]} text-encre shadow-[2px_2px_0_var(--color-hard)]` : 'bg-card text-foreground'
                        )}
                      >
                        {grade}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Exclure des additifs précis (C8c) : groupés par niveau de risque, code toujours lisible */}
            {!isBeauty && riskyAdditives.length > 0 && (
              <div className="grid gap-3 border-t-2 border-dashed border-line/25 pt-4 md:col-span-3">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="eyebrow">
                    {t('search.excludeAdditives')}
                    {filters.excludeAdditives.length > 0 && <b className="ms-2 text-foreground">{filters.excludeAdditives.length}</b>}
                  </span>
                  <span className="muted text-xs">{t('search.excludeAdditivesHint')}</span>
                </div>
                {(['banned_ma', 'avoid', 'limited'] as const).map((risk) => {
                  const list = riskyAdditives.filter((a) => a.risk_level === risk)
                  if (list.length === 0) return null
                  return (
                    <div key={risk} className="grid gap-1.5 md:grid-cols-[150px_minmax(0,1fr)] md:items-start">
                      <span className="flex items-center gap-1.5 pt-1.5 text-[12.5px] font-bold">
                        <span className="size-2.5 flex-none rounded-full border border-encre" style={{ background: RISK_DOT[risk] }} aria-hidden="true" />
                        {t(risk === 'banned_ma' ? 'additive.risk.banned' : `additive.risk.${risk}`)}
                      </span>
                      <div className="chips">
                        {list.map((a) => {
                          const active = filters.excludeAdditives.includes(a.id)
                          const name = (locale === 'ary' && a.name_ar) || a.name_fr
                          return (
                            <button
                              key={a.id}
                              type="button"
                              aria-pressed={active}
                              title={name}
                              onClick={() => updateFilter('excludeAdditives', active ? filters.excludeAdditives.filter((c) => c !== a.id) : [...filters.excludeAdditives, a.id])}
                              className={cn('chip max-w-full', active && 'fill bg-tomate text-encre')}
                            >
                              {active && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>}
                              <b dir="ltr">{a.id}</b>
                              {/* dir="auto" : les points de suspension tombent à la fin du nom, quelle que soit sa langue */}
                              <span dir="auto" className="max-w-[11rem] truncate font-medium opacity-75">{name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {hasActiveFilters && (
              <div className="flex justify-end md:col-span-3">
                <button type="button" className="btn sm ghost" onClick={resetFilters}>{t('search.resetFilters')}</button>
              </div>
            )}
          </div>
        )}

        {/* Compteur de résultats + tri */}
        <div className="flex items-center justify-between gap-3 text-[13px] md:col-span-2">
          <span className="muted">
            {!loading && totalCount > 0 && (
              <b className="text-foreground">
                {totalCount} {totalCount > 1 ? t('history.itemsPlural') : t('history.itemSingular')}
              </b>
            )}
          </span>
          <label className="flex items-center gap-1 font-bold">
            {t('search.sortLabel')}
            <select
              value={filters.sort}
              onChange={(e) => updateFilter('sort', e.target.value as SortValue)}
              aria-label={t('search.sort')}
              className="cursor-pointer appearance-none bg-transparent font-bold lowercase text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
            <span aria-hidden="true">▾</span>
          </label>
        </div>
      </section>

      <section className="section gap-3">
        {/* Squelette de chargement */}
        {loading && <LoadingSkeleton />}

        {/* Résultats : cartes en ligne (mobile), grille (ordinateur) */}
        {!loading && products.length > 0 && <ProductList products={products} locale={locale} />}

        {/* Résultats Open Food Facts (quand Directus est vide) */}
        {!loading && products.length === 0 && offResults.length > 0 && (
          <>
            <div className="flex items-center gap-2 rounded-2xl border-2 border-encre bg-citron px-4 py-2.5 text-encre">
              <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              <p className="text-sm">
                {t('search.noLocalResults')} — <strong>{offResults.length}</strong> {isBeauty ? t('beauty.obfResults') : t('search.offResults')}
              </p>
            </div>
            <ProductList products={offResults} locale={locale} />
          </>
        )}

        {/* Recherche OFF en cours */}
        {searchingOff && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Spinner />
            {t('search.searchingOff')}
          </div>
        )}

        {/* État vide (ni local ni OFF) : Naânaa à la loupe */}
        {!loading && !searchingOff && products.length === 0 && offResults.length === 0 && (
          <>
            <div className="naanaa md:max-w-xl">
              <img src="/mascotte/naanaa-loupe.webp" alt="" width="72" height="106" />
              <div className="bubble">
                <p className="disp d-s">{t('search.noResults')}</p>
                <p className="muted mt-1 text-sm">{t('search.noResultsDesc')}</p>
              </div>
            </div>
            {hasActiveFilters && (
              <button type="button" className="btn sm justify-self-start" onClick={resetFilters}>
                {t('search.resetFilters')}
              </button>
            )}
          </>
        )}

        {/* Charger plus */}
        {!loading && hasMore && products.length > 0 && (
          <button type="button" className="btn mt-2 min-w-[200px] justify-self-center" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? (
              <>
                <Spinner />
                {t('common.loading')}
              </>
            ) : (
              t('search.loadMore')
            )}
          </button>
        )}

        {/* Bulle Naânaa : produit absent → scanner */}
        <div className="naanaa mt-1.5 grid-cols-[56px_minmax(0,1fr)] md:max-w-xl">
          <div className="m size-14">
            <img src="/mascotte/naanaa-scan.webp" alt="" width="56" height="56" loading="lazy" />
          </div>
          <p className="bubble">
            {t('search.naanaaMissing')} <a href="/scan" className="underline underline-offset-2"><b>{t('search.naanaaScan')}</b></a>{t('search.naanaaAdd')}
          </p>
        </div>
      </section>
    </>
  )
}

// ────────────────────────────────────────────────────────────────
// Sous-composants
// ────────────────────────────────────────────────────────────────

/** Puce de filtre (maquette) : active = aplat citron + coche, texte encre */
function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn('chip', active && 'fill bg-citron')}>
      {active && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>
      )}
      {label}
    </button>
  )
}

/** Liste de résultats : ProductCard « row » sur mobile, « grid » sur ordinateur */
function ProductList({ products, locale }: { products: Product[]; locale: Locale }) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} locale={locale} />
        ))}
      </div>
      <div className="hidden gap-4 md:grid md:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} variant="grid" locale={locale} />
        ))}
      </div>
    </>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

/** Squelette de chargement : silhouettes de cartes (ligne sur mobile, grille sur ordinateur) */
function LoadingSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card h-24 animate-pulse bg-muted md:h-80" />
      ))}
    </div>
  )
}
