/**
 * Proxy endpoint pour l'auth Directus — évite les problèmes CORS
 * POST /api/auth/login → proxy vers Directus /auth/login
 */
import type { APIContext } from 'astro'

export const prerender = false

export async function POST(context: APIContext): Promise<Response> {
  const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api-bayen.n0.ma'

  try {
    const body = await context.request.text()

    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    const data = await res.text()

    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return new Response(JSON.stringify({ errors: [{ message: 'Erreur de connexion au serveur' }] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
