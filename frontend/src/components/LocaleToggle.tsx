/**
 * Bouton de basculement FR / درجة
 * Affiche la locale vers laquelle on bascule (pas la locale courante)
 */

import { useLocale } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

export default function LocaleToggle() {
  const { locale, setLocale } = useLocale()

  /** Bascule la locale et recharge la page pour tout re-rendre */
  function handleToggle() {
    const next = locale === 'fr' ? 'ary' : 'fr'
    setLocale(next)
    window.location.reload()
  }

  // On affiche ce vers quoi on va basculer
  const label = locale === 'fr' ? 'درجة' : 'FR'

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="text-sm font-semibold px-3"
      aria-label={locale === 'fr' ? 'Passer en darija' : 'Passer en français'}
    >
      {label}
    </Button>
  )
}
