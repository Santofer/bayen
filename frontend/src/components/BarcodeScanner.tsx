/**
 * Scanner de code-barres — vue caméra de la maquette « Scan » (plein écran
 * sombre sur mobile, carte sur ordinateur) : coins de visée menthe, ligne de
 * scan animée, puce « Vise le code-barres », fermer, lampe (si l'appareil l'a),
 * saisie manuelle.
 *
 * Stratégie de détection :
 * 1. Android Chrome : BarcodeDetector API natif (le plus rapide)
 * 2. Autres navigateurs (iOS Safari) : polyfill barcode-detector (ZXing WASM)
 *    avec capture manuelle des frames via canvas (contourne les limitations iOS)
 *
 * Le passage par canvas est ESSENTIEL pour iOS Safari car detector.detect(video)
 * ne fonctionne pas de manière fiable sur WebKit — il faut dessiner la frame
 * sur un canvas puis passer le canvas au détecteur.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Camera, Keyboard } from 'lucide-react'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onError?: (error: string) => void
  /** Met la détection en pause (feuille de résultat ouverte) sans couper la caméra */
  disabled?: boolean
  className?: string
}

// Formats EAN/UPC supportés — couvre 99% des produits au Maroc
const BARCODE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const

// Même code vu en continu : ignoré tant qu'il ne quitte pas le cadre ~3 s
const SAME_CODE_MS = 3000

function isValidBarcode(code: string): boolean {
  return /^\d{8,13}$/.test(code)
}

/** Détecte si le navigateur a l'API BarcodeDetector native (Android Chrome) */
function hasNativeBarcodeDetector(): boolean {
  return typeof globalThis !== 'undefined' && 'BarcodeDetector' in globalThis
}

// Lampe torche : contrainte MediaStream non standard (Chrome Android), absente des types DOM
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }

