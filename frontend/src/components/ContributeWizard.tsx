/**
 * Parcours de contribution mobile (C19).
 *
 * Le formulaire précédent exigeait une photo du tableau nutritionnel et
 * beaucoup de saisie au clavier : sur un téléphone, dans un rayon de
 * supermarché, personne ne va au bout. Ici la seule photo obligatoire est la
 * face avant — l'IA identifie le produit et l'OCR lit le tableau, la personne
 * vérifie et corrige. Tout le reste est optionnel et récompensé.
 *
 * Fonctionne sans compte : les photos passent par /bayen-api/upload-photo.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, ArrowRight, Camera, Check, Loader2,
  RotateCcw, Sparkles, Star, HelpCircle, Tag,
} from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { authHeader, isAuthenticated } from '@/lib/auth'
import halalLogo from '@/assets/halal-logo.svg?raw'

const API = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

type Step = 'barcode' | 'photos' | 'info' | 'nutrition' | 'price' | 'done'
type PhotoKind = 'front' | 'ingredients' | 'nutrition'

interface Props {
  initialBarcode?: string
}

interface PhotoState {
  file: File
  preview: string
  fileId?: string
  uploading: boolean
}

const CATEGORIES: Array<{ id: number; label: string }> = [
  { id: 1, label: 'Biscuits' },
  { id: 2, label: 'Céréales & petit-déjeuner' },
  { id: 3, label: 'Produits laitiers' },
  { id: 4, label: 'Charcuterie & viandes' },
  { id: 5, label: 'Boissons sucrées' },
  { id: 6, label: 'Eaux & jus' },
  { id: 7, label: 'Conserves' },
  { id: 8, label: 'Épices & condiments' },
  { id: 9, label: 'Huiles & graisses' },
  { id: 10, label: 'Snacks & chips' },
  { id: 11, label: 'Pain & viennoiseries' },
  { id: 12, label: 'Plats préparés' },
]

const STORES = ['Marjane', 'Carrefour', 'BIM', 'Aswak Assalam', 'Atacadao', 'Épicerie du coin']

const NUTRIENTS = [
  { key: 'energy_kcal', label: 'Énergie', unit: 'kcal', max: 950 },
  { key: 'fat_total', label: 'Matières grasses', unit: 'g', max: 100 },
  { key: 'fat_saturated', label: 'dont saturées', unit: 'g', max: 100 },
  { key: 'carbs_total', label: 'Glucides', unit: 'g', max: 100 },
  { key: 'sugars', label: 'dont sucres', unit: 'g', max: 100 },
  { key: 'fiber', label: 'Fibres', unit: 'g', max: 100 },
  { key: 'proteins', label: 'Protéines', unit: 'g', max: 100 },
  { key: 'salt', label: 'Sel', unit: 'g', max: 100 },
] as const

type NutrientKey = (typeof NUTRIENTS)[number]['key']
type Nutrition = Partial<Record<NutrientKey, number | null>>

/**
 * Réduit la photo avant envoi : une photo de téléphone fait 3 à 8 Mo, ce qui
 * est long à téléverser en 3G et inutile pour lire une étiquette.
 */
async function shrink(file: File, maxSide = 1280, quality = 0.82): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas indisponible')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}

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

/**
 * Signale une valeur incohérente sans jamais l'effacer : les calories doivent
 * approcher 9×lipides + 4×(glucides+protéines). Un écart franc trahit une
 * lecture OCR fautive (le cas des « 90 g de fibres » lus sur un paquet).
 */
function suspicious(key: NutrientKey, n: Nutrition): boolean {
  const v = n[key]
  if (v == null) return false
  const def = NUTRIENTS.find((x) => x.key === key)
  if (def && (v < 0 || v > def.max)) return true

  if (key === 'energy_kcal') {
    const { fat_total: f, carbs_total: c, proteins: p } = n
    if (f != null && c != null && p != null) {
      const theoretical = 9 * f + 4 * (c + p)
      if (theoretical > 40 && Math.abs(v - theoretical) / theoretical > 0.35) return true
    }
  }
  return false
}

