/**
 * Icône panier dans la barre de nav, avec pastille du nombre d'articles.
 * Masquée (juste l'icône) quand le panier est vide.
 */

import { useState, useEffect } from 'react'
import { ShoppingBasket } from 'lucide-react'
import { cartCount, onCartChange } from '@/lib/cart'

export default function CartNavButton({ label }: { label: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    setCount(cartCount())
    return onCartChange(() => setCount(cartCount()))
  }, [])

  return (
    <a href="/panier" className="relative inline-flex items-center opacity-60 hover:opacity-100 transition-opacity" aria-label={label} title={label}>
      <ShoppingBasket className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
          {count}
        </span>
      )}
    </a>
  )
}
