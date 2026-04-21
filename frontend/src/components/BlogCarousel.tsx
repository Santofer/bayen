/**
 * Carousel "Articles récents" pour la homepage.
 *
 * Wrapper autour du composant shadcn/ui carousel + BlogCard compact.
 * Monté avec `client:idle` : hydratation non-bloquante, le HTML SSR
 * (premier slide) reste lisible même si le JS tarde à charger.
 */
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel'
import BlogCard from '@/components/BlogCard'
import type { Article } from '@/lib/types'
import type { Locale } from '@/lib/translations'

interface BlogCarouselProps {
  articles: Article[]
  locale: Locale
}

export default function BlogCarousel({ articles, locale }: BlogCarouselProps) {
  if (!articles || articles.length === 0) return null

  return (
    <Carousel
      opts={{
        align: 'start',
        dragFree: true,
        loop: false,
        direction: locale === 'ary' ? 'rtl' : 'ltr',
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-3">
        {articles.map((article) => (
          <CarouselItem
            key={article.id}
            className="basis-[82%] sm:basis-[48%] md:basis-[40%] lg:basis-[31%] pl-3"
          >
            <BlogCard article={article} locale={locale} variant="compact" />
          </CarouselItem>
        ))}
      </CarouselContent>
      {/* Flèches visibles sur desktop uniquement (carousel swipable sur mobile) */}
      <CarouselPrevious className="hidden md:inline-flex -left-4" />
      <CarouselNext className="hidden md:inline-flex -right-4" />
    </Carousel>
  )
}
