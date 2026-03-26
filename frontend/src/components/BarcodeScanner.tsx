/**
 * Scanner de code-barres — double stratégie
 *
 * Android Chrome : BarcodeDetector API natif (instantané)
 * iOS Safari : html5-qrcode en mode caméra dans un div hors React
 *
 * Le div pour html5-qrcode est injecté en dehors de l'arbre React
 * pour éviter les erreurs d'hydratation (#425/#423).
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

function isValidBarcode(code: string): boolean {
  return /^\d{8,13}$/.test(code)
}

export default function BarcodeScanner({ onScan, onError, disabled = false, className }: BarcodeScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const lastScannedRef = useRef<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)
  const [starting, setStarting] = useState(true)
  const [useNative, setUseNative] = useState(false)

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

    const hasBarcodeDetector = typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis

    async function startNativeScanner() {
      // Android Chrome : BarcodeDetector API natif
      setUseNative(true)

      try {
        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }

        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return }
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

        // @ts-expect-error — BarcodeDetector API
        const detector = new globalThis.BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
        })

        const detectLoop = async () => {
          while (mounted && scanningRef.current && video.readyState >= 2) {
            try {
              const barcodes = await detector.detect(video)
              for (const bc of barcodes) {
                if (bc.rawValue && mounted) {
                  handleDetection(bc.rawValue)
                }
              }
            } catch { /* continuer */ }
            await new Promise(r => setTimeout(r, 150))
          }
        }
        detectLoop()

        cleanupRef.current = () => {
          stream.getTracks().forEach(t => t.stop())
          if (video) video.srcObject = null
        }

      } catch (err) {
        if (!mounted) return
        handleCameraError(err)
      }
    }

    async function startHtml5QrcodeScanner() {
      // iOS Safari : html5-qrcode en mode caméra
      // Le div est injecté DANS notre container mais APRÈS le mount React
      setUseNative(false)

      try {
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!mounted) return

        const container = containerRef.current
        if (!container) return

        // Créer un div pour html5-qrcode EN DEHORS de l'arbre React
        const scanDiv = document.createElement('div')
        scanDiv.id = `bayen-qr-${Date.now()}`
        scanDiv.style.width = '100%'
        scanDiv.style.height = '100%'
        scanDiv.style.position = 'absolute'
        scanDiv.style.top = '0'
        scanDiv.style.left = '0'
        container.appendChild(scanDiv)

        const scanner = new Html5Qrcode(scanDiv.id, { verbose: false })

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 0.75,
            disableFlip: false,
          },
          (decodedText: string) => {
            if (mounted && isValidBarcode(decodedText)) {
              handleDetection(decodedText)
            }
          },
          () => { /* NotFoundException — normal */ }
        )

        if (!mounted) {
          await scanner.stop().catch(() => {})
          scanner.clear()
          scanDiv.remove()
          return
        }

        setCameraActive(true)
        setCameraError(null)
        setStarting(false)

        cleanupRef.current = () => {
          scanner.stop().catch(() => {}).finally(() => {
            try { scanner.clear() } catch { /* ignore */ }
            scanDiv.remove()
          })
        }

      } catch (err) {
        if (!mounted) return
        handleCameraError(err)
      }
    }

    function handleCameraError(err: unknown) {
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

    if (hasBarcodeDetector) {
      startNativeScanner()
    } else {
      startHtml5QrcodeScanner()
    }

    return () => {
      mounted = false
      scanningRef.current = false
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      streamRef.current = null
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
        <div
          ref={containerRef}
          className="relative w-full max-w-sm aspect-[3/4] rounded-xl overflow-hidden bg-black"
        >
          {/* Video natif pour BarcodeDetector (Android) */}
          {useNative && (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              autoPlay
              muted
            />
          )}

          {/* Pour html5-qrcode (iOS) : le div est injecté dynamiquement dans containerRef */}

          {/* Overlay scan — affiché par-dessus le scanner */}
          {cameraActive && useNative && (
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
