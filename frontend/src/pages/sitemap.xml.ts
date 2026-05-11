/**
 * Sitemap dynamique — liste tous les produits publiés et catégories
 */

export const prerender = false

import type { APIRoute } from 'astro'

const SITE_URL = 'https://bayen.ma'
const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

export const GET: APIRoute = async () => {
  // Pages statiques avec lastmod (date du dernier déploiement majeur).
  // /scan et /contribuer retirés : pages applicatives sans contenu indexable,
  // /scan en priorité 0.9 risquait de polluer le crawl budget.
  const STATIC_LASTMOD = '2026-05-11'
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily', lastmod: STATIC_LASTMOD },
    { url: '/recherche', priority: '0.8', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
    { url: '/additifs', priority: '0.7', changefreq: 'monthly', lastmod: STATIC_LASTMOD },
    { url: '/blog', priority: '0.8', changefreq: 'weekly', lastmod: STATIC_LASTMOD },
    { url: '/analyser-repas', priority: '0.7', changefreq: 'monthly', lastmod: STATIC_LASTMOD },
    { url: '/a-propos', priority: '0.6', changefreq: 'monthly', lastmod: STATIC_LASTMOD },
    { url: '/methodologie', priority: '0.6', changefreq: 'monthly', lastmod: STATIC_LASTMOD },
  ]

  // Articles blog : timeout généreux (15s) — Directus peut être lent
  // sur la première requête après cold-start. Fallback hardcodé si la
  // requête échoue, pour ne JAMAIS perdre les articles du sitemap.
  let articles: Array<{ slug: string; date_published: string | null }> = []
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/articles?filter[status][_eq]=published&fields=slug,date_published&limit=-1`,
      { signal: AbortSignal.timeout(15000) }
    )
    if (res.ok) {
      const data = await res.json()
      articles = data.data ?? []
    }
  } catch { /* fallback ci-dessous */ }

  // Fallback statique : liste hardcodée des slugs connus à la date de build.
  // Si Directus est down ou timeout, on garde au moins ces articles dans le sitemap.
  if (articles.length === 0) {
    const KNOWN_SLUGS = [
      'bayen-est-en-ligne',
      'comprendre-le-nutri-score',
      'additifs-a-eviter-maroc',
      'lire-une-etiquette-nutritionnelle',
      'sucre-cache-produits-marocains',
      'pourquoi-eviter-ultra-transforme',
      'parler-nutrition-enfants',
      'le-reflexe-bayen',
      'alternatives-snacks-industriels',
      'courses-methode-3-minutes',
      'bien-manger-ramadan',
      'diabete-alimentation-maroc-produits-a-eviter',
      'huile-palme-maroc-produits-impact-sante',
      'meilleurs-yaourts-maroc-comparatif',
      'gouter-enfants-sain-maroc-idees',
      'lire-etiquette-arabe-maroc-vocabulaire',
      'the-marocain-sucre-reduire-sans-perdre-tradition',
      'nutrition-sport-maroc-produits-locaux',
    ]
    articles = KNOWN_SLUGS.map((slug) => ({ slug, date_published: null }))
  }

  // Récupérer les produits publiés
  let products: Array<{ barcode: string; date_updated: string | null }> = []
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/products?filter[status][_eq]=published&fields=barcode,date_updated&limit=-1`,
      { signal: AbortSignal.timeout(10000) }
    )
    if (res.ok) {
      const data = await res.json()
      products = data.data ?? []
    }
  } catch { /* sitemap sans produits si API down */ }

  // Récupérer les catégories
  let categories: Array<{ slug: string }> = []
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/categories?fields=slug&limit=-1`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const data = await res.json()
      categories = data.data ?? []
    }
  } catch { /* continue */ }

  // Récupérer les additifs
  let additives: Array<{ id: string }> = []
  try {
    const res = await fetch(
      `${DIRECTUS_URL}/items/additives?fields=id&limit=-1`,
      { signal: AbortSignal.timeout(5000) }
    )
    if (res.ok) {
      const data = await res.json()
      additives = data.data ?? []
    }
  } catch { /* continue */ }

  // Construire le XML
  const urls = [
    // Pages statiques (avec lastmod hardcodé)
    ...staticPages.map(
      (p) => `  <url>
    <loc>${SITE_URL}${p.url}</loc>
    <lastmod>${p.lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    ),
    // Produits
    ...products.map(
      (p) => `  <url>
    <loc>${SITE_URL}/produit/${p.barcode}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${p.date_updated ? `\n    <lastmod>${new Date(p.date_updated).toISOString().split('T')[0]}</lastmod>` : ''}
  </url>`
    ),
    // Catégories
    ...categories.map(
      (c) => `  <url>
    <loc>${SITE_URL}/categories/${c.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`
    ),
    // Additifs
    ...additives.map(
      (a) => `  <url>
    <loc>${SITE_URL}/additifs/${a.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`
    ),
    // Articles blog
    ...articles.map(
      (a) => `  <url>
    <loc>${SITE_URL}/blog/${a.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>${a.date_published ? `\n    <lastmod>${new Date(a.date_published).toISOString().split('T')[0]}</lastmod>` : ''}
  </url>`
    ),
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
