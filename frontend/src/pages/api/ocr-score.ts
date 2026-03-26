/**
 * Proxy endpoint pour le pipeline OCR complet
 * POST /api/ocr-score → proxy vers ocr.bayen.n0.ma/pipeline (Tesseract + Mistral)
 *
 * Reçoit : multipart/form-data avec image_nutrition (requis), barcode
 * Retourne : JSON avec données nutritionnelles parsées ou erreur
 */
import type { APIContext } from 'astro'

export const prerender = false

const OCR_URL = import.meta.env.OCR_PIPELINE_URL ?? 'https://ocr.bayen.n0.ma'

export async function POST(context: APIContext): Promise<Response> {
  try {
    const formData = await context.request.formData()

    // Construire le FormData pour le pipeline OCR
    const pipelineForm = new FormData()

    const imageNutrition = formData.get('image_nutrition')
    if (!imageNutrition || !(imageNutrition instanceof File)) {
      return new Response(
        JSON.stringify({ error: 'image_nutrition requise', job_status: 'error' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    pipelineForm.append('image_nutrition', imageNutrition)
    pipelineForm.append('barcode', formData.get('barcode')?.toString() ?? '')

    // Appeler le pipeline OCR
    const res = await fetch(`${OCR_URL}/pipeline`, {
      method: 'POST',
      body: pipelineForm,
    })

    const data = await res.text()

    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : 'Erreur pipeline OCR',
        job_status: 'error',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
