/**
 * Prix communautaires sur la fiche produit (C22).
 *
 * Affiche la fourchette observée et la médiane par enseigne — la médiane
 * plutôt que la moyenne, pour qu'une saisie fantaisiste ne déplace pas le
 * repère. Chacun peut ajouter le prix qu'il a payé, avec ou sans compte.
 */

import { useEffect, useState } from 'react'
import { Tag, Plus, Check } from 'lucide-react'
import { useLocale } from '@/lib/i18n'

const API = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

const STORES = ['Marjane', 'Carrefour', 'BIM', 'Aswak Assalam', 'Atacadao', 'Épicerie du coin']

interface StorePrice {
  store: string
  median: number
  count: number
  last: string | null
}

interface Aggregate {
  count: number
  min: number | null
  max: number | null
  city: string | null
  updated: string | null
  by_store: StorePrice[]
}

interface Props {
  barcode: string
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

export default function PriceSection({ barcode }: Props) {
  const { t } = useLocale()
  const [data, setData] = useState<Aggregate | null>(null)
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
  const hasPrices = data !== null && data.count > 0
  // Échelle depuis 0 : la longueur des barres est lisible comme le prix.
  const scaleMax = hasPrices ? Math.max(...data.by_store.map((s) => s.median)) : 0

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Tag size={16} />
        </span>
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold leading-tight">{t('price.title')}</h2>
          {hasPrices && (
            <p className="text-xs text-muted-foreground">
              {data.count} {t('price.sharedCount')}
            </p>
          )}
        </div>
      </div>

      {hasPrices ? (
        <>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-primary">
              {data.min !== null && data.max !== null && data.min !== data.max
                ? `${formatPrice(data.min)} – ${formatPrice(data.max)}`
                : formatPrice(data.min ?? 0)}
            </span>
            <span className="text-sm font-bold text-muted-foreground">DH</span>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {data.by_store.map((s) => (
              <div key={s.store} className="flex items-center gap-2.5">
                <span className="w-24 flex-shrink-0 truncate text-xs font-bold">{s.store}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${scaleMax > 0 ? Math.round((s.median / scaleMax) * 100) : 0}%` }}
                  />
                </div>
                <span className="w-20 flex-shrink-0 text-end text-xs font-extrabold">
                  {formatPrice(s.median)} DH
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            {t('price.disclaimer')}
            {data.city ? ` ${data.city}.` : ''}
          </p>
        </>
      ) : loading ? (
        <div className="flex flex-col gap-2" aria-hidden="true">
          <div className="skeleton h-7 w-40" />
          <div className="skeleton h-2.5 w-full" />
          <div className="skeleton h-2.5 w-3/4" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('price.none')} {t('price.beFirst')} <span className="font-bold text-primary">(+5 pts)</span>
        </p>
      )}

      {state === 'sent' && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-bold text-primary">
          <Check size={15} /> {message}
        </p>
      )}

      {loading ? null : !open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setState('idle') }}
          className="mt-4 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full border border-primary/30 bg-card text-sm font-bold text-primary"
        >
          <Plus size={17} />
          {hasPrices ? t('price.addOther') : t('price.beFirst')}
          <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-extrabold text-accent-foreground">
            +5 pts
          </span>
        </button>
      ) : (
        <div className="mt-4 rounded-2xl border bg-popover p-4">
          <p className="font-bold">{t('price.howMuch')}</p>

          <div className="mt-3 flex items-baseline justify-center gap-2 rounded-2xl border-2 border-primary bg-card px-4 py-5">
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
                    ? 'flex min-h-[46px] items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground'
                    : 'flex min-h-[46px] items-center rounded-full border bg-card px-4 text-sm font-semibold'
                }
              >
                {s}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStore('__other')}
              className={
                store === '__other'
                  ? 'flex min-h-[46px] items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground'
                  : 'flex min-h-[46px] items-center rounded-full border bg-card px-4 text-sm font-semibold text-muted-foreground'
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
              className="mt-2 min-h-[46px] w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-primary"
            />
          )}

          <p className="mt-4 text-sm font-bold">{t('price.city')}</p>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Casablanca"
            aria-label={t('price.city')}
            className="mt-2 min-h-[46px] w-full rounded-2xl border bg-card px-4 text-sm outline-none focus:border-primary"
          />

          {state === 'error' && (
            <p className="mt-3 text-sm font-semibold text-destructive">{message}</p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={state === 'sending'}
            className="mt-4 flex min-h-[52px] w-full items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground disabled:opacity-60"
          >
            {state === 'sending' ? t('contrib.sending') : t('price.send')}
          </button>
        </div>
      )}
    </section>
  )
}
