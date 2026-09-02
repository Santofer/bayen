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
 *   POST /bayen-api/confirm-halal      → Confirmation communautaire du logo halal
 *   POST /bayen-api/price              → Partage d'un prix observé en magasin
 *   GET  /bayen-api/prices/:barcode    → Agrégat des prix (médiane par enseigne)
 *   POST /bayen-api/meal-feedback      → Retour sur une estimation repas (+ correction)
 *   POST /bayen-api/upload-photo       → Upload d'une photo produit sans compte
 *   POST /bayen-api/partner-request    → Demande de partenariat (stockage + email)
 *   GET  /bayen-api/leaderboard        → Top contributeurs réels (public, cache 5 min)
 *   POST /bayen-api/confirm-product    → « Infos exactes » : 3 confirmations = fiche vérifiée
 *   GET  /bayen-api/partner-requests   → Demandes de partenariat (admin du site)
 *   POST /bayen-api/partner-request-status → Marquer une demande traitée / écartée
 *   GET  /bayen-api/cosmetic-ingredients → Autocomplétion INCI (univers beauté)
 *   POST /bayen-api/cosmetic-score       → Recalcul admin du score cosmétique
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
import { registerLogAiEndpoint } from './log-ai.js'
import { registerHalalEndpoint } from './halal.js'
import { registerPricesEndpoints } from './prices.js'
import { registerMealFeedbackEndpoint } from './meal-feedback.js'
import { registerUploadPhotoEndpoint } from './upload-photo.js'
import { registerPartnerEndpoint } from './partner.js'
import { registerLeaderboardEndpoint } from './leaderboard.js'
import { registerConfirmProductEndpoint } from './confirm-product.js'
import { registerPartnerAdminEndpoints } from './partner-admin.js'
import { registerCosmeticEndpoints } from './cosmetic.js'

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
  registerLogAiEndpoint(router, context as unknown as Parameters<typeof registerLogAiEndpoint>[1])
  registerHalalEndpoint(router, context as unknown as Parameters<typeof registerHalalEndpoint>[1])
  registerPricesEndpoints(router, context as unknown as Parameters<typeof registerPricesEndpoints>[1])
  registerMealFeedbackEndpoint(router, context as unknown as Parameters<typeof registerMealFeedbackEndpoint>[1])
  registerUploadPhotoEndpoint(router, context as unknown as Parameters<typeof registerUploadPhotoEndpoint>[1])
  registerPartnerEndpoint(router, context as unknown as Parameters<typeof registerPartnerEndpoint>[1])
  registerLeaderboardEndpoint(router, context as unknown as Parameters<typeof registerLeaderboardEndpoint>[1])
  registerConfirmProductEndpoint(router, context as unknown as Parameters<typeof registerConfirmProductEndpoint>[1])
  registerPartnerAdminEndpoints(router, context as unknown as Parameters<typeof registerPartnerAdminEndpoints>[1])
  registerCosmeticEndpoints(router, context as unknown as Parameters<typeof registerCosmeticEndpoints>[1])
}
