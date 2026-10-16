/**
 * Formulaire de connexion / inscription
 * Onglets "Connexion" et "Inscription" avec validation
 */

import { useEffect, useState, type FormEvent } from 'react'
import { login, register } from '@/lib/auth'
import { useAntibot } from '@/lib/antibot'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'

type AuthTab = 'login' | 'register'

// Champ pilule 46 px (maquette : même gabarit que les boutons)
const FIELD = 'flex h-[46px] w-full rounded-full border-2 border-line bg-background px-4 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background'

export default function AuthForm() {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState<AuthTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const antibot = useAntibot('auth-gotcha')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // « Créer un compte » (carte de connexion du compte) ouvre directement l'inscription
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'register') setActiveTab('register')
  }, [])

  /** Réinitialise le formulaire lors du changement d'onglet */
  function switchTab(tab: AuthTab): void {
    setActiveTab(tab)
    setError(null)
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setDisplayName('')
  }

  /** Validation du formulaire */
  function validate(): string | null {
    if (!email.trim()) return t('auth.err.emailRequired')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t('auth.err.emailInvalid')
    if (!password) return t('auth.err.passwordRequired')
    if (password.length < 8) return t('auth.err.passwordShort')

    if (activeTab === 'register') {
      if (!displayName.trim()) return t('auth.err.nameRequired')
      if (password !== confirmPassword) return t('auth.err.passwordMismatch')
    }

    return null
  }

  async function handleSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    try {
      if (activeTab === 'login') {
        await login(email, password, antibot.fields)
      } else {
        await register(email, password, displayName.trim(), antibot.fields)
      }

      // Redirection après connexion réussie
      const params = new URLSearchParams(window.location.search)
      const redirectTo = params.get('redirect') || '/'
      window.location.href = redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-5">
      {/* Naânaa accueille (pose « salut ») */}
      <div className="naanaa">
        <div className="m"><img src="/mascotte/naanaa-salut.webp" alt={t('auth.naanaaAlt')} /></div>
        <p className="bubble"><b>{t('auth.hello')}</b> {t('contrib.anonNote')}</p>
      </div>

      {/* Onglets */}
      <div className="flex rounded-full border-2 border-line bg-muted p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'login'}
          onClick={() => switchTab('login')}
          className={cn(
            'flex-1 rounded-full border-2 py-2 text-sm font-bold transition-colors',
            activeTab === 'login'
              ? 'border-encre bg-citron text-encre'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {t('auth.login')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'register'}
          onClick={() => switchTab('register')}
          className={cn(
            'flex-1 rounded-full border-2 py-2 text-sm font-bold transition-colors',
            activeTab === 'register'
              ? 'border-encre bg-citron text-encre'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          {t('auth.register')}
        </button>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="grid gap-4">
        {antibot.honeypot}
        {/* Nom d'affichage (inscription uniquement) */}
        {activeTab === 'register' && (
          <div className="grid gap-1.5">
            <label htmlFor="displayName" className="text-sm font-semibold">
              {t('auth.displayName')}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('auth.namePlaceholder')}
              autoComplete="name"
              className={FIELD}
            />
          </div>
        )}

        {/* Email */}
        <div className="grid gap-1.5">
          <label htmlFor="email" className="text-sm font-semibold">
            {t('auth.email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.emailPlaceholder')}
            autoComplete="email"
            className={FIELD}
          />
        </div>

        {/* Mot de passe */}
        <div className="grid gap-1.5">
          <label htmlFor="password" className="text-sm font-semibold">
            {t('auth.password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
            className={FIELD}
          />
        </div>

        {/* Confirmation mot de passe (inscription uniquement) */}
        {activeTab === 'register' && (
          <div className="grid gap-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-semibold">
              {t('auth.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPlaceholder')}
              autoComplete="new-password"
              className={FIELD}
            />
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div role="alert" className="tint-tomate rounded-2xl border-2 border-line px-4 py-3 text-sm font-medium text-foreground">
            {error}
          </div>
        )}

        {/* Bouton de soumission */}
        <button type="submit" className="btn primary w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {activeTab === 'login' ? t('auth.loggingIn') : t('auth.registering')}
            </span>
          ) : (
            activeTab === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')
          )}
        </button>
      </form>
    </div>
  )
}
