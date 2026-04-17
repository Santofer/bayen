/**
 * Client Directus SDK — toutes les requêtes API passent par ici
 * Ne jamais appeler l'API Directus directement depuis les composants
 */

import { createDirectus, rest, readItems, readItem, createItem, updateItem, authentication } from '@directus/sdk'
import type {
  DirectusSchema,
  Product,
  Category,
  Additive,
  ScanRequest,
  ScanResponse,
  ScoreResult,
} from './types'

// ────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

/**
 * URL proxy pour les appels client-side — évite les CORS
 * Les appels SSR (Astro pages) utilisent DIRECTUS_URL directement
 * Les appels client (React components) passent par /api/directus/*
 */
const CLIENT_API_URL = typeof window !== 'undefined' ? '/api/directus' : DIRECTUS_URL

// Client Directus typé avec le schéma Bayen
const directus = createDirectus<DirectusSchema>(DIRECTUS_URL)
  .with(rest())
  .with(authentication())

export { directus, DIRECTUS_URL }

// ────────────────────────────────────────────────────────────────
// Produits
// ────────────────────────────────────────────────────────────────

/** Récupère un produit publié par son code-barres */
export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const results = await directus.request(
    readItems('products', {
      filter: { barcode: { _eq: barcode }, status: { _eq: 'published' } },
      limit: 1,
    })
  )
  return (results[0] as Product) ?? null
}

/** Récupère un produit par son ID */
export async function getProductById(id: string): Promise<Product> {
  return await directus.request(readItem('products', id)) as Product
}

/** Récupère les produits récents (pour la page d'accueil) */
export async function getRecentProducts(limit = 12): Promise<Product[]> {
  return await directus.request(
    readItems('products', {
      filter: { status: { _eq: 'published' } },
      sort: ['-date_created'],
      limit,
    })
  ) as Product[]
}

/** Recherche de produits par texte */
export async function searchProducts(
  query: string,
  options: { category?: string; limit?: number; offset?: number } = {}
): Promise<Product[]> {
  const { limit = 20, offset = 0, category } = options

  const filter: Record<string, unknown> = {
    status: { _eq: 'published' },
    _or: [
      { name_fr: { _contains: query } },
      { brand: { _contains: query } },
      { barcode: { _eq: query } },
    ],
  }

  if (category) {
    filter.category_id = {
      slug: { _eq: category },
    }
  }

  return await directus.request(
    readItems('products', { filter, limit, offset, sort: ['-scan_count'] })
  ) as Product[]
}

// ────────────────────────────────────────────────────────────────
// Catégories
// ────────────────────────────────────────────────────────────────

/** Récupère toutes les catégories triées par nom */
export async function getCategories(): Promise<Category[]> {
  return await directus.request(
    readItems('categories', { sort: ['name_fr'], limit: -1 })
  ) as Category[]
}

/** Récupère une catégorie par slug */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const results = await directus.request(
    readItems('categories', {
      filter: { slug: { _eq: slug } },
      limit: 1,
    })
  )
  return (results[0] as Category) ?? null
}

// ────────────────────────────────────────────────────────────────
// Additifs
// ────────────────────────────────────────────────────────────────

/** Récupère tous les additifs */
export async function getAdditives(): Promise<Additive[]> {
  return await directus.request(
    readItems('additives', { sort: ['id'], limit: -1 })
  ) as Additive[]
}

/** Récupère un additif par son code (ex: "E471") */
export async function getAdditiveById(id: string): Promise<Additive> {
  return await directus.request(readItem('additives', id)) as Additive
}

/** Récupère les risk_levels pour une liste de codes additifs */
export async function getAdditiveRisks(
  codes: string[]
): Promise<Array<{ code: string; risk_level: Additive['risk_level'] }>> {
  if (codes.length === 0) return []

  const results = await directus.request(
    readItems('additives', {
      filter: { id: { _in: codes } },
      fields: ['id', 'risk_level'],
      limit: -1,
    })
  ) as Additive[]

  const riskMap = new Map(results.map((a) => [a.id, a.risk_level]))

  return codes.map((code) => ({
    code,
    risk_level: riskMap.get(code) ?? 'limited',
  }))
}

