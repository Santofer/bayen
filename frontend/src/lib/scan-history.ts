/**
 * Historique de scans Bayen — 100% client (localStorage), sans compte.
 *
 * Yuka réserve l'« historique illimité » à sa version payante ; ici c'est
 * gratuit et privé : rien ne quitte l'appareil. Alimenté par la fiche produit
 * (script inline), consommé par /mes-scans et la section « Scans récents » de
 * la page /scan.
 *
 * Pub/sub via CustomEvent + `storage` (même pattern que cart.ts).
 */

export interface ScanHistoryEntry {
  barcode: string
  name_fr: string
  brand: string | null
  /** UUID Directus OU URL http (héritage OFF) — stocké tel quel */
  image_front: string | null
  scan_score: number | null
  score_label: string | null
  /** Date.now() de la dernière consultation */
  at: number
}

const KEY = 'bayen_scan_history'
const EVT = 'bayen-history-change'
const MAX = 100

export function getHistory(): ScanHistoryEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? (arr as ScanHistoryEntry[]).filter((e) => e && e.barcode) : []
  } catch {
    return []
  }
}

function save(entries: ScanHistoryEntry[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX)))
  window.dispatchEvent(new CustomEvent(EVT))
}

/** Ajoute (ou remonte en tête) un produit consulté. */
export function addToHistory(entry: Omit<ScanHistoryEntry, 'at'>): void {
  if (typeof window === 'undefined' || !entry?.barcode) return
  const rest = getHistory().filter((e) => e.barcode !== entry.barcode)
  save([{ ...entry, at: Date.now() }, ...rest])
}

export function historyCount(): number {
  return getHistory().length
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(KEY)
  window.dispatchEvent(new CustomEvent(EVT))
}

export function onHistoryChange(cb: () => void): () => void {
  const handler = (): void => cb()
  window.addEventListener(EVT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVT, handler)
    window.removeEventListener('storage', handler)
  }
}
