/**
 * Point d'entrée de l'extension Directus — endpoints custom Bayen
 *
 * Routes :
 *   POST /custom/scan       → Chemin A (query DB → OFF → score)
 *   POST /custom/ocr-score  → Chemin B (OCR → LLM → score)
 *   GET  /custom/search     → Recherche full-text produits
 */

import type { Router } from 'express'
import { registerScanEndpoint } from './scan.js'

// Directus 11 endpoint — export de fonction directe
// Les routes seront accessibles sous /custom/... (nom du dossier de l'extension)
export default (router: Router, context: Record<string, unknown>) => {
  registerScanEndpoint(router, context as unknown as Parameters<typeof registerScanEndpoint>[1])
}