export default function ContributeWizard({ initialBarcode = '' }: Props) {
  const { t } = useLocale()
  const [step, setStep] = useState<Step>(initialBarcode ? 'photos' : 'barcode')
  const [barcode, setBarcode] = useState(initialBarcode)
  const [photos, setPhotos] = useState<Partial<Record<PhotoKind, PhotoState>>>({})
  const [identifying, setIdentifying] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [quantity, setQuantity] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [halal, setHalal] = useState<boolean | null>(null)

  const [nutrition, setNutrition] = useState<Nutrition>({})
  const [readingLabel, setReadingLabel] = useState(false)

  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [city, setCity] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [earned, setEarned] = useState<{ total: number; lines: Array<[string, number]> }>({ total: 0, lines: [] })
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)

  useEffect(() => {
    setLoggedIn(isAuthenticated())
    try {
      setCity(localStorage.getItem('bayen_city') ?? '')
    } catch { /* navigation privée */ }
  }, [])

  // ── Photos ──────────────────────────────────────────────────────────
  const handlePhoto = useCallback(async (kind: PhotoKind, file: File): Promise<void> => {
    const preview = URL.createObjectURL(file)
    setPhotos((p) => ({ ...p, [kind]: { file, preview, uploading: true } }))
    setError('')

    try {
      const dataUrl = await shrink(file)

      // Téléversement (indépendant de l'identification)
      const upload = fetch(`${API}/bayen-api/upload-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl, kind, barcode: barcode || undefined }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { file_id?: string } | null) => {
          setPhotos((p) => {
            const cur = p[kind]
            return cur ? { ...p, [kind]: { ...cur, fileId: d?.file_id, uploading: false } } : p
          })
        })
        .catch(() => {
          setPhotos((p) => {
            const cur = p[kind]
            return cur ? { ...p, [kind]: { ...cur, uploading: false } } : p
          })
        })

      // Face avant → identification du produit par la vision
      if (kind === 'front') {
        setIdentifying(true)
        const form = new FormData()
        form.append('image', file)
        try {
          const res = await fetch('/api/identify-product', { method: 'POST', body: form })
          if (res.ok) {
            const d = (await res.json()) as {
              name_fr?: string | null
              brand?: string | null
              quantity?: string | null
              halal_logo?: boolean | null
              confiance?: string
            }
            if (d.confiance !== 'faible') {
              if (d.name_fr) setName(d.name_fr)
              if (d.brand) setBrand(d.brand)
              if (d.quantity) setQuantity(d.quantity)
              if (d.halal_logo === true) setHalal(true)
              if (d.name_fr || d.brand) setPrefilled(true)
            }
          }
        } catch { /* la saisie manuelle reste possible */ } finally {
          setIdentifying(false)
        }
      }

      // Tableau nutritionnel → lecture OCR + vision
      if (kind === 'nutrition') {
        setReadingLabel(true)
        const form = new FormData()
        form.append('image_nutrition', file)
        form.append('barcode', barcode)
        try {
          const res = await fetch('/api/ocr-score', { method: 'POST', body: form })
          if (res.ok) {
            const d = (await res.json()) as { parsed_data?: Record<string, unknown> }
            const parsed = d.parsed_data ?? {}
            const next: Nutrition = {}
            for (const { key, max } of NUTRIENTS) {
              const v = parsed[key]
              if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max) {
                next[key] = v
              }
            }
            if (Object.keys(next).length > 0) setNutrition((n) => ({ ...next, ...n }))
          }
        } catch { /* saisie manuelle */ } finally {
          setReadingLabel(false)
        }
      }

      await upload
    } catch {
      setError(t('contrib.errorGeneric'))
      setPhotos((p) => {
        const cur = p[kind]
        return cur ? { ...p, [kind]: { ...cur, uploading: false } } : p
      })
    }
  }, [barcode, t])

  // ── Envoi final ─────────────────────────────────────────────────────
  const submit = async (withPrice: boolean): Promise<void> => {
    setSubmitting(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        barcode,
        name_fr: name.trim(),
        brand: brand.trim() || undefined,
        quantity: quantity.trim() || undefined,
        category_id: categoryId ?? undefined,
        is_halal: halal === true ? true : undefined,
        image_front: photos.front?.fileId,
        image_ingredients: photos.ingredients?.fileId,
        image_nutrition: photos.nutrition?.fileId,
      }
      for (const { key } of NUTRIENTS) {
        const v = nutrition[key]
        if (typeof v === 'number') body[key] = v
      }

      const res = await fetch(`${API}/bayen-api/contribute`, {
        method: 'POST',
        // Le token attribue la contribution : c'est lui qui crédite les points.
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        existed?: boolean
        points_earned?: number
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? t('contrib.errorGeneric'))
        setSubmitting(false)
        return
      }

      // Récapitulatif des points : le barème vit côté serveur, on n'affiche
      // ici que ce qui vient d'être fait.
      const lines: Array<[string, number]> = [[t('points.actionProduct'), 50]]
      const photoCount = (['front', 'ingredients', 'nutrition'] as const)
        .filter((k) => photos[k]?.fileId).length
      if (photoCount > 0) {
        const label = photoCount > 1 ? t('points.photosAdded') : t('points.photoAdded')
        lines.push([`${photoCount} ${label}`, 20 * photoCount])
      }

      // Prix éventuel — envoyé après la création, le produit doit exister.
      if (withPrice) {
        const value = Number(price.replace(',', '.'))
        if (Number.isFinite(value) && value >= 0.5 && store.trim().length >= 2) {
          const ok = await fetch(`${API}/bayen-api/price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
            body: JSON.stringify({
              barcode,
              price_mad: value,
              store: store.trim(),
              city: city.trim() || null,
              session_id: sessionId(),
            }),
          }).then((r) => r.ok).catch(() => false)
          if (ok) {
            lines.push([t('points.actionPrice'), 5])
            try {
              if (city.trim()) localStorage.setItem('bayen_city', city.trim())
            } catch { /* navigation privée */ }
          }
        }
      }

      setEarned({ total: lines.reduce((sum, [, n]) => sum + n, 0), lines })
      setStep('done')
    } catch {
      setError(t('contrib.errorGeneric'))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Fragments d'interface ───────────────────────────────────────────
  const stepIndex = { barcode: 0, photos: 1, info: 2, nutrition: 3, price: 4, done: 5 }[step]
  const stepLabel = {
    photos: t('contrib.stepPhotos'),
    info: t('contrib.stepProduct'),
    nutrition: t('contrib.stepNutrition'),
    price: t('contrib.stepPrice'),
  }[step as 'photos' | 'info' | 'nutrition' | 'price']

  const back = (): void => {
    const order: Step[] = ['barcode', 'photos', 'info', 'nutrition', 'price']
    const i = order.indexOf(step)
    if (i > 0) setStep(order[i - 1] as Step)
    else history.back()
  }

  const Header = (
    <div className="pt-1">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Retour"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border bg-card"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-bold">{t('contrib.addThis')}</p>
          {stepLabel && (
            <p className="text-xs text-muted-foreground">
              {t('contrib.step')} {stepIndex} {t('contrib.of')} 4 — {stepLabel}
            </p>
          )}
        </div>
        {(step === 'photos' || step === 'nutrition' || step === 'price') && (
          <button
            type="button"
            onClick={() => {
              if (step === 'photos') setStep('info')
              else if (step === 'nutrition') setStep('price')
              else void submit(false)
            }}
            className="-me-3 flex min-h-[44px] items-center px-3 text-[13px] font-bold text-primary"
          >
            {t('contrib.skip')}
          </button>
        )}
      </div>
      {stepLabel && (
        <div className="mt-3.5 flex gap-1.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={n <= stepIndex ? 'h-1.5 flex-1 rounded-full bg-primary' : 'h-1.5 flex-1 rounded-full bg-primary/15'}
            />
          ))}
        </div>
      )}
    </div>
  )

  const PhotoTile = ({ kind, title, hint }: { kind: PhotoKind; title: string; hint: string }) => {
    const p = photos[kind]
    return (
      <label
        className={
          p
            ? 'flex cursor-pointer items-center gap-4 rounded-[20px] border-2 border-primary bg-card p-4 shadow-[var(--shadow-card)]'
            : 'flex cursor-pointer items-center gap-4 rounded-[20px] border border-dashed border-primary/45 bg-card p-4'
        }
      >
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handlePhoto(kind, f)
            e.target.value = ''
          }}
        />
        <span className="relative flex h-[74px] w-[74px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-muted">
          {p ? (
            <>
              <img src={p.preview} alt="" className="h-full w-full object-cover" />
              {p.uploading ? (
                <span className="absolute inset-0 flex items-center justify-center bg-background/60">
                  <Loader2 size={20} className="animate-spin text-primary" />
                </span>
              ) : (
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-success-600)] shadow">
                  <Check size={13} className="text-white" strokeWidth={3} />
                </span>
              )}
            </>
          ) : (
            <Camera size={28} className="text-muted-foreground" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{title}</span>
          <span className="mt-0.5 block text-[13px] text-muted-foreground">{hint}</span>
        </span>
        <span
          className={
            p
              ? 'flex min-h-[44px] items-center px-2 text-[13px] font-bold text-primary'
              : 'flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_4px_14px_hsl(97_40%_20%/0.25)]'
          }
        >
          {p ? t('contrib.retake') : <Camera size={21} />}
        </span>
      </label>
    )
  }

  const Cta = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-full bg-primary text-[17px] font-bold text-primary-foreground shadow-[0_8px_24px_hsl(97_40%_20%/0.3)] disabled:opacity-60"
    >
      {label}
      {!disabled && <ArrowRight size={19} />}
    </button>
  )

  // ── Écrans ──────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="relative mb-6 flex h-[148px] w-[148px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_16px_44px_hsl(97_40%_20%/0.35)]">
          <div>
            <div className="font-display text-[42px] font-extrabold leading-none">+{earned.total}</div>
            <div className="text-[13px] font-bold uppercase tracking-wider opacity-85">{t('points.points')}</div>
          </div>
          <Star size={26} className="absolute -top-2 right-1 fill-[#b1cf3a] text-[#b1cf3a]" />
        </div>

        <h1 className="font-display text-2xl font-bold leading-tight">{t('contrib.thanksTitle')}</h1>
        <p className="mt-2.5 max-w-[290px] text-[15px] leading-relaxed text-muted-foreground">
          « {name} » {t('contrib.thanksDesc')}
        </p>

        <div className="mt-6 w-full max-w-[320px] rounded-[20px] border bg-card p-4 shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-2.5">
            {earned.lines.map(([label, pts]) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="font-semibold">{label}</span>
                <span className="font-extrabold text-primary">+{pts}</span>
              </div>
            ))}
          </div>
          {loggedIn !== true && (
            <p className="mt-3.5 border-t pt-3.5 text-[13px] text-muted-foreground">
              {t('contrib.anonNote')}{' '}
              <a href="/connexion" className="font-bold text-primary">
                {t('nav.account')}
              </a>
            </p>
          )}
        </div>

        <div className="mt-7 flex w-full max-w-[320px] flex-col gap-3">
          <a
            href={`/produit/${barcode}`}
            className="flex min-h-[58px] items-center justify-center rounded-full bg-primary text-[17px] font-bold text-primary-foreground shadow-[0_8px_24px_hsl(97_40%_20%/0.3)]"
          >
            {t('contrib.seeProduct')}
          </a>
          <a
            href="/scan"
            className="flex min-h-[54px] items-center justify-center gap-2.5 rounded-full border border-primary/30 bg-card text-[15px] font-bold text-primary"
          >
            <RotateCcw size={17} />
            {t('contrib.scanAnother')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {Header}

      {step === 'barcode' && (
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="font-display text-xl font-bold">{t('scan.manual')}</h1>
          <input
            type="text"
            inputMode="numeric"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value.replace(/\D/g, '').slice(0, 13))}
            placeholder="6111080016394"
            aria-label={t('scan.manual')}
            className="min-h-[58px] w-full rounded-2xl border bg-card px-5 text-center font-display text-xl font-bold tracking-wider outline-none focus:border-primary"
          />
          <div className="mt-auto pt-4">
            <Cta
              label={t('contrib.continue')}
              disabled={!/^\d{8}$|^\d{13}$/.test(barcode)}
              onClick={() => setStep('photos')}
            />
          </div>
        </div>
      )}

      {step === 'photos' && (
        <div className="flex flex-1 flex-col gap-3.5">
          <h1 className="font-display text-xl font-bold">{t('contrib.photosTitle')}</h1>

          <PhotoTile kind="front" title={t('contrib.photoFront')} hint={t('contrib.photoFrontHint')} />
          <PhotoTile kind="ingredients" title={t('contrib.photoIngredients')} hint={t('contrib.photoIngredientsHint')} />
          <PhotoTile kind="nutrition" title={t('contrib.photoNutrition')} hint={t('contrib.photoNutritionHint')} />

          {identifying && (
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Loader2 size={15} className="animate-spin" />
              {t('contrib.identifying')}
            </p>
          )}

          <div className="flex items-start gap-2.5 rounded-2xl border border-accent bg-accent/50 px-4 py-3">
            <Sparkles size={16} className="mt-0.5 flex-shrink-0 text-accent-foreground" />
            <p className="text-[13px] leading-snug text-accent-foreground">{t('contrib.photoBonus')}</p>
          </div>

          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

          <div className="mt-auto pt-4">
            <Cta
              label={t('contrib.continue')}
              disabled={!photos.front}
              onClick={() => setStep('info')}
            />
            {!photos.front && (
              <p className="mt-2 text-center text-[13px] text-muted-foreground">{t('contrib.photoRequired')}</p>
            )}
          </div>
        </div>
      )}

      {step === 'info' && (
        <div className="flex flex-1 flex-col gap-4">
          {prefilled && (
            <p className="inline-flex items-center gap-2 self-start rounded-full border border-accent bg-accent/50 px-4 py-2 text-[13px] font-bold text-accent-foreground">
              <Sparkles size={15} />
              {t('contrib.prefilled')}
            </p>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-[13.5px] font-bold">{t('contrib.name')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Confiture de fraises extra"
              className="min-h-[52px] rounded-2xl border bg-card px-4 text-base font-semibold outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13.5px] font-bold">{t('contrib.brand')}</span>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Délicia"
              className="min-h-[52px] rounded-2xl border bg-card px-4 text-base font-semibold outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13.5px] font-bold">{t('contrib.quantity')}</span>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="430 g"
              className="min-h-[52px] rounded-2xl border bg-card px-4 text-base font-semibold outline-none focus:border-primary"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-[13.5px] font-bold">{t('contrib.category')}</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
                  className={
                    categoryId === c.id
                      ? 'flex min-h-[46px] items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground'
                      : 'flex min-h-[46px] items-center rounded-full border bg-card px-4 text-sm font-semibold'
                  }
                >
                  {categoryId === c.id && <Check size={14} strokeWidth={3} />}
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-[20px] border bg-card p-4">
            <span className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-full bg-primary/[0.09] text-primary">
              <span className="block h-6 w-6" dangerouslySetInnerHTML={{ __html: halalLogo }} />
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-bold">{t('halal.question')}</span>
            <span className="flex flex-shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setHalal(halal === true ? null : true)}
                className={
                  halal === true
                    ? 'flex min-h-[46px] items-center rounded-full bg-primary px-4 text-[13.5px] font-bold text-primary-foreground'
                    : 'flex min-h-[46px] items-center rounded-full bg-secondary px-4 text-[13.5px] font-semibold text-muted-foreground'
                }
              >
                {t('halal.yes')}
              </button>
              <button
                type="button"
                onClick={() => setHalal(halal === false ? null : false)}
                className={
                  halal === false
                    ? 'flex min-h-[46px] items-center rounded-full bg-primary px-4 text-[13.5px] font-bold text-primary-foreground'
                    : 'flex min-h-[46px] items-center rounded-full bg-secondary px-4 text-[13.5px] font-semibold text-muted-foreground'
                }
              >
                {t('halal.notSeen')}
              </button>
            </span>
          </div>

          <div className="mt-auto pt-4">
            <Cta
              label={t('contrib.continue')}
              disabled={name.trim().length < 2}
              onClick={() => setStep('nutrition')}
            />
          </div>
        </div>
      )}

      {step === 'nutrition' && (
        <div className="flex flex-1 flex-col gap-3.5">
          <div>
            <h1 className="font-display text-xl font-bold">{t('contrib.nutritionTitle')}</h1>
            {(photos.nutrition || readingLabel) && (
              <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-primary">
                {readingLabel ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                {t('contrib.nutritionRead')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {NUTRIENTS.map(({ key, label, unit }) => {
              const bad = suspicious(key, nutrition)
              return (
                <label
                  key={key}
                  className={
                    bad
                      ? 'relative flex flex-col rounded-2xl border-2 border-[var(--color-score-mediocre)] bg-card px-4 py-3'
                      : 'relative flex flex-col rounded-2xl border bg-card px-4 py-3'
                  }
                >
                  <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                  <span className="mt-0.5 flex items-baseline gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={nutrition[key] ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(',', '.')
                        const v = raw === '' ? null : Number(raw)
                        setNutrition((n) => ({ ...n, [key]: v !== null && Number.isFinite(v) ? v : null }))
                      }}
                      placeholder="—"
                      className="w-full min-w-0 border-0 bg-transparent p-0 font-display text-xl font-extrabold outline-none"
                    />
                    <span className="flex-shrink-0 text-xs font-semibold text-muted-foreground">{unit}</span>
                  </span>
                  {bad && (
                    <span className="absolute right-3 top-2.5 text-[10.5px] font-extrabold uppercase tracking-wide text-[var(--color-score-mediocre)]">
                      {t('contrib.check')}
                    </span>
                  )}
                </label>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => { setNutrition({}); setStep('price') }}
            className="flex min-h-[50px] items-center justify-center gap-2.5 rounded-full bg-secondary text-sm font-semibold text-muted-foreground"
          >
            <HelpCircle size={17} />
            {t('contrib.noTable')}
          </button>

          <div className="mt-auto pt-4">
            <Cta label={t('contrib.continue')} onClick={() => setStep('price')} />
          </div>
        </div>
      )}

      {step === 'price' && (
        <div className="flex flex-1 flex-col gap-4">
          <div>
            <h1 className="font-display text-xl font-bold">{t('price.howMuch')}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {t('price.disclaimer')}
            </p>
          </div>

          <div className="flex items-baseline justify-center gap-2.5 rounded-3xl border-2 border-primary bg-card px-5 py-6 shadow-[0_8px_26px_hsl(97_40%_20%/0.14)]">
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
              aria-label={t('price.howMuch')}
              className="w-40 border-0 bg-transparent text-center font-display text-[52px] font-extrabold leading-none outline-none"
            />
            <span className="text-xl font-bold text-muted-foreground">DH</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[13.5px] font-bold">{t('price.where')}</span>
            <div className="flex flex-wrap gap-2">
              {STORES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStore(store === s ? '' : s)}
                  className={
                    store === s
                      ? 'flex min-h-[46px] items-center rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground'
                      : 'flex min-h-[46px] items-center rounded-full border bg-card px-4 text-sm font-semibold'
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13.5px] font-bold">{t('price.city')}</span>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Casablanca"
              className="min-h-[52px] rounded-2xl border bg-card px-4 text-base font-semibold outline-none focus:border-primary"
            />
          </label>

          <p className="inline-flex items-center gap-2 self-start rounded-full border border-accent bg-accent/50 px-4 py-2 text-[13px] font-bold text-accent-foreground">
            <Tag size={15} />
            {t('points.pricePill')}
          </p>

          {error && <p className="text-sm font-semibold text-destructive">{error}</p>}

          <div className="mt-auto pt-4">
            <button
              type="button"
              onClick={() => void submit(true)}
              disabled={submitting}
              className="flex min-h-[58px] w-full items-center justify-center gap-2.5 rounded-full bg-primary text-[17px] font-bold text-primary-foreground shadow-[0_8px_24px_hsl(97_40%_20%/0.3)] disabled:opacity-60"
            >
              {submitting ? <Loader2 size={19} className="animate-spin" /> : <Check size={19} />}
              {submitting ? t('contrib.sending') : t('contrib.publish')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
