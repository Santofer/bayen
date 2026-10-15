/**
 * Garde d'authentification côté client
 *
 * Redirige vers /connexion si l'utilisateur n'est pas connecté.
 * À utiliser dans les pages protégées (ex: /importer) via client:load.
 *
 * Note : le site est en output: 'static', donc pas de middleware SSR.
 * La protection se fait côté client avec redirection immédiate.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { initAuth, isAuthenticated } from '@/lib/auth'
import { useLocale } from '@/lib/i18n'

interface AuthGuardProps {
  /** Contenu à afficher si authentifié */
  children: ReactNode
  /** URL de la page actuelle (pour redirect après login) */
  redirectPath?: string
}

/**
 * Carte « non connecté » (langage Marché Pop) : Naânaa salue, deux boutons.
 * Réutilisée par le compte quand personne n'est connecté.
 */
export function LoginCard({ redirectPath }: { redirectPath: string }) {
  const { t } = useLocale()
  const next = encodeURIComponent(redirectPath)
  return (
    <div className="card grid gap-4 p-4">
      <div className="naanaa">
        <div className="m"><img src="/mascotte/naanaa-salut.webp" alt={t('auth.naanaaAlt')} /></div>
        <p className="bubble">
          <b>{t('auth.hello')}</b> {t('auth.loginCardBubble')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <a className="btn primary" href={`/connexion?redirect=${next}`}>{t('auth.loginBtn')}</a>
        <a className="btn" href={`/connexion?redirect=${next}&mode=register`}>{t('auth.registerBtn')}</a>
      </div>
    </div>
  )
}

export default function AuthGuard({ children, redirectPath = '/compte' }: AuthGuardProps) {
  const { t } = useLocale()
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
      <div className="flex items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
        <span className="size-6 animate-spin rounded-full border-[3px] border-line border-t-transparent" aria-hidden="true" />
        {t('auth.checking')}
      </div>
    )
  }

  // Pendant la redirection : la même carte que le compte (lien de secours si elle tarde)
  if (state === 'unauthenticated') {
    return (
      <div className="mx-auto w-full max-w-md py-10">
        <LoginCard redirectPath={redirectPath} />
      </div>
    )
  }

  return <>{children}</>
}
