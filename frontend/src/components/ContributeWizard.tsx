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

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowLeft, ArrowRight, Camera, Check, Loader2,
  RotateCcw, Sparkles, HelpCircle, Tag,
} from 'lucide-react'
import { useLocale } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { authHeader, isAuthenticated } from '@/lib/auth'
import { useAntibot } from '@/lib/antibot'
import { shrink } from '@/lib/image'
import halalLogo from '@/assets/halal-logo.svg?raw'

const API = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

type Step = 'barcode' | 'photos' | 'info' | 'nutrition' | 'inci' | 'price' | 'done'
type Universe = 'food' | 'cosmetic'
type PhotoKind = 'front' | 'ingredients' | 'nutrition'

interface Props {
  initialBarcode?: string
  /** Fiche beauté existante à compléter : univers imposé */
  initialUniverse?: Universe
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

/** Catégories beauté (C23) — mêmes clés que products.cosmetic_category */
const COSMETIC_CATEGORIES = ['visage', 'corps', 'cheveux', 'hygiene', 'dents', 'maquillage', 'parfum', 'solaire', 'bebe', 'homme', 'eclaircissant', 'ongles'] as const
type CosmeticCategory = (typeof COSMETIC_CATEGORIES)[number]

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

// Langage Marché Pop : champ contour encre sur fond crème, puce de choix à taille tactile
const FIELD = 'min-h-[52px] w-full rounded-2xl border-2 border-line bg-background px-4 text-base font-semibold outline-none focus:border-brand-ink'
const CHOICE = 'chip h-11 px-4 text-sm'
const LABEL = 'text-[13.5px] font-bold'
/** Carte d'étape */
const STEP_CARD = 'card grid gap-4 p-4 md:p-6'
type Nutrition = Partial<Record<NutrientKey, number | null>>

/** Bulle de Naânaa (astuce, attente, erreur) */
function Bubble({ pose, children, alert }: { pose: string; children: ReactNode; alert?: boolean }) {
  return (
    <div className="naanaa grid-cols-[56px_minmax(0,1fr)]" role={alert ? 'alert' : undefined}>
      <img src={`/mascotte/naanaa-${pose}.webp`} alt="" width="56" height="56" className="size-14" />
      <div className="bubble">{children}</div>
    </div>
  )
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

export default function ContributeWizard({ initialBarcode = '', initialUniverse }: Props) {
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

  // Univers (C23) : détecté sur la photo de face, modifiable à la main
  const [universe, setUniverse] = useState<Universe>(initialUniverse ?? 'food')
  const [universeDetected, setUniverseDetected] = useState(false)
  const [cosmeticCategory, setCosmeticCategory] = useState<CosmeticCategory | null>(null)
  const [inciText, setInciText] = useState('')
  const [pao, setPao] = useState('')
  const [readingInci, setReadingInci] = useState(false)

  const [nutrition, setNutrition] = useState<Nutrition>({})
  const [readingLabel, setReadingLabel] = useState(false)

  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [city, setCity] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [earned, setEarned] = useState<{ total: number; lines: Array<[string, number]> }>({ total: 0, lines: [] })
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null)
  const antibot = useAntibot('contrib-gotcha')

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
              kind?: 'food' | 'cosmetic' | 'other'
              cosmetic_category?: string | null
              confiance?: string
            }
            if (d.confiance !== 'faible') {
              if (d.name_fr) setName(d.name_fr)
              if (d.brand) setBrand(d.brand)
              if (d.quantity) setQuantity(d.quantity)
              if (d.halal_logo === true) setHalal(true)
              if (d.name_fr || d.brand) setPrefilled(true)
              if (d.kind === 'cosmetic' || d.kind === 'food') {
                setUniverse(d.kind)
                setUniverseDetected(true)
              }
              if (d.kind === 'cosmetic' && (COSMETIC_CATEGORIES as readonly string[]).includes(d.cosmetic_category ?? '')) {
                setCosmeticCategory(d.cosmetic_category as CosmeticCategory)
              }
            }
          }
        } catch { /* la saisie manuelle reste possible */ } finally {
          setIdentifying(false)
        }
      }

      // Liste INCI (beauté) → lecture vision, la personne vérifie
      if (kind === 'ingredients' && universe === 'cosmetic') {
        setReadingInci(true)
        const form = new FormData()
        form.append('image', file)
        try {
          const res = await fetch('/api/inci-read', { method: 'POST', body: form })
          if (res.ok) {
            const d = (await res.json()) as { inci_text?: string | null; period_after_opening?: string | null; confiance?: string }
            if (d.inci_text && d.confiance !== 'faible') setInciText((cur) => cur.trim() ? cur : d.inci_text ?? '')
            if (d.period_after_opening) setPao(d.period_after_opening)
          }
        } catch { /* saisie manuelle */ } finally {
          setReadingInci(false)
        }
      }

      // Tableau nutritionnel → lecture OCR + vision
      if (kind === 'nutrition' && universe === 'food') {
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
  }, [barcode, t, universe])

  // ── Envoi final ─────────────────────────────────────────────────────
  const submit = async (withPrice: boolean): Promise<void> => {
    setSubmitting(true)
    setError('')
    try {
      const body: Record<string, unknown> = {
        ...antibot.fields,
        barcode,
        name_fr: name.trim(),
        brand: brand.trim() || undefined,
        quantity: quantity.trim() || undefined,
        category_id: universe === 'food' ? (categoryId ?? undefined) : undefined,
        is_halal: halal === true ? true : undefined,
        image_front: photos.front?.fileId,
        image_ingredients: photos.ingredients?.fileId,
        image_nutrition: universe === 'food' ? photos.nutrition?.fileId : undefined,
        product_type: universe,
      }
      if (universe === 'cosmetic') {
        if (inciText.trim()) body.inci_text = inciText.trim()
        if (cosmeticCategory) body.cosmetic_category = cosmeticCategory
        if (/^\d{1,2}\s?M$/i.test(pao.trim())) body.period_after_opening = pao.trim().toUpperCase().replace(/\s/g, '')
      } else {
        for (const { key } of NUTRIENTS) {
          const v = nutrition[key]
          if (typeof v === 'number') body[key] = v
        }
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
  const stepIndex = { barcode: 0, photos: 1, info: 2, nutrition: 3, inci: 3, price: 4, done: 5 }[step]
  const stepLabel = {
    photos: t('contrib.stepPhotos'),
    info: t('contrib.stepProduct'),
    nutrition: t('contrib.stepNutrition'),
    inci: t('contrib.stepInci'),
    price: t('contrib.stepPrice'),
  }[step as 'photos' | 'info' | 'nutrition' | 'inci' | 'price']
  const thirdStep: Step = universe === 'cosmetic' ? 'inci' : 'nutrition'

  const back = (): void => {
    const order: Step[] = ['barcode', 'photos', 'info', thirdStep, 'price']
    const i = order.indexOf(step)
    if (i > 0) setStep(order[i - 1] as Step)
    else history.back()
  }

  const Header = (
    <div className="grid gap-3.5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={back} aria-label="Retour" className="icon-btn">
          <ArrowLeft className="rtl:rotate-180" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="disp d-s">{t('contrib.addThis')}</p>
          {stepLabel && (
            <p className="muted mt-0.5 text-xs">
              {t('contrib.step')} {stepIndex} {t('contrib.of')} 4 — {stepLabel}
            </p>
          )}
        </div>
        {(step === 'photos' || step === 'nutrition' || step === 'inci' || step === 'price') && (
          <button
            type="button"
            onClick={() => {
              if (step === 'photos') setStep('info')
              else if (step === 'nutrition' || step === 'inci') setStep('price')
              else void submit(false)
            }}
            className="-me-2 flex min-h-[44px] items-center px-2 text-[13px] font-bold underline underline-offset-[3px]"
          >
            {t('contrib.skip')}
          </button>
        )}
      </div>
      {stepLabel && (
        // Progression : 4 segments, barre de la maquette Compte
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={cn('h-2.5 flex-1 rounded-full border-[1.5px] border-line', n <= stepIndex ? 'bg-menthe' : 'bg-muted')} />
          ))}
        </div>
      )}
    </div>
  )

  const PhotoTile = ({ kind, title, hint }: { kind: PhotoKind; title: string; hint: string }) => {
    const p = photos[kind]
    return (
      <label
        className={cn(
          'grid cursor-pointer grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] border-2 p-2.5 pe-3',
          p ? 'border-line' : 'border-dashed border-line/45 bg-background'
        )}
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
        <span className="tile tint-creme size-[76px] rounded-[14px]">
          {p ? (
            <>
              <img src={p.preview} alt="" />
              {p.uploading ? (
                <span className="absolute inset-0 grid place-items-center bg-background/60">
                  <Loader2 size={20} className="animate-spin" />
                </span>
              ) : (
                <span className="absolute end-1 top-1 grid size-6 place-items-center rounded-full border-2 border-encre bg-menthe">
                  <Check size={13} className="text-encre" strokeWidth={3} />
                </span>
              )}
            </>
          ) : (
            <Camera size={26} className="text-muted-foreground" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block font-bold">{title}</span>
          <span className="muted mt-0.5 block text-[13px]">{hint}</span>
        </span>
        {p ? (
          <span className="flex min-h-[44px] items-center text-[13px] font-bold underline underline-offset-[3px]">{t('contrib.retake')}</span>
        ) : (
          <span className="icon-btn border-encre bg-menthe text-encre" aria-hidden="true"><Camera /></span>
        )}
      </label>
    )
  }

  const UniverseSwitch = (
    <div className="grid gap-1.5">
      <span className={LABEL}>{t('contrib.universe')}</span>
      <div className="grid grid-cols-2 gap-2">
        {(['food', 'cosmetic'] as const).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => setUniverse(u)}
            aria-pressed={universe === u}
            className={cn(CHOICE, 'justify-center', universe === u && (u === 'cosmetic' ? 'fill bg-beauty' : 'fill bg-menthe'))}
          >
            {u === 'food' ? t('beauty.food') : t('beauty.cosmetic')}
          </button>
        ))}
      </div>
      {universeDetected && (
        <p className="muted flex items-center gap-1.5 text-[12px] font-semibold">
          <Sparkles size={13} /> {t('contrib.universeDetected')}
        </p>
      )}
    </div>
  )

  const Cta = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled} className="btn primary min-h-[54px] w-full text-[17px]">
      {label}
      {!disabled && <ArrowRight size={19} className="rtl:rotate-180" />}
    </button>
  )

  const ErrorBubble = error ? (
    <Bubble pose="oups" alert>
      <p className="font-semibold text-destructive">{error}</p>
    </Bubble>
  ) : null

  // ── Écrans ──────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="card grid justify-items-center gap-4 p-5 text-center md:p-8">
        <div className="flex items-end justify-center gap-3">
          <img src="/mascotte/naanaa-bravo.webp" alt="" width="96" height="141" className="naanaa-bob h-auto w-24" />
          {/* Pastille de points : même emblème que le score, sur aplat citron */}
          <span
            className="score-sticker lg"
            style={{ '--c': 'var(--color-citron)' } as CSSProperties}
            role="img"
            aria-label={`+${earned.total} ${t('points.points')}`}
          >
            <span aria-hidden="true"><b>+{earned.total}</b><i>{t('points.points')}</i></span>
          </span>
        </div>

        <h2 className="disp d-l">{t('contrib.thanksTitle')}</h2>
        <p className="muted max-w-[320px] text-[15px] leading-relaxed">
          « {name} » {t('contrib.thanksDesc')}
        </p>

        <ul className="w-full max-w-[340px] overflow-hidden rounded-2xl border-2 border-line text-start">
          {earned.lines.map(([label, pts]) => (
            <li key={label} className="flex items-center justify-between gap-3 border-b-[1.5px] border-line px-4 py-2.5 text-sm last:border-b-0">
              <span className="font-semibold">{label}</span>
              <span className="chip fill num bg-menthe">+{pts}</span>
            </li>
          ))}
        </ul>

        {loggedIn !== true && (
          <div className="w-full max-w-[340px] text-start">
            <Bubble pose="astuce">
              <p className="text-[13px]">
                {t('contrib.anonNote')}{' '}
                <a href="/connexion" className="font-bold underline underline-offset-2">{t('nav.account')}</a>
              </p>
            </Bubble>
          </div>
        )}

        <div className="grid w-full max-w-[340px] gap-3">
          <a href={`/produit/${barcode}`} className="btn primary min-h-[54px] text-[17px]">
            {t('contrib.seeProduct')}
          </a>
          <a href="/scan" className="btn">
            <RotateCcw size={17} />
            {t('contrib.scanAnother')}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-5">
      {Header}

      {step === 'barcode' && (
        <div className={STEP_CARD}>
          <h2 className="disp d-m">{t('scan.manual')}</h2>
          <input
            type="text"
            inputMode="numeric"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value.replace(/\D/g, '').slice(0, 13))}
            placeholder="6111080016394"
            aria-label={t('scan.manual')}
            className={cn(FIELD, 'min-h-[58px] text-center font-display text-xl tracking-wider')}
          />
          <Cta
            label={t('contrib.continue')}
            disabled={!/^\d{8}$|^\d{13}$/.test(barcode)}
            onClick={() => setStep('photos')}
          />
        </div>
      )}

      {step === 'photos' && (
        <div className={STEP_CARD}>
          <h2 className="disp d-m">{t('contrib.photosTitle')}</h2>

          <PhotoTile kind="front" title={t('contrib.photoFront')} hint={t('contrib.photoFrontHint')} />
          {photos.front && UniverseSwitch}
          <PhotoTile
            kind="ingredients"
            title={universe === 'cosmetic' ? t('inci.title') : t('contrib.photoIngredients')}
            hint={universe === 'cosmetic' ? t('inci.photoHint') : t('contrib.photoIngredientsHint')}
          />
          {universe === 'food' && (
            <PhotoTile kind="nutrition" title={t('contrib.photoNutrition')} hint={t('contrib.photoNutritionHint')} />
          )}

          {readingInci && (
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Loader2 size={15} className="animate-spin" />
              {t('inci.reading')}
            </p>
          )}

          {identifying && (
            <Bubble pose="loupe">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Loader2 size={15} className="animate-spin text-ai-ink" />
                {t('contrib.identifying')}
              </p>
            </Bubble>
          )}

          <Bubble pose="astuce">
            <p className="text-[13px] leading-snug">{t('contrib.photoBonus')}</p>
          </Bubble>

          {ErrorBubble}

          <div>
            <Cta
              label={t('contrib.continue')}
              disabled={!photos.front}
              onClick={() => setStep('info')}
            />
            {!photos.front && (
              <p className="muted mt-2 text-center text-[13px]">{t('contrib.photoRequired')}</p>
            )}
          </div>
        </div>
      )}

      {step === 'info' && (
        <div className={STEP_CARD}>
          {antibot.honeypot}
          <h2 className="disp d-m">{t('contrib.stepProduct')}</h2>
          {prefilled && (
            <span className="chip fill w-max bg-ai">
              <Sparkles />
              {t('contrib.prefilled')}
            </span>
          )}

          <label className="grid gap-1.5">
            <span className={LABEL}>{t('contrib.name')}</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Confiture de fraises extra" className={FIELD} />
          </label>

          <label className="grid gap-1.5">
            <span className={LABEL}>{t('contrib.brand')}</span>
            <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Délicia" className={FIELD} />
          </label>

          <label className="grid gap-1.5">
            <span className={LABEL}>{t('contrib.quantity')}</span>
            <input type="text" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="430 g" className={FIELD} />
          </label>

          {UniverseSwitch}

          {universe === 'cosmetic' ? (
            <div className="grid gap-2">
              <span className={LABEL}>{t('beauty.category')}</span>
              <div className="chips gap-2">
                {COSMETIC_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCosmeticCategory(cosmeticCategory === c ? null : c)}
                    aria-pressed={cosmeticCategory === c}
                    className={cn(CHOICE, cosmeticCategory === c && 'fill bg-beauty')}
                  >
                    {cosmeticCategory === c && <Check strokeWidth={3} />}
                    {t(`beauty.cat.${c}` as `beauty.cat.${CosmeticCategory}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-2">
              <span className={LABEL}>{t('contrib.category')}</span>
              <div className="chips gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
                    aria-pressed={categoryId === c.id}
                    className={cn(CHOICE, categoryId === c.id && 'fill bg-menthe')}
                  >
                    {categoryId === c.id && <Check strokeWidth={3} />}
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-line p-3">
            <span className="tile tint-menthe size-[42px] flex-none rounded-full">
              <span className="block size-6" dangerouslySetInnerHTML={{ __html: halalLogo }} />
            </span>
            <span className="min-w-0 flex-1 text-[15px] font-bold">{t('halal.question')}</span>
            <span className="flex flex-none gap-2">
              <button
                type="button"
                onClick={() => setHalal(halal === true ? null : true)}
                aria-pressed={halal === true}
                className={cn(CHOICE, halal === true && 'fill bg-menthe')}
              >
                {t('halal.yes')}
              </button>
              <button
                type="button"
                onClick={() => setHalal(halal === false ? null : false)}
                aria-pressed={halal === false}
                className={cn(CHOICE, halal === false && 'fill bg-menthe')}
              >
                {t('halal.notSeen')}
              </button>
            </span>
          </div>

          <Cta
            label={t('contrib.continue')}
            disabled={name.trim().length < 2}
            onClick={() => setStep(thirdStep)}
          />
        </div>
      )}

      {step === 'nutrition' && (
        <div className={STEP_CARD}>
          <div className="grid gap-2">
            <div className="sec-head">
              <h2 className="disp d-m">{t('contrib.nutritionTitle')}</h2>
              <span className="eyebrow">pour 100 g</span>
            </div>
            {(photos.nutrition || readingLabel) && (
              <p className="flex items-center gap-2 text-[13px] font-semibold">
                {readingLabel ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-ai-ink" />}
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
                  className={cn(
                    'relative flex flex-col rounded-2xl border-2 bg-background px-4 py-3',
                    bad ? 'border-score-mediocre' : 'border-line'
                  )}
                >
                  <span className="muted text-xs font-semibold">{label}</span>
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
                    <span className="muted flex-none text-xs font-semibold">{unit}</span>
                  </span>
                  {bad && (
                    <span className="absolute end-3 top-2.5 text-[10.5px] font-extrabold uppercase tracking-wide text-score-mediocre-ink">
                      {t('contrib.check')}
                    </span>
                  )}
                </label>
              )
            })}
          </div>

          <button type="button" onClick={() => { setNutrition({}); setStep('price') }} className="btn flat w-full">
            <HelpCircle size={17} />
            {t('contrib.noTable')}
          </button>

          <Cta label={t('contrib.continue')} onClick={() => setStep('price')} />
        </div>
      )}

      {step === 'inci' && (
        <div className={STEP_CARD}>
          <div className="grid gap-2">
            <h2 className="disp d-m">{t('contrib.inciTitle')}</h2>
            {(photos.ingredients || readingInci) && (
              <p className="flex items-center gap-2 text-[13px] font-semibold">
                {readingInci ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} className="text-ai-ink" />}
                {readingInci ? t('inci.reading') : t('inci.read')}
              </p>
            )}
          </div>

          {!photos.ingredients && (
            <PhotoTile kind="ingredients" title={t('inci.title')} hint={t('inci.photoHint')} />
          )}

          <textarea
            value={inciText}
            onChange={(e) => setInciText(e.target.value)}
            placeholder={t('inci.placeholder')}
            rows={7}
            className="w-full rounded-2xl border-2 border-line bg-background px-4 py-3 text-sm font-medium uppercase leading-relaxed outline-none focus:border-brand-ink"
          />

          <label className="grid gap-1.5">
            <span className={LABEL}>{t('inci.paoLabel')}</span>
            <input type="text" value={pao} onChange={(e) => setPao(e.target.value)} placeholder="12M" className={cn(FIELD, 'w-32 uppercase')} />
          </label>

          <button type="button" onClick={() => { setInciText(''); setStep('price') }} className="btn flat w-full">
            <HelpCircle size={17} />
            {t('inci.noList')}
          </button>

          <Cta label={t('contrib.continue')} onClick={() => setStep('price')} />
        </div>
      )}

      {step === 'price' && (
        <div className={STEP_CARD}>
          <div className="grid gap-1.5">
            <h2 className="disp d-m">{t('price.howMuch')}</h2>
            <p className="muted text-sm leading-relaxed">{t('price.disclaimer')}</p>
          </div>

          <div className="flex items-baseline justify-center gap-2.5 rounded-3xl border-2 border-line bg-background px-5 py-6">
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0,00"
              aria-label={t('price.howMuch')}
              className="w-40 border-0 bg-transparent text-center font-display text-[52px] font-extrabold leading-none outline-none"
            />
            <span className="muted text-xl font-bold">DH</span>
          </div>

          <div className="grid gap-2">
            <span className={LABEL}>{t('price.where')}</span>
            <div className="chips gap-2">
              {STORES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStore(store === s ? '' : s)}
                  aria-pressed={store === s}
                  className={cn(CHOICE, store === s && 'fill bg-menthe')}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <label className="grid gap-1.5">
            <span className={LABEL}>{t('price.city')}</span>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Casablanca" className={FIELD} />
          </label>

          <span className="chip fill w-max bg-citron">
            <Tag />
            {t('points.pricePill')}
          </span>

          {ErrorBubble}

          <button type="button" onClick={() => void submit(true)} disabled={submitting} className="btn primary min-h-[54px] w-full text-[17px]">
            {submitting ? <Loader2 size={19} className="animate-spin" /> : <Check size={19} />}
            {submitting ? t('contrib.sending') : t('contrib.publish')}
          </button>
        </div>
      )}
    </div>
  )
}
