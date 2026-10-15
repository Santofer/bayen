/**
 * Éditeur du profil santé (page /profil) — 100% localStorage, sans compte.
 * Pills togglables : allergènes, huile de palme, additifs à risque.
 */

import { useEffect, useState } from 'react'
import { Ban } from 'lucide-react'
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
    <section className="section gap-5 md:grid-cols-2 md:items-start md:gap-8">
      {/* Allergènes */}
      <div className="card p-5 sm:p-6">
        <h2 className="disp d-m">{t('profile.allergensTitle')}</h2>
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
                  'rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors',
                  on
                    ? 'bg-tomate text-encre border-encre'
                    : 'bg-background border-line hover:bg-muted'
                )}
              >
                {on && <span aria-hidden="true" className="me-1.5">✕</span>}
                {locale === 'ary' ? a.labelAr : a.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Huile de palme */}
      <div className="card p-5 sm:p-6">
        <h2 className="disp d-m">{t('profile.otherTitle')}</h2>
        <button
          type="button"
          onClick={() => update((p) => ({ ...p, avoidPalmOil: !p.avoidPalmOil }))}
          aria-pressed={profile.avoidPalmOil}
          className={cn(
            'mt-4 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-colors',
            profile.avoidPalmOil
              ? 'bg-tomate text-encre border-encre'
              : 'bg-background border-line hover:bg-muted'
          )}
        >
          {profile.avoidPalmOil && <span aria-hidden="true" className="me-1.5">✕</span>}
          {t('profile.palmOil')}
        </button>
      </div>

      {/* Beauté (C23) : alertes sur les fiches cosmétiques */}
      <div className="card p-5 sm:p-6">
        <h2 className="disp d-m">{t('profile.beautyTitle')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('profile.beautyHint')}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Puces courtes sur une ligne : l'icône « interdit » porte le « éviter », la phrase complète reste en aria-label */}
          {([
            ['avoidEndocrine', t('profile.chipEndocrine'), t('profile.noEndocrine')],
            ['avoidFragranceAllergens', t('profile.chipFragrance'), t('profile.noFragranceAllergens')],
          ] as const).map(([key, label, aria]) => (
            <button
              key={key}
              type="button"
              onClick={() => update((p) => ({ ...p, [key]: !p[key] }))}
              aria-pressed={profile[key]}
              aria-label={aria}
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-encre px-4 py-2 text-sm font-semibold transition-colors',
                profile[key] ? 'bg-tomate text-encre' : 'bg-card hover:bg-muted'
              )}
            >
              <Ban size={15} className={cn('flex-none', !profile[key] && 'text-muted-foreground')} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Additifs */}
      <div className="card p-5 sm:p-6">
        <h2 className="disp d-m">{t('profile.additivesTitle')}</h2>
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
                    'inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-1 text-xs font-semibold transition-colors',
                    on
                      ? 'bg-tomate text-encre border-encre'
                      : a.risk_level === 'limited'
                        ? 'bg-background border-score-mediocre hover:bg-muted'
                        : 'bg-background border-score-mauvais hover:bg-muted'
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
      </div>

      {/* Récap + reset */}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4 md:col-span-2">
        <p className="text-sm">
          {isProfileEmpty(profile) ? (
            <span className="text-muted-foreground">{t('profile.empty')}</span>
          ) : (
            <span>
              <b className="font-bold text-brand-ink">{count}</b> {t('profile.activeCount')}
              {saved && <span className="ms-2 text-brand-ink font-semibold">· {t('profile.saved')}</span>}
            </span>
          )}
        </p>
        {!isProfileEmpty(profile) && (
          <button
            type="button"
            onClick={() => update(() => EMPTY_PROFILE)}
            className="btn sm flat"
          >
            {t('profile.reset')}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center md:col-span-2">{t('profile.privacy')}</p>
    </section>
  )
}
