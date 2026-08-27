/**
 * Journal repas local — 100% client (localStorage), sans compte.
 *
 * L'analyse photo était déjà publique, mais la SAUVEGARDE exigeait un compte :
 * personne ne sauvegardait (0 entrée en base). Ici l'utilisateur garde son
 * journal sur son appareil ; créer un compte ne sert qu'à synchroniser.
 *
 * La photo n'est PAS stockée (trop lourd pour localStorage) : seules les
 * valeurs estimées le sont.
 */

export interface LocalMealEntry {
  id: string
  plat: string
  kcal_min: number | null
  kcal_max: number | null
  proteines_g: number | null
  lipides_g: number | null
  glucides_g: number | null
  confiance: string | null
  /** Date.now() de l'enregistrement */
  at: number
}

const KEY = 'bayen_meal_history'
const EVT = 'bayen-meal-change'
const MAX = 60

export function getMealHistory(): LocalMealEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? (arr as LocalMealEntry[]).filter((e) => e && e.id) : []
  } catch {
    return []
  }
}

function save(entries: LocalMealEntry[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)))
  window.dispatchEvent(new CustomEvent(EVT))
}

export function addMealToHistory(entry: Omit<LocalMealEntry, 'id' | 'at'>): void {
  if (typeof window === 'undefined') return
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `meal-${Date.now()}-${Math.random().toString(36).slice(2)}`
  save([{ ...entry, id, at: Date.now() }, ...getMealHistory()])
}

export function removeMealFromHistory(id: string): void {
  if (typeof window === 'undefined') return
  save(getMealHistory().filter((e) => e.id !== id))
}

export function clearMealHistory(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(KEY)
  window.dispatchEvent(new CustomEvent(EVT))
}

/** Entrées du jour (minuit local) + total calorique (moyenne des fourchettes). */
export function todayStats(entries: LocalMealEntry[]): { count: number; kcalMin: number; kcalMax: number } {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const today = entries.filter((e) => e.at >= start.getTime())
  return {
    count: today.length,
    kcalMin: today.reduce((s, e) => s + (e.kcal_min ?? e.kcal_max ?? 0), 0),
    kcalMax: today.reduce((s, e) => s + (e.kcal_max ?? e.kcal_min ?? 0), 0),
  }
}

export function onMealHistoryChange(cb: () => void): () => void {
  const handler = (): void => cb()
  window.addEventListener(EVT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVT, handler)
    window.removeEventListener('storage', handler)
  }
}
