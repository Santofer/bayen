/**
 * Utilitaires d'authentification — gestion tokens Directus
 *
 * access_token en mémoire, refresh_token en localStorage.
 * Auto-refresh transparent si le token est expiré.
 */

import { DIRECTUS_URL } from './directus'
import type { UserProfile } from './types'

// ────────────────────────────────────────────────────────────────
// Stockage des tokens
// ────────────────────────────────────────────────────────────────

const REFRESH_TOKEN_KEY = 'bayen_refresh_token'

/** Token d'accès en mémoire (jamais dans localStorage) */
let accessToken: string | null = null
/** Timestamp d'expiration du access_token */
let tokenExpiresAt = 0

// ────────────────────────────────────────────────────────────────
// Types internes
// ────────────────────────────────────────────────────────────────

interface AuthTokens {
  access_token: string
  refresh_token: string
  expires: number
}

interface DirectusAuthResponse {
  data: AuthTokens
}

interface DirectusErrorResponse {
  errors: Array<{ message: string; extensions?: { code?: string } }>
}

// ────────────────────────────────────────────────────────────────
// Listeners pour les changements d'état auth
// ────────────────────────────────────────────────────────────────

type AuthListener = () => void
const listeners: AuthListener[] = []

/** Abonne un callback aux changements d'état d'authentification */
export function onAuthChange(listener: AuthListener): () => void {
  listeners.push(listener)
  return () => {
    const index = listeners.indexOf(listener)
    if (index > -1) listeners.splice(index, 1)
  }
}

function notifyListeners(): void {
  listeners.forEach((fn) => fn())
}

// ────────────────────────────────────────────────────────────────
// Fonctions utilitaires internes
// ────────────────────────────────────────────────────────────────

function storeTokens(tokens: AuthTokens): void {
  accessToken = tokens.access_token
  // expires est en millisecondes dans Directus
  tokenExpiresAt = Date.now() + tokens.expires
  if (typeof window !== 'undefined') {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token)
  }
}

function clearTokens(): void {
  accessToken = null
  tokenExpiresAt = 0
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }
}

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

/** Extrait un message d'erreur lisible depuis une réponse Directus */
function parseDirectusError(data: DirectusErrorResponse): string {
  const msg = data.errors?.[0]?.message ?? 'Erreur inconnue'
  const code = data.errors?.[0]?.extensions?.code

  // Messages d'erreur en français
  if (code === 'INVALID_CREDENTIALS') return 'Email ou mot de passe incorrect'
  if (code === 'RECORD_NOT_UNIQUE') return 'Un compte avec cet email existe déjà'
  if (msg.includes('RECORD_NOT_UNIQUE')) return 'Un compte avec cet email existe déjà'

  return msg
}

// ────────────────────────────────────────────────────────────────
// API publique
// ────────────────────────────────────────────────────────────────

/** Connexion email + mot de passe */
export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(`${DIRECTUS_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(parseDirectusError(data as DirectusErrorResponse))
  }

  storeTokens((data as DirectusAuthResponse).data)
  notifyListeners()
}

/** Inscription : crée un utilisateur puis se connecte automatiquement */
export async function register(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  const response = await fetch(`${DIRECTUS_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      first_name: displayName,
      // Le rôle par défaut sera attribué par Directus (rôle public/contributeur)
    }),
  })

  if (!response.ok) {
    const data = await response.json()
    throw new Error(parseDirectusError(data as DirectusErrorResponse))
  }

  // Connexion automatique après inscription
  await login(email, password)
}

/** Déconnexion — invalide le refresh_token côté serveur */
export async function logout(): Promise<void> {
  const refreshToken = getStoredRefreshToken()

  if (refreshToken) {
    try {
      await fetch(`${DIRECTUS_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
    } catch {
      // On ignore les erreurs réseau lors du logout
    }
  }

  clearTokens()
  notifyListeners()
}

/** Rafraîchit le access_token via le refresh_token */
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) return false

  try {
    const response = await fetch(`${DIRECTUS_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken, mode: 'json' }),
    })

    if (!response.ok) {
      clearTokens()
      notifyListeners()
      return false
    }

    const data = (await response.json()) as DirectusAuthResponse
    storeTokens(data.data)
    return true
  } catch {
    clearTokens()
    notifyListeners()
    return false
  }
}

/**
 * Retourne un access_token valide.
 * Rafraîchit automatiquement si le token est expiré.
 * Retourne null si l'utilisateur n'est pas connecté.
 */
export async function getAccessToken(): Promise<string | null> {
  // Token encore valide (avec 30s de marge)
  if (accessToken && Date.now() < tokenExpiresAt - 30_000) {
    return accessToken
  }

  // Tentative de refresh
  const refreshed = await refreshAccessToken()
  return refreshed ? accessToken : null
}

/** Vérifie si l'utilisateur est authentifié (a un refresh_token stocké) */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return getStoredRefreshToken() !== null
}

/** Récupère le profil de l'utilisateur connecté */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const token = await getAccessToken()
  if (!token) return null

  try {
    const response = await fetch(`${DIRECTUS_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) return null

    const data = await response.json()
    const user = (data as { data: Record<string, unknown> }).data

    return {
      id: user.id as string,
      email: user.email as string,
      display_name: (user.first_name as string) ?? null,
      points: (user.points as number) ?? 0,
      contributions_count: (user.contributions_count as number) ?? 0,
      rank: (user.rank as UserProfile['rank']) ?? 'nouveau',
    } satisfies UserProfile
  } catch {
    return null
  }
}

/**
 * Initialise l'auth au chargement de la page.
 * Tente un refresh silencieux si un refresh_token existe.
 */
export async function initAuth(): Promise<void> {
  if (!isAuthenticated()) return
  await refreshAccessToken()
}
