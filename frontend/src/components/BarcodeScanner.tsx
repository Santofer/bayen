/**
 * Scanner de code-barres — @zxing/library
 * Détection EAN-13, EAN-8, UPC-A
 * Fallback : input texte manuel
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [lastScanned, setLastScanned] = useState<string | null>(null)

  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(100)
  }, [])

  const handleDetection = useCallback(
    (barcode: string) => {
      if (barcode === lastScanned) return
      if (!isValidBarcode(barcode)) return
      setLastScanned(barcode)
      vibrate()
      onScan(barcode)
      setTimeout(() => setLastScanned(null), 3000)
    },
    [lastScanned, onScan, vibrate]
  )

  useEffect(() => {
    if (disabled || showManual) return

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)

    const reader = new BrowserMultiFormatReader(hints)
    readerRef.current = reader

    let mounted = true

    async function startCamera() {
      try {
        if (!videoRef.current) return

        // Obtenir le flux vidéo directement via getUserMedia
        // avec des contraintes optimisées pour le scan de code-barres
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        }

        let stream: MediaStream
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
        } catch {
          // Fallback : contraintes minimales
          stream = await navigator.mediaDevices.getUserMedia({ video: true })
        }

        streamRef.current = stream

        // Attacher le flux à la vidéo
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        videoRef.current.setAttribute('autoplay', 'true')
        await videoRef.current.play()

        if (mounted) {
          setCameraActive(true)
          setCameraError(null)
        }

        // Lancer le décodage continu sur le flux
        const decodeLoop = async () => {
          while (mounted && videoRef.current && stream.active) {
            try {
              const result = await reader.decodeOnce(videoRef.current)
              if (result && mounted) {
                handleDetection(result.getText())
              }
            } catch {
              // NotFoundException est normal — continuer le scan
            }
            // Petit délai entre chaque tentative
            await new Promise(r => setTimeout(r, 150))
          }
        }

        decodeLoop()

      } catch (err) {
        if (!mounted) return
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

    startCamera()

    return () => {
      mounted = false
      reader.reset()
      // Arrêter proprement le flux vidéo
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
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            muted
          />

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

          {lastScanned && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
              ✓ {lastScanned}
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
              <p className="text-white text-sm mb-4">{cameraError}</p>
              <Button variant="secondary" size="sm" onClick={() => setShowManual(true)}>
                Saisir manuellement
              </Button>
            </div>
          )}

          {!cameraActive && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-white/60 text-xs">Activation de la caméra...</p>
            </div>
          )}

          {cameraActive && !lastScanned && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1.5 rounded-full text-xs">
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
        {showManual ? '📷 Utiliser la caméra' : '⌨️ Saisir manuellement'}
      </Button>
    </div>
  )
}
