/**
 * Bouton « Ajouter à ma liste » sur la fiche produit. Bascule ajout/retrait,
 * réactif au panier (localStorage). Public, aucun login requis.
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n'
import { ShoppingBasket, Check } from 'lucide-react'
import { inCart, toggleCart, onCartChange, type CartItem } from '@/lib/cart'

export default function AddToCartButton({ item }: { item: CartItem }) {
  const { t } = useLocale()
  const [added, setAdded] = useState(false)

  useEffect(() => {
    setAdded(inCart(item.barcode))
    return onCartChange(() => setAdded(inCart(item.barcode)))
  }, [item.barcode])

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
