/**
 * Fichier de vérification Google Search Console.
 *
 * Servi par une route (et non un asset de public/) : Cloudflare Pages
 * redirige les .html statiques vers leur version sans extension (308),
 * ce que la vérification Google n'accepte pas — il lui faut un 200 à
 * l'URL exacte. Ne pas supprimer : la propriété resterait vérifiée un
 * temps, puis serait révoquée au prochain contrôle.
 */
export const prerender = false

export function GET(): Response {
  return new Response('google-site-verification: google641825d47a3dd8dd.html', {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