export default function BarcodeScanner({ onScan, onError, disabled = false, className }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanningRef = useRef(false)
  const lastRef = useRef<{ code: string; at: number } | null>(null)
  const pausedRef = useRef(disabled)
  // Rappels en ref : un nouveau rappel du parent ne redémarre pas la caméra
  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)
  onScanRef.current = onScan
  onErrorRef.current = onError

  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [starting, setStarting] = useState(true)
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  const vibrate = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(100)
  }, [])

  // Reprise après la feuille de résultat : le produit encore dans le cadre ne repart pas
  useEffect(() => {
    pausedRef.current = disabled
    if (!disabled && lastRef.current) lastRef.current.at = Date.now()
  }, [disabled])

  const handleDetection = useCallback(
    (barcode: string) => {
      if (pausedRef.current || !isValidBarcode(barcode)) return
      const now = Date.now()
      const last = lastRef.current
      if (last && last.code === barcode && now - last.at < SAME_CODE_MS) {
        last.at = now
        return
      }
      lastRef.current = { code: barcode, at: now }
      vibrate()
      onScanRef.current(barcode)
    },
    [vibrate]
  )

  useEffect(() => {
    if (showManual) return

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

        // Lampe : bouton affiché seulement si la piste vidéo la propose
        const track = stream.getVideoTracks()[0]
        const caps = track?.getCapabilities?.() as TorchCapabilities | undefined
        setTorchAvailable(caps?.torch === true)

        // 2. Créer le détecteur
        // Android Chrome : API natif (pas besoin de canvas)
        // iOS Safari : polyfill WASM + canvas obligatoire
        const useNative = hasNativeBarcodeDetector()

        let detector: InstanceType<typeof globalThis.BarcodeDetector>

        if (useNative) {
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

        // 4. Boucle de détection (en pause pendant que la feuille de résultat est ouverte)
        const scanInterval = useNative ? 150 : 250 // WASM est plus lent, espacer davantage

        while (mounted && scanningRef.current) {
          if (pausedRef.current || video.readyState < 2) {
            await new Promise(r => setTimeout(r, 120))
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
        onErrorRef.current?.(message)
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
      setTorchAvailable(false)
      setTorchOn(false)
    }
  }, [showManual, handleDetection])

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    const torch: MediaTrackConstraintSet & { torch: boolean } = { torch: next }
    try {
      await track.applyConstraints({ advanced: [torch] })
      setTorchOn(next)
    } catch {
      setTorchAvailable(false)
    }
  }

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
    <div
      className={cn(
        'relative h-[100svh] min-h-[560px] overflow-hidden bg-[#120C1F] text-creme',
        'md:h-auto md:min-h-0 md:aspect-[4/3] md:rounded-[28px] md:border-2 md:border-line md:shadow-[4px_4px_0_var(--color-hard)]',
        className
      )}
    >
      {/* Flux vidéo caméra (reste monté : la saisie manuelle le masque seulement) */}
      <video ref={videoRef} className={cn('absolute inset-0 size-full object-cover', showManual && 'hidden')} playsInline autoPlay muted />

      {/* Visée : voile sombre autour, coins menthe, ligne de scan animée */}
      {cameraActive && !showManual && (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,transparent_0_150px,rgb(18_12_31/.72)_151px)]" />
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[40%] h-[200px] w-[280px] -translate-x-1/2 -translate-y-1/2">
            <div className="absolute inset-0 rounded-[28px] border-4 border-menthe opacity-95 [clip-path:polygon(0_0,22%_0,22%_100%,78%_100%,78%_0,100%_0,100%_100%,0_100%)]" />
            <div className="animate-scan absolute inset-x-[18px] h-[3px] rounded-[3px] bg-menthe shadow-[0_0_18px_var(--color-menthe)]" />
          </div>
          <div className="absolute inset-x-4 top-[calc(40%+118px)] z-10 grid justify-items-center gap-3 text-center">
            <p className="text-[13px] opacity-80">Scan en rafale : enchaîne les produits, on garde la liste.</p>
            <button type="button" className="btn sm" onClick={() => setShowManual(true)}>
              <Keyboard aria-hidden="true" />
              Saisir manuellement
            </button>
          </div>
        </>
      )}

      {/* Activation de la caméra */}
      {starting && !cameraError && !showManual && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#120C1F]">
          <img src="/mascotte/naanaa-loupe.webp" alt="" width="72" height="106" className="naanaa-bob mb-3 h-auto w-[72px]" />
          <p className="text-xs opacity-70">Activation de la caméra...</p>
        </div>
      )}

      {/* Erreur caméra (permission refusée, pas de caméra…) */}
      {cameraError && !showManual && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-encre/90 p-6 text-center">
          <img src="/mascotte/naanaa-oups.webp" alt="" width="72" height="106" className="h-auto w-[72px]" />
          <p className="max-w-xs text-sm">{cameraError}</p>
          <button type="button" className="btn sm" onClick={() => setShowManual(true)}>
            <Keyboard aria-hidden="true" />
            Saisir manuellement
          </button>
        </div>
      )}

      {/* Saisie manuelle du code */}
      {showManual && (
        <div className="absolute inset-0 z-20 grid place-items-center p-5">
          <form onSubmit={handleManualSubmit} className="card grid w-full max-w-sm gap-3 p-5">
            <label htmlFor="manual-barcode" className="disp d-s">Code-barres</label>
            <div className="flex gap-2">
              <input
                id="manual-barcode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={13}
                placeholder="6111080016394"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value.replace(/\D/g, ''))}
                className="h-11 min-w-0 flex-1 rounded-full border-2 border-line bg-background px-4 py-2 font-display text-sm tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
              <button type="submit" className="btn primary min-h-11" disabled={!isValidBarcode(manualInput.trim())}>Chercher</button>
            </div>
            <button type="button" className="btn sm flat justify-self-start" onClick={() => { setShowManual(false); setStarting(true) }}>
              <Camera aria-hidden="true" />
              Utiliser la caméra
            </button>
          </form>
        </div>
      )}

      {/* Barre du haut : fermer · consigne · lampe */}
      <div className="absolute inset-x-4 top-3.5 z-30 flex items-center justify-between gap-2">
        <a className="icon-btn md:invisible" href="/" aria-label="Fermer le scanner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </a>
        <span className="chip border-creme/40 bg-creme/15 text-creme">Vise le code-barres</span>
        {torchAvailable ? (
          <button
            type="button"
            className={cn('icon-btn', torchOn && 'bg-citron text-encre')}
            aria-label={torchOn ? 'Éteindre la lampe' : 'Allumer la lampe'}
            aria-pressed={torchOn}
            onClick={toggleTorch}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
          </button>
        ) : (
          <span className="size-11" aria-hidden="true" />
        )}
      </div>
    </div>
  )
}
