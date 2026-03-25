/**
 * Bannière "Installer l'application" pour mobile
 * S'affiche quand le beforeinstallprompt est disponible
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Vérifier si déjà installée
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Vérifier si déjà refusée
    if (localStorage.getItem('bayen_install_dismissed') === 'true') return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!deferredPrompt || dismissed) return null

  const handleInstall = async () => {
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('bayen_install_dismissed', 'true')
  }

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
        <div className="flex-1">
          <p className="text-sm font-medium">Installer Bayen</p>
          <p className="text-xs text-muted-foreground">Accès rapide depuis votre écran d'accueil</p>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <Button size="sm" className="w-full mt-3" onClick={handleInstall}>
        Installer
      </Button>
    </div>
  )
}
