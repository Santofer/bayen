/**
 * Système i18n type-safe — français + darija marocaine
 * Persistance de la locale dans localStorage sous 'bayen_locale'
 */

import { useState, useCallback, useMemo } from 'react'
import { translations, type Locale, type TranslationKey } from '@/lib/translations'

const STORAGE_KEY = 'bayen_locale'
const DEFAULT_LOCALE: Locale = 'fr'
const SUPPORTED_LOCALES: readonly Locale[] = ['fr', 'ary'] as const

/** Vérifie qu'une valeur est une locale supportée */
function isValidLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Récupère la locale courante depuis localStorage (client) ou cookie (SSR) */
export function getLocale(cookieValue?: string | null): Locale {
  // SSR : utiliser la valeur du cookie si fournie
  if (cookieValue && isValidLocale(cookieValue)) return cookieValue
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && isValidLocale(stored)) return stored
  return DEFAULT_LOCALE
}

/** Persiste la locale dans localStorage + cookie */
export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, locale)
  document.cookie = `${STORAGE_KEY}=${locale};path=/;max-age=31536000;SameSite=Lax`
}

/** Retourne true si la locale courante est RTL (darija = arabe) */
export function isRtl(locale?: Locale): boolean {
  const current = locale ?? getLocale()
  return current === 'ary'
}

/** Retourne la traduction pour une clé donnée dans la locale courante */
export function t(key: TranslationKey, locale?: Locale): string {
  const current = locale ?? getLocale()
  return translations[key][current]
}

/**
 * Hook React pour le système i18n
 * Retourne { locale, setLocale, t, isRtl }
 */
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(getLocale)

  const updateLocale = useCallback((newLocale: Locale) => {
    setLocale(newLocale)
    setLocaleState(newLocale)
  }, [])

  const translate = useCallback(
    (key: TranslationKey) => t(key, locale),
    [locale],
  )

  const rtl = useMemo(() => isRtl(locale), [locale])

  return {
    locale,
    setLocale: updateLocale,
    t: translate,
    isRtl: rtl,
  } as const
}
