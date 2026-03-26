import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { t, isRtl } from '@/lib/i18n'
import type { Locale } from '@/lib/translations'

// --- Types ---

export interface StructuredIngredient {
  id: number
  name_fr: string
  name_ar?: string
  icon: string
  category: string
  is_allergen: boolean
  allergen_type?: string
  percent?: number | null
  rank?: number
}

interface IngredientsListProps {
  ingredients?: StructuredIngredient[]
  traces?: string[]
  ingredientsText?: string
  locale: Locale
}

// --- Constantes ---

/** Mapping allergène → emoji */
const ALLERGEN_EMOJI: Record<string, string> = {
  gluten: '\u{1F33E}',
  lait: '\u{1F95B}',
  lactose: '\u{1F95B}',
  oeufs: '\u{1F95A}',
  arachide: '\u{1F95C}',
  fruits_a_coque: '\u{1F330}',
  soja: '\u{1FAD8}',
  poisson: '\u{1F41F}',
  crustaces: '\u{1F990}',
  sesame: '\u{1F330}',
  moutarde: '\u{1F343}',
  celeri: '\u{1F343}',
  lupin: '\u{1FAD8}',
}

/** Couleurs par catégorie d'ingrédient */
const CATEGORY_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'safe' | 'limited' | 'avoid'> = {
  additif: 'limited',
  conservateur: 'avoid',
  colorant: 'avoid',
  emulsifiant: 'limited',
  arome: 'secondary',
  sucre: 'limited',
  graisse: 'limited',
  cereale: 'safe',
  legume: 'safe',
  fruit: 'safe',
  proteine: 'safe',
  mineral: 'secondary',
  vitamine: 'safe',
}

// --- Helpers ---

/** Retourne l'emoji correspondant à un type d'allergène */
function getAllergenEmoji(allergenType?: string): string {
  if (!allergenType) return '\u26A0\uFE0F'
  const key = allergenType.toLowerCase().replace(/\s+/g, '_').replace(/[àâ]/g, 'a').replace(/[éèê]/g, 'e')
  return ALLERGEN_EMOJI[key] ?? '\u26A0\uFE0F'
}

/** Détecte si un texte est un code additif (E-number) */
function isAdditiveCode(name: string): string | null {
  const match = name.match(/\b(E\d{3,4}[a-z]?)\b/i)
  return match ? match[1].toUpperCase() : null
}

/** Retourne le variant de badge pour une catégorie */
function getCategoryVariant(category: string): 'default' | 'secondary' | 'outline' | 'safe' | 'limited' | 'avoid' {
  const key = category.toLowerCase().replace(/\s+/g, '_')
  return CATEGORY_VARIANT[key] ?? 'outline'
}

/**
 * Parse le texte brut des ingrédients en tags individuels.
 * Protège les virgules décimales (ex: "1,5%") pour ne pas couper au mauvais endroit.
 */
function parseIngredientsText(text: string): string[] {
  // Remplace temporairement les virgules décimales par un placeholder
  const protected_ = text.replace(/(\d),(\d)/g, '$1\u200B$2')
  // Sépare par virgule ou point-virgule
  const parts = protected_.split(/[,;]/).map((s) => s.trim().replace(/\u200B/g, ',')).filter(Boolean)
  return parts
}

// --- Composant principal ---

export default function IngredientsList({ ingredients, traces, ingredientsText, locale }: IngredientsListProps) {
  const rtl = isRtl(locale)
  const hasStructured = ingredients && ingredients.length > 0

  /** Ingrédients triés par rang */
  const sortedIngredients = useMemo(() => {
    if (!ingredients) return []
    return [...ingredients].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  }, [ingredients])

  /** Tags parsés depuis le texte brut (fallback) */
  const parsedTags = useMemo(() => {
    if (hasStructured || !ingredientsText) return []
    return parseIngredientsText(ingredientsText)
  }, [hasStructured, ingredientsText])

  // Rien à afficher
  if (!hasStructured && parsedTags.length === 0) return null

  return (
    <div className={cn('space-y-4', rtl && 'text-right')} dir={rtl ? 'rtl' : 'ltr'}>
      {/* --- En-tête --- */}
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold">
          {locale === 'ary' ? '\u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A' : 'Ingr\u00E9dients'}
        </h3>
        <Badge variant="secondary" className="text-xs tabular-nums">
          {hasStructured ? sortedIngredients.length : parsedTags.length}
        </Badge>
      </div>

      {/* --- Liste structurée --- */}
      {hasStructured ? (
        <ul className="divide-y divide-border rounded-lg border bg-card">
          {sortedIngredients.map((ing) => (
            <IngredientRow key={ing.id} ingredient={ing} locale={locale} />
          ))}
        </ul>
      ) : (
        /* --- Fallback : tags parsés depuis le texte brut --- */
        <div className="flex flex-wrap gap-1.5">
          {parsedTags.map((tag, i) => (
            <Badge key={i} variant="outline" className="text-sm font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* --- Traces d'allergènes --- */}
      {traces && traces.length > 0 && <TracesSection traces={traces} locale={locale} />}
    </div>
  )
}

// --- Sous-composants ---

/** Ligne d'un ingrédient structuré */
function IngredientRow({ ingredient, locale }: { ingredient: StructuredIngredient; locale: Locale }) {
  const { name_fr, name_ar, icon, category, is_allergen, allergen_type, percent } = ingredient
  const displayName = locale === 'ary' && name_ar ? name_ar : name_fr
  const additiveCode = isAdditiveCode(name_fr)

  return (
    <li
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 text-sm',
        is_allergen && 'bg-red-50 dark:bg-red-950/30',
      )}
    >
      {/* Icône */}
      <span className="shrink-0 text-lg leading-none" aria-hidden="true">
        {is_allergen ? getAllergenEmoji(allergen_type) : icon || '\u{1F7E2}'}
      </span>

      {/* Nom + catégorie */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cn('truncate font-medium', is_allergen && 'font-bold text-red-700 uppercase dark:text-red-400')}>
          {additiveCode ? (
            <a
              href={`/additifs/${additiveCode.toLowerCase()}`}
              className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
            >
              {displayName}
            </a>
          ) : (
            displayName
          )}
        </span>
        {category && (
          <Badge variant={getCategoryVariant(category)} className="shrink-0 text-[10px] leading-tight">
            {category}
          </Badge>
        )}
      </div>

      {/* Pourcentage */}
      {percent != null && (
        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
          {percent}%
        </span>
      )}
    </li>
  )
}

/** Section traces d'allergènes */
function TracesSection({ traces, locale }: { traces: string[]; locale: Locale }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
      <p className="mb-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
        {locale === 'ary'
          ? '\u0622\u062B\u0627\u0631 \u0645\u062D\u062A\u0645\u0644\u0629'
          : 'Traces possibles'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {traces.map((trace) => {
          const emoji = getAllergenEmoji(trace)
          return (
            <Badge
              key={trace}
              variant="outline"
              className="border-amber-300 bg-amber-100 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-200"
            >
              <span aria-hidden="true" className="mr-1">{emoji}</span>
              {trace}
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
