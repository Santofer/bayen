/**
 * Scanner de code-barres
 * Stratégie : BarcodeDetector API natif (Chrome/Edge Android 83+)
 *           + fallback html5-qrcode pour iOS Safari
 * Fallback final : input texte manuel
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
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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

    async function startScanning() {
      try {
        // Obtenir le flux caméra
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

        // Essayer BarcodeDetector natif (Chrome Android, Edge)
        const hasBarcodeDetector = typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis

        if (hasBarcodeDetector) {
          // @ts-expect-error — BarcodeDetector n'est pas dans les types TS standard
          const detector = new globalThis.BarcodeDetector({
            formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
          })

          const detectLoop = async () => {
            while (mounted && scanningRef.current && video.readyState >= 2) {
              try {
                // @ts-expect-error — BarcodeDetector.detect()
                const barcodes = await detector.detect(video)
                for (const bc of barcodes) {
                  if (bc.rawValue && mounted) {
                    handleDetection(bc.rawValue)
                  }
                }
              } catch {
                // Erreur de détection — continuer
              }
              await new Promise(r => setTimeout(r, 200))
            }
          }
          detectLoop()
        } else {
          // Fallback : html5-qrcode frame scanning via canvas
          const canvas = canvasRef.current
          if (!canvas) return
          const ctx = canvas.getContext('2d', { willReadFrequently: true })
          if (!ctx) return

          // Import dynamique pour éviter les problèmes SSR
          const { Html5Qrcode } = await import('html5-qrcode')

          // Créer un scanner qui travaille sur des images (pas sur le DOM)
          const tempDiv = document.createElement('div')
          tempDiv.id = `bayen-scanner-${Date.now()}`
          tempDiv.style.display = 'none'
          document.body.appendChild(tempDiv)

          const scanner = new Html5Qrcode(tempDiv.id, { verbose: false })

          const scanLoop = async () => {
            while (mounted && scanningRef.current && video.readyState >= 2) {
              try {
                canvas.width = video.videoWidth || 640
                canvas.height = video.videoHeight || 480
                ctx.drawImage(video, 0, 0)
                const blob = await new Promise<Blob | null>(resolve =>
                  canvas.toBlob(resolve, 'image/jpeg', 0.8)
                )
                if (blob && mounted) {
                  const file = new File([blob], 'frame.jpg', { type: 'image/jpeg' })
                  try {
                    const result = await scanner.scanFileV2(file, false)
                    if (result?.decodedText && mounted) {
                      handleDetection(result.decodedText)
                    }
                  } catch {
                    // Pas de barcode détecté — normal
                  }
                }
              } catch {
                // Erreur canvas — continuer
              }
              await new Promise(r => setTimeout(r, 500))
            }

            // Nettoyage
            try { scanner.clear() } catch { /* ignore */ }
            tempDiv.remove()
          }
          scanLoop()
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

    startScanning()

    return () => {
      mounted = false
      scanningRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
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
          {/* Video natif — pas de manipulation DOM par html5-qrcode */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
          />

          {/* Canvas invisible pour le fallback html5-qrcode */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay scan */}
          {cameraActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs z-10 flex items-center gap-1.5">
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
