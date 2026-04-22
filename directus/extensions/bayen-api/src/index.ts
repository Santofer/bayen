/**
 * Point d'entrée de l'extension Directus — endpoints custom Bayen
 *
 * Routes (montées sous /bayen-api/) :
 *   POST /bayen-api/scan        → Scan code-barres : DB → OFF → auto-import
 *   POST /bayen-api/contribute  → Création anonyme d'un produit (sans login)
 *   POST /bayen-api/log-error   → Ingestion des erreurs frontend
 *   GET  /bayen-api/off-search  → Proxy recherche Open Food Facts (bulk import admin)
 *   POST /bayen-api/meal-scan   → Sauvegarde analyse photo repas (journal perso)
 */

import type { Router } from 'express'
import { registerScanEndpoint } from './scan.js'
import { registerContributeEndpoint } from './contribute.js'
import { registerLogErrorEndpoint } from './log-error.js'
import { registerOffSearchEndpoint } from './off-search.js'
import { registerMealScanEndpoint } from './meal-scan.js'

export default (router: Router, context: Record<string, unknown>) => {
  registerScanEndpoint(router, context as unknown as Parameters<typeof registerScanEndpoint>[1])
  registerContributeEndpoint(router, context as unknown as Parameters<typeof registerContributeEndpoint>[1])
  registerLogErrorEndpoint(router, context as unknown as Parameters<typeof registerLogErrorEndpoint>[1])
  registerOffSearchEndpoint(router)
  registerMealScanEndpoint(router, context as unknown as Parameters<typeof registerMealScanEndpoint>[1])
}
