/**
 * Alternatives plus saines — section sur la fiche produit
 * Affiche 3 produits de la même catégorie avec un meilleur score
 */

import { ArrowUpRight, Package } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { ScoreSticker, productTint } from '@/components/ProductCard'

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
          <ArrowUpRight size={18} className="text-brand-ink" />
        </div>
        <h3 className="text-lg font-semibold">{t('alt.title')}</h3>
      </div>

      {/* Meilleur de sa catégorie : Naânaa applaudit */}
      {isBestInCategory && (
        <div className={cn('naanaa', rtl && 'flex-row-reverse')}>
          <img src="/mascotte/naanaa-bravo.webp" alt="" width="72" height="106" />
          <div className="bubble">
            <p className="font-bold text-foreground">{t('alt.bestInCategory')}</p>
            <p className="text-sm text-muted-foreground">
              {rtl ? 'هاد المنتوج عندو أحسن نتيجة فالفئة ديالو' : 'Ce produit a le meilleur score de sa catégorie'}
            </p>
          </div>
        </div>
      )}

      {/* Cards alternatives */}
      {alternatives.length > 0 && (
        <div className="rail-x flex gap-3 overflow-x-auto snap-x -mx-5 px-5 pt-2 pb-6 -mb-3">
          {alternatives.map((alt) => (
            <a
              key={alt.barcode}
              href={`/produit/${alt.barcode}`}
              className="card-lift group relative w-[168px] flex-shrink-0 snap-start rounded-2xl border bg-card p-2.5"
            >
              {/* Vignette colorée (teinte stable par code-barres) + pastille inclinée */}
              <div className="relative mb-2.5">
                <div className={cn('grid h-[120px] place-items-center overflow-hidden rounded-2xl border-2 border-line', productTint(alt.barcode))}>
                  {alt.image_front ? (
                    <img
                      src={`${CDN_URL}/${alt.image_front}?width=160&height=160&fit=cover`}
                      alt={alt.name_fr}
                      className="size-[86%] object-contain mix-blend-multiply transition-transform group-hover:scale-105 dark:mix-blend-normal"
                      loading="lazy"
                    />
                  ) : (
                    <Package size={32} className="text-foreground/30" />
                  )}
                </div>
                {alt.scan_score != null && (
                  <span className="absolute -bottom-3 end-1">
                    <ScoreSticker score={alt.scan_score} size="sm" />
                  </span>
                )}
              </div>

              {/* Infos */}
              <p className="mb-0.5 line-clamp-2 pe-10 text-sm font-bold leading-tight">
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
                    <li key={i} className="flex items-start gap-1 text-[11px] leading-tight text-brand-ink">
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
