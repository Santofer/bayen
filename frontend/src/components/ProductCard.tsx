/**
 * Carte produit pour les listes (accueil, recherche, catégorie)
 *
 * Rendu 100% SSR : pas de useState/useEffect car le composant est
 * souvent mounté sans directive `client:*` (ex: boucle .map dans
 * index.astro). Un état React ne s'hydrate pas dans ce cas → les
 * handlers onLoad/onError ne s'attachent jamais et l'image reste
 * invisible (opacity-0).
 *
 * L'image est affichée directement avec `opacity-100`. Le prefetch
 * OFF est fait côté parent (index.astro) pour les produits sans image.
 * Si l'URL échoue à charger, le placeholder SVG (bg-muted) reste
 * visible par dessous.
 */

import { cn } from '@/lib/utils'
import type { Product, ScoreLabel } from '@/lib/types'

interface ProductCardProps {
  product: Product
  className?: string
}

const SCORE_COLORS: Record<ScoreLabel, string> = {
  excellent: '#476a32',
  bon: '#b1cf3a',
  'médiocre': '#f97316',
  mauvais: '#ef4444',
}

const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'

export default function ProductCard({ product, className }: ProductCardProps) {
  const scoreColor = product.score_label
    ? SCORE_COLORS[product.score_label]
    : '#a1a1aa'

  // image_front peut être une URL externe (OFF préfetché) ou un UUID Directus
  const imgSrc = product.image_front
    ? (product.image_front.startsWith('http') ? product.image_front : `${CDN_URL}/${product.image_front}`)
    : null

  return (
    <a
      href={`/produit/${product.barcode}`}
      className={cn(
        'group flex gap-3 rounded-xl border bg-card p-3 transition-all hover:shadow-md hover:border-primary/20',
        className
      )}
    >
      {/* Image + placeholder en fond (visible si l'image échoue à charger) */}
      <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted flex-shrink-0">
        {/* Placeholder SVG en fond ; l'image passe par dessus */}
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        {imgSrc && (
          <img
            src={imgSrc}
            alt={product.name_fr}
            className="relative w-full h-full object-cover"
            loading="lazy"
          />
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
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col justify-center gap-1">
        <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {product.name_fr}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {product.brand}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {product.nutriscore_grade && (
            <img
              src={`/badges/nutriscore-${product.nutriscore_grade.toLowerCase()}.svg`}
              alt={`Nutri-Score ${product.nutriscore_grade}`}
              className="h-6 w-auto"
              loading="lazy"
            />
          )}
          {product.nova_group && (
            <img
              src={`/badges/nova-group-${product.nova_group}.svg`}
              alt={`NOVA ${product.nova_group}`}
              className="h-6 w-auto"
              loading="lazy"
            />
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
