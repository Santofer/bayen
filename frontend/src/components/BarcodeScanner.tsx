/**
 * Scanner de code-barres — capture canvas + polyfill BarcodeDetector
 *
 * Stratégie :
 * 1. Android Chrome : BarcodeDetector API natif (le plus rapide)
 * 2. Autres navigateurs (iOS Safari) : polyfill barcode-detector (ZXing WASM)
 *    avec capture manuelle des frames via canvas (contourne les limitations iOS)
 *
 * Le passage par canvas est ESSENTIEL pour iOS Safari car detector.detect(video)
 * ne fonctionne pas de manière fiable sur WebKit — il faut dessiner la frame
 * sur un canvas puis passer le canvas au détecteur.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, Camera, Keyboard, ScanBarcode } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onError?: (error: string) => void
  disabled?: boolean
  className?: string
}

// Formats EAN/UPC supportés — couvre 99% des produits au Maroc
const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

function isValidBarcode(code: string): boolean {
  return /^\d{8,13}$/.test(code)
}

/** Détecte si le navigateur a l'API BarcodeDetector native (Android Chrome) */
function hasNativeBarcodeDetector(): boolean {
  return typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis
}

export default function BarcodeScanner({ onScan, onError, disabled = false, className }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const lastScannedRef = useRef<string | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)

  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(100)
  }, [])

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

    let mounted = true
    scanningRef.current = true

    async function startScanner() {
      try {
        // 1. Accès caméra — préférer arrière, haute résolution pour meilleure détection
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
            audio: false,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        streamRef.current = stream

        const video = videoRef.current
        if (!video) return

        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        await video.play()

        if (!mounted) return
        setCameraActive(true)
        setCameraError(null)
        setStarting(false)

        // 2. Créer le détecteur
        // Android Chrome : API natif (pas besoin de canvas)
        // iOS Safari : polyfill WASM + canvas obligatoire
        const useNative = hasNativeBarcodeDetector()

        let detector: InstanceType<typeof globalThis.BarcodeDetector>

        if (useNative) {
          // @ts-expect-error — BarcodeDetector natif Android
          detector = new globalThis.BarcodeDetector({ formats: [...BARCODE_FORMATS] })
        } else {
          // Charger le polyfill dynamiquement (lazy — WASM chargé ici)
          const { BarcodeDetector: Polyfill } = await import('barcode-detector')
          detector = new Polyfill({ formats: [...BARCODE_FORMATS] })
        }

        // 3. Canvas hors-écran pour capturer les frames (essentiel pour iOS)
        if (!useNative) {
          canvasRef.current = document.createElement('canvas')
        }

        // 4. Boucle de détection
        const scanInterval = useNative ? 150 : 250 // WASM est plus lent, espacer davantage

        while (mounted && scanningRef.current) {
          if (video.readyState < 2) {
            await new Promise(r => setTimeout(r, 100))
            continue
          }

          try {
            let source: HTMLVideoElement | HTMLCanvasElement = video

            // Sur iOS : capturer la frame sur le canvas avant détection
            if (!useNative && canvasRef.current) {
              const canvas = canvasRef.current
              const vw = video.videoWidth
              const vh = video.videoHeight

              if (vw > 0 && vh > 0) {
                canvas.width = vw
                canvas.height = vh
                const ctx = canvas.getContext('2d', { willReadFrequently: true })
                if (ctx) {
                  ctx.drawImage(video, 0, 0, vw, vh)
                  source = canvas
                }
              }
            }

            const barcodes = await detector.detect(source)
            for (const bc of barcodes) {
              if (bc.rawValue && mounted) {
                handleDetection(bc.rawValue)
              }
            }
          } catch {
            // Erreur ponctuelle de détection — continuer
          }

          await new Promise(r => setTimeout(r, scanInterval))
        }
      } catch (err) {
        if (!mounted) return
        setStarting(false)
        const message =
          err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Accès caméra refusé. Autorisez dans les paramètres du navigateur.'
            : err instanceof DOMException && err.name === 'NotFoundError'
              ? 'Aucune caméra détectée.'
              : `Erreur caméra : ${err instanceof Error ? err.message : 'inconnue'}`
        setCameraError(message)
        setCameraActive(false)
        onError?.(message)
      }
    }

    startScanner()

    return () => {
      mounted = false
      scanningRef.current = false
      canvasRef.current = null
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      const video = videoRef.current
      if (video) video.srcObject = null
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
        <div className="relative w-full max-w-sm aspect-[3/4] rounded-xl overflow-hidden bg-black">
          {/* Flux vidéo caméra */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
          />

          {/* Overlay scan */}
          {cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="relative w-64 h-32 border-2 border-white/70 rounded-lg">
                <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-3 border-l-3 border-primary rounded-tl-lg" />
                <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-3 border-r-3 border-primary rounded-tr-lg" />
                <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-3 border-l-3 border-primary rounded-bl-lg" />
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-3 border-r-3 border-primary rounded-br-lg" />
                <div className="absolute left-2 right-2 h-0.5 bg-primary shadow-[0_0_8px_rgba(22,163,74,0.6)] animate-scan" />
              </div>
            </div>
          )}

          {/* Badge succès */}
          {lastScanned && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg z-20">
              <Check size={14} className="text-current inline-block mr-1" />{lastScanned}
            </div>
          )}

          {/* Erreur caméra */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center z-20">
              <p className="text-white text-sm mb-4">{cameraError}</p>
              <Button variant="secondary" size="sm" onClick={() => setShowManual(true)}>
                Saisir manuellement
              </Button>
            </div>
          )}

          {/* Loading */}
          {starting && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-20">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-white/60 text-xs">Activation de la caméra...</p>
            </div>
          )}

          {/* Instruction */}
          {cameraActive && !lastScanned && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs z-20 flex items-center gap-1.5">
              <ScanBarcode size={14} />
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
        {showManual
          ? <><Camera size={14} className="text-current inline-block mr-1" />Utiliser la caméra</>
          : <><Keyboard size={14} className="text-current inline-block mr-1" />Saisir manuellement</>}
      </Button>
    </div>
  )
}
