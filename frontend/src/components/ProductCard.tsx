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
import { scoreFill, scoreLevel } from '@/lib/score-colors'
import { getLocale, t } from '@/lib/i18n'
import type { Locale } from '@/lib/translations'
import type { Product } from '@/lib/types'

interface ProductCardProps {
  product: Product
  className?: string
  /** 'row' = carte horizontale (accueil) · 'grid' = carte verticale maquette v2 (recherche, catégories) */
  variant?: 'row' | 'grid'
  /** Pastille imposée à la place du Nutri-Score (galerie protéines : « 33 g prot. ») */
  badge?: { text: string; color: string }
  /** Langue des textes ; en rendu serveur (Astro), passer la locale du cookie */
  locale?: Locale
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
export function ScoreSticker({ score, word, size, value, fill, className, locale }: {
  score: number | null | undefined
  /** Langue du mot (rendu serveur : passer la locale du cookie ; sinon celle du navigateur) */
  locale?: Locale
  word?: string
  size?: 'sm' | 'lg'
  value?: number
  /** Aplat imposé (score beauté : couleur du niveau de risque plafonnant) */
  fill?: string
  className?: string
}) {
  const level = scoreLevel(score)
  const lang = locale ?? getLocale()
  const label = word ?? (level ? t(`score.${level}`, lang) : '')
  const shown = value ?? score ?? '?'
  return (
    <span
      // w3 : « 100 » ne tient pas dans le rond à la taille d'un nombre à 2 chiffres
      className={cn('score-sticker', size, level == null && 'none', String(shown).length > 2 && 'w3', className)}
      style={level ? ({ '--c': fill ?? scoreFill(score) } as CSSProperties) : undefined}
      role="img"
      aria-label={score == null ? t('card.scoreUnknown', lang) : `${t('card.score', lang)} ${score}/100${label ? `, ${label}` : ''}`}
    >
      {/* Enveloppe : chiffre et mot restent groupés au centre du rond */}
      <span aria-hidden="true">
        <b>{shown}</b>
        {label && <i>{label}</i>}
      </span>
    </span>
  )
}

// Puce compacte de carte (maquette .pcard : 22 px)
const CHIP = 'chip h-[22px] px-2 text-[11px]'
// Puce posée sur un aplat de couleur : texte encre dans les deux thèmes
const CHIP_FILL = `${CHIP} fill`

/** Puce cosmétique : aplat de risque (token) + texte encre */
interface Chip { text: string; fill: string }

/**
 * Pastille beauté (C23) : remplace le Nutri-Score sur une fiche cosmétique.
 * Textes via t() avec la locale passée par la page (rendu SSR sans hook).
 */
function cosmeticBadge(product: Product, lang: Locale): Chip | null {
  if (product.product_type !== 'cosmetic') return null
  const risk = product.cosmetic_risk
  if (!risk || risk.total == null) return { text: t('card.inciMissing', lang), fill: 'bg-muted' }
  const cap = risk.cap_reason?.risk_level
  if (!cap) return { text: t('card.noKnownRisk', lang), fill: 'bg-score-excellent' }
  const n = (risk.counts.banned ?? 0) + (risk.counts.high ?? 0) + (risk.counts.moderate ?? 0) + (risk.counts.low ?? 0)
  const fill = cap === 'banned' || cap === 'high' ? 'bg-score-mauvais' : cap === 'moderate' ? 'bg-score-mediocre' : 'bg-score-bon'
  const word = cap === 'banned' ? t('card.banned', lang) : `${Math.max(n, 1)} ${t('card.toWatch', lang)}`
  return { text: word, fill }
}

/** Puces Marché Pop communes aux deux variantes (cosmétique, badge imposé, Nutri-Score, NOVA, additifs) */
function ProductChips({ product, badge, lang }: { product: Product; badge?: { text: string; color: string }; lang: Locale }) {
  const cosmetic = cosmeticBadge(product, lang)
  const grade = product.nutriscore_grade?.toLowerCase()
  const additives = product.additives?.length ?? 0
  return (
    <span className="chips mt-1.5">
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
          {additives} {t(additives > 1 ? 'card.additives' : 'card.additive', lang)}
        </span>
      )}
    </span>
  )
}

// Pictogramme affiché sous la photo (visible si elle manque ou échoue à charger)
const PHOTO_PH = (
  <svg className="ph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </svg>
)

export default function ProductCard({ product, className, variant = 'row', badge, locale }: ProductCardProps) {
  const lang = locale ?? getLocale()
  // image_front peut être une URL externe (héritage OFF) ou un UUID Directus.
  // Pour les UUID : vignette transformée côté Directus (WebP recadré).
  const thumbSize = variant === 'grid' ? 480 : 160
  const imgSrc = product.image_front
    ? (product.image_front.startsWith('http')
        ? product.image_front
        : `${CDN_URL}/${product.image_front}?width=${thumbSize}&height=${thumbSize}&fit=cover&quality=80&format=webp`)
    : null

  const isBeauty = product.product_type === 'cosmetic'
  // Beauté : vignette framboise (univers distinct) ; alimentaire : teinte stable par code-barres
  const tint = isBeauty ? 'tint-framboise' : productTint(product.barcode)
  const quantity = (product as { quantity?: string }).quantity
  const meta = [product.brand, quantity].filter(Boolean).join(' · ')

  // Variante grille — carte de la maquette « Desktop » (les mieux notés) :
  // grande vignette, pastille à cheval sur son bord bas, nom, marque · contenance
  if (variant === 'grid') {
    const risk = product.cosmetic_risk
    const flagged = risk ? (risk.counts.banned ?? 0) + (risk.counts.high ?? 0) + (risk.counts.moderate ?? 0) + (risk.counts.low ?? 0) : 0
    return (
      <a href={`/produit/${product.barcode}`} className={cn('card relative grid content-start gap-3 p-3.5', className)}>
        <div className={cn('tile aspect-square', tint)}>
          {PHOTO_PH}
          {imgSrc && <img src={imgSrc} alt={product.name_fr} loading="lazy" />}
        </div>
        <div className="relative min-w-0 pe-16">
          {product.scan_score != null && (
            <span className="absolute -top-9 end-0">
              <ScoreSticker score={product.scan_score} locale={lang} />
            </span>
          )}
          <p className="line-clamp-2 font-bold leading-tight">{product.name_fr}</p>
          {meta && <p className="muted mt-1 truncate text-[13px]">{meta}</p>}
          {isBeauty && risk && risk.token_count > 0 && (
            <p className="muted mt-0.5 text-xs">{risk.token_count} {t('card.ingredients', lang)} · {flagged} {t('card.toWatchLower', lang)}</p>
          )}
          <ProductChips product={product} badge={badge} lang={lang} />
        </div>
      </a>
    )
  }

  // Variante liste — carte .pcard de la maquette « Accueil » : vignette | nom + puces | pastille
  return (
    <a href={`/produit/${product.barcode}`} className={cn('card pcard', className)}>
      <div className={cn('tile', tint)}>
        {PHOTO_PH}
        {imgSrc && <img src={imgSrc} alt={product.name_fr} loading="lazy" />}
      </div>
      <div className="min-w-0">
        <p className="pn">{product.name_fr}</p>
        {meta && <p className="pm">{meta}</p>}
        <ProductChips product={product} badge={badge} lang={lang} />
      </div>
      {product.scan_score != null ? <ScoreSticker score={product.scan_score} locale={lang} /> : <span />}
    </a>
  )
}
