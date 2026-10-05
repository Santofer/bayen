/**
 * Bandeau d'alerte sur la fiche produit : signale que le produit contient
 * quelque chose que l'utilisateur a déclaré éviter (profil santé local).
 * N'affiche rien si le profil est vide ou si le produit est compatible.
 */

import { useEffect, useState } from 'react'
import { AlertTriangle, Info, SlidersHorizontal } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import {
  checkProduct, getProfile, onProfileChange,
  type ProductForCheck, type ProfileHit,
} from '@/lib/health-profile'

export default function ProfileAlert(product: ProductForCheck) {
  const { t, locale } = useLocale()
  const [hits, setHits] = useState<ProfileHit[] | null>(null)

  useEffect(() => {
    const run = (): void => setHits(checkProduct(getProfile(), product))
    run()
    return onProfileChange(run)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!hits || hits.length === 0) return null

  const direct = hits.filter((h) => h.source === 'ingredient')
  const traces = hits.filter((h) => h.source === 'trace')
  // Tomate si le produit en contient vraiment, citron s'il s'agit seulement de traces.
  // Aplat franc → tout le texte est en encre, dans les deux thèmes.
  const severe = direct.length > 0
  // Puce crème sur l'aplat (.pop-chip hors calque Tailwind → `!`)
  const chip = 'pop-chip border-encre! bg-creme! text-encre!'

  return (
    <div
      className={`rounded-2xl border-2 border-encre p-4 text-encre shadow-[var(--shadow-card)] sm:p-5 ${severe ? 'bg-tomate' : 'bg-citron'}`}
      role="alert"
    >
      <div className="flex gap-3">
        <span className="flex-shrink-0">
          {severe ? <AlertTriangle size={22} /> : <Info size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          {direct.length > 0 && (
            <>
              <p className="font-bold">{t('profile.alertContains')}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {direct.map((h) => (
                  <span key={`${h.type}-${h.label}`} className={`${chip} font-bold!`}>
                    {(locale === 'ary' && h.labelAr) || h.label}
                  </span>
                ))}
              </div>
            </>
          )}

          {traces.length > 0 && (
            <div className={direct.length > 0 ? 'mt-3' : ''}>
              <p className="font-semibold text-sm">{t('profile.alertTraces')}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {traces.map((h) => (
                  <span key={`trace-${h.label}`} className={chip}>
                    {(locale === 'ary' && h.labelAr) || h.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <a
            href="/profil"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold underline underline-offset-2 opacity-80 hover:opacity-100"
          >
            <SlidersHorizontal size={13} /> {t('profile.edit')}
          </a>
        </div>
      </div>
    </div>
  )
}
