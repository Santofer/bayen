/**
 * Carte article du journal (maquette « Blog »).
 *
 * Rendu 100 % SSR — même règle que ProductCard : pas de useState/useEffect
 * qui ne pourraient pas s'hydrater quand le composant est monté sans
 * directive `client:*` (ex: boucle `.map` dans Astro).
 *
 * - `default`  : ligne vignette 128×96 + eyebrow + titre (mobile), carte à
 *                couverture dans la grille 3 colonnes (ordinateur) — liste /blog
 * - `featured` : mise en avant (couverture 200 px, puce, titre, extrait, méta),
 *                large sur ordinateur
 * - `compact`  : carte à couverture (carrousel d'accueil, articles liés)
 */
import type { Article, ArticleCategory } from '@/lib/types'
import type { Locale } from '@/lib/translations'
import { cn } from '@/lib/utils'
import { articleCover } from '@/lib/blog-covers'

/** Aplat Marché Pop par catégorie (texte encre posé dessus) — liste, article, cartes */
export const BLOG_CATEGORY_FILL: Record<ArticleCategory, string> = {
  'bien-etre': 'bg-framboise',
  habitudes: 'bg-menthe',
  guides: 'bg-citron',
  actualites: 'bg-myrtille',
}

const CATEGORY_LABELS: Record<Locale, Record<ArticleCategory, string>> = {
  fr: { 'bien-etre': 'Bien-être', habitudes: 'Habitudes', guides: 'Guides', actualites: 'Actualités' },
  ary: { 'bien-etre': 'العافية', habitudes: 'العادات', guides: 'دليل', actualites: 'الأخبار' },
}

export function blogCategoryLabel(category: ArticleCategory, locale: Locale): string {
  return CATEGORY_LABELS[locale][category] ?? category
}

const MONTHS: Record<Locale, string[]> = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  ary: ['يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو', 'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'],
}

export function formatBlogDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()} ${MONTHS[locale][d.getMonth()]} ${d.getFullYear()}`
}

/** Méta de carte : « 5 min · 12 oct. 2026 » */
function cardMeta(article: Article, locale: Locale): string {
  const reading = article.reading_time_min ? `${article.reading_time_min} ${locale === 'ary' ? 'دقيقة' : 'min'}` : ''
  return [reading, formatBlogDate(article.date_published ?? article.date_created, locale)].filter(Boolean).join(' · ')
}

interface BlogCardProps {
  article: Article
  locale: Locale
  variant?: 'default' | 'featured' | 'compact'
  className?: string
}

export default function BlogCard({ article, locale, variant = 'default', className }: BlogCardProps) {
  const title = (locale === 'ary' && article.title_ar) || article.title_fr
  const excerpt = (locale === 'ary' && article.excerpt_ar) || article.excerpt_fr
  const label = blogCategoryLabel(article.category, locale)
  const fill = BLOG_CATEGORY_FILL[article.category]
  const cover = articleCover(article)
  const meta = cardMeta(article, locale)
  const href = `/blog/${article.slug}`

  if (variant === 'featured') {
    return (
      <a href={href} className={cn('card grid overflow-hidden md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]', className)}>
        <img
          src={cover}
          alt=""
          loading="eager"
          className="h-[200px] w-full border-b-2 border-line object-cover md:h-full md:min-h-[380px] md:border-b-0 md:border-e-2"
        />
        <div className="grid content-center gap-2 p-4 md:gap-3 md:p-8">
          <span className={cn('chip fill w-max', fill)}>{label}</span>
          <h2 className="disp d-m md:text-[32px]">{title}</h2>
          {excerpt && <p className="muted text-sm md:text-base">{excerpt}</p>}
          {meta && <p className="muted text-[12.5px]">{meta}</p>}
        </div>
      </a>
    )
  }

  if (variant === 'compact') {
    return (
      <a href={href} className={cn('card grid h-full content-start overflow-hidden', className)}>
        <img src={cover} alt="" loading="lazy" className="aspect-[4/3] w-full border-b-2 border-line object-cover" />
        <div className="grid gap-2 p-4">
          <span className={cn('chip fill w-max', fill)}>{label}</span>
          <h3 className="disp d-s line-clamp-2">{title}</h3>
          {excerpt && <p className="muted line-clamp-2 text-[13px]">{excerpt}</p>}
          {meta && <p className="muted text-[12.5px]">{meta}</p>}
        </div>
      </a>
    )
  }

  // Ligne de la maquette sur mobile ; carte à couverture sur ordinateur (utilitaires md:, la
  // classe .card n'acceptant pas de variante)
  return (
    <a
      href={href}
      className={cn(
        'grid grid-cols-[128px_minmax(0,1fr)] items-center gap-3',
        'md:grid-cols-1 md:content-start md:items-stretch md:gap-0 md:overflow-hidden md:rounded-[20px] md:border-2 md:border-line md:bg-card md:shadow-[4px_4px_0_var(--color-hard)] md:transition-transform md:hover:-translate-x-0.5 md:hover:-translate-y-0.5',
        className
      )}
    >
      <img
        src={cover}
        alt=""
        loading="lazy"
        className="h-24 w-32 rounded-2xl border-2 border-line object-cover md:aspect-[4/3] md:h-auto md:w-full md:rounded-none md:border-0 md:border-b-2"
      />
      <div className="grid gap-1 md:gap-2 md:p-4">
        <span className="eyebrow">{label}</span>
        <h3 className="disp d-s md:text-lg">{title}</h3>
        {excerpt && <p className="muted hidden text-sm md:line-clamp-3">{excerpt}</p>}
        {meta && <p className="muted hidden text-[12.5px] md:block">{meta}</p>}
      </div>
    </a>
  )
}
