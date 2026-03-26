/**
 * Scanner de code-barres — html5-qrcode
 * Détection EAN-13, EAN-8, UPC-A, UPC-E
 * Fiable sur mobile (iOS Safari, Android Chrome)
 * Fallback : input texte manuel
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, Camera, Keyboard } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

function isValidBarcode(code: string): boolean {
  return /^\d{8,13}$/.test(code)
}

export default function BarcodeScanner({ onScan, onError, disabled = false, className }: BarcodeScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null)
  const html5QrCodeRef = useRef<unknown>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(100)
  }, [])

  const lastScannedRef = useRef<string | null>(null)

  const handleDetection = useCallback(
    (barcode: string) => {
      if (barcode === lastScannedRef.current) return
      if (!isValidBarcode(barcode)) return
      lastScannedRef.current = barcode
      setLastScanned(barcode)
      vibrate()
      onScan(barcode)
      setTimeout(() => {
        lastScannedRef.current = null
        setLastScanned(null)
      }, 3000)
    },
    [onScan, vibrate]
  )

  useEffect(() => {
    if (disabled || showManual) return
    if (!scannerRef.current) return

    let mounted = true
    const containerId = 'bayen-barcode-scanner'

    // Assurer que le container a un ID
    scannerRef.current.id = containerId

    async function startScanner() {
      setStarting(true)

      try {
        // Import dynamique pour éviter les problèmes SSR
        const { Html5Qrcode } = await import('html5-qrcode')

        if (!mounted) return

        const scanner = new Html5Qrcode(containerId, {
          verbose: false,
        })

        html5QrCodeRef.current = scanner

        // Configuration optimisée pour les codes-barres
        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 120 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText: string) => {
            // Callback de succès
            if (mounted) {
              handleDetection(decodedText)
            }
          },
          () => {
            // Callback d'échec (NotFoundException) — silencieux
          }
        )

        if (mounted) {
          setCameraActive(true)
          setCameraError(null)
          setStarting(false)
        }
      } catch (err) {
        if (!mounted) return
        setStarting(false)

        let message: string
        if (err instanceof Error) {
          if (err.message.includes('NotAllowedError') || err.message.includes('Permission')) {
            message = 'Accès caméra refusé. Autorisez dans les paramètres du navigateur.'
          } else if (err.message.includes('NotFoundError') || err.message.includes('Requested device not found')) {
            message = 'Aucune caméra détectée.'
          } else {
            message = `Erreur caméra : ${err.message}`
          }
        } else {
          message = 'Erreur caméra inconnue'
        }

        setCameraError(message)
        setCameraActive(false)
        onError?.(message)
      }
    }

    startScanner()

    return () => {
      mounted = false
      const scanner = html5QrCodeRef.current as { stop?: () => Promise<void>; clear?: () => void } | null
      if (scanner?.stop) {
        scanner.stop().catch(() => {
          // Ignorer les erreurs de nettoyage
        })
      }
      if (scanner?.clear) {
        scanner.clear()
      }
      html5QrCodeRef.current = null
      setCameraActive(false)
    }
  }, [disabled, showManual, handleDetection, onError])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = manualInput.trim()
    if (isValidBarcode(trimmed)) {
      vibrate()
      onScan(trimmed)
      setManualInput('')
    }
  }

  return (
    <div className={cn('flex flex-col items-center gap-4', className)}>
      {!showManual && (
        <div className="relative w-full max-w-sm rounded-xl overflow-hidden bg-black">
          {/* Container pour html5-qrcode */}
          <div
            ref={scannerRef}
            className="w-full"
            style={{ minHeight: '320px' }}
          />

          {/* Badge de succès */}
          {lastScanned && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-10">
              <Check size={14} className="text-current inline-block mr-1" />{lastScanned}
            </div>
          )}

          {/* Erreur caméra */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center z-10">
              <p className="text-white text-sm mb-4">{cameraError}</p>
              <Button variant="secondary" size="sm" onClick={() => setShowManual(true)}>
                Saisir manuellement
              </Button>
            </div>
          )}

          {/* Loading */}
          {starting && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-white/60 text-xs">Activation de la caméra...</p>
            </div>
          )}

          {/* Instruction */}
          {cameraActive && !lastScanned && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs z-10">
              Placez le code-barres dans le cadre
            </div>
          )}
        </div>
      )}

      {showManual && (
        <form onSubmit={handleManualSubmit} className="w-full max-w-sm flex flex-col gap-3">
          <label className="text-sm font-medium text-foreground">Code-barres</label>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={13}
              placeholder="6111080016394"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value.replace(/\D/g, ''))}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
            <Button type="submit" disabled={!isValidBarcode(manualInput.trim())}>Chercher</Button>
          </div>
        </form>
      )}

      <Button variant="ghost" size="sm" onClick={() => setShowManual(!showManual)} className="text-muted-foreground">
        {showManual ? <><Camera size={14} className="text-current inline-block mr-1" />Utiliser la caméra</> : <><Keyboard size={14} className="text-current inline-block mr-1" />Saisir manuellement</>}
      </Button>
    </div>
  )
}
