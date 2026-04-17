/**
 * Bannière "Installer Bayen" — Android (Chrome/Samsung) + iOS (Safari)
 *
 * Android : utilise l'event natif `beforeinstallprompt`.
 * iOS : pas de prompt natif → affiche un mini guide "Partager → Ajouter".
 *
 * S'affiche après 15s de navigation, peut être rejetée (stockée en localStorage).
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'bayen_install_dismissed'
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000 // 14 jours
const SHOW_AFTER_MS = 15_000 // 15s de navigation avant d'afficher

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

function wasRecentlyDismissed(): boolean {
  const stored = localStorage.getItem(DISMISS_KEY)
  if (!stored) return false
  const ts = parseInt(stored, 10)
  if (!isFinite(ts)) return true // anciennes valeurs 'true' → traiter comme refusé
  return Date.now() - ts < DISMISS_COOLDOWN_MS
}

export default function InstallPrompt() {
  const { t } = useLocale()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (wasRecentlyDismissed()) return

    // Android — event natif
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS — pas d'event, on affiche après 15s
    let iosTimer: ReturnType<typeof setTimeout> | undefined
    if (isIos()) {
      iosTimer = setTimeout(() => setShowIosGuide(true), SHOW_AFTER_MS)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  if (dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    setDeferredPrompt(null)
    setShowIosGuide(false)
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* storage plein/bloqué */ }
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setDeferredPrompt(null)
      } else {
        handleDismiss()
      }
    } catch {
      handleDismiss()
    }
  }

  // ─── iOS guide (pas de prompt natif) ─────────────────────
  if (showIosGuide) {
    return (
      <div dir="ltr" className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 rounded-xl border bg-card p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t('install.ios.title')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('install.ios.step1')}</p>
            <p className="text-xs text-muted-foreground">{t('install.ios.step2')}</p>
          </div>
          <button onClick={handleDismiss} aria-label="Fermer" className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // ─── Android prompt natif disponible ─────────────────────
  if (!deferredPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 rounded-xl border bg-card p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{t('install.title')}</p>
          <p className="text-xs text-muted-foreground">{t('install.subtitle')}</p>
        </div>
        <button onClick={handleDismiss} aria-label={t('install.later')} className="text-muted-foreground hover:text-foreground flex-shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <Button size="sm" className="w-full mt-3" onClick={handleInstall}>
        {t('install.button')}
      </Button>
    </div>
  )
}
