/**
 * Génère une image PNG (canvas) de la liste de courses, aux couleurs Marché Pop
 * (fond crème, bandeau menthe, pastilles de score inclinées à contour encre),
 * pour partage WhatsApp ou téléchargement. 100% client, aucune dépendance.
 */

import type { CartItem } from './cart'
import { scoreFill, SCORE_ON } from '@/lib/score-colors'

// Palette Marché Pop (fixe : l'image partagée ne suit pas le thème de l'écran)
const CREME = '#FFF8EC'
const SOFT = '#F3EADB'
const MENTHE = '#19C08B'
const MUTED = '#5E5A52'
const DISPLAY = '"Unbounded", "Readex Pro", system-ui, sans-serif'
const TEXT = '"Readex Pro", system-ui, sans-serif'

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

  // Polices de la marque si elles sont déjà chargées par la page
  await document.fonts?.ready

  // Fond crème
  ctx.fillStyle = CREME
  ctx.fillRect(0, 0, W, H)

  // En-tête : bandeau menthe, texte encre, filet encre dessous
  ctx.fillStyle = MENTHE
  ctx.fillRect(0, 0, W, HEADER)
  ctx.fillStyle = SCORE_ON
  ctx.fillRect(0, HEADER - 3, W, 3)
  ctx.font = `800 36px ${DISPLAY}`
  ctx.fillText('Bayen', PAD, 56)
  ctx.font = `600 22px ${TEXT}`
  ctx.fillText('Ma liste de courses', PAD, 92)

  // Lignes
  items.forEach((it, i) => {
    const y = HEADER + i * ROW
    if (i % 2 === 1) {
      ctx.fillStyle = SOFT
      ctx.fillRect(0, y, W, ROW)
    }
    const cy = y + ROW / 2
    // Pastille score : ombre nette décalée, aplat du score, contour encre, inclinée de -8°
    const cx = PAD + 20
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((-8 * Math.PI) / 180)
    ctx.beginPath()
    ctx.arc(2, 2, 20, 0, Math.PI * 2)
    ctx.fillStyle = SCORE_ON
    ctx.fill()
    ctx.beginPath()
    ctx.arc(0, 0, 20, 0, Math.PI * 2)
    ctx.fillStyle = scoreFill(it.scan_score)
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = SCORE_ON
    ctx.stroke()
    ctx.fillStyle = SCORE_ON
    ctx.font = `800 14px ${DISPLAY}`
    ctx.textAlign = 'center'
    ctx.fillText(it.scan_score != null ? String(it.scan_score) : '?', 0, 5)
    ctx.restore()
    // Nom + marque
    ctx.textAlign = 'left'
    ctx.fillStyle = SCORE_ON
    ctx.font = `600 20px ${TEXT}`
    ctx.fillText(truncate(ctx, it.name_fr, W - PAD * 2 - 60), PAD + 56, cy - 2)
    ctx.fillStyle = MUTED
    ctx.font = `15px ${TEXT}`
    ctx.fillText(truncate(ctx, it.brand ?? '', W - PAD * 2 - 60), PAD + 56, cy + 19)
  })

  // Pied
  ctx.fillStyle = MUTED
  ctx.font = `15px ${TEXT}`
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
