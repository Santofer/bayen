/**
 * Carte d'aperçu d'une fiche produit, servie depuis bayen.ma : GET /apercu/<code-barres>.jpg
 * Le robots.txt d'api.bayen.ma (Directus) interdit tout (« Disallow: / ») et les robots de Facebook et LinkedIn
 * le respectent aussi pour les images : la carte dessinée par /bayen-api/og/ est donc relayée ici.
 */
import type { APIContext } from 'astro'

export const prerender = false

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'
const REPLI = 'https://bayen.ma/og/default.jpg'

export async function GET(context: APIContext): Promise<Response> {
  const code = (context.params.file ?? '').replace(/\.jpg$/i, '')
  if (!/^\d{6,14}$/.test(code)) return Response.redirect(REPLI, 302)
  try {
    const res = await fetch(`${DIRECTUS_URL}/bayen-api/og/${code}.jpg`, { signal: AbortSignal.timeout(15000) })
    if (!res.ok || !(res.headers.get('Content-Type') ?? '').startsWith('image/')) return Response.redirect(REPLI, 302)
    return new Response(await res.arrayBuffer(), {
      headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
    })
  } catch {
    return Response.redirect(REPLI, 302)
  }
}
