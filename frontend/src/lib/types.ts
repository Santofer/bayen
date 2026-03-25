/**
 * Types TypeScript partagés — zéro any
 *
 * Types pour le modèle de données Directus, les réponses API
 * et les résultats de scoring.
 */

// ────────────────────────────────────────────────────────────────
// Enums
// ────────────────────────────────────────────────────────────────

export type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E'
export type NovaGroup = 1 | 2 | 3 | 4
export type RiskLevel = 'safe' | 'limited' | 'avoid' | 'banned_ma'
export type ScoreLabel = 'excellent' | 'bon' | 'médiocre' | 'mauvais'
export type DataSource = 'off' | 'user' | 'ocr_tesseract' | 'manual'
export type ProductStatus = 'draft' | 'pending_review' | 'published' | 'rejected'
export type ContributionType = 'new_product' | 'fix_data' | 'add_image' | 'confirm'
export type ContributionStatus = 'pending' | 'approved' | 'rejected'
export type UserRank = 'nouveau' | 'contributeur' | 'expert' | 'vérifié'

// ────────────────────────────────────────────────────────────────
// Collections Directus
// ────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  barcode: string
  name_fr: string
  name_ar?: string | null
  brand: string
  category_id?: number | null
  image_front?: string | null
  image_nutrition?: string | null
  image_ingredients?: string | null
  nutriscore_grade?: NutriScoreGrade | null
  nova_group?: NovaGroup | null
  scan_score?: number | null
  score_label?: ScoreLabel | null
  energy_kcal?: number | null
  fat_total?: number | null
  fat_saturated?: number | null
  carbs_total?: number | null
  sugars?: number | null
  fiber?: number | null
  proteins?: number | null
  salt?: number | null
  ingredients_text?: string | null
  additives?: string[] | null
  allergens?: string[] | null
  is_organic: boolean
  is_halal: boolean
  origin_country?: string | null
  off_id?: string | null
  data_source: DataSource
  status: ProductStatus
  confidence_score?: number | null
  ocr_raw_text?: string | null
  ocr_confidence?: number | null
  scan_count: number
  date_created: string
  date_updated?: string | null
  created_by?: string | null
}

export interface Category {
  id: number
  name_fr: string
  name_ar?: string | null
  slug: string
  parent_id?: number | null
  icon?: string | null
}

export interface Additive {
  id: string
  name_fr: string
  function: string
  risk_level: RiskLevel
  description_fr?: string | null
  sources?: string[] | null
}

export interface Scan {
  id: string
  product_id: string
  user_id?: string | null
  session_id: string
  device_type?: string | null
  date_created: string
}

export interface Contribution {
  id: string
  product_id: string
  user_id: string
  type: ContributionType
  data_before?: Record<string, unknown> | null
  data_after?: Record<string, unknown> | null
  status: ContributionStatus
  reviewed_by?: string | null
  date_created: string
}

export interface AiLog {
  id: string
  product_id?: string | null
  type: 'ocr_tesseract' | 'mistral_parsing'
  input?: string | null
  output?: string | null
  duration_ms?: number | null
  success: boolean
  error_message?: string | null
  date_created: string
}

export interface UserProfile {
  id: string
  email: string
  display_name?: string | null
  points: number
  contributions_count: number
  rank: UserRank
}

// ────────────────────────────────────────────────────────────────
// Résultats de scoring
// ────────────────────────────────────────────────────────────────

export interface AdditiveResult {
  code: string
  risk_level: RiskLevel
  deduction: number
}

export interface ScoreResult {
  total: number
  label: ScoreLabel
  color: string
  nutriscore_grade: NutriScoreGrade
  nutriscore_points: number
  nova_group: NovaGroup | null
  nova_points: number
  additives_points: number
  additives_detail: AdditiveResult[]
  fsa_score: number | null
  incomplete: boolean
}

// ────────────────────────────────────────────────────────────────
// Réponses API /custom/scan
// ────────────────────────────────────────────────────────────────

export interface ScanRequest {
  barcode: string
  session_id: string
  user_id?: string
}

export interface ScanResponseFound {
  found: true
  source: 'database' | 'open_food_facts'
  product: Product
  score: ScoreResult
}

export interface ScanResponseNotFound {
  found: false
  barcode: string
  message: string
  contribute_url: string
}

export type ScanResponse = ScanResponseFound | ScanResponseNotFound

// ────────────────────────────────────────────────────────────────
// Réponses API /custom/ocr-score
// ────────────────────────────────────────────────────────────────

export interface OcrScoreResponse {
  job_status: 'done' | 'low_confidence' | 'manual_required'
  ocr_confidence: number
  product_draft?: Product
  score?: ScoreResult
  message?: string
}

// ────────────────────────────────────────────────────────────────
// Schéma Directus SDK (typage du client)
// ────────────────────────────────────────────────────────────────

export interface DirectusSchema {
  products: Product[]
  categories: Category[]
  additives: Additive[]
  scans: Scan[]
  contributions: Contribution[]
  ai_logs: AiLog[]
  directus_users: UserProfile[]
}
