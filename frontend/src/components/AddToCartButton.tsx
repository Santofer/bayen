/**
 * Bouton « Ajouter à ma liste » — bascule ajout/retrait, réactif au panier
 * (localStorage). Public, aucun login requis.
 *
 * `compact` : version courte pleine largeur pour les cartes de carrousel
 * (le libellé long débordait des cards de 150 px).
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
}

export default function AddToCartButton({ item, compact = false }: AddToCartButtonProps) {
  const { t } = useLocale()
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setAdded(inCart(item.barcode))
    return onCartChange(() => setAdded(inCart(item.barcode)))
  }, [item.barcode])

  if (compact) {
    return (
      <Button
        variant={added ? 'secondary' : 'outline'}
        size="sm"
        onClick={() => setAdded(toggleCart(item))}
        className={`w-full min-w-0 px-2 ${added ? 'text-primary' : ''}`}
      >
        {added ? (
          <><Check className="mr-1 h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('cart.addedShort')}</span></>
        ) : (
          <><ShoppingBasket className="mr-1 h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{t('cart.addShort')}</span></>
        )}
      </Button>
    )
  }

  return (
    <Button
      variant={added ? 'secondary' : 'outline'}
      size="sm"
      onClick={() => setAdded(toggleCart(item))}
      className={added ? 'text-primary' : ''}
    >
      {added ? (
        <><Check className="mr-1.5 h-4 w-4" />{t('cart.added')}</>
      ) : (
        <><ShoppingBasket className="mr-1.5 h-4 w-4" />{t('cart.add')}</>
      )}
    </Button>
  )
}
