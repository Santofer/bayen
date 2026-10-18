/**
 * Endpoint GET /bayen-api/og/:barcode(.jpg) — image d'aperçu de lien (Open Graph)
 *
 * Quand on partage bayen.ma/produit/<barcode> (WhatsApp, Facebook, LinkedIn),
 * l'aperçu montre une carte « Marché Pop » : photo, nom, pastille de score.
 * Même source de score que la fiche : scan_score / score_label pour
 * l'alimentaire, cosmetic_risk (déterministe) pour la beauté — rien n'est
 * recalculé ici. Le dessin est fait par bayen-tesseract (/og-card, Pillow).
 *
 * Produit inconnu ou toute erreur → redirection vers l'image par défaut du site.
 */

import type { Router } from 'express'

const OCR_URL = (process.env.OCR_INTERNAL_URL ?? 'http://bayen-tesseract:5000').replace(/\/$/, '')
// URL lue par bayen-tesseract (même réseau Docker), pas par Directus : nom du container
const ASSETS_URL = 'http://bayen-directus:8055/assets'
const FALLBACK = 'https://bayen.ma/og/default.jpg'

/** Apostrophes perdues à l'import (« Flocons d avoine ») : rétablies à l'affichage, comme sur la fiche */
const fixApostrophes = (s: string | null): string | null =>
  s === null ? null : s.replace(/(^|\s)([dl]) (?=[aeiouyhàâäéèêëîïôöûüœAEIOUYHÀÂÉÈÊÎÔÛ])/g, "$1$2'")
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface KnexLike {
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
}

interface CosmeticRisk {
  total?: number | null
  label?: string | null
  insufficient?: boolean
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const int = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Math.round(Number(v)))
/** « médiocre » → « mediocre » : clés de couleur de la carte */
const plain = (v: unknown): string | null => str(v)?.normalize('NFD').replace(/\p{M}/gu, '') ?? null

export function registerOgEndpoint(router: Router, context: { database: unknown }) {
  router.get('/og/:barcode', async (req, res) => {
    const fallback = () => {
      res.setHeader('Cache-Control', 'public, max-age=300')
      res.redirect(302, FALLBACK)
    }
    const barcode = String(req.params.barcode ?? '').replace(/\.jpg$/i, '')
    if (!/^\d{6,14}$/.test(barcode)) return fallback()

    try {
      const knex = context.database as KnexLike
      const { rows } = await knex.raw(
        `SELECT name_fr, brand, quantity, product_type, scan_score, score_label, image_front,
                nutriscore_grade, nova_group, cosmetic_risk
         FROM products WHERE barcode = ? AND status = 'published' LIMIT 1`,
        [barcode],
      )
      const p = rows[0]
      if (!p) return fallback()

      const cosmetic = p.product_type === 'cosmetic'
      const risk = (cosmetic ? p.cosmetic_risk : null) as CosmeticRisk | null
      const brand = str(p.brand)
      const image = str(p.image_front)
      const payload = {
        name: fixApostrophes(str(p.name_fr)),
        brand: brand && !/^marque inconnue$/i.test(brand) ? brand : null,
        quantity: str(p.quantity),
        barcode,
        kind: cosmetic ? 'cosmetic' : 'food',
        score: cosmetic ? int(risk?.total) : int(p.scan_score),
        label: plain(cosmetic ? risk?.label : p.score_label),
        insufficient: risk?.insufficient === true,
        nutriscore: cosmetic ? null : str(p.nutriscore_grade),
        nova: cosmetic ? null : int(p.nova_group),
        image_url: image && UUID_RE.test(image) ? `${ASSETS_URL}/${image}?width=700&quality=85&fit=cover` : null,
      }

      const r = await fetch(`${OCR_URL}/og-card`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      })
      if (!r.ok) throw new Error(`og-card ${r.status}`)
      const jpeg = Buffer.from(await r.arrayBuffer())

      res.setHeader('Content-Type', 'image/jpeg')
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800')
      res.end(jpeg)
    } catch {
      fallback()
    }
  })
}
