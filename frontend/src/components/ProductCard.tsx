/**
 * Carte produit pour les listes (accueil, recherche, catégorie)
 */

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Product, ScoreLabel } from '@/lib/types'

interface ProductCardProps {
  product: Product
  className?: string
}

const SCORE_COLORS: Record<ScoreLabel, string> = {
  excellent: '#16a34a',
  bon: '#84cc16',
  'médiocre': '#f97316',
  mauvais: '#ef4444',
}

const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api-bayen.n0.ma/assets'

export default function ProductCard({ product, className }: ProductCardProps) {
  const scoreColor = product.score_label
    ? SCORE_COLORS[product.score_label]
    : '#a1a1aa'

  return (
    <a
      href={`/produit/${product.barcode}`}
      className={cn(
        'group flex gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-md hover:border-primary/20',
        className
      )}
    >
      {/* Image */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {product.image_front ? (
          <img
            src={product.image_front.startsWith('http') ? product.image_front : `${CDN_URL}/${product.image_front}`}
            alt={product.name_fr}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
        )}

        {/* Score badge */}
        {product.scan_score != null && (
          <div
            className="absolute top-1 right-1 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow"
            style={{ backgroundColor: scoreColor }}
          >
            {product.scan_score}
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
          {product.name_fr}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {product.brand}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {product.nutriscore_grade && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Nutri {product.nutriscore_grade}
            </Badge>
          )}
          {product.nova_group && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              NOVA {product.nova_group}
            </Badge>
          )}
          {product.additives && product.additives.length > 0 && (
            <span className="text-[10px] text-muted-foreground">
              {product.additives.length} additif{product.additives.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}