// ────────────────────────────────────────────────────────────────
// Endpoint custom /scan (Chemin A)
// ────────────────────────────────────────────────────────────────

/** Appelle POST /bayen-api/scan — orchestration complète Chemin A */
export async function scanBarcode(params: ScanRequest): Promise<ScanResponse> {
  const response = await fetch(`${CLIENT_API_URL}/bayen-api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(`Erreur scan: ${response.status} ${response.statusText}`)
  }

  return await response.json() as ScanResponse
}

// ────────────────────────────────────────────────────────────────
// Contributions
// ────────────────────────────────────────────────────────────────

/** Crée une contribution (ajout produit, correction, photo, confirmation) */
export async function createContribution(data: {
  product_id: string
  type: 'new_product' | 'fix_data' | 'add_image' | 'confirm'
  data_before?: Record<string, unknown>
  data_after?: Record<string, unknown>
}): Promise<string> {
  const result = await directus.request(createItem('contributions', data))
  return (result as { id: string }).id
}

// ────────────────────────────────────────────────────────────────
// Scans
// ────────────────────────────────────────────────────────────────

/** Enregistre un scan (via l'API Directus natif, si on ne passe pas par /bayen-api/scan) */
export async function createScan(data: {
  product_id: string
  session_id: string
  user_id?: string
  device_type?: string
}): Promise<string> {
  const result = await directus.request(createItem('scans', data))
  return (result as { id: string }).id
}

// ────────────────────────────────────────────────────────────────
// Produits — CRUD avec authentification
// ────────────────────────────────────────────────────────────────

/** Crée un produit dans Directus (requiert un token valide) */
export async function createProduct(
  data: Record<string, unknown>,
  token: string
): Promise<Record<string, unknown>> {
  const response = await fetch(`${CLIENT_API_URL}/items/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null) as { errors?: Array<{ message: string }> } | null
    const msg = errorData?.errors?.[0]?.message ?? `Erreur ${response.status}`
    throw new Error(msg)
  }

  const result = await response.json() as { data: Record<string, unknown> }
  return result.data
}

/** Met a jour un produit existant dans Directus */
export async function updateProduct(
  id: string,
  data: Record<string, unknown>,
  token: string
): Promise<Record<string, unknown>> {
  const response = await fetch(`${DIRECTUS_URL}/items/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null) as { errors?: Array<{ message: string }> } | null
    const msg = errorData?.errors?.[0]?.message ?? `Erreur ${response.status}`
    throw new Error(msg)
  }

  const result = await response.json() as { data: Record<string, unknown> }
  return result.data
}

/** Upload un fichier vers Directus, retourne l'ID du fichier */
export async function uploadFile(
  file: File,
  token: string
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${CLIENT_API_URL}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null) as { errors?: Array<{ message: string }> } | null
    const msg = errorData?.errors?.[0]?.message ?? `Erreur upload ${response.status}`
    throw new Error(msg)
  }

  const result = await response.json() as { data: { id: string } }
  return result.data.id
}

/** Supprimer un produit (admin uniquement) */
export async function deleteProduct(
  id: string,
  token: string
): Promise<boolean> {
  const response = await fetch(`${CLIENT_API_URL}/items/products/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  return response.ok
}

// ────────────────────────────────────────────────────────────────
// Auth
// ────────────────────────────────────────────────────────────────

/** Login email + mot de passe via Directus */
export async function login(email: string, password: string): Promise<void> {
  await directus.login(email, password)
}

/** Logout */
export async function logout(): Promise<void> {
  await directus.logout()
}

/** Récupère le profil de l'utilisateur connecté */
export async function getCurrentUser(): Promise<DirectusSchema['directus_users'][number] | null> {
  try {
    const me = await directus.request(readItem('directus_users', 'me' as string))
    return me as DirectusSchema['directus_users'][number]
  } catch {
    return null
  }
}

// ────────────────────────────────────────────────────────────────
// Session anonyme
// ────────────────────────────────────────────────────────────────

/** Génère ou récupère un session_id anonyme depuis localStorage */
export function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'

  const key = 'bayen_session_id'
  let sessionId = localStorage.getItem(key)

  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(key, sessionId)
  }

  return sessionId
}
