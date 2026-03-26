/**
 * Proxy endpoint pour le refresh token — évite les problèmes CORS
 * POST /api/auth/refresh → proxy vers Directus /auth/refresh
 */
import type { APIContext } from 'astro'

export const prerender = false

export async function POST(context: APIContext): Promise<Response> {
  const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api-bayen.n0.ma'

  try {
    const body = await context.request.text()

    const res = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    const data = await res.text()

    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ errors: [{ message: 'Erreur de connexion au serveur' }] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
