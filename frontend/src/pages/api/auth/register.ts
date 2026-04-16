/**
 * Proxy endpoint pour l'inscription — évite les problèmes CORS
 * POST /api/auth/register → proxy vers Directus /users/register puis /auth/login
 *
 * L'endpoint /users/register utilise la configuration publique de Directus
 * (directus_settings.public_registration + public_registration_role) pour
 * auto-assigner le rôle "Utilisateur" aux nouveaux inscrits.
 */
import type { APIContext } from 'astro'

export const prerender = false

export async function POST(context: APIContext): Promise<Response> {
  const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

  try {
    const body = await context.request.json() as { email: string; password: string; first_name: string }

    // Inscription publique — le rôle est assigné côté serveur
    const createRes = await fetch(`${DIRECTUS_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        first_name: body.first_name,
      }),
    })

    // /users/register retourne 204 No Content en cas de succès
    if (!createRes.ok) {
      const errData = await createRes.text()
      return new Response(errData || JSON.stringify({ errors: [{ message: 'Inscription échouée' }] }), {
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
