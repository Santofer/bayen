/**
 * Proxy POST /api/compare → tesseract /compare-verdict (Qwen).
 * Reçoit {a, b, gagnant} et renvoie {raison, conseil}. Le gagnant est
 * déterminé côté client par le score (déterministe) ; l'IA ne fait que rédiger.
 */
import type { APIContext } from 'astro'

export const prerender = false

const OCR_URL = import.meta.env.OCR_PIPELINE_URL ?? 'https://ocr.bayen.ma'

export async function POST(context: APIContext): Promise<Response> {
  try {
    const body = await context.request.text()
    const res = await fetch(`${OCR_URL}/compare-verdict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(60_000),
    })
    const data = await res.text()
    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur comparaison' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
