/**
 * Proxy endpoint pour l'identification d'un produit depuis sa photo de face
 * POST /api/identify-product → ocr.bayen.ma/identify-product (Qwen3.5-9B vision)
 *
 * Reçoit : multipart/form-data avec `image` (JPEG/PNG, max 8 MB)
 * Retourne : { name_fr, brand, quantity, halal_logo, confiance }
 *
 * Sert à préremplir le formulaire de contribution : la personne photographie,
 * vérifie et corrige, plutôt que de tout saisir au clavier sur mobile.
 */
import type { APIContext } from 'astro'

export const prerender = false

const OCR_URL = import.meta.env.OCR_PIPELINE_URL ?? 'https://ocr.bayen.ma'

export async function POST(context: APIContext): Promise<Response> {
  try {
    const formData = await context.request.formData()

    const image = formData.get('image')
    if (!image || !(image instanceof File)) {
      return new Response(JSON.stringify({ error: 'image requise' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (image.size > 8 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Image trop grande (>8 MB)' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const forward = new FormData()
    forward.append('image', image)

    const started = Date.now()
    const res = await fetch(`${OCR_URL}/identify-product`, {
      method: 'POST',
      body: forward,
      signal: AbortSignal.timeout(90_000),
    })

    const data = await res.text()

    // Mesure d'usage anonyme — fire-and-forget
    const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'
    void fetch(`${DIRECTUS_URL}/bayen-api/log-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'identify',
        success: res.ok,
        duration_ms: Date.now() - started,
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => { /* la mesure ne doit jamais casser l'identification */ })

    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur identification' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
