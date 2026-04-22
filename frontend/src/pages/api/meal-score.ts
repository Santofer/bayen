/**
 * Proxy endpoint pour l'analyse VLM d'une photo de plat
 * POST /api/meal-score → proxy vers ocr.bayen.ma/meal-analyze (Gemma3 vision)
 *
 * Reçoit : multipart/form-data avec `image` (JPEG/PNG, max 8 MB)
 * Retourne : JSON avec description + ingrédients + nutrition + calories
 */
import type { APIContext } from 'astro'

export const prerender = false

const OCR_URL = import.meta.env.OCR_PIPELINE_URL ?? 'https://ocr.bayen.ma'

export async function POST(context: APIContext): Promise<Response> {
  try {
    const formData = await context.request.formData()

    const image = formData.get('image')
    if (!image || !(image instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'image requise', job_status: 'error' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Limite anti-abus côté proxy (le backend plafonne aussi à 8 MB)
    if (image.size > 8 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Image trop grande (>8 MB)', job_status: 'error' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const forward = new FormData()
    forward.append('image', image)

    const res = await fetch(`${OCR_URL}/meal-analyze`, {
      method: 'POST',
      body: forward,
      // Le VLM prend ~25s warm, max ~60s cold → 90s de marge côté proxy.
      signal: AbortSignal.timeout(100_000),
    })

    const data = await res.text()
    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Erreur analyse repas',
        job_status: 'error',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
