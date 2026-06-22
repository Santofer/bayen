/**
 * Proxy endpoint pour l'analyse vision d'une photo de plat
 * POST /api/meal-score → proxy vers ocr.bayen.ma/meal-analyze (Qwen3.5-9B vision)
 *
 * Reçoit : multipart/form-data avec `image` (JPEG/PNG, max 8 MB)
 * Retourne : estimation calories (fourchette) + macros + ingrédients + confiance
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
      // Qwen3.5-9B vLLM : ~5s. Marge large pour pic de charge serveur partagé.
      signal: AbortSignal.timeout(90_000),
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
