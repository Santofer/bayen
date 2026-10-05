/**
 * Suggestions dans le panier : produits bien notés issus des mêmes catégories
 * que les articles déjà présents. Profite de la catégorisation IA de la base.
 */

import { useState, useEffect } from 'react'
import { useLocale } from '@/lib/i18n'
import { Sparkles } from 'lucide-react'
import AddToCartButton from '@/components/AddToCartButton'
import { ScoreSticker, productTint } from '@/components/ProductCard'
import { cn } from '@/lib/utils'
import type { CartItem } from '@/lib/cart'

const DIRECTUS_URL = '/api/directus'
const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'
const FIELDS = 'barcode,name_fr,brand,image_front,scan_score,score_label'

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
    <section className="rounded-2xl border bg-card p-5 print:hidden">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-brand-ink" />
        {t('cart.recoTitle')}
      </h3>
      {/* -mx-5/px-5 : le fondu du mask + les ombres vivent dans le padding, rien n'est rogné */}
      <div className="rail-x flex gap-3 overflow-x-auto -mx-5 px-5 pt-2 pb-6 -mb-3">
        {recos.map((r) => {
          const src = r.image_front
            ? (r.image_front.startsWith('http') ? r.image_front : `${CDN_URL}/${r.image_front}?width=160&height=160&fit=cover&format=webp`)
            : null
          return (
            <div key={r.barcode} className="card-lift w-[150px] flex-shrink-0 rounded-2xl border bg-card p-2.5">
              <a href={`/produit/${r.barcode}`} className="block">
                <div className="relative mb-2.5">
                  <div className={cn('grid aspect-square place-items-center overflow-hidden rounded-xl border-2 border-line', productTint(r.barcode))}>
                    {src && <img src={src} alt={r.name_fr} className="size-[86%] object-contain mix-blend-multiply dark:mix-blend-normal" loading="lazy" />}
                  </div>
                  {r.scan_score != null && (
                    <span className="absolute -bottom-2 end-0">
                      <ScoreSticker score={r.scan_score} size="sm" />
                    </span>
                  )}
                </div>
                <p className="mb-1.5 line-clamp-2 pe-9 text-xs font-bold leading-tight">{r.name_fr}</p>
              </a>
              <AddToCartButton item={r} compact />
            </div>
          )
        })}
      </div>
    </section>
  )
}
