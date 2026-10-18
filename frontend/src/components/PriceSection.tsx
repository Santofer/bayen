/**
 * Prix communautaires sur la fiche produit (C22).
 *
 * Affiche la fourchette observée et la médiane par enseigne — la médiane
 * plutôt que la moyenne, pour qu'une saisie fantaisiste ne déplace pas le
 * repère. Chacun peut ajouter le prix qu'il a payé, avec ou sans compte.
 */

import { useEffect, useState } from 'react'
import { Plus, Check } from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { authHeader } from '@/lib/auth'
import { useAntibot } from '@/lib/antibot'
import type { PriceAggregate } from '@/lib/directus'

const API = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

// Valeurs enregistrées telles quelles (agrégation par enseigne) ; seul le libellé est traduit
const CORNER_STORE = 'Épicerie du coin'
const STORES = ['Marjane', 'Carrefour', 'BIM', 'Aswak Assalam', 'Atacadao', CORNER_STORE]

type Aggregate = PriceAggregate

interface Props {
  barcode: string
  /** Agrégat lu côté serveur : prix visibles dans le HTML initial, sans attendre l'hydratation */
  initial?: Aggregate | null
  /** Nombre de relevés à partir duquel la section (titre + médianes) s'affiche */
  minReports?: number
}

/** Identifiant de session anonyme, partagé avec le reste du site. */
function sessionId(): string {
  try {
    let id = localStorage.getItem('bayen_session_id')
    if (!id) {
      id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      localStorage.setItem('bayen_session_id', id)
    }
    return id
  } catch {
    return 'anon'
  }
}

function formatPrice(n: number): string {
  return n.toFixed(2).replace('.', ',').replace(/,00$/, '')
}

