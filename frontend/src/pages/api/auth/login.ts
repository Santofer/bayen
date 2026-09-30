/**
 * Proxy endpoint pour l'auth Directus — évite les problèmes CORS
 * POST /api/auth/login → proxy vers Directus /auth/login
 */
import type { APIContext } from 'astro'
import { isBot } from '@/lib/antibot'

export const prerender = false

export async function POST(context: APIContext): Promise<Response> {
  const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

  try {
    const { _gotcha, startedAt, ...payload } = (await context.request.json()) as Record<string, unknown>
    if (isBot({ _gotcha, startedAt })) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }

    const res = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
