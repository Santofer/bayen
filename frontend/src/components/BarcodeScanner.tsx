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
        <div className="relative w-full max-w-sm aspect-[3/4] rounded-[28px] overflow-hidden border-2 border-line bg-encre shadow-[var(--shadow-lift)]">
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
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
              style={{ background: 'radial-gradient(ellipse 150px 95px at 50% 50%, transparent 98%, color-mix(in srgb, var(--color-encre) 62%, transparent) 100%)' }}
            >
              {/* Cadre de visée menthe : équerres arrondies (maquette Scan) */}
              <div className="relative w-64 h-36">
                <div className="absolute top-0 left-0 w-12 h-10 border-t-4 border-l-4 border-menthe rounded-tl-[22px]" />
                <div className="absolute top-0 right-0 w-12 h-10 border-t-4 border-r-4 border-menthe rounded-tr-[22px]" />
                <div className="absolute bottom-0 left-0 w-12 h-10 border-b-4 border-l-4 border-menthe rounded-bl-[22px]" />
                <div className="absolute bottom-0 right-0 w-12 h-10 border-b-4 border-r-4 border-menthe rounded-br-[22px]" />
                {/* Faisceau de balayage menthe */}
                <div
                  className="absolute left-4 right-4 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-menthe animate-pulse"
                  style={{ boxShadow: '0 0 18px var(--color-menthe)' }}
                />
              </div>
            </div>
          )}

          {/* Badge succès */}
          {lastScanned && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-menthe text-encre border-2 border-encre px-4 py-2 rounded-full font-display text-sm font-bold shadow-[var(--shadow-card)] z-20">
              <Check size={14} className="text-current inline-block me-1" />{lastScanned}
            </div>
          )}

          {/* Erreur caméra */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-encre/90 p-6 text-center z-20">
              <img src="/mascotte/naanaa-oups.webp" alt="" width="72" height="106" className="mb-3 h-auto w-[72px]" />
              <p className="text-creme text-sm mb-4">{cameraError}</p>
              <Button variant="secondary" size="sm" onClick={() => setShowManual(true)}>
                Saisir manuellement
              </Button>
            </div>
          )}

          {/* Loading */}
          {starting && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-encre z-20">
              <img src="/mascotte/naanaa-loupe.webp" alt="" width="72" height="106" className="naanaa-bob mb-3 h-auto w-[72px]" />
              <p className="text-creme/70 text-xs">Activation de la caméra...</p>
            </div>
          )}

          {/* Instruction */}
          {cameraActive && !lastScanned && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-creme/15 text-creme border-[1.5px] border-creme/40 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-semibold z-20 flex items-center gap-1.5">
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
              className="flex-1 min-w-0 h-11 rounded-full border-2 border-line bg-card px-4 py-2 font-display text-sm tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
            <Button type="submit" disabled={!isValidBarcode(manualInput.trim())}>Chercher</Button>
          </div>
        </form>
      )}

      <Button variant="ghost" size="sm" onClick={() => setShowManual(!showManual)} className="text-muted-foreground">
        {showManual
          ? <><Camera size={14} className="text-current inline-block me-1" />Utiliser la caméra</>
          : <><Keyboard size={14} className="text-current inline-block me-1" />Saisir manuellement</>}
      </Button>
    </div>
  )
}
