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

import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { scoreFill, scoreLevel, SCORE_WORD } from '@/lib/score-colors'
import type { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
  className?: string
  /** 'row' = carte horizontale (accueil) · 'grid' = carte verticale maquette v2 (recherche, catégories) */
  variant?: 'row' | 'grid'
  /** Pastille imposée à la place du Nutri-Score (galerie protéines : « 33 g prot. ») */
  badge?: { text: string; color: string }
}

// Pastille Nutri-Score : couleurs officielles via les tokens (classes complètes pour Tailwind)
const NUTRISCORE_DOT: Record<string, string> = {
  a: 'bg-nutriscore-a',
  b: 'bg-nutriscore-b',
  c: 'bg-nutriscore-c',
  d: 'bg-nutriscore-d',
  e: 'bg-nutriscore-e',
}

const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'

// Vignettes Marché Pop (fond derrière la photo) — gèrent le mode sombre
const TINTS = ['tint-menthe', 'tint-citron', 'tint-framboise', 'tint-myrtille', 'tint-figue', 'tint-tomate'] as const

/**
 * Teinte de vignette STABLE pour un produit : même code-barres → même couleur,
 * d'une page à l'autre et entre le rendu serveur et le client.
 */
export function productTint(key: string | number | null | undefined): string {
  let h = 0
  for (const c of String(key ?? '')) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return TINTS[h % TINTS.length]
}

/**
 * Pastille de score Marché Pop (`.score-sticker`) : chiffre + mot, texte encre
 * sur l'aplat du score. `value` remplace le chiffre affiché (animation) sans
 * changer la couleur, calculée sur `score` (ou imposée par `fill`).
 */
export function ScoreSticker({ score, word, size, value, fill, className }: {
  score: number | null | undefined
  word?: string
  size?: 'sm' | 'lg'
  value?: number
  /** Aplat imposé (score beauté : couleur du niveau de risque plafonnant) */
  fill?: string
  className?: string
}) {
  const level = scoreLevel(score)
  const label = word ?? (level ? SCORE_WORD[level] : '')
  return (
    <span
      className={cn('score-sticker', size, level == null && 'none', className)}
      style={level ? ({ '--c': fill ?? scoreFill(score) } as CSSProperties) : undefined}
      role="img"
      aria-label={score == null ? 'Score inconnu' : `Score ${score} sur 100${label ? `, ${label}` : ''}`}
    >
      {/* Enveloppe : chiffre et mot restent groupés au centre du rond */}
      <span aria-hidden="true">
        <b>{value ?? score ?? '?'}</b>
        {label && <i>{label}</i>}
      </span>
    </span>
  )
}

// Puce compacte de carte (maquette .pcard : 22 px). `!` car .pop-chip est une règle
// globale hors calque Tailwind : sans lui, les utilitaires ne la surchargent pas.
// Ne pas passer ces chaînes dans cn() : tailwind-merge 2 ne comprend pas le `!` final.
const CHIP = 'pop-chip h-[22px]! px-2! text-[11px]!'
// Puce posée sur un aplat de couleur : texte et contour encre dans les deux thèmes
const CHIP_FILL = `${CHIP} border-encre! text-encre!`

/** Puce cosmétique : aplat de risque (token) + texte encre */
interface Chip { text: string; fill: string }

/**
 * Pastille beauté (C23) : remplace le Nutri-Score sur une fiche cosmétique.
 * Texte en français dur, comme le reste de la carte (rendu SSR sans hook).
 */
function cosmeticBadge(product: Product): Chip | null {
  if (product.product_type !== 'cosmetic') return null
  const risk = product.cosmetic_risk
  if (!risk || risk.total == null) return { text: 'LISTE INCI MANQUANTE', fill: 'bg-muted!' }
  const cap = risk.cap_reason?.risk_level
  if (!cap) return { text: 'SANS RISQUE CONNU', fill: 'bg-score-excellent!' }
  const n = (risk.counts.banned ?? 0) + (risk.counts.high ?? 0) + (risk.counts.moderate ?? 0) + (risk.counts.low ?? 0)
  const fill = cap === 'banned' || cap === 'high' ? 'bg-score-mauvais!' : cap === 'moderate' ? 'bg-score-mediocre!' : 'bg-score-bon!'
  const word = cap === 'banned' ? 'INTERDIT' : n > 1 ? `${n} À SURVEILLER` : '1 À SURVEILLER'
  return { text: word, fill }
}

