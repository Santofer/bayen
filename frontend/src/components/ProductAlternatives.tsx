/**
 * Alternatives plus saines — section sur la fiche produit
 * Affiche 3 produits de la même catégorie avec un meilleur score
 */

import { Package } from 'lucide-react'
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

  // Rien à proposer et pas « meilleur de sa catégorie » : pas de section vide
  if (alternatives.length === 0 && !isBestInCategory) return null

  return (
    <section className={cn('grid gap-3', className)}>
      <div className="sec-head px-[18px] md:px-0">
        <h2 className="disp d-m">Mieux, dans le même rayon</h2>
      </div>

      {/* Meilleur de sa catégorie : Naânaa applaudit */}
      {isBestInCategory && (
        <div className="naanaa px-[18px] md:px-0">
          <img src="/mascotte/naanaa-bravo.webp" alt="" width="72" height="106" />
          <div className="bubble">
            <p className="font-bold text-foreground">{t('alt.bestInCategory')}</p>
            <p className="text-sm text-muted-foreground">
              {rtl ? 'هاد المنتوج عندو أحسن نتيجة فالفئة ديالو' : 'Ce produit a le meilleur score de sa catégorie'}
            </p>
          </div>
        </div>
      )}

      {/* Rail horizontal de la maquette : vignette pleine, pastille, nom, raison factuelle */}
      {alternatives.length > 0 && (
        <div className="scroller">
          {alternatives.map((alt) => (
            <a
              key={alt.barcode}
              href={`/produit/${alt.barcode}`}
              className="card relative grid w-[168px] content-start gap-2 p-2.5 md:w-[220px]"
            >
              <div className={cn('tile h-[120px] md:h-[160px]', productTint(alt.barcode))}>
                <Package size={26} className="ph" aria-hidden="true" />
                {alt.image_front && (
                  <img
                    src={alt.image_front.startsWith('http') ? alt.image_front : `${CDN_URL}/${alt.image_front}?width=320&height=320&fit=cover&quality=80&format=webp`}
                    alt={alt.name_fr}
                    loading="lazy"
                  />
                )}
              </div>
              {alt.scan_score != null && (
                <span className="absolute end-1 top-[96px] md:top-[136px]">
                  <ScoreSticker score={alt.scan_score} size="sm" />
                </span>
              )}
              <p className="line-clamp-2 pe-8 text-sm font-bold leading-tight">{alt.name_fr}</p>
              {/* Raisons « pourquoi mieux » (déterministes), sinon la marque */}
              <p className="muted line-clamp-2 text-xs">
                {alt.reasons && alt.reasons.length > 0 ? alt.reasons.join(' · ') : alt.brand}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
