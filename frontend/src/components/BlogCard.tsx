/**
 * Carte article pour les listings et carousels.
 *
 * Rendu 100 % SSR — même règle que ProductCard : pas de useState/useEffect
 * qui ne pourraient pas s'hydrater quand le composant est monté sans
 * directive `client:*` (ex: boucle `.map` dans Astro).
 *
 * Variante `compact` : carte fixe 280px de large pour le carousel horizontal.
 * Variante `default` : pleine largeur, utilisée dans la grille /blog.
 */
import type { Article, ArticleCategory } from '@/lib/types'
import type { Locale } from '@/lib/translations'
import { cn } from '@/lib/utils'

const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'

const CATEGORY_COLORS: Record<ArticleCategory, string> = {
  'bien-etre': '#476a32',
  habitudes: '#b1cf3a',
  guides: '#0f766e',
  actualites: '#f97316',
}

const CATEGORY_LABELS_FR: Record<ArticleCategory, string> = {
  'bien-etre': 'Bien-être',
  habitudes: 'Habitudes',
  guides: 'Guides',
  actualites: 'Actualités',
}

const CATEGORY_LABELS_ARY: Record<ArticleCategory, string> = {
  'bien-etre': 'العافية',
  habitudes: 'العادات',
  guides: 'دليل',
  actualites: 'الأخبار',
}

// Covers de secours (générés IA, palette Bayen) quand un article n'a pas
// encore d'image dédiée — évite le placeholder gris. Voir /public/blog/.
const CATEGORY_FALLBACK_COVER: Record<ArticleCategory, string> = {
  'bien-etre': '/blog/fallback-bien-etre.jpg',
  habitudes: '/blog/fallback-habitudes.jpg',
  guides: '/blog/fallback-guides.jpg',
  actualites: '/blog/fallback-actualites.jpg',
}

const MONTHS_FR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
]
const MONTHS_ARY = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
  'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر',
]

function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const months = locale === 'ary' ? MONTHS_ARY : MONTHS_FR
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return ''
  }
}

interface BlogCardProps {
  article: Article
  locale: Locale
  variant?: 'default' | 'compact'
  className?: string
}

export default function BlogCard({
  article,
  locale,
  variant = 'default',
  className,
}: BlogCardProps) {
  const title = (locale === 'ary' && article.title_ar) || article.title_fr
  const excerpt = (locale === 'ary' && article.excerpt_ar) || article.excerpt_fr
  const categoryLabel =
    locale === 'ary'
      ? CATEGORY_LABELS_ARY[article.category]
      : CATEGORY_LABELS_FR[article.category]
  const categoryColor = CATEGORY_COLORS[article.category]

  const cover = article.cover_image
    ? article.cover_image.startsWith('http')
      ? article.cover_image
      : `${CDN_URL}/${article.cover_image}`
    : (CATEGORY_FALLBACK_COVER[article.category] ?? null)

  const dateStr = formatDate(article.date_published ?? article.date_created, locale)
  const readingTime = article.reading_time_min
    ? `${article.reading_time_min} ${locale === 'ary' ? 'دقيقة' : 'min'}`
    : null

  const isCompact = variant === 'compact'

  return (
    <a
      href={`/blog/${article.slug}`}
      className={cn(
        'group block overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/20',
        isCompact && 'h-full',
        className
      )}
    >
      {/* Cover 4:3 — placeholder SVG visible si pas d'image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        </div>
        {cover && (
          <img
            src={cover}
            alt={title}
            className="relative w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}

        {/* Badge catégorie en overlay */}
        <span
          className="absolute top-3 start-3 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white shadow"
          style={{ backgroundColor: categoryColor }}
        >
          {categoryLabel}
        </span>
      </div>

      {/* Contenu texte */}
      <div className={cn('p-4', isCompact ? 'space-y-2' : 'space-y-3')}>
        <h3
          className={cn(
            'font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors',
            isCompact ? 'text-sm' : 'text-base sm:text-lg'
          )}
        >
          {title}
        </h3>
        {excerpt && (
          <p
            className={cn(
              'text-muted-foreground',
              isCompact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-3'
            )}
          >
            {excerpt}
          </p>
        )}
        {(dateStr || readingTime) && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {dateStr && <span>{dateStr}</span>}
            {dateStr && readingTime && <span aria-hidden="true">•</span>}
            {readingTime && <span>{readingTime}</span>}
          </div>
        )}
      </div>
    </a>
  )
}