export default function PriceSection({ barcode, initial = null, minReports = 3 }: Props) {
  const antibot = useAntibot('price-gotcha')
  const { t } = useLocale()
  const storeLabel = (s: string): string => (s === CORNER_STORE ? t('price.storeCorner') : s)
  const [data, setData] = useState<Aggregate | null>(initial)
  const [open, setOpen] = useState(false)
  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [customStore, setCustomStore] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const load = (): void => {
    fetch(`${API}/bayen-api/prices/${barcode}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Aggregate | null) => d && setData(d))
      .catch(() => { /* section non critique */ })
  }

  useEffect(() => {
    load()
    try {
      setCity(localStorage.getItem('bayen_city') ?? '')
    } catch { /* navigation privée */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode])

  const submit = async (): Promise<void> => {
    const value = Number(price.replace(',', '.'))
    const chosenStore = store === '__other' ? customStore.trim() : store
    if (!Number.isFinite(value) || value < 0.5 || value > 10000 || chosenStore.length < 2) {
      setState('error')
      setMessage(t('price.invalid'))
      return
    }

    setState('sending')
    try {
      const res = await fetch(`${API}/bayen-api/price`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({
          ...antibot.fields,
          barcode,
          price_mad: value,
          store: chosenStore,
          city: city.trim() || null,
          session_id: sessionId(),
        }),
      })
      if (res.ok) {
        setState('sent')
        setMessage(t('price.sent'))
        try {
          if (city.trim()) localStorage.setItem('bayen_city', city.trim())
        } catch { /* navigation privée */ }
        setOpen(false)
        setPrice('')
        load()
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string }
        setState('error')
        setMessage(err.error === 'already_submitted' ? t('price.already') : t('contrib.errorGeneric'))
      }
    } catch {
      setState('error')
      setMessage(t('contrib.errorGeneric'))
    }
  }

  // `data === null` = pas encore chargé : on ne peut pas affirmer qu'il n'y a
  // aucun prix (le rendu serveur l'annoncerait à tort avant l'hydratation).
  const loading = data === null
  // Sous le seuil : pas de titre ni de liste (un H2 « moins cher » vide n'aide personne)
  const hasPrices = data !== null && data.count >= minReports && data.by_store.length > 0
  // Cartes d'enseigne de la maquette, de la médiane la plus basse à la plus haute
  const stores = hasPrices ? [...data.by_store].sort((a, b) => a.median - b.median) : []
  const cheapest = stores[0]?.median ?? 0

  // Pas encore chargé : rien (ni squelette ni titre)
  if (loading) return null

  return (
    <section className="section">
      {hasPrices && (
        <div className="sec-head">
          <h2 className="disp d-m">{t('price.cheaperTitle')}</h2>
          <span className="eyebrow">{t('price.median')}</span>
        </div>
      )}

      {hasPrices && (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            {stores.map((s) => (
              // La médiane la plus basse passe en citron (texte encre dans les deux thèmes)
              <div
                key={s.store}
                className={s.median === cheapest ? 'card grid gap-0.5 bg-citron p-3 text-encre' : 'card grid gap-0.5 p-3'}
              >
                <span className="truncate text-xs font-semibold">{storeLabel(s.store)}</span>
                {/* « DH » plus petit : un prix à 2 décimales tient dans le tiers d'écran */}
                <b className="disp d-s num whitespace-nowrap">{formatPrice(s.median)}<span className="ms-1 text-[11px]">DH</span></b>
                {s.median === cheapest && stores.length > 1 ? (
                  <span className="text-[11px]">{t('price.cheapest')}</span>
                ) : (
                  <span className={s.median === cheapest ? 'text-[11px]' : 'muted text-[11px]'}>
                    {s.count} {s.count > 1 ? t('price.records') : t('price.record')}
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {data.count} {t('price.sharedCount')}
            {data.min !== null && data.max !== null && data.min !== data.max
              ? ` · ${formatPrice(data.min)} – ${formatPrice(data.max)} DH`
              : ''}
            {'. '}
            {t('price.disclaimer')}
            {data.city ? ` ${data.city}.` : ''}
          </p>
        </>
      )}

      {state === 'sent' && (
        <p className="flex items-center gap-1.5 text-sm font-bold text-brand-ink">
          <Check size={15} /> {message}
        </p>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setState('idle') }}
          className="btn w-full"
        >
          <Plus size={17} className="flex-shrink-0" />
          <span className="min-w-0">{hasPrices ? t('price.addOther') : t('price.share')}</span>
          <span className="flex-shrink-0 whitespace-nowrap rounded-full border-[1.5px] border-encre bg-menthe px-2 py-0.5 text-[11px] font-extrabold text-encre">
            {t('price.pts5')}
          </span>
        </button>
      ) : (
        <div className="card p-4">
          {antibot.honeypot}
          <p className="font-bold">{t('price.howMuch')}</p>

          <div className="mt-3 flex items-baseline justify-center gap-2 rounded-2xl border-2 border-line bg-card px-4 py-5">
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
              aria-label={t('price.howMuch')}
              className="w-32 border-0 bg-transparent text-center font-display text-4xl font-extrabold outline-none"
            />
            <span className="text-lg font-bold text-muted-foreground">DH</span>
          </div>

          <p className="mt-4 text-sm font-bold">{t('price.where')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {STORES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStore(s)}
                className={
                  store === s
                    ? 'flex min-h-[46px] items-center rounded-full border-2 border-encre bg-primary px-4 text-sm font-bold text-primary-foreground'
                    : 'flex min-h-[46px] items-center rounded-full border-2 border-line bg-card px-4 text-sm font-semibold'
                }
              >
                {storeLabel(s)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStore('__other')}
              className={
                store === '__other'
                  ? 'flex min-h-[46px] items-center rounded-full border-2 border-encre bg-primary px-4 text-sm font-bold text-primary-foreground'
                  : 'flex min-h-[46px] items-center rounded-full border-2 border-line bg-card px-4 text-sm font-semibold text-muted-foreground'
              }
            >
              {t('price.otherStore')}
            </button>
          </div>

          {store === '__other' && (
            <input
              type="text"
              value={customStore}
              onChange={(e) => setCustomStore(e.target.value)}
              placeholder={t('price.where')}
              aria-label={t('price.where')}
              className="mt-2 min-h-[46px] w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-line"
            />
          )}

          <p className="mt-4 text-sm font-bold">{t('price.city')}</p>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Casablanca"
            aria-label={t('price.city')}
            className="mt-2 min-h-[46px] w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-line"
          />

          {state === 'error' && (
            <p className="mt-3 text-sm font-semibold text-destructive">{message}</p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={state === 'sending'}
            className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-full border-2 border-encre bg-primary text-base font-bold text-primary-foreground shadow-[var(--shadow-card)] disabled:opacity-60"
          >
            {state === 'sending' ? t('contrib.sending') : t('price.send')}
          </button>
        </div>
      )}
    </section>
  )
}
