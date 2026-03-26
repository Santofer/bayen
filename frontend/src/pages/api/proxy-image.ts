/**
 * Proxy pour télécharger des images externes (contourne CORS)
 * GET /api/proxy-image?url=https://images.openfoodfacts.org/...
 */
import type { APIContext } from 'astro'

export const prerender = false

export async function GET(context: APIContext): Promise<Response> {
  const url = context.url.searchParams.get('url')
  if (!url || !url.startsWith('https://images.openfoodfacts.org/')) {
    return new Response('URL invalide', { status: 400 })
  }

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return new Response('Image non trouvée', { status: 404 })

    const blob = await res.arrayBuffer()
    return new Response(blob, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new Response('Erreur téléchargement', { status: 502 })
  }
}
