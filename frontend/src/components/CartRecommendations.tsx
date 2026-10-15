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
    <section className="section print:hidden">
      <div className="sec-head">
        <h2 className="disp d-m flex items-center gap-2">
          <Sparkles className="size-5 flex-none text-brand-ink" aria-hidden="true" />
          {t('cart.recoTitle')}
        </h2>
      </div>
      {/* Rail défilant sur mobile, grille sur ordinateur */}
      <div className="scroller -mx-[18px] md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible lg:grid-cols-6">
        {recos.map((r) => {
          const src = r.image_front
            ? (r.image_front.startsWith('http') ? r.image_front : `${CDN_URL}/${r.image_front}?width=320&height=320&fit=cover&format=webp`)
            : null
          return (
            <div key={r.barcode} className="card grid w-[160px] content-start gap-2.5 p-2.5 md:w-auto">
              <a href={`/produit/${r.barcode}`} className="grid gap-2.5">
                <div className="relative">
                  <div className={cn('tile aspect-square', productTint(r.barcode))}>
                    {src && <img src={src} alt={r.name_fr} loading="lazy" />}
                  </div>
                  {r.scan_score != null && (
                    <span className="absolute -bottom-2 end-0">
                      <ScoreSticker score={r.scan_score} size="sm" />
                    </span>
                  )}
                </div>
                <p className="line-clamp-2 pe-9 text-xs font-bold leading-tight">{r.name_fr}</p>
              </a>
              <AddToCartButton item={r} compact />
            </div>
          )
        })}
      </div>
    </section>
  )
}
