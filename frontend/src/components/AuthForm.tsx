/**
 * Formulaire de connexion / inscription
 * Onglets "Connexion" et "Inscription" avec validation
 */

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { login, register } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'

type AuthTab = 'login' | 'register'

export default function AuthForm() {
  const { t } = useLocale()
  const [activeTab, setActiveTab] = useState<AuthTab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    if (!email.trim()) return 'Veuillez saisir votre email'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Adresse email invalide'
    if (!password) return 'Veuillez saisir votre mot de passe'
    if (password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères'

    if (activeTab === 'register') {
      if (!displayName.trim()) return 'Veuillez saisir votre nom'
      if (password !== confirmPassword) return 'Les mots de passe ne correspondent pas'
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
        await login(email, password)
      } else {
        await register(email, password, displayName.trim())
      }

      // Redirection après connexion réussie
      const params = new URLSearchParams(window.location.search)
      const redirectTo = params.get('redirect') || '/'
      window.location.href = redirectTo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Onglets */}
      <div className="flex rounded-lg bg-muted p-1 mb-6">
        <button
          type="button"
          onClick={() => switchTab('login')}
          className={cn(
            'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
            activeTab === 'login'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('auth.login')}
        </button>
        <button
          type="button"
          onClick={() => switchTab('register')}
          className={cn(
            'flex-1 rounded-md py-2 text-sm font-medium transition-colors',
            activeTab === 'register'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('auth.register')}
        </button>
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nom d'affichage (inscription uniquement) */}
        {activeTab === 'register' && (
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium text-foreground">
              {t('auth.displayName')}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Votre nom"
              autoComplete="name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        )}

        {/* Email */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            {t('auth.email')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            autoComplete="email"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Mot de passe */}
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            {t('auth.password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 caractères"
            autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        {/* Confirmation mot de passe (inscription uniquement) */}
        {activeTab === 'register' && (
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              {t('auth.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Retapez le mot de passe"
              autoComplete="new-password"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        )}

        {/* Message d'erreur */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Bouton de soumission */}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {activeTab === 'login' ? 'Connexion...' : 'Inscription...'}
            </span>
          ) : (
            activeTab === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')
          )}
        </Button>
      </form>
    </div>
  )
}
