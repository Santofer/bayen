/**
 * Page « Ma liste de courses » (/panier).
 *
 * Liste 100% locale (localStorage). Affiche les produits ajoutés avec leur
 * score, un récap, et des actions : imprimer, partager sur WhatsApp (image),
 * vider. Les recommandations et l'export image sont branchés dans des paquets
 * suivants (C4b/C4c).
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n'
import { Printer, Trash2, ShoppingBasket, X, Loader2 } from 'lucide-react'
import { getCart, removeFromCart, clearCart, onCartChange, type CartItem } from '@/lib/cart'
import { renderCartImage, cartShareText } from '@/lib/cartImage'
import CartRecommendations from '@/components/CartRecommendations'

const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'

function scoreColor(s: number | null): string {
  if (s == null) return '#9ca3af'
  if (s >= 75) return '#476a32'
  if (s >= 50) return '#b1cf3a'
  if (s >= 25) return '#f97316'
  return '#ef4444'
}

function imgSrc(item: CartItem): string | null {
  if (!item.image_front) return null
  return item.image_front.startsWith('http')
    ? item.image_front
    : `${CDN_URL}/${item.image_front}?width=120&height=120&fit=cover&format=webp`
}

export default function Cart() {
  const { t } = useLocale()
  const [items, setItems] = useState<CartItem[]>([])
  const [ready, setReady] = useState(false)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    setItems(getCart())
    setReady(true)
    return onCartChange(() => setItems(getCart()))
  }, [])

  async function shareWhatsApp() {
    setSharing(true)
    try {
      const blob = await renderCartImage(items)
      const text = cartShareText(items)
      if (blob) {
        const file = new File([blob], 'liste-bayen.png', { type: 'image/png' })
        const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean }
        if (nav.canShare && nav.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], text, title: 'Ma liste Bayen' })
            return
          } catch { /* annulé → fallback */ }
        }
        // Fallback desktop : télécharge l'image + ouvre WhatsApp avec le texte
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'liste-bayen.png'
        a.click()
        URL.revokeObjectURL(url)
      }
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    } finally {
      setSharing(false)
    }
  }

  if (!ready) return null

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-10 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <ShoppingBasket className="h-8 w-8 text-primary" />
        </div>
        <p className="text-muted-foreground">{t('cart.empty')}</p>
        <a
          href="/recherche"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          {t('cart.browse')}
        </a>
      </div>
    )
  }

  const scored = items.filter((i) => i.scan_score != null)
  const avg = scored.length ? Math.round(scored.reduce((s, i) => s + (i.scan_score ?? 0), 0) / scored.length) : null

  return (
    <div className="space-y-5">
      {/* Actions (masquées à l'impression) */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button onClick={shareWhatsApp} disabled={sharing} size="sm" className="bg-[#25D366] text-white hover:bg-[#1eb356]">
          {sharing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : (
            <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          )}
          {t('cart.whatsapp')}
        </Button>
        <Button onClick={() => window.print()} size="sm" variant="outline">
          <Printer className="mr-1.5 h-4 w-4" />{t('cart.print')}
        </Button>
        <Button onClick={() => { if (confirm(t('cart.clearConfirm'))) clearCart() }} size="sm" variant="ghost" className="text-muted-foreground">
          <Trash2 className="mr-1.5 h-4 w-4" />{t('cart.clear')}
        </Button>
      </div>

      {/* En-tête impression seulement */}
      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold">Bayen — {t('cart.pageTitle')}</h1>
      </div>

      {/* Récap — bandeau score moyen dégradé (maquette v2) */}
      <div
        className="flex items-center justify-between rounded-2xl border p-4 sm:p-5 shadow-card"
        style={
          avg != null
            ? { background: `linear-gradient(120deg, ${scoreColor(avg)}1f, transparent 65%)`, borderColor: `${scoreColor(avg)}55` }
            : undefined
        }
      >
        <span className="text-sm text-muted-foreground">
          {items.length} {items.length > 1 ? t('cart.itemsPlural') : t('cart.itemSingular')}
        </span>
        {avg != null && (
          <span className="text-sm flex items-baseline gap-2">
            {t('cart.avgScore')}
            <span className="font-display text-2xl font-extrabold leading-none" style={{ color: scoreColor(avg) }}>{avg}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </span>
        )}
      </div>

      {/* Liste */}
      <ul className="space-y-2">
        {items.map((item) => {
          const src = imgSrc(item)
          return (
            <li key={item.barcode} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                {src ? <img src={src} alt={item.name_fr} className="w-full h-full object-cover" loading="lazy" /> : null}
              </div>
              <a href={`/produit/${item.barcode}`} className="flex-1 min-w-0 hover:text-primary">
                <p className="text-sm font-medium line-clamp-1">{item.name_fr}</p>
                <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
              </a>
              {item.scan_score != null && (
                <span
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: scoreColor(item.scan_score) }}
                >
                  {item.scan_score}
                </span>
              )}
              <button
                onClick={() => removeFromCart(item.barcode)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground print:hidden flex-shrink-0"
                aria-label={t('cart.remove')}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          )
        })}
      </ul>

      {/* Recommandations issues des catégories du panier */}
      <CartRecommendations items={items} />
    </div>
  )
}
