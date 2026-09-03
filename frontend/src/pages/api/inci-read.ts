/**
 * Proxy endpoint pour la lecture de la liste INCI d'un cosmétique
 * POST /api/inci-read → ocr.bayen.ma/inci-read (Qwen3.5-9B vision)
 *
 * Reçoit : multipart/form-data avec `image` (dos de l'emballage, JPEG/PNG, max 8 MB)
 * Retourne : { inci_text, period_after_opening, confiance, engine }
 *
 * Le modèle recopie la liste, il ne note rien : le score cosmétique est
 * calculé ensuite par l'algorithme déterministe côté API (scoring-cosmetic.ts).
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
    const res = await fetch(`${OCR_URL}/inci-read`, {
      method: 'POST',
      body: forward,
      signal: AbortSignal.timeout(120_000),
    })

    const data = await res.text()

    // Mesure d'usage anonyme — fire-and-forget
    const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'
    void fetch(`${DIRECTUS_URL}/bayen-api/log-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'inci_read',
        success: res.ok,
        duration_ms: Date.now() - started,
      }),
      signal: AbortSignal.timeout(3000),
    }).catch(() => { /* la mesure ne doit jamais casser la lecture */ })

    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur lecture INCI' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
