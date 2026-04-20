/**
 * Proxy pour l'API de recherche Open Food Facts (contourne CORS)
 * GET /api/off-search?page=N[&country=morocco]
 *
 * Utilisé par BulkOffImporter (interface admin) qui ne peut pas taper
 * world.openfoodfacts.org directement depuis le navigateur à cause
 * des restrictions CORS du navigateur.
 */
import type { APIContext } from 'astro'

export const prerender = false

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const OFF_USER_AGENT = 'Bayen/1.0 (contact@n0.ma)'

const OFF_FIELDS = [
  'code',
  'product_name_fr',
  'product_name',
  'brands',
  'nutriscore_grade',
  'nova_group',
  'nutriments',
  'ingredients_text_fr',
  'ingredients_text',
  'additives_tags',
  'image_front_url',
  'image_nutrition_url',
  'image_ingredients_url',
  'categories_tags',
  'traces_tags',
  'ingredients',
].join(',')

export async function GET(context: APIContext): Promise<Response> {
  const page = context.url.searchParams.get('page') ?? '1'
  const country = context.url.searchParams.get('country') ?? 'morocco'
  const pageSize = context.url.searchParams.get('page_size') ?? '100'

  // Validation stricte des paramètres (évite l'injection URL)
  if (!/^\d{1,4}$/.test(page)) {
    return new Response(JSON.stringify({ error: 'page invalide' }), { status: 400 })
  }
  if (!/^[a-z-]{2,30}$/.test(country)) {
    return new Response(JSON.stringify({ error: 'country invalide' }), { status: 400 })
  }
  if (!/^\d{1,3}$/.test(pageSize)) {
    return new Response(JSON.stringify({ error: 'page_size invalide' }), { status: 400 })
  }

  const url =
    `${OFF_SEARCH_URL}?tagtype_0=countries&tag_contains_0=contains&tag_0=${country}` +
    `&action=process&json=true&page_size=${pageSize}&page=${page}&fields=${OFF_FIELDS}`

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': OFF_USER_AGENT },
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `OFF HTTP ${res.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // IMPORTANT : retourner le body en streaming (ReadableStream) plutôt que
    // d'await .text() puis reconstruire. Cloudflare Pages Workers crash sur
    // les réponses volumineuses (page_size=100 sur OFF = ~200 KB+ avec tous
    // les fields) si on buffer en mémoire avant de retourner.
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Cache 5 min côté Cloudflare pour amortir les retries
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'fetch OFF a échoué',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
