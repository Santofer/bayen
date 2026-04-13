/**
 * Liste d'ingrédients structurée avec traces
 * - Affichage M2M structuré si disponible, sinon fallback texte
 * - Allergènes mis en évidence
 * - Additifs cliquables
 * - Section traces séparée
 */

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Locale } from '@/lib/translations'
import { t as translate } from '@/lib/i18n'
import {
  ClipboardList, AlertTriangle, Wheat, Milk, Egg, Nut, TreeDeciduous,
  Bean, Fish, Shell, CircleDot, Leaf, Candy, Droplet, Beef, Apple,
  Sparkles, Droplets, FlaskConical,
} from 'lucide-react'

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

/** Icône Lucide pour un type de trace/allergène */
function traceIcon(trace: string): React.ReactNode {
  const key = trace.toLowerCase()
  if (key === 'gluten') return <Wheat size={14} className="text-current" />
  if (key === 'lait' || key === 'lactose') return <Milk size={14} className="text-current" />
  if (key === 'œufs' || key === 'oeufs') return <Egg size={14} className="text-current" />
  if (key === 'arachide') return <Nut size={14} className="text-current" />
  if (key === 'fruits à coque') return <TreeDeciduous size={14} className="text-current" />
  if (key === 'soja' || key === 'lupin') return <Bean size={14} className="text-current" />
  if (key === 'poisson') return <Fish size={14} className="text-current" />
  if (key === 'crustacés') return <Shell size={14} className="text-current" />
  if (key === 'sésame') return <CircleDot size={14} className="text-current" />
  if (key === 'moutarde' || key === 'céleri') return <Leaf size={14} className="text-current" />
  return <AlertTriangle size={14} className="text-current" />
}

/** Icône Lucide pour une catégorie d'ingrédient */
function categoryIcon(category: string): React.ReactNode {
  switch (category) {
    case 'cereale': return <Wheat size={16} className="text-current" />
    case 'sucre': return <Candy size={16} className="text-current" />
    case 'graisse': return <Droplet size={16} className="text-current" />
    case 'laitier': return <Milk size={16} className="text-current" />
    case 'proteine': return <Beef size={16} className="text-current" />
    case 'fruit_legume': return <Apple size={16} className="text-current" />
    case 'sel': return <Sparkles size={16} className="text-current" />
    case 'eau': return <Droplets size={16} className="text-current" />
    case 'arome': return <Leaf size={16} className="text-current" />
    case 'additif': return <FlaskConical size={16} className="text-current" />
    default: return <CircleDot size={16} className="text-current" />
  }
}

export default function IngredientsList({ ingredients, traces, ingredientsText, locale }: IngredientsListProps) {
  const tt = (key: string) => translate(key as Parameters<typeof translate>[0], locale)
  const hasStructured = ingredients && ingredients.length > 0

  const sorted = useMemo(() => {
    if (!ingredients) return []
    return [...ingredients].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  }, [ingredients])

  // Fallback : parser le texte brut
  const parsedTags = useMemo(() => {
    if (hasStructured || !ingredientsText) return []
    const text = ingredientsText.replace(/(\d),(\d)/g, '$1\u0000$2')
    return text.split(/[,;]/)
      .map(s => s.replace(/\u0000/g, ',').trim())
      .filter(s => s.length > 1)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
  }, [hasStructured, ingredientsText])

  if (!hasStructured && parsedTags.length === 0 && (!traces || traces.length === 0)) return null

  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      {/* En-tête */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <ClipboardList size={16} className="text-current" /> {tt('ing.title')}
        </h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
          {hasStructured ? sorted.length : parsedTags.length}
        </span>
      </div>

      {/* Liste structurée */}
      {hasStructured ? (
        <div className="space-y-0.5">
          {sorted.map((ing, i) => {
            const isAdditive = /^E\d{3}/i.test(ing.name_fr)
            const rawName = locale === 'ary' && ing.name_ar ? ing.name_ar : ing.name_fr
            // Première lettre en majuscule
            const name = rawName.charAt(0).toUpperCase() + rawName.slice(1)

            return (
              <div
                key={`${ing.id}-${i}`}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm',
                  ing.is_allergen ? 'bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900' : (i % 2 === 0 ? 'bg-muted/30' : ''),
                )}
              >
                {/* Icône */}
                <span className="text-base flex-shrink-0 w-6 text-center">{categoryIcon(ing.category)}</span>

                {/* Nom */}
                <span className={cn('flex-1 min-w-0', ing.is_allergen && 'font-semibold text-red-800 dark:text-red-300')}>
                  {isAdditive ? (
                    <a href={`/additifs/${ing.name_fr.match(/E\d{3,4}[a-z]?/i)?.[0]}`} className="underline decoration-dotted hover:decoration-solid hover:text-primary">
                      {name}
                    </a>
                  ) : (
                    <span>{ing.is_allergen ? name.toUpperCase() : name}</span>
                  )}
                  {ing.is_allergen && <span className="ml-1 inline-flex align-text-bottom"><AlertTriangle size={12} className="text-current" /></span>}
                </span>

                {/* Pourcentage */}
                {ing.percent != null && (
                  <span className="text-xs text-muted-foreground font-mono flex-shrink-0">
                    {ing.percent}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ) : parsedTags.length > 0 ? (
        /* Fallback texte */
        <div className="flex flex-wrap gap-1.5">
          {parsedTags.map((tag, i) => {
            const isAdditive = /^E\s?\d{3}/i.test(tag)
            const isAllergen = /\b(BLÉ|SOJA|LAIT|OEUFS?|GLUTEN|ARACHIDE|NOIX|SÉSAME|POISSON|CRUSTACÉ|LUPIN|MOUTARDE|CÉLERI)\b/i.test(tag)
            return (
              <span
                key={i}
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-md text-xs',
                  isAdditive ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                  isAllergen ? 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 font-medium' :
                  'bg-muted/50 text-foreground'
                )}
              >
                {isAllergen && <span className="mr-0.5 inline-flex"><AlertTriangle size={12} className="text-current" /></span>}
                {tag}
              </span>
            )
          })}
        </div>
      ) : null}

      {/* Traces */}
      {traces && traces.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 p-3 mt-3">
          <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1">
            <AlertTriangle size={12} className="text-current" /> {tt('ing.traces')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {traces.map((trace) => (
              <span key={trace} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-white dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300">
                <span>{traceIcon(trace)}</span>
                {trace}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
