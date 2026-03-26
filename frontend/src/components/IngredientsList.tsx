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

const TRACE_EMOJI: Record<string, string> = {
  gluten: '🌾', lait: '🥛', lactose: '🥛', 'œufs': '🥚', oeufs: '🥚',
  arachide: '🥜', 'fruits à coque': '🌰', soja: '🫘', poisson: '🐟',
  'crustacés': '🦐', 'sésame': '🌰', moutarde: '🍃', 'céleri': '🍃', lupin: '🫘',
}

export default function IngredientsList({ ingredients, traces, ingredientsText, locale }: IngredientsListProps) {
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
        <h2 className="text-sm font-bold text-foreground">📋 Ingrédients</h2>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
          {hasStructured ? sorted.length : parsedTags.length}
        </span>
      </div>

      {/* Liste structurée */}
      {hasStructured ? (
        <div className="space-y-0.5">
          {sorted.map((ing, i) => {
            const isAdditive = /^E\d{3}/i.test(ing.name_fr)
            const name = locale === 'ary' && ing.name_ar ? ing.name_ar : ing.name_fr

            return (
              <div
                key={`${ing.id}-${i}`}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm',
                  ing.is_allergen ? 'bg-red-50 border border-red-100' : (i % 2 === 0 ? 'bg-muted/30' : ''),
                )}
              >
                {/* Icône */}
                <span className="text-base flex-shrink-0 w-6 text-center">{ing.icon}</span>

                {/* Nom */}
                <span className={cn('flex-1 min-w-0', ing.is_allergen && 'font-semibold text-red-800')}>
                  {isAdditive ? (
                    <a href={`/additifs/${ing.name_fr.match(/E\d{3,4}[a-z]?/i)?.[0]}`} className="underline decoration-dotted hover:decoration-solid hover:text-primary">
                      {name}
                    </a>
                  ) : (
                    <span>{ing.is_allergen ? name.toUpperCase() : name}</span>
                  )}
                  {ing.is_allergen && <span className="ml-1 text-xs">⚠️</span>}
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
                  isAllergen ? 'bg-red-50 text-red-700 border border-red-200 font-medium' :
                  'bg-muted/50 text-foreground'
                )}
              >
                {isAllergen && <span className="mr-0.5">⚠️</span>}
                {tag}
              </span>
            )
          })}
        </div>
      ) : null}

      {/* Traces */}
      {traces && traces.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 mt-3">
          <p className="text-xs font-semibold text-amber-800 mb-2">⚠️ Peut contenir des traces de :</p>
          <div className="flex flex-wrap gap-1.5">
            {traces.map((trace) => (
              <span key={trace} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-white border border-amber-200 text-amber-800">
                <span>{TRACE_EMOJI[trace.toLowerCase()] ?? '⚠️'}</span>
                {trace}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
