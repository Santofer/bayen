/**
 * Endpoint GET /bayen-api/to-complete?tab=nonote|estimated|inci|photo&limit=20
 *
 * Produits publiés auxquels il manque de quoi être notés (page /a-completer et
 * accroche de l'accueil), triés par nombre de recherches : on complète d'abord
 * ce que les gens cherchent. La communauté envoie des photos, l'algorithme note.
 */

import type { Router } from 'express'

interface KnexLike {
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
}

// Une file = un filtre SQL sur les produits publiés
const TABS = {
  nonote: `product_type = 'food' AND scan_score IS NULL`,
  estimated: `data_source = 'ai_estimate'`,
  inci: `product_type = 'cosmetic' AND COALESCE(inci_text, '') = ''`,
  photo: `image_front IS NULL`,
} as const
type Tab = keyof typeof TABS

const PLACEHOLDER = /^(produit sans nom|marque inconnue)$/i

export function registerToCompleteEndpoint(router: Router, context: { database: unknown }) {
  router.get('/to-complete', async (req, res) => {
    try {
      const knex = context.database as KnexLike
      const tab: Tab = (String(req.query.tab ?? '') in TABS ? req.query.tab : 'nonote') as Tab
      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 60)

      const [counts, items] = await Promise.all([
        knex.raw(
          `SELECT ${Object.entries(TABS).map(([k, w]) => `count(*) FILTER (WHERE ${w}) AS ${k}`).join(', ')}
           FROM products WHERE status = 'published'`,
        ),
        knex.raw(
          `SELECT barcode, name_fr, brand, image_front, image_nutrition, scan_count, product_type,
                  data_source, energy_kcal, COALESCE(ingredients_text, '') = '' AS no_ingredients,
                  COALESCE(inci_text, '') = '' AS no_inci
           FROM products
           WHERE status = 'published' AND ${TABS[tab]}
           ORDER BY scan_count DESC NULLS LAST, date_created DESC
           LIMIT ?`,
          [limit],
        ),
      ])

      res.setHeader('Cache-Control', 'public, max-age=300')
      res.json({
        tab,
        counts: Object.fromEntries(Object.keys(TABS).map((k) => [k, Number(counts.rows[0]?.[k] ?? 0)])),
        items: items.rows.map((p) => {
          const food = p.product_type !== 'cosmetic'
          // Ce qu'une photo apporterait : clés de traduction côté frontend
          const missing: string[] = []
          if (food && (p.energy_kcal == null || (p.data_source === 'ai_estimate' && !p.image_nutrition))) missing.push('nutrition')
          if (food && p.no_ingredients) missing.push('ingredients')
          if (!food && p.no_inci) missing.push('inci')
          if (!p.image_front) missing.push('photo')
          // Libellés de remplissage posés à la création : affichés comme « sans nom » côté frontend
          const name = p.name_fr && !PLACEHOLDER.test(String(p.name_fr)) ? String(p.name_fr) : null
          const brand = p.brand && !PLACEHOLDER.test(String(p.brand)) ? String(p.brand) : null
          if (!name) missing.unshift('name')
          return {
            barcode: String(p.barcode),
            name,
            brand,
            image: p.image_front ? String(p.image_front) : null,
            scans: Number(p.scan_count ?? 0),
            type: food ? 'food' : 'cosmetic',
            estimated: p.data_source === 'ai_estimate',
            missing,
          }
        }),
      })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
