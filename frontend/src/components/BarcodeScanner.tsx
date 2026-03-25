/**
 * Scanner de code-barres — composant React interactif
 *
 * - Bibliothèque : @zxing/library
 * - Détection EAN-13 et EAN-8
 * - Overlay avec ligne de scan animée
 * - Fallback : input texte manuel
 * - Vibration haptic sur scan réussi
 *
 * Référence : SPEC.md §9
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface BarcodeScannerProps {
  /** Appelé quand un code-barres est détecté */
  onScan: (barcode: string) => void
  /** Appelé en cas d'erreur caméra */
  onError?: (error: string) => void
  /** Désactiver le scanner */
  disabled?: boolean
  /** Classes CSS additionnelles */
  className?: string
}

// Validation EAN-8 / EAN-13
function isValidEan(code: string): boolean {
  return /^\d{8}$|^\d{13}$/.test(code)
}

// ────────────────────────────────────────────────────────────────
// Composant
// ────────────────────────────────────────────────────────────────

export default function BarcodeScanner({
  onScan,
  onError,
  disabled = false,
  className,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  // Vibration haptic
  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(100)
    }
  }, [])

  // Gestion du résultat de scan
  const handleDetection = useCallback(
    (barcode: string) => {
      // Éviter les doublons rapides
      if (barcode === lastScanned) return
      if (!isValidEan(barcode)) return

      setLastScanned(barcode)
      vibrate()
      onScan(barcode)

      // Reset après 3s pour permettre un re-scan
      setTimeout(() => setLastScanned(null), 3000)
    },
    [lastScanned, onScan, vibrate]
  )

  // Initialisation caméra + décodage
  useEffect(() => {
    if (disabled || showManual) return

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)

    const reader = new BrowserMultiFormatReader(hints)
    readerRef.current = reader

    let mounted = true

    async function startCamera() {
      try {
        if (!videoRef.current) return

        await reader.decodeFromVideoDevice(
          undefined, // Caméra arrière par défaut
          videoRef.current,
          (result, error) => {
            if (!mounted) return

            if (result) {
              handleDetection(result.getText())
            }

            // Ne pas logger les erreurs de "not found" à chaque frame
            if (error && error.name !== 'NotFoundException') {
              console.warn('[BarcodeScanner] decode error:', error.message)
            }
          }
        )

        if (mounted) {
          setCameraActive(true)
          setCameraError(null)
        }
      } catch (err) {
        if (!mounted) return

        const message =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Accès à la caméra refusé. Autorisez la caméra dans les paramètres.'
            : err instanceof DOMException && err.name === 'NotFoundError'
              ? 'Aucune caméra détectée sur cet appareil.'
              : 'Impossible d\'accéder à la caméra.'

        setCameraError(message)
        setCameraActive(false)
        onError?.(message)
      }
    }

    startCamera()

    return () => {
      mounted = false
      reader.reset()
      setCameraActive(false)
    }
  }, [disabled, showManual, handleDetection, onError])

  // Soumission manuelle
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = manualInput.trim()
    if (isValidEan(trimmed)) {
      vibrate()
      onScan(trimmed)
      setManualInput('')
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {/* Zone caméra */}
      {!showManual && (
        <div className="relative w-full max-w-sm aspect-[3/4] rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
          />

          {/* Overlay avec zone de scan */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Cadre de scan */}
            <div className="relative w-64 h-32 border-2 border-white/70 rounded-lg">
              {/* Coins accentués */}
              <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-3 border-l-3 border-primary rounded-tl-lg" />
              <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-3 border-r-3 border-primary rounded-tr-lg" />
              <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-3 border-l-3 border-primary rounded-bl-lg" />
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-3 border-r-3 border-primary rounded-br-lg" />

              {/* Ligne de scan animée */}
              {cameraActive && (
                <div className="absolute left-2 right-2 h-0.5 bg-primary shadow-[0_0_8px_rgba(22,163,74,0.6)] animate-scan" />
              )}
            </div>
          </div>

          {/* Indication de scan réussi */}
          {lastScanned && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              {lastScanned}
            </div>
          )}

          {/* Erreur caméra */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
              <svg
                className="w-12 h-12 text-muted-foreground mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                />
              </svg>
              <p className="text-white text-sm mb-4">{cameraError}</p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowManual(true)}
              >
                Saisir manuellement
              </Button>
            </div>
          )}

          {/* Instructions */}
          {cameraActive && !cameraError && !lastScanned && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs">
              Placez le code-barres dans le cadre
            </div>
          )}
        </div>
      )}

      {/* Mode saisie manuelle */}
      {showManual && (
        <form
          onSubmit={handleManualSubmit}
          className="w-full max-w-sm flex flex-col gap-3"
        >
          <label className="text-sm font-medium text-foreground">
            Code-barres (EAN-8 ou EAN-13)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={13}
              placeholder="6111080016394"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value.replace(/\D/g, ''))}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
            <Button
              type="submit"
              disabled={!isValidEan(manualInput.trim())}
            >
              Chercher
            </Button>
          </div>
          {manualInput.length > 0 && !isValidEan(manualInput) && (
            <p className="text-xs text-destructive">
              Entrez 8 ou 13 chiffres
            </p>
          )}
        </form>
      )}

      {/* Bascule caméra / manuel */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowManual(!showManual)}
        className="text-muted-foreground"
      >
        {showManual ? (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            Utiliser la caméra
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Saisir manuellement
          </>
        )}
      </Button>
    </div>
  )
}
