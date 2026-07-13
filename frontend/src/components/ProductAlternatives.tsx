/**
 * Alternatives plus saines — section sur la fiche produit
 * Affiche 3 produits de la même catégorie avec un meilleur score
 */

import { ArrowUpRight, Trophy, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface Alternative {
  barcode: string
  name_fr: string
  brand: string
  image_front: string | null
  scan_score: number | null
  score_label: string | null
  nutriscore_grade: string | null
  /** Raisons factuelles pour lesquelles cette alternative est meilleure */
  reasons?: string[]
}

interface ProductAlternativesProps {
  alternatives: Alternative[]
  isBestInCategory: boolean
  className?: string
}

/** Couleur du score selon la valeur */
function scoreColor(score: number | null): string {
  if (score == null) return '#9ca3af'
  if (score >= 75) return '#476a32'
  if (score >= 50) return '#b1cf3a'
  if (score >= 25) return '#f97316'
  return '#ef4444'
}

/** Couleur de fond légère du score (adaptée dark) */
function scoreBg(score: number | null): string {
  if (score == null) return 'bg-gray-100 dark:bg-gray-800/50'
  if (score >= 75) return 'bg-green-50 dark:bg-green-950/40'
  if (score >= 50) return 'bg-lime-50 dark:bg-lime-950/40'
  if (score >= 25) return 'bg-orange-50 dark:bg-orange-950/40'
  return 'bg-red-50 dark:bg-red-950/40'
}

const CDN_URL = (typeof window !== 'undefined'
  ? (document.querySelector('meta[name="cdn-url"]')?.getAttribute('content') ?? '')
  : '') || 'https://api.bayen.ma/assets'

export default function ProductAlternatives({ alternatives, isBestInCategory, className }: ProductAlternativesProps) {
  const { t, isRtl: rtl } = useLocale()

  return (
    <section className={cn('rounded-xl border bg-card p-5', className)}>
      {/* Titre */}
      <div className={cn('flex items-center gap-2 mb-4', rtl && 'flex-row-reverse')}>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <ArrowUpRight size={18} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{t('alt.title')}</h3>
      </div>

      {/* Meilleur de sa catégorie */}
      {isBestInCategory && (
        <div className={cn(
          'flex items-center gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
          rtl && 'flex-row-reverse'
        )}>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/60">
            <Trophy size={20} className="text-amber-600 dark:text-amber-300" />
          </div>
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">{t('alt.bestInCategory')}</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {rtl ? 'هاد المنتوج عندو أحسن نتيجة فالفئة ديالو' : 'Ce produit a le meilleur score de sa catégorie'}
            </p>
          </div>
        </div>
      )}

      {/* Cards alternatives */}
      {alternatives.length > 0 && (
        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-none">
          {alternatives.map((alt) => (
            <a
              key={alt.barcode}
              href={`/produit/${alt.barcode}`}
              className="flex-shrink-0 snap-start w-[160px] rounded-lg border bg-background p-3 hover:shadow-md transition-shadow group"
            >
              {/* Image */}
              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-muted mb-2.5">
                {alt.image_front ? (
                  <img
                    src={`${CDN_URL}/${alt.image_front}?width=160&height=160&fit=cover`}
                    alt={alt.name_fr}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={32} className="text-muted-foreground/30" />
                  </div>
                )}

                {/* Badge score */}
                {alt.scan_score != null && (
                  <div
                    className={cn(
                      'absolute top-1.5 right-1.5 w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md',
                    )}
                    style={{ backgroundColor: scoreColor(alt.scan_score) }}
                  >
                    {alt.scan_score}
                  </div>
                )}
              </div>

              {/* Infos */}
              <p className="text-sm font-medium line-clamp-2 leading-tight mb-0.5">
                {alt.name_fr}
              </p>
              <p className="text-xs text-muted-foreground truncate mb-1.5">
                {alt.brand}
              </p>

              {/* Nutri-Score mini */}
              {alt.nutriscore_grade && (
                <img
                  src={`/badges/nutriscore-${alt.nutriscore_grade.toLowerCase()}.svg`}
                  alt={`Nutri-Score ${alt.nutriscore_grade}`}
                  className="h-5"
                  loading="lazy"
                />
              )}

              {/* Raisons factuelles « pourquoi mieux » */}
              {alt.reasons && alt.reasons.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {alt.reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-1 text-[11px] leading-tight text-green-700 dark:text-green-300">
                      <span className="mt-0.5 flex-shrink-0">✓</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
