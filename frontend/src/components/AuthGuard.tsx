/**
 * Garde d'authentification côté client
 *
 * Redirige vers /connexion si l'utilisateur n'est pas connecté.
 * À utiliser dans les pages protégées (ex: /compte) via client:load.
 *
 * Note : le site est en output: 'static', donc pas de middleware SSR.
 * La protection se fait côté client avec redirection immédiate.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { initAuth, isAuthenticated } from '@/lib/auth'

interface AuthGuardProps {
  /** Contenu à afficher si authentifié */
  children: ReactNode
  /** URL de la page actuelle (pour redirect après login) */
  redirectPath?: string
}

export default function AuthGuard({ children, redirectPath = '/compte' }: AuthGuardProps) {
  const [state, setState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')

  useEffect(() => {
    async function checkAuth(): Promise<void> {
      await initAuth()
      if (isAuthenticated()) {
        setState('authenticated')
      } else {
        setState('unauthenticated')
        window.location.href = `/connexion?redirect=${encodeURIComponent(redirectPath)}`
      }
    }

    void checkAuth()
  }, [redirectPath])

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-muted-foreground">Vérification...</p>
        </div>
      </div>
    )
  }

  if (state === 'unauthenticated') {
    // Pendant la redirection, afficher le spinner
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">Redirection vers la connexion...</p>
      </div>
    )
  }

  return <>{children}</>
}
