/**
 * Proxy endpoint pour l'inscription — évite les problèmes CORS
 * POST /api/auth/register → proxy vers Directus /users puis /auth/login
 */
import type { APIContext } from 'astro'

export const prerender = false

export async function POST(context: APIContext): Promise<Response> {
  const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api-bayen.n0.ma'

  try {
    const body = await context.request.json() as { email: string; password: string; first_name: string }

    // Créer l'utilisateur
    const createRes = await fetch(`${DIRECTUS_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        first_name: body.first_name,
      }),
    })

    if (!createRes.ok) {
      const errData = await createRes.text()
      return new Response(errData, {
        status: createRes.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Auto-login après inscription
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: body.email, password: body.password }),
    })

    const loginData = await loginRes.text()

    return new Response(loginData, {
      status: loginRes.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ errors: [{ message: 'Erreur de connexion au serveur' }] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
