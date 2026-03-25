/**
 * Point d'entrée de l'extension Directus — endpoints custom Bayen
 *
 * Routes :
 *   POST /custom/scan       → Chemin A (query DB → OFF → score)
 *   POST /custom/ocr-score  → Chemin B (OCR → LLM → score)
 *   GET  /custom/search     → Recherche full-text produits
 */

import type { EndpointConfig } from '@directus/extensions'
import { registerScanEndpoint } from './scan.js'

const endpoint: EndpointConfig = {
  id: 'custom',
  handler: (router, context) => {
    // Chemin A — scan code-barres
    registerScanEndpoint(router, context as Parameters<typeof registerScanEndpoint>[1])

    // Chemin B — OCR + parsing (TODO: phase 2)
    // registerOcrScoreEndpoint(router, context)

    // Recherche full-text (TODO: phase 1)
    // registerSearchEndpoint(router, context)
  },
}

export default endpoint
