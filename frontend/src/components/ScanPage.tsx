/**
 * Page scanner — composant React client
 * Gère le BarcodeScanner + redirection vers /produit/[barcode]
 */

import { useState, useCallback } from 'react'
import BarcodeScanner from '@/components/BarcodeScanner'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n'

type ScanState = 'scanning' | 'loading' | 'not_found' | 'error'

export default function ScanPage() {
  const { t } = useLocale()
  const [state, setState] = useState<ScanState>('scanning')
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleScan = useCallback((barcode: string) => {
    setState('loading')
    setScannedBarcode(barcode)

    // Redirection vers la page produit — le SSR fera l'appel /bayen-api/scan
    window.location.href = `/produit/${barcode}`
  }, [])

  const handleError = useCallback((error: string) => {
    setErrorMessage(error)
  }, [])

  const handleReset = useCallback(() => {
    setState('scanning')
    setScannedBarcode(null)
    setErrorMessage(null)
  }, [])

  return (
    <div className="flex flex-col items-center px-4 py-8 pb-24">
      {/* Titre + invitation de Naânaa */}
      <div className="w-full max-w-sm mb-6 space-y-3">
        <h1 className="text-2xl font-bold text-foreground text-center">{t('scan.title')}</h1>
        <div className="naanaa">
          <img src="/mascotte/naanaa-scan.webp" alt="" width="64" height="94" className="naanaa-bob" />
          <p className="bubble">{t('scan.subtitle')}</p>
        </div>
      </div>

      {/* Scanner (reste monté, caméra coupée, pendant la recherche : le panneau monte par-dessus) */}
      {(state === 'scanning' || state === 'loading') && (
        <BarcodeScanner
          onScan={handleScan}
          onError={handleError}
          disabled={state === 'loading'}
          className="w-full max-w-sm"
        />
      )}

      {/* Chargement : panneau résultat qui remonte du bas (maquette Scan) */}
      {state === 'loading' && (
        <section
          role="status"
          aria-live="polite"
          className="animate-fade-up fixed inset-x-2.5 bottom-3 z-50 mx-auto max-w-md rounded-[28px] border-2 border-line bg-card p-4 pt-3 shadow-[0_-4px_0_var(--color-hard)]"
        >
          <span className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-muted-foreground/40" aria-hidden="true" />
          <div className="grid grid-cols-[72px_1fr] items-center gap-3">
            <div className="tint-figue flex h-[72px] w-[72px] items-end justify-center overflow-hidden rounded-2xl border-2 border-line">
              <img src="/mascotte/naanaa-loupe.webp" alt="" width="56" height="82" className="naanaa-bob h-auto w-14" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('scan.loading')}…</p>
              <p className="font-display text-lg font-extrabold text-foreground truncate">{scannedBarcode}</p>
              <div className="skeleton h-2.5 w-3/4" />
            </div>
          </div>
        </section>
      )}

      {/* Erreur */}
      {state === 'error' && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="naanaa">
            <img src="/mascotte/naanaa-oups.webp" alt="" width="72" height="106" />
            <p className="bubble">{errorMessage ?? t('common.error')}</p>
          </div>
          <Button onClick={handleReset}>{t('scan.retry')}</Button>
        </div>
      )}

      {/* Guide */}
      {state === 'scanning' && (
        <div className="mt-8 w-full max-w-sm rounded-2xl border bg-card p-4">
          <h2 className="text-sm font-bold text-foreground mb-3">{t('scan.tips.title')}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 text-brand-ink flex-shrink-0" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t('scan.tip1')}
            </li>
            <li className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 text-brand-ink flex-shrink-0" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t('scan.tip2')}
            </li>
            <li className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 text-brand-ink flex-shrink-0" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {t('scan.tip3')}
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
