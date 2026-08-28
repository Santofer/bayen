/**
 * Endpoint POST /bayen-api/upload-photo
 *
 * Upload d'UNE photo de produit, sans compte. Renvoie l'identifiant du fichier
 * Directus, que le client rattache ensuite à sa contribution.
 *
 * L'image arrive en base64 dans du JSON plutôt qu'en multipart : les endpoints
 * custom Directus reçoivent un corps déjà parsé en JSON, et le client
 * redimensionne de toute façon la photo avant l'envoi (≤ 1280 px), ce qui la
 * ramène à quelques centaines de kilooctets — plus rapide sur un réseau mobile
 * marocain et bien en deçà de la limite de 5 Mo de Directus.
 *
 * Rate-limité à 12 photos / heure / IP : de quoi documenter plusieurs produits
 * dans un rayon de supermarché, pas de quoi inonder le stockage.
 */

import type { Router, Request } from 'express'

interface UploadRequest {
  image?: string
  kind?: string
  barcode?: string
}

const WINDOW_MS = 60 * 60 * 1000
const MAX = 12
const ipHits = new Map<string, number[]>()

function allowed(ip: string): boolean {
  const now = Date.now()
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (hits.length >= MAX) return false
  hits.push(now)
  ipHits.set(ip, hits)
  return true
}

function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0]?.trim() ?? 'unknown'
  if (Array.isArray(fwd)) return fwd[0] ?? 'unknown'
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown'
}

const KINDS = new Set(['front', 'ingredients', 'nutrition'])
const MAX_BYTES = 4 * 1024 * 1024

export function registerUploadPhotoEndpoint(
  router: Router,
  context: { services: Record<string, unknown>; getSchema: () => Promise<unknown>; database: unknown },
) {
  router.post('/upload-photo', async (req, res) => {
    try {
      if (!allowed(clientIp(req))) {
        res.status(429).json({ error: 'rate_limited' })
        return
      }

      const { image, kind, barcode } = (req.body ?? {}) as UploadRequest
      if (typeof image !== 'string' || image.length < 100) {
        res.status(400).json({ error: 'invalid_image' })
        return
      }
      if (typeof kind !== 'string' || !KINDS.has(kind)) {
        res.status(400).json({ error: 'invalid_kind' })
        return
      }

      // Accepte une data-URL ou du base64 nu.
      const base64 = image.includes(',') ? image.slice(image.indexOf(',') + 1) : image
      const buffer = Buffer.from(base64, 'base64')

      if (buffer.length === 0 || buffer.length > MAX_BYTES) {
        res.status(413).json({ error: 'image_too_large' })
        return
      }
      // Signature JPEG (FF D8 FF) ou PNG (89 50 4E 47) : on ne stocke pas
      // n'importe quel binaire déguisé en photo.
      const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
      const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
      if (!isJpeg && !isPng) {
        res.status(400).json({ error: 'unsupported_format' })
        return
      }

      const schema = await context.getSchema()
      const { FilesService } = context.services as {
        FilesService: new (opts: { database: unknown; schema: unknown; accountability?: { admin: boolean } }) => {
          uploadOne(
            stream: NodeJS.ReadableStream,
            data: Record<string, unknown>,
          ): Promise<string>
        }
      }
      const filesService = new FilesService({
        database: context.database,
        schema,
        accountability: { admin: true },
      })

      const { Readable } = await import('node:stream')
      const safeBarcode = typeof barcode === 'string' && /^\d{8,14}$/.test(barcode) ? barcode : 'sans-code'
      const ext = isPng ? 'png' : 'jpg'

      const fileId = await filesService.uploadOne(Readable.from(buffer), {
        title: `${safeBarcode} — ${kind}`,
        filename_download: `${safeBarcode}-${kind}.${ext}`,
        type: isPng ? 'image/png' : 'image/jpeg',
        storage: process.env.STORAGE_LOCATIONS?.split(',')[0]?.trim() || 'local',
      })

      res.json({ ok: true, file_id: fileId })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
