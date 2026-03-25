/**
 * Sitemap dynamique — liste tous les produits publiés et catégories
 */

export const prerender = false

import type { APIRoute } from 'astro'

const SITE_URL = 'https://bayen.n0.ma'
const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api-bayen.n0.ma'

export const GET: APIRoute = async () => {
  // Pages statiques
  const staticPages = [
    { url: '/', priority: '1.0', changefreq: 'daily' },
    { url: '/scan', priority: '0.9', changefreq: 'monthly' },
    { url: '/recherche', priority: '0.8', changefreq: 'weekly' },
    { url: '/additifs', priority: '0.7', changefreq: 'monthly' },
    { url: '/contribuer', priority: '0.6', changefreq: 'monthly' },
  ]

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
    // Pages statiques
    ...staticPages.map(
      (p) => `  <url>
    <loc>${SITE_URL}${p.url}</loc>
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
