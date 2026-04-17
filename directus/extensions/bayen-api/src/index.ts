/**
 * Point d'entrée de l'extension Directus — endpoints custom Bayen
 *
 * Routes (montées sous /bayen-api/) :
 *   POST /bayen-api/scan        → Scan code-barres : DB → OFF → auto-import
 *   POST /bayen-api/contribute  → Création anonyme d'un produit (sans login)
 */

import type { Router } from 'express'
import { registerScanEndpoint } from './scan.js'
import { registerContributeEndpoint } from './contribute.js'

export default (router: Router, context: Record<string, unknown>) => {
  registerScanEndpoint(router, context as unknown as Parameters<typeof registerScanEndpoint>[1])
  registerContributeEndpoint(router, context as unknown as Parameters<typeof registerContributeEndpoint>[1])
}
