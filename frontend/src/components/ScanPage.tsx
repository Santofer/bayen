/**
 * Page scanner — composant React client
 * Gère le BarcodeScanner + redirection vers /produit/[barcode]
 */

import { useState, useCallback } from 'react'
import BarcodeScanner from '@/components/BarcodeScanner'
import { Button } from '@/components/ui/button'

type ScanState = 'scanning' | 'loading' | 'not_found' | 'error'

export default function ScanPage() {
  const [state, setState] = useState<ScanState>('scanning')
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleScan = useCallback((barcode: string) => {
    setState('loading')
    setScannedBarcode(barcode)

    // Redirection vers la page produit — le SSR fera l'appel /custom/scan
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
      {/* Titre */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Scanner un produit</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Scannez le code-barres pour obtenir le score
        </p>
      </div>

      {/* Scanner */}
      {state === 'scanning' && (
        <BarcodeScanner
          onScan={handleScan}
          onError={handleError}
          className="w-full max-w-sm"
        />
      )}

      {/* Chargement */}
      {state === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">
            Recherche du produit <span className="font-mono font-medium text-foreground">{scannedBarcode}</span>...
          </p>
        </div>
      )}

      {/* Erreur */}
      {state === 'error' && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <p className="text-sm text-foreground">{errorMessage ?? 'Une erreur est survenue'}</p>
          <Button onClick={handleReset}>Réessayer</Button>
        </div>
      )}

      {/* Guide */}
      {state === 'scanning' && (
        <div className="mt-8 w-full max-w-sm">
          <h2 className="text-sm font-medium text-foreground mb-3">Conseils pour un bon scan</h2>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 text-primary flex-shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Placez le code-barres bien centré dans le cadre
            </li>
            <li className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 text-primary flex-shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Assurez un bon éclairage, évitez les reflets
            </li>
            <li className="flex items-start gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 text-primary flex-shrink-0">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Distance idéale : 15–25 cm du produit
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
