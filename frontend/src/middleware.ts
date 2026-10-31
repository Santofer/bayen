/**
 * En-têtes de sécurité sur les pages HTML rendues par le Worker.
 * `public/_headers` ne s'applique qu'aux fichiers statiques : sans ce middleware,
 * le HTML SSR (fiches, rayons, accueil…) partait sans HSTS ni nosniff.
 *
 * Seules les réponses text/html sont touchées : routes /api/*, sitemap, sw.js et
 * fichiers statiques passent tels quels. Aucun Cache-Control n'est ajouté ici
 * (le cache du HTML en périphérie est une décision à part).
 */
import { defineMiddleware } from 'astro:middleware'

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
}

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next()
  if (!response.headers.get('content-type')?.includes('text/html')) return response
  // Copie : les en-têtes d'une réponse peuvent être immuables (réponse issue d'un fetch)
  const html = new Response(response.body, response)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) html.headers.set(name, value)
  // Sans charset dans l'en-tête, certains robots (dont des crawlers d'IA) lisent l'UTF-8 en latin-1 et abîment l'arabe
  if (!/charset=/i.test(html.headers.get('content-type') ?? '')) html.headers.set('content-type', 'text/html; charset=utf-8')
  return html
})
