/**
 * Bouton « Ajouter à ma liste » — bascule ajout/retrait, réactif au panier
 * (localStorage). Public, aucun login requis.
 *
 * `compact` : version courte pleine largeur pour les cartes de carrousel
 * (le libellé long débordait des cards de 150 px).
 * `look` : rendus de la fiche produit (maquette FichePop) — `icon` bouton rond
 * de la barre du haut, `bar` bouton pilule « À mes courses » de la barre d'actions.
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n'
import { ShoppingBasket, Check } from 'lucide-react'
import { inCart, toggleCart, onCartChange, type CartItem } from '@/lib/cart'

interface AddToCartButtonProps {
  item: CartItem
  /** Version courte, pleine largeur (cartes de carrousel) */
  compact?: boolean
  look?: 'icon' | 'bar'
}

/** Panier de la maquette FichePop */
const BASKET = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 11h11l2-8H6.3" /><circle cx="9" cy="19.5" r="1.5" /><circle cx="17" cy="19.5" r="1.5" /></svg>
)

export default function AddToCartButton({ item, compact = false, look }: AddToCartButtonProps) {
  const { t } = useLocale()
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setAdded(inCart(item.barcode))
    return onCartChange(() => setAdded(inCart(item.barcode)))
  }, [item.barcode])

  const toggle = (): void => setAdded(toggleCart(item))

  if (look === 'icon') {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={added}
        aria-label={t('cart.add')}
        className={added ? 'icon-btn bg-menthe text-encre' : 'icon-btn'}
      >
        {added ? <Check aria-hidden="true" /> : BASKET}
      </button>
    )
  }

  if (look === 'bar') {
    return (
      <button type="button" onClick={toggle} className={added ? 'btn' : 'btn primary'}>
        {added ? <><Check aria-hidden="true" />{t('cart.added')}</> : <>{BASKET}{t('cart.toMyList')}</>}
      </button>
    )
  }

  if (compact) {
    return (
      <Button
        variant={added ? 'secondary' : 'outline'}
        size="sm"
        onClick={() => setAdded(toggleCart(item))}
        className={`w-full min-w-0 px-2 ${added ? 'text-brand-ink' : ''}`}
      >
        {added ? (
          <><Check className="me-1 h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('cart.addedShort')}</span></>
        ) : (
          <><ShoppingBasket className="me-1 h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('cart.addShort')}</span></>
        )}
      </Button>
    )
  }

  return (
    <Button
      variant={added ? 'secondary' : 'outline'}
      size="sm"
      onClick={() => setAdded(toggleCart(item))}
      className={added ? 'text-brand-ink' : ''}
    >
      {added ? (
        <><Check className="me-1.5 h-4 w-4" />{t('cart.added')}</>
      ) : (
        <><ShoppingBasket className="me-1.5 h-4 w-4" />{t('cart.add')}</>
      )}
    </Button>
  )
}
