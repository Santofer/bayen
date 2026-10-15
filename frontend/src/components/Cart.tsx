/**
 * Page « Ma liste de courses » (/panier).
 *
 * Liste 100% locale (localStorage). Affiche les produits ajoutés avec leur
 * score, un récap, et des actions : imprimer, partager sur WhatsApp (image),
 * vider, puis des recommandations. Rend des sections d'écran (main.screen).
 */

import { useState, useEffect } from 'react'
import { useLocale } from '@/lib/i18n'
import { Printer, Trash2, ShoppingBasket, X, Loader2 } from 'lucide-react'
import { getCart, removeFromCart, clearCart, onCartChange, type CartItem } from '@/lib/cart'
import { renderCartImage, cartShareText } from '@/lib/cartImage'
import CartRecommendations from '@/components/CartRecommendations'
import { ScoreSticker, productTint } from '@/components/ProductCard'
import { cn } from '@/lib/utils'

const CDN_URL = import.meta.env.PUBLIC_CDN_URL ?? 'https://api.bayen.ma/assets'

function imgSrc(item: CartItem): string | null {
  if (!item.image_front) return null
  return item.image_front.startsWith('http')
    ? item.image_front
    : `${CDN_URL}/${item.image_front}?width=160&height=160&fit=cover&format=webp`
}

export default function Cart() {
  const { t, locale } = useLocale()
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
            await navigator.share({ files: [file], text, title: t('cart.shareTitle') })
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
      <section className="section">
        <div className="card grid justify-items-start gap-4 p-4">
          {/* Naânaa et son panier vide */}
          <div className="naanaa">
            <div className="m"><img src="/mascotte/naanaa-courses.webp" alt="" /></div>
            <p className="bubble">{t('cart.empty')}</p>
          </div>
          <a href="/recherche" className="btn primary">
            <ShoppingBasket aria-hidden="true" />
            {t('cart.browse')}
          </a>
        </div>
      </section>
    )
  }

  const scored = items.filter((i) => i.scan_score != null)
  const avg = scored.length ? Math.round(scored.reduce((s, i) => s + (i.scan_score ?? 0), 0) / scored.length) : null

  return (
    <>
      {/* En-tête impression seulement */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Bayen — {t('cart.pageTitle')}</h1>
      </div>

      {/* Récap (nombre + pastille du score moyen) puis actions */}
      <section className="section">
        <div className="card flex flex-wrap items-center justify-between gap-4 p-4 md:p-5">
          <div className="flex items-center gap-3.5">
            {avg != null && <ScoreSticker score={avg} locale={locale} />}
            <div>
              <p className="disp d-m num">
                {items.length} {items.length > 1 ? t('cart.itemsPlural') : t('cart.itemSingular')}
              </p>
              {avg != null && <p className="muted text-sm">{t('cart.avgScore')} : {avg}/100</p>}
            </div>
          </div>
          {/* Actions (masquées à l'impression) */}
          <div className="flex flex-wrap gap-2 print:hidden">
            <button type="button" onClick={shareWhatsApp} disabled={sharing} className="btn sm border-encre bg-[#25D366] text-encre">
              {sharing ? <Loader2 className="animate-spin" aria-hidden="true" /> : (
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              )}
              {t('cart.whatsapp')}
            </button>
            <button type="button" onClick={() => window.print()} className="btn sm">
              <Printer aria-hidden="true" />{t('cart.print')}
            </button>
            <button type="button" onClick={() => { if (confirm(t('cart.clearConfirm'))) clearCart() }} className="btn sm flat text-muted-foreground">
              <Trash2 aria-hidden="true" />{t('cart.clear')}
            </button>
          </div>
        </div>
      </section>

      {/* Liste : cartes .pcard (vignette | nom | pastille | retirer) */}
      <section className="section">
        <ul className="grid gap-3 md:grid-cols-2 md:gap-4">
          {items.map((item) => {
            const src = imgSrc(item)
            return (
              <li key={item.barcode} className="card pcard grid-cols-[76px_minmax(0,1fr)_auto_auto]">
                <div className={cn('tile', productTint(item.barcode))}>
                  {src && <img src={src} alt={item.name_fr} loading="lazy" />}
                </div>
                <a href={`/produit/${item.barcode}`} className="min-w-0 hover:underline">
                  <p className="pn">{item.name_fr}</p>
                  {item.brand && <p className="pm">{item.brand}</p>}
                </a>
                {item.scan_score != null ? <ScoreSticker score={item.scan_score} size="sm" locale={locale} /> : <span />}
                <button
                  type="button"
                  onClick={() => removeFromCart(item.barcode)}
                  className="grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted print:hidden"
                  aria-label={t('cart.remove')}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Recommandations issues des catégories du panier */}
      <CartRecommendations items={items} />
    </>
  )
}
