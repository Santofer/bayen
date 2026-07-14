/**
 * Génère une image PNG (canvas) de la liste de courses, aux couleurs Bayen,
 * pour partage WhatsApp ou téléchargement. 100% client, aucune dépendance.
 */

import type { CartItem } from './cart'

function scoreColor(s: number | null): string {
  if (s == null) return '#9ca3af'
  if (s >= 75) return '#476a32'
  if (s >= 50) return '#8bb02e'
  if (s >= 25) return '#f97316'
  return '#ef4444'
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

export async function renderCartImage(items: CartItem[]): Promise<Blob | null> {
  const W = 720
  const PAD = 32
  const HEADER = 116
  const ROW = 66
  const FOOTER = 56
  const H = HEADER + items.length * ROW + FOOTER

  const scale = 2
  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.scale(scale, scale)

  // Fond
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)

  // En-tête vert Bayen
  ctx.fillStyle = '#476a32'
  ctx.fillRect(0, 0, W, HEADER)
  ctx.fillStyle = '#b1cf3a'
  ctx.font = 'bold 36px system-ui, sans-serif'
  ctx.fillText('Bayen', PAD, 54)
  ctx.fillStyle = '#f0f2d2'
  ctx.font = '600 22px system-ui, sans-serif'
  ctx.fillText('Ma liste de courses', PAD, 90)

  // Lignes
  items.forEach((it, i) => {
    const y = HEADER + i * ROW
    if (i % 2 === 1) {
      ctx.fillStyle = '#f6f7ee'
      ctx.fillRect(0, y, W, ROW)
    }
    const cy = y + ROW / 2
    // Pastille score
    const cx = PAD + 20
    ctx.beginPath()
    ctx.arc(cx, cy, 19, 0, Math.PI * 2)
    ctx.fillStyle = scoreColor(it.scan_score)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 16px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(it.scan_score != null ? String(it.scan_score) : '?', cx, cy + 6)
    ctx.textAlign = 'left'
    // Nom + marque
    ctx.fillStyle = '#1a1a1a'
    ctx.font = '600 20px system-ui, sans-serif'
    ctx.fillText(truncate(ctx, it.name_fr, W - PAD * 2 - 60), PAD + 52, cy - 2)
    ctx.fillStyle = '#8a8a8a'
    ctx.font = '15px system-ui, sans-serif'
    ctx.fillText(truncate(ctx, it.brand ?? '', W - PAD * 2 - 60), PAD + 52, cy + 19)
  })

  // Pied
  ctx.fillStyle = '#9a9a9a'
  ctx.font = '15px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('bayen.ma — Mange mieux au Maroc', W / 2, H - 22)
  ctx.textAlign = 'left'

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}

/** Texte de secours (desktop / partage sans fichier). */
export function cartShareText(items: CartItem[]): string {
  const lines = items.map((i) => `• ${i.name_fr}${i.scan_score != null ? ` (${i.scan_score}/100)` : ''}`)
  return `Ma liste de courses Bayen :\n${lines.join('\n')}\n\nbayen.ma`
}
