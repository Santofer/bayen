/**
 * Point d'entrée de l'extension Directus — endpoints custom Bayen
 *
 * Routes (montées sous /bayen-api/) :
 *   POST /bayen-api/scan        → Scan code-barres : DB → OFF → auto-import
 *   POST /bayen-api/contribute  → Création anonyme d'un produit (sans login)
 *   POST /bayen-api/log-error   → Ingestion des erreurs frontend
 *   GET  /bayen-api/off-search  → Proxy recherche Open Food Facts (bulk import admin)
 *   POST /bayen-api/meal-scan          → Sauvegarde analyse photo repas (journal perso)
 *   GET  /bayen-api/my-stats           → Stats perso : streaks + position classement
 *   GET  /bayen-api/nutrition-summary  → Résumé nutritionnel jour + 7 jours (journal)
 *   POST /bayen-api/estimate-and-score → Estimation IA (Qwen) d'un produit sans données
 */

import type { Router } from 'express'
import { registerScanEndpoint } from './scan.js'
import { registerContributeEndpoint } from './contribute.js'
import { registerLogErrorEndpoint } from './log-error.js'
import { registerOffSearchEndpoint } from './off-search.js'
import { registerMealScanEndpoint } from './meal-scan.js'
import { registerStatsEndpoint } from './stats.js'
import { registerNutritionEndpoint } from './nutrition.js'
import { registerEstimateEndpoint } from './estimate.js'
import { registerCoachEndpoint } from './coach.js'
import { registerSearchEndpoint } from './search.js'

export default (router: Router, context: Record<string, unknown>) => {
  registerScanEndpoint(router, context as unknown as Parameters<typeof registerScanEndpoint>[1])
  registerContributeEndpoint(router, context as unknown as Parameters<typeof registerContributeEndpoint>[1])
  registerLogErrorEndpoint(router, context as unknown as Parameters<typeof registerLogErrorEndpoint>[1])
  registerOffSearchEndpoint(router)
  registerMealScanEndpoint(router, context as unknown as Parameters<typeof registerMealScanEndpoint>[1])
  // (meal-scan & my-stats lisent req.accountability — Directus authentifie en amont)
  registerStatsEndpoint(router, context as unknown as Parameters<typeof registerStatsEndpoint>[1])
  registerNutritionEndpoint(router, context as unknown as Parameters<typeof registerNutritionEndpoint>[1])
  registerEstimateEndpoint(router, context as unknown as Parameters<typeof registerEstimateEndpoint>[1])
  registerCoachEndpoint(router, context as unknown as Parameters<typeof registerCoachEndpoint>[1])
  registerSearchEndpoint(router, context as unknown as Parameters<typeof registerSearchEndpoint>[1])
}