/** Puces Marché Pop communes aux deux variantes (cosmétique, badge imposé, Nutri-Score, NOVA, additifs) */
function ProductChips({ product, badge }: { product: Product; badge?: { text: string; color: string } }) {
  const cosmetic = cosmeticBadge(product)
  const grade = product.nutriscore_grade?.toLowerCase()
  const additives = product.additives?.length ?? 0
  return (
    <span className="mt-2 flex flex-wrap gap-1">
      {badge ? (
        // Badge imposé par la page (protéines) : sa couleur devient une pastille, le texte reste lisible
        <span className={CHIP}>
          <span className="size-2 rounded-full border border-encre" style={{ backgroundColor: badge.color }} />
          {badge.text}
        </span>
      ) : cosmetic ? (
        <span className={`${CHIP_FILL} ${cosmetic.fill}`}>{cosmetic.text}</span>
      ) : grade && NUTRISCORE_DOT[grade] ? (
        <span className={CHIP}>
          <span className={cn('size-2.5 rounded-full', NUTRISCORE_DOT[grade])} />
          Nutri-Score {grade.toUpperCase()}
        </span>
      ) : null}
      {product.product_type !== 'cosmetic' && product.nova_group != null && (
        <span className={CHIP}>NOVA {product.nova_group}</span>
      )}
      {product.product_type !== 'cosmetic' && additives > 0 && (
        <span className={CHIP}>
          {additives} additif{additives > 1 ? 's' : ''}
        </span>
      )}
    </span>
  )
}

export default function ProductCard({ product, className, variant = 'row', badge }: ProductCardProps) {
  // image_front peut être une URL externe (héritage OFF) ou un UUID Directus.
  // Pour les UUID : thumbnail transformé côté Directus (160×160 WebP ≈ 7 Ko
  // au lieu du fichier original parfois > 500 Ko).
  const thumbSize = variant === 'grid' ? 320 : 160
  const imgSrc = product.image_front
    ? (product.image_front.startsWith('http')
        ? product.image_front
        : `${CDN_URL}/${product.image_front}?width=${thumbSize}&height=${thumbSize}&fit=cover&quality=80&format=webp`)
    : null

  const isBeauty = product.product_type === 'cosmetic'
  // Beauté : vignette framboise (univers distinct) ; alimentaire : teinte stable par code-barres
  const tint = isBeauty ? 'tint-framboise' : productTint(product.barcode)

  // Variante grille — carte verticale Marché Pop (recherche, catégories)
  if (variant === 'grid') {
    const risk = product.cosmetic_risk
    const flagged = risk ? (risk.counts.banned ?? 0) + (risk.counts.high ?? 0) + (risk.counts.moderate ?? 0) + (risk.counts.low ?? 0) : 0
    return (
      <a href={`/produit/${product.barcode}`} className={cn('pcard-v2', isBeauty && 'pcard-beauty', className)}>
        <div className="pi">
          {/* Vignette de couleur sous la photo ; en clair, le fond blanc des
              photos se fond dans la teinte (multiply) */}
          <div className={cn('absolute inset-0 grid place-items-center', tint)}>
            {imgSrc && (
              <img
                src={imgSrc}
                alt={product.name_fr}
                loading="lazy"
                className="object-contain! p-[9%] mix-blend-multiply dark:mix-blend-normal"
              />
            )}
          </div>
          {isBeauty && (
            <span className="uni" aria-label="Cosmétique">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 15.5a2 2 0 0 0-1.4-1.4L2.4 12.5a.5.5 0 0 1 0-1L8.5 9.9a2 2 0 0 0 1.4-1.4l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0z"/></svg>
            </span>
          )}
          {/* Pastille inclinée chiffre + mot, dans le coin de la vignette */}
          {product.scan_score != null && (
            <span className="absolute end-2 top-2 z-[2]">
              <ScoreSticker score={product.scan_score} />
            </span>
          )}
        </div>
        <b>{product.name_fr}</b>
        {/* Marque · contenance — la contenance distingue les variantes d'un
            même produit (5 « Nutella / Ferrero » = 5 formats différents) */}
        {(product.brand || (product as { quantity?: string }).quantity) && (
          <span className="br">
            {[product.brand, (product as { quantity?: string }).quantity]
              .filter(Boolean)
              .join(' · ')}
          </span>
        )}
        {isBeauty && risk && risk.token_count > 0 && (
          <span className="meta">{risk.token_count} ingrédients · {flagged} à surveiller</span>
        )}
        <ProductChips product={product} badge={badge} />
      </a>
    )
  }

  // Variante liste — maquette A « Marché Pop » : vignette | nom + puces | pastille
  return (
    <a
      href={`/produit/${product.barcode}`}
      className={cn(
        'card-lift group grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border bg-card py-2.5 ps-2.5 pe-3',
        className
      )}
    >
      {/* Vignette colorée + placeholder (visible si l'image échoue à charger) */}
      <div className={cn('relative grid size-[76px] place-items-center overflow-hidden rounded-[14px] border-2 border-line', tint)}>
        <svg className="absolute text-foreground/30" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
        {imgSrc && (
          <img
            src={imgSrc}
            alt={product.name_fr}
            className="relative size-[86%] object-contain mix-blend-multiply dark:mix-blend-normal"
            loading="lazy"
          />
        )}
      </div>

      {/* Infos */}
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-[14.5px] font-bold leading-tight text-foreground transition-colors group-hover:text-brand-ink">
          {product.name_fr}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {product.brand}
        </p>
        <ProductChips product={product} badge={badge} />
      </div>

      {product.scan_score != null ? <ScoreSticker score={product.scan_score} /> : <span />}
    </a>
  )
}
