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
  // Rouge si le produit en contient vraiment, orange s'il s'agit seulement de traces
  const severe = direct.length > 0

  return (
    <div
      className={
        severe
          ? 'rounded-2xl border-2 border-destructive/40 bg-destructive/10 p-4 sm:p-5'
          : 'rounded-2xl border-2 border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-4 sm:p-5'
      }
      role="alert"
    >
      <div className="flex gap-3">
        <span className={severe ? 'text-destructive flex-shrink-0' : 'text-orange-600 dark:text-orange-400 flex-shrink-0'}>
          {severe ? <AlertTriangle size={22} /> : <Info size={22} />}
        </span>
        <div className="min-w-0 flex-1">
          {direct.length > 0 && (
            <>
              <p className="font-bold text-foreground">{t('profile.alertContains')}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {direct.map((h) => (
                  <span
                    key={`${h.type}-${h.label}`}
                    className="rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground"
                  >
                    {(locale === 'ary' && h.labelAr) || h.label}
                  </span>
                ))}
              </div>
            </>
          )}

          {traces.length > 0 && (
            <div className={direct.length > 0 ? 'mt-3' : ''}>
              <p className="font-semibold text-foreground text-sm">{t('profile.alertTraces')}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {traces.map((h) => (
                  <span
                    key={`trace-${h.label}`}
                    className="rounded-full border border-orange-400 dark:border-orange-700 px-2.5 py-1 text-xs font-semibold text-orange-800 dark:text-orange-300"
                  >
                    {(locale === 'ary' && h.labelAr) || h.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <a
            href="/profil"
            className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal size={13} /> {t('profile.edit')}
          </a>
        </div>
      </div>
    </div>
  )
}
