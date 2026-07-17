/**
 * GET /bayen-api/search-products — recherche produits avec filtres avancés.
 *
 * Raison d'être : le champ JSON `products.additives` ne supporte pas les
 * opérateurs _contains/_ncontains de l'API items Directus. Cet endpoint
 * fait la requête en SQL (Postgres) : le motif LIKE '%"E322"%' est exact
 * grâce aux guillemets JSON (pas de collision E102/E1020).
 *
 * Params :
 *   q                 texte (nom, marque, code-barres exact)
 *   category_id       id numérique
 *   score_min         0-100
 *   nutriscore        CSV de grades (A,B)
 *   no_additives      'true' → produits sans additif
 *   halal, bio        'true'
 *   exclude_additives CSV de codes E à EXCLURE (E621,E102…) — max 30
 *   has_additive      code E que le produit doit CONTENIR (page additif)
 *   sort              -scan_count | -scan_score | -date_created
 *   limit ≤ 50, offset
 *
 * Public : ne renvoie que les produits published.
 */

import type { Router, Request } from 'express'

interface EndpointContext {
  database: unknown
}

interface KnexLike {
  raw: (sql: string, bindings?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
}

const SORTS: Record<string, string> = {
  '-scan_count': 'scan_count DESC NULLS LAST',
  '-scan_score': 'scan_score DESC NULLS LAST',
  '-date_created': 'date_created DESC NULLS LAST',
}

const CODE_RE = /^E\d{3,4}[A-Z]?$/

export function registerSearchEndpoint(router: Router, context: EndpointContext) {
  router.get('/search-products', async (req: Request, res) => {
    const knex = context.database as KnexLike
    try {
      const q = String(req.query.q ?? '').trim().slice(0, 80)
      const categoryId = parseInt(String(req.query.category_id ?? ''), 10)
      const scoreMin = parseInt(String(req.query.score_min ?? ''), 10)
      const nutriscore = String(req.query.nutriscore ?? '')
        .split(',').map((s) => s.trim().toUpperCase()).filter((s) => /^[A-E]$/.test(s))
      const noAdditives = req.query.no_additives === 'true'
      const halal = req.query.halal === 'true'
      const bio = req.query.bio === 'true'
      const exclude = String(req.query.exclude_additives ?? '')
        .split(',').map((s) => s.trim().toUpperCase()).filter((s) => CODE_RE.test(s)).slice(0, 30)
      const hasAdditive = String(req.query.has_additive ?? '').trim().toUpperCase()
      const sort = SORTS[String(req.query.sort ?? '-scan_count')] ?? SORTS['-scan_count']
      const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '20'), 10) || 20, 1), 50)
      const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0)

      const where: string[] = [`status = 'published'`]
      const bind: unknown[] = []

      if (q) {
        where.push('(name_fr ILIKE ? OR brand ILIKE ? OR barcode = ?)')
        bind.push(`%${q}%`, `%${q}%`, q)
      }
      if (!Number.isNaN(categoryId)) {
        where.push('category_id = ?')
        bind.push(categoryId)
      }
      if (!Number.isNaN(scoreMin) && scoreMin > 0) {
        where.push('scan_score >= ?')
        bind.push(scoreMin)
      }
      if (nutriscore.length > 0) {
        where.push(`nutriscore_grade IN (${nutriscore.map(() => '?').join(',')})`)
        bind.push(...nutriscore)
      }
      if (noAdditives) {
        where.push(`(additives IS NULL OR additives::text IN ('[]', 'null'))`)
      }
      if (halal) where.push('is_halal = true')
      if (bio) where.push('is_organic = true')

      // Exclusion : le produit ne doit contenir AUCUN des codes listés
      for (const code of exclude) {
        where.push(`COALESCE(additives::text, '') NOT LIKE ?`)
        bind.push(`%"${code}"%`)
      }
      // Inclusion : le produit doit contenir ce code (page détail additif)
      if (CODE_RE.test(hasAdditive)) {
        where.push(`COALESCE(additives::text, '') LIKE ?`)
        bind.push(`%"${hasAdditive}"%`)
      }

      const whereSql = where.join(' AND ')
      const fields =
        'id, barcode, name_fr, brand, image_front, scan_score, score_label, ' +
        'nutriscore_grade, nova_group, additives, scan_count'

      const [rowsRes, countRes] = await Promise.all([
        knex.raw(
          `SELECT ${fields} FROM products WHERE ${whereSql} ORDER BY ${sort} LIMIT ${limit} OFFSET ${offset}`,
          bind,
        ),
        knex.raw(`SELECT COUNT(*)::int AS n FROM products WHERE ${whereSql}`, bind),
      ])

      res.json({ data: rowsRes.rows, count: countRes.rows[0]?.n ?? 0 })
    } catch {
      res.status(500).json({ error: 'search failed' })
    }
  })
}
