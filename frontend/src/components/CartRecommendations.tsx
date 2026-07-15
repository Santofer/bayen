/**
 * Suggestions dans le panier : produits bien notés issus des mêmes catégories
 * que les articles déjà présents. Profite de la catégorisation IA de la base.
 */

import { useState, useEffect } from 'react'
import { useLocale } from '@/lib/i18n'
import { Sparkles } from 'lucide-react'
import AddToCartButton from '@/components/AddToCartButton'
import type { CartItem } from '@/lib/cart'

const DIRECTUS_URL = '/api/directus'
const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'
const FIELDS = 'barcode,name_fr,brand,image_front,scan_score,score_label'

function scoreColor(s: number | null): string {
  if (s == null) return '#9ca3af'
  if (s >= 75) return '#476a32'
  if (s >= 50) return '#b1cf3a'
  if (s >= 25) return '#f97316'
  return '#ef4444'
}

interface Reco extends CartItem { }

export default function CartRecommendations({ items }: { items: CartItem[] }) {
  const { t } = useLocale()
  const [recos, setRecos] = useState<Reco[]>([])

  const barcodes = items.map((i) => i.barcode).sort().join(',')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const cartBarcodes = items.map((i) => i.barcode)
      if (cartBarcodes.length === 0) { setRecos([]); return }
      try {
        // 1. Catégories des produits du panier
        const catRes = await fetch(
          `${DIRECTUS_URL}/items/products?filter[barcode][_in]=${cartBarcodes.join(',')}&fields=category_id&limit=50`
        )
        if (!catRes.ok) return
        const catData = (await catRes.json()) as { data: Array<{ category_id: number | null }> }
        const cats = [...new Set(catData.data.map((p) => p.category_id).filter((c): c is number => c != null))]
        if (cats.length === 0) { setRecos([]); return }

        // 2. Meilleurs produits de ces catégories, pas déjà dans le panier
        const recRes = await fetch(
          `${DIRECTUS_URL}/items/products?filter[category_id][_in]=${cats.join(',')}&filter[scan_score][_gte]=60&filter[status][_eq]=published&sort=-scan_score&limit=12&fields=${FIELDS}`
        )
        if (!recRes.ok) return
        const recData = (await recRes.json()) as { data: Reco[] }
        const filtered = (recData.data ?? []).filter((p) => !cartBarcodes.includes(p.barcode)).slice(0, 6)
        if (!cancelled) setRecos(filtered)
      } catch { /* silencieux */ }
    }
    load()
    return () => { cancelled = true }
  }, [barcodes])

  if (recos.length === 0) return null

  return (
    <section className="rounded-xl border bg-card p-5 print:hidden">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        {t('cart.recoTitle')}
      </h3>
      {/* -mx-5/px-5 : le fondu du mask + les ombres vivent dans le padding, rien n'est rogné */}
      <div className="rail-x flex gap-3 overflow-x-auto -mx-5 px-5 pt-2 pb-6 -mb-3">
        {recos.map((r) => {
          const src = r.image_front
            ? (r.image_front.startsWith('http') ? r.image_front : `${CDN_URL}/${r.image_front}?width=160&height=160&fit=cover&format=webp`)
            : null
          return (
            <div key={r.barcode} className="card-lift flex-shrink-0 w-[150px] rounded-xl border bg-background p-2.5">
              <a href={`/produit/${r.barcode}`} className="block">
                <div className="relative w-full aspect-square rounded-md overflow-hidden bg-muted mb-2">
                  {src && <img src={src} alt={r.name_fr} className="w-full h-full object-cover" loading="lazy" />}
                  {r.scan_score != null && (
                    <div className="absolute top-1 right-1 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow" style={{ backgroundColor: scoreColor(r.scan_score) }}>
                      {r.scan_score}
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium line-clamp-2 leading-tight mb-1">{r.name_fr}</p>
              </a>
              <AddToCartButton item={r} compact />
            </div>
          )
        })}
      </div>
    </section>
  )
}
