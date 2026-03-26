/**
 * Menu utilisateur dans le header
 * Affiche les initiales + dropdown si connecté, ou un lien "Connexion" sinon
 */

import { useEffect, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCurrentUser, initAuth, isAuthenticated, logout, onAuthChange } from '@/lib/auth'
import { useLocale } from '@/lib/i18n'
import type { UserProfile } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Extrait les initiales d'un nom (max 2 lettres) */
function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Labels français pour les rangs */
const rankLabels: Record<UserProfile['rank'], string> = {
  nouveau: 'Nouveau',
  contributeur: 'Contributeur',
  expert: 'Expert',
  vérifié: 'Vérifié',
}

export default function UserMenu() {
  const { t } = useLocale()
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Chargement initial du profil
  useEffect(() => {
    async function loadUser(): Promise<void> {
      await initAuth()
      if (isAuthenticated()) {
        const profile = await getCurrentUser()
        setUser(profile)
      }
      setLoading(false)
    }

    void loadUser()

    // Écouter les changements d'état auth
    const unsubscribe = onAuthChange(() => {
      if (!isAuthenticated()) {
        setUser(null)
      } else {
        void getCurrentUser().then(setUser)
      }
    })

    return unsubscribe
  }, [])

  // Fermer le menu au clic extérieur
  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleLogout(): Promise<void> {
    setMenuOpen(false)
    await logout()
    window.location.href = '/'
  }

  // État de chargement
  if (loading) {
    return (
      <div className="ml-3 w-10 h-10 rounded-full bg-muted animate-pulse" />
    )
  }

  // Non connecté — lien vers connexion
  if (!user) {
    return (
      <Button variant="ghost" size="sm" asChild className="ml-3">
        <a href="/connexion">{t('nav.login')}</a>
      </Button>
    )
  }

  // Connecté — avatar + dropdown
  return (
    <div className="relative ml-3" ref={menuRef}>
      {/* Bouton avatar */}
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-colors',
          'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
        aria-label="Menu utilisateur"
        aria-expanded={menuOpen}
      >
        {getInitials(user.display_name)}
      </button>

      {/* Dropdown menu */}
      {menuOpen && (
        <div className="absolute right-0 top-12 w-64 rounded-lg border bg-background shadow-lg z-50">
          {/* Info utilisateur */}
          <div className="p-4 border-b">
            <p className="font-medium text-sm truncate">{user.display_name || user.email}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              {user.role === 'admin' && (
                <Badge className="text-xs bg-red-600 text-white hover:bg-red-700">Admin</Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {rankLabels[user.rank]}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {user.points} pts
              </span>
            </div>
          </div>

          {/* Liens */}
          <div className="p-2">
            <a
              href="/compte"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M19 21v-2a4 4 0 00-4-4H9a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              {t('nav.account')}
            </a>
            {user.role === 'admin' && (
              <a
                href="/admin/import-off"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                  <path d="M12 3v12" /><path d="m8 11 4 4 4-4" /><path d="M8 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-4" />
                </svg>
                Import OFF (admin)
              </a>
            )}
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
