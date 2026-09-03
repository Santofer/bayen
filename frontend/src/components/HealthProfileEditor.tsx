/**
 * Éditeur du profil santé (page /profil) — 100% localStorage, sans compte.
 * Pills togglables : allergènes, huile de palme, additifs à risque.
 */

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import {
  ALLERGENS, EMPTY_PROFILE, getProfile, isProfileEmpty, saveProfile,
  type HealthProfile,
} from '@/lib/health-profile'

const DIRECTUS_URL = '/api/directus'

interface RiskyAdditive {
  id: string
  name_fr: string
  risk_level: string
}

export default function HealthProfileEditor() {
  const { t, locale } = useLocale()
  const [profile, setProfile] = useState<HealthProfile>(EMPTY_PROFILE)
  const [additives, setAdditives] = useState<RiskyAdditive[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setProfile(getProfile())
    fetch(`${DIRECTUS_URL}/items/additives?filter[risk_level][_in]=banned_ma,avoid,limited&fields=id,name_fr,risk_level&sort=risk_level,id&limit=-1`)
      .then((r) => r.json())
      .then((j: { data: RiskyAdditive[] }) => {
        const order: Record<string, number> = { banned_ma: 0, avoid: 1, limited: 2 }
        setAdditives((j.data ?? []).sort((a, b) => (order[a.risk_level] ?? 9) - (order[b.risk_level] ?? 9)))
      })
      .catch(() => { /* silencieux */ })
  }, [])

  /**
   * Enregistre immédiatement (pas de bouton « valider » à oublier).
   * Mise à jour FONCTIONNELLE : deux bascules rapprochées ne s'écrasent pas
   * (les handlers liraient sinon un `profile` périmé issu du closure).
   */
  function update(mutate: (prev: HealthProfile) => HealthProfile): void {
    setProfile((prev) => {
      const next = mutate(prev)
      saveProfile(next)
      return next
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  const toggleAllergen = (key: string): void =>
    update((p) => ({
      ...p,
      allergens: p.allergens.includes(key)
        ? p.allergens.filter((k) => k !== key)
        : [...p.allergens, key],
    }))

  const toggleAdditive = (code: string): void =>
    update((p) => ({
      ...p,
      avoidAdditives: p.avoidAdditives.includes(code)
        ? p.avoidAdditives.filter((c) => c !== code)
        : [...p.avoidAdditives, code],
    }))

  const count = profile.allergens.length + profile.avoidAdditives.length + (profile.avoidPalmOil ? 1 : 0)
    + (profile.avoidEndocrine ? 1 : 0) + (profile.avoidFragranceAllergens ? 1 : 0)

  return (
    <div className="space-y-6">
      {/* Allergènes */}
      <section className="rounded-3xl border bg-card p-5 sm:p-6 shadow-card">
        <h2 className="font-display font-bold text-lg">{t('profile.allergensTitle')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('profile.allergensHint')}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {ALLERGENS.map((a) => {
            const on = profile.allergens.includes(a.key)
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => toggleAllergen(a.key)}
                aria-pressed={on}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                  on
                    ? 'bg-destructive text-destructive-foreground border-destructive'
                    : 'bg-background hover:bg-muted'
                )}
              >
                {on && <span aria-hidden="true" className="me-1.5">✕</span>}
                {locale === 'ary' ? a.labelAr : a.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Huile de palme */}
      <section className="rounded-3xl border bg-card p-5 sm:p-6 shadow-card">
        <h2 className="font-display font-bold text-lg">{t('profile.otherTitle')}</h2>
        <button
          type="button"
          onClick={() => update((p) => ({ ...p, avoidPalmOil: !p.avoidPalmOil }))}
          aria-pressed={profile.avoidPalmOil}
          className={cn(
            'mt-4 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
            profile.avoidPalmOil
              ? 'bg-destructive text-destructive-foreground border-destructive'
              : 'bg-background hover:bg-muted'
          )}
        >
          {profile.avoidPalmOil && <span aria-hidden="true" className="me-1.5">✕</span>}
          {t('profile.palmOil')}
        </button>
      </section>

      {/* Beauté (C23) : alertes sur les fiches cosmétiques */}
      <section className="rounded-3xl border bg-card p-5 sm:p-6 shadow-card">
        <h2 className="font-display font-bold text-lg">{t('profile.beautyTitle')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('profile.beautyHint')}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {([
            ['avoidEndocrine', t('profile.noEndocrine')],
            ['avoidFragranceAllergens', t('profile.noFragranceAllergens')],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => update((p) => ({ ...p, [key]: !p[key] }))}
              aria-pressed={profile[key]}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                profile[key]
                  ? 'bg-destructive text-destructive-foreground border-destructive'
                  : 'bg-background hover:bg-muted'
              )}
            >
              {profile[key] && <span aria-hidden="true" className="me-1.5">✕</span>}
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Additifs */}
      <section className="rounded-3xl border bg-card p-5 sm:p-6 shadow-card">
        <h2 className="font-display font-bold text-lg">{t('profile.additivesTitle')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('profile.additivesHint')}</p>
        {additives.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-4">…</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mt-4 max-h-72 overflow-y-auto">
            {additives.map((a) => {
              const on = profile.avoidAdditives.includes(a.id)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAdditive(a.id)}
                  aria-pressed={on}
                  title={a.name_fr}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                    on
                      ? 'bg-destructive text-destructive-foreground border-destructive'
                      : a.risk_level === 'limited'
                        ? 'bg-background border-orange-300 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                        : 'bg-background border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/30'
                  )}
                >
                  {on && <span aria-hidden="true">✕</span>}
                  {a.id}
                  <span className="font-normal text-muted-foreground max-w-28 truncate">{a.name_fr}</span>
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Récap + reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-card">
        <p className="text-sm">
          {isProfileEmpty(profile) ? (
            <span className="text-muted-foreground">{t('profile.empty')}</span>
          ) : (
            <span>
              <b className="font-bold text-primary">{count}</b> {t('profile.activeCount')}
              {saved && <span className="ms-2 text-primary font-semibold">· {t('profile.saved')}</span>}
            </span>
          )}
        </p>
        {!isProfileEmpty(profile) && (
          <button
            type="button"
            onClick={() => update(() => EMPTY_PROFILE)}
            className="text-sm font-semibold text-muted-foreground hover:text-destructive"
          >
            {t('profile.reset')}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">{t('profile.privacy')}</p>
    </div>
  )
}
