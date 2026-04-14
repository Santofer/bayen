/**
 * Proxy générique vers l'API Directus — résout les problèmes CORS
 *
 * Toutes les requêtes vers /api/directus/* sont proxifiées vers DIRECTUS_URL/*
 * Les headers Authorization sont transmis tels quels.
 */
import type { APIContext } from 'astro'

export const prerender = false

async function handleRequest(context: APIContext): Promise<Response> {
  const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'
  const path = context.params.path ?? ''
  const url = new URL(context.request.url)
  const targetUrl = `${DIRECTUS_URL}/${path}${url.search}`

  try {
    // Construire les headers à transmettre
    const headers: Record<string, string> = {
      'Content-Type': context.request.headers.get('Content-Type') ?? 'application/json',
    }

    // Transmettre le token d'auth s'il est présent
    const authHeader = context.request.headers.get('Authorization')
    if (authHeader) {
      headers['Authorization'] = authHeader
    }

    const fetchOptions: RequestInit = {
      method: context.request.method,
      headers,
    }

    // Transmettre le body pour POST/PATCH/PUT/DELETE
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(context.request.method)) {
      const contentType = context.request.headers.get('Content-Type') ?? ''
      if (contentType.includes('multipart/form-data')) {
        // Pour les uploads de fichiers, transmettre le Content-Type avec boundary intact
        headers['Content-Type'] = contentType
        fetchOptions.body = await context.request.arrayBuffer()
      } else {
        fetchOptions.body = await context.request.text()
      }
    }

    const res = await fetch(targetUrl, fetchOptions)
    const data = await res.arrayBuffer()

    return new Response(data, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
      },
    })
  } catch {
    return new Response(JSON.stringify({ errors: [{ message: 'Erreur de connexion au serveur Directus' }] }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const GET = handleRequest
export const POST = handleRequest
export const PATCH = handleRequest
export const PUT = handleRequest
export const DELETE = handleRequest
