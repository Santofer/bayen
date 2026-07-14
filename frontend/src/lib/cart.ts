/**
 * Panier / liste de courses Bayen — 100% client (localStorage), pas de compte
 * requis. Pub/sub via CustomEvent pour que le badge nav et la page /panier
 * réagissent en direct, + événement `storage` pour la synchro inter-onglets.
 */

export interface CartItem {
  barcode: string
  name_fr: string
  brand: string | null
  image_front: string | null
  scan_score: number | null
  score_label: string | null
  category_name?: string | null
}

const KEY = 'bayen_cart'
const EVT = 'bayen-cart-change'

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(arr) ? (arr as CartItem[]) : []
  } catch {
    return []
  }
}

function save(items: CartItem[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(EVT))
}

export function cartCount(): number {
  return getCart().length
}

export function inCart(barcode: string): boolean {
  return getCart().some((i) => i.barcode === barcode)
}

export function addToCart(item: CartItem): void {
  const items = getCart()
  if (!items.some((i) => i.barcode === item.barcode)) {
    items.push(item)
    save(items)
  }
}

export function removeFromCart(barcode: string): void {
  save(getCart().filter((i) => i.barcode !== barcode))
}

/** Ajoute si absent, retire si présent. Renvoie true si désormais dans le panier. */
export function toggleCart(item: CartItem): boolean {
  if (inCart(item.barcode)) {
    removeFromCart(item.barcode)
    return false
  }
  addToCart(item)
  return true
}

export function clearCart(): void {
  save([])
}

/** S'abonne aux changements du panier. Renvoie une fonction de désabonnement. */
export function onCartChange(cb: () => void): () => void {
  const handler = () => cb()
  window.addEventListener(EVT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVT, handler)
    window.removeEventListener('storage', handler)
  }
}
