/**
 * Couvertures d'articles Marché Pop (public/blog/covers/<slug>.webp).
 * Liste statique générée depuis le dossier : à compléter quand une couverture est ajoutée.
 */
const LOCAL_COVERS = new Set<string>([
  'additifs-a-eviter-maroc',
  'alternatives-snacks-industriels',
  'bayen-est-en-ligne',
  'bien-manger-ramadan',
  'comprendre-le-nutri-score',
  'courses-methode-3-minutes',
  'cremes-eclaircissantes-maroc-hydroquinone-corticoides-mercure',
  'diabete-alimentation-maroc-produits-a-eviter',
  'fromage-fondu-maroc-que-contient-il',
  'gouter-enfants-sain-maroc-idees',
  'huile-palme-maroc-produits-impact-sante',
  'le-reflexe-bayen',
  'lire-etiquette-arabe-maroc-vocabulaire',
  'lire-une-etiquette-nutritionnelle',
  'meilleurs-yaourts-maroc-comparatif',
  'nutrition-sport-maroc-produits-locaux',
  'parler-nutrition-enfants',
  'pourquoi-eviter-ultra-transforme',
  'produits-sans-sucre-maroc-guide',
  'sucre-cache-produits-marocains',
  'the-marocain-sucre-reduire-sans-perdre-tradition',
])

/** Chemin de la couverture locale d'un article, ou null s'il n'en a pas */
export function localCover(slug: string | null | undefined): string | null {
  return slug && LOCAL_COVERS.has(slug) ? `/blog/covers/${slug}.webp` : null
}

/**
 * Article dont la couverture pointe vers le visuel local quand il existe.
 * URL absolue (origine de la requête) : BlogCard/BlogCarousel préfixent le CDN
 * Directus à tout chemin relatif.
 */
export function withLocalCover<T extends { slug: string; cover_image?: string | null }>(article: T, origin: URL): T {
  const cover = localCover(article.slug)
  return cover ? { ...article, cover_image: new URL(cover, origin).href } : article
}

const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'

/**
 * Couverture affichée d'un article : visuel local Marché Pop, sinon image
 * Directus, sinon visuel de secours de sa catégorie (public/blog/fallback-*.jpg).
 */
export function articleCover(article: { slug: string; cover_image?: string | null; category: string }): string {
  return localCover(article.slug)
    ?? (article.cover_image
      ? (article.cover_image.startsWith('http') ? article.cover_image : `${CDN_URL}/${article.cover_image}`)
      : `/blog/fallback-${article.category}.jpg`)
}
