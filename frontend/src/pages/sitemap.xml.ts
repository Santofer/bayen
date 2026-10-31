/**
 * Sitemap dynamique — pages statiques, fiches produit indexables, rayons, marques, additifs, articles.
 *
 * - Fiches : seulement celles qui passent la porte d'indexation (lib/indexable.ts, même règle
 *   que le noindex de la fiche) ; elles reviennent d'elles-mêmes une fois complétées.
 * - lastmod réels (date_updated Directus) ; pas de changefreq / priority (ignorés par Google).
 * - Directus injoignable → 503 : jamais un sitemap 200 vidé de ses fiches et mis en cache.
 * - /classement et /comparer restent dehors (classement des contributeurs, outil) ;
 *   /scan et /contribuer aussi (pages applicatives sans contenu indexable).
 */

export const prerender = false

import type { APIRoute } from 'astro'
import { INDEXABLE_FIELDS, isIndexableProduct, firstBrand, brandKey, canonicalBrand, type IndexableInput } from '@/lib/indexable'

const SITE_URL = 'https://bayen.ma'
const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

// Dernière modification du CONTENU des pages statiques : à mettre à jour quand on les modifie
const STATIC_PAGES: Array<[path: string, lastmod: string]> = [
  ['/', '2026-10-31'],
  ['/recherche', '2026-10-18'],
  ['/beaute', '2026-10-16'],
  ['/proteines', '2026-10-15'],
  ['/ingredients-cosmetiques', '2026-10-15'],
  ['/additifs', '2026-10-18'],
  ['/blog', '2026-10-18'],
  ['/analyser-repas', '2026-10-18'],
  ['/a-propos', '2026-10-18'],
  ['/methodologie', '2026-10-18'],
  ['/questions', '2026-10-31'],
  ['/partenaires', '2026-10-18'],
]

// Une marque entre au sitemap à partir de 5 fiches indexables
const BRAND_MIN_PRODUCTS = 5

interface ProductRow extends IndexableInput {
  barcode: string
  brand: string | null
  category_id: number | null
  date_updated: string | null
  date_created: string | null
}

/** Lecture Directus qui ÉCHOUE (au lieu de renvoyer une liste vide) si l'API ne répond pas */
async function load<T>(path: string, timeoutMs: number): Promise<T[]> {
  const res = await fetch(`${DIRECTUS_URL}${path}`, { signal: AbortSignal.timeout(timeoutMs) })
  if (!res.ok) throw new Error(`${path} → ${res.status}`)
  return ((await res.json()).data ?? []) as T[]
}

const day = (d: string | null | undefined): string | null => (d ? new Date(d).toISOString().slice(0, 10) : null)
const later = (a: string | null, b: string | null): string | null => (!a || (b && b > a) ? b : a)
const entry = (loc: string, lastmod: string | null) =>
  `  <url>\n    <loc>${SITE_URL}${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`

export const GET: APIRoute = async () => {
  let products: ProductRow[]
  let categories: Array<{ id: number; slug: string }>
  let additives: Array<{ id: string }>
  let articles: Array<{ slug: string; date_published: string | null }>
  try {
    ;[products, categories, additives, articles] = await Promise.all([
      load<ProductRow>(`/items/products?filter[status][_eq]=published&fields=barcode,brand,category_id,date_updated,date_created,${INDEXABLE_FIELDS}&limit=-1`, 15000),
      load<{ id: number; slug: string }>('/items/categories?fields=id,slug&limit=-1', 5000),
      load<{ id: string }>('/items/additives?fields=id&limit=-1', 5000),
      load<{ slug: string; date_published: string | null }>('/items/articles?filter[status][_eq]=published&fields=slug,date_published&limit=-1', 15000),
    ])
  } catch {
    return new Response('Sitemap momentanément indisponible, réessayer plus tard.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '300', 'Cache-Control': 'no-store' },
    })
  }

  const productUrls: string[] = []
  // Rayon et marque : date de la fiche la plus récemment modifiée
  const categoryLastmod = new Map<number, string | null>()
  const brands = new Map<string, { spellings: string[]; indexable: number; lastmod: string | null }>()
  for (const p of products) {
    const lastmod = day(p.date_updated ?? p.date_created)
    const indexable = isIndexableProduct(p)
    if (indexable) productUrls.push(entry(`/produit/${p.barcode}`, lastmod))
    if (p.category_id != null && p.product_type !== 'cosmetic') {
      categoryLastmod.set(p.category_id, later(categoryLastmod.get(p.category_id) ?? null, lastmod))
    }
    const brand = firstBrand(p.brand)
    if (brand) {
      const b = brands.get(brandKey(brand)) ?? { spellings: [], indexable: 0, lastmod: null }
      b.spellings.push(brand)
      if (indexable) b.indexable++
      b.lastmod = later(b.lastmod, lastmod)
      brands.set(brandKey(brand), b)
    }
  }

  const urls = [
    ...STATIC_PAGES.map(([path, lastmod]) => entry(path, lastmod)),
    ...productUrls,
    ...categories.map((c) => entry(`/categories/${c.slug}`, categoryLastmod.get(c.id) ?? null)),
    // Même graphie canonique que la page /marque/<nom> (la plus fréquente)
    ...[...brands.values()]
      .filter((b) => b.indexable >= BRAND_MIN_PRODUCTS)
      .map((b) => entry(`/marque/${encodeURIComponent(canonicalBrand(b.spellings))}`, b.lastmod)),
    ...additives.map((a) => entry(`/additifs/${a.id}`, null)),
    ...articles.map((a) => entry(`/blog/${a.slug}`, day(a.date_published))),
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
