/**
 * Formulaire de contribution — ajout de produit multi-étapes
 *
 * Étapes :
 * 1. Code-barres (pré-rempli si venant d'un scan non trouvé)
 * 2. Photos (face avant, tableau nutritionnel, ingrédients)
 * 3. Informations produit (nom, marque, catégorie)
 * 4. Confirmation et soumission
 *
 * Mode édition (existingProduct fourni) :
 * - Démarre à l'étape 'info' (saute code-barres et photos)
 * - Pré-remplit nom et marque
 * - Permet l'upload de photo face avant
 * - Met à jour le produit existant au lieu d'en créer un nouveau
 *
 * Référence : SPEC.md §9
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { getAccessToken } from '@/lib/auth'
import { useAntibot } from '@/lib/antibot'
import { Camera, Check, Lightbulb, UtensilsCrossed, FileText } from 'lucide-react'

interface ContributeFormProps {
  initialBarcode?: string
  existingProduct?: Record<string, unknown> | null
}

type Step = 'barcode' | 'photos' | 'info' | 'confirm'

const DIRECTUS_URL = '/api/directus'

// Langage Marché Pop : champ contour encre sur fond crème
const FIELD = 'min-h-[48px] w-full rounded-2xl border-2 border-line bg-background px-4 text-[15px] font-medium outline-none placeholder:text-muted-foreground focus:border-brand-ink'
const FILE = 'w-full text-sm file:me-3 file:cursor-pointer file:rounded-full file:border-2 file:border-line file:bg-card file:px-3.5 file:py-1.5 file:text-[13px] file:font-bold file:text-foreground'
const STEP_CARD = 'card grid gap-4 p-4 md:p-5'

/** Bulle de Naânaa (astuce, erreur) */
function Bubble({ pose, children, alert }: { pose: string; children: React.ReactNode; alert?: boolean }) {
  return (
    <div className="naanaa grid-cols-[56px_minmax(0,1fr)]" role={alert ? 'alert' : undefined}>
      <img src={`/mascotte/naanaa-${pose}.webp`} alt="" width="56" height="56" className="size-14" />
      <div className="bubble text-sm">{children}</div>
    </div>
  )
}

function isValidEan(code: string): boolean {
  return /^\d{8}$|^\d{13}$/.test(code)
}

export default function ContributeForm({ initialBarcode = '', existingProduct = null }: ContributeFormProps) {
  const { t } = useLocale()
  const isEditMode = existingProduct !== null && existingProduct !== undefined

  // En mode édition, démarrer à l'étape info (sauter code-barres et photos)
  const initialStep: Step = isEditMode ? 'info' : (initialBarcode ? 'photos' : 'barcode')

  const [step, setStep] = useState<Step>(initialStep)
  const [barcode, setBarcode] = useState(initialBarcode)
  const [photos, setPhotos] = useState<{ front?: File; nutrition?: File; ingredients?: File }>({})
  const [productInfo, setProductInfo] = useState({
    name_fr: isEditMode ? ((existingProduct.name_fr as string) ?? '') : '',
    brand: isEditMode ? ((existingProduct.brand as string) ?? '') : '',
    ingredients_text: isEditMode ? ((existingProduct.ingredients_text as string) ?? '') : '',
    energy_kcal: isEditMode ? ((existingProduct.energy_kcal as number) ?? null) : null,
    fat_total: isEditMode ? ((existingProduct.fat_total as number) ?? null) : null,
    fat_saturated: isEditMode ? ((existingProduct.fat_saturated as number) ?? null) : null,
    carbs_total: isEditMode ? ((existingProduct.carbs_total as number) ?? null) : null,
    sugars: isEditMode ? ((existingProduct.sugars as number) ?? null) : null,
    fiber: isEditMode ? ((existingProduct.fiber as number) ?? null) : null,
    proteins: isEditMode ? ((existingProduct.proteins as number) ?? null) : null,
    salt: isEditMode ? ((existingProduct.salt as number) ?? null) : null,
  })
  const [frontPhotoFile, setFrontPhotoFile] = useState<File | null>(null)
  const [frontPhotoUploading, setFrontPhotoUploading] = useState(false)
  const [frontPhotoUploaded, setFrontPhotoUploaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  // ponytail: écrit Directus en direct (pas d'endpoint à nous) → contrôle anti-bot côté client seulement
  const antibot = useAntibot('fix-gotcha')
  const [error, setError] = useState<string | null>(null)

  // Étape 1 : Code-barres
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidEan(barcode)) {
      setStep('photos')
    }
  }

  // Gestion des photos
  const handlePhoto = (field: 'front' | 'nutrition' | 'ingredients', file: File | null) => {
    if (file) {
      setPhotos((prev) => ({ ...prev, [field]: file }))
    }
  }

  // Upload de la photo face avant (mode édition)
  const handleFrontPhotoUpload = async () => {
    if (!frontPhotoFile || !isEditMode) return
    setFrontPhotoUploading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setFrontPhotoUploading(false)
        return
      }

      // 1. Upload du fichier vers Directus /files
      const formData = new FormData()
      formData.append('file', frontPhotoFile)

      const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!uploadRes.ok) {
        throw new Error(`Erreur upload: ${uploadRes.status}`)
      }

      const uploadData = await uploadRes.json() as { data: { id: string } }
      const fileId = uploadData.data.id

      // 2. PATCH le produit avec la nouvelle image
      const productId = existingProduct.id as string
      const patchRes = await fetch(`${DIRECTUS_URL}/items/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_front: fileId }),
      })

      if (!patchRes.ok) {
        throw new Error(`Erreur mise à jour: ${patchRes.status}`)
      }

      setFrontPhotoUploaded(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'upload')
    } finally {
      setFrontPhotoUploading(false)
    }
  }

  // Soumission
  const handleSubmit = async () => {
    if (antibot.bot()) { setSubmitted(true); return }
    setSubmitting(true)
    setError(null)

    try {
      if (isEditMode) {
        // Mode édition : mettre à jour le produit existant
        const token = await getAccessToken()
        if (!token) {
          setError('Session expirée. Veuillez vous reconnecter.')
          setSubmitting(false)
          return
        }

        const productId = existingProduct.id as string
        const patchData: Record<string, unknown> = {
          name_fr: productInfo.name_fr.trim(),
          brand: productInfo.brand.trim(),
        }

        // Ajouter les champs nutritionnels modifiés
        if (productInfo.ingredients_text) patchData.ingredients_text = productInfo.ingredients_text
        if (productInfo.energy_kcal !== null) patchData.energy_kcal = productInfo.energy_kcal
        if (productInfo.fat_total !== null) patchData.fat_total = productInfo.fat_total
        if (productInfo.fat_saturated !== null) patchData.fat_saturated = productInfo.fat_saturated
        if (productInfo.carbs_total !== null) patchData.carbs_total = productInfo.carbs_total
        if (productInfo.sugars !== null) patchData.sugars = productInfo.sugars
        if (productInfo.fiber !== null) patchData.fiber = productInfo.fiber
        if (productInfo.proteins !== null) patchData.proteins = productInfo.proteins
        if (productInfo.salt !== null) patchData.salt = productInfo.salt

        // Uploader les photos (front, nutrition, ingredients)
        const photoFields: Array<[string, string, File | undefined]> = [
          ['front', 'image_front', frontPhotoFile ?? undefined],
          ['nutrition', 'image_nutrition', photos.nutrition],
          ['ingredients', 'image_ingredients', photos.ingredients],
        ]

        for (const [label, field, file] of photoFields) {
          if (!file) continue
          try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('title', `${barcode || existingProduct.barcode}-${label}`)

            const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            })

            if (uploadRes.ok) {
              const uploadData = await uploadRes.json() as { data?: { id: string } }
              if (uploadData?.data?.id) {
                patchData[field] = uploadData.data.id
              }
            }
          } catch {
            // Continue avec les autres uploads
          }
        }

        // Si une photo nutrition a été uploadée, lancer l'OCR pour enrichir les données
        if (photos.nutrition && !productInfo.energy_kcal) {
          try {
            const ocrForm = new FormData()
            ocrForm.append('image_nutrition', photos.nutrition)
            ocrForm.append('barcode', (barcode || existingProduct.barcode) as string)

            const ocrRes = await fetch('/api/ocr-score', { method: 'POST', body: ocrForm })
            if (ocrRes.ok) {
              const ocrData = await ocrRes.json() as { job_status: string; parsed_data?: Record<string, unknown> }
              if (ocrData.job_status === 'done' && ocrData.parsed_data) {
                const pd = ocrData.parsed_data
                // Enrichir seulement les champs non saisis manuellement
                if (pd.energy_kcal != null && !patchData.energy_kcal) patchData.energy_kcal = pd.energy_kcal
                if (pd.fat_total != null && !patchData.fat_total) patchData.fat_total = pd.fat_total
                if (pd.fat_saturated != null && !patchData.fat_saturated) patchData.fat_saturated = pd.fat_saturated
                if (pd.carbs_total != null && !patchData.carbs_total) patchData.carbs_total = pd.carbs_total
                if (pd.sugars != null && !patchData.sugars) patchData.sugars = pd.sugars
                if (pd.fiber != null && !patchData.fiber) patchData.fiber = pd.fiber
                if (pd.proteins != null && !patchData.proteins) patchData.proteins = pd.proteins
                if (pd.salt != null && !patchData.salt) patchData.salt = pd.salt
                if (pd.ingredients_text && !patchData.ingredients_text) patchData.ingredients_text = pd.ingredients_text
              }
            }
          } catch {
            // OCR optionnel — on continue
          }
        }

        const res = await fetch(`${DIRECTUS_URL}/items/products/${productId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(patchData),
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => null) as { errors?: Array<{ message: string }> } | null
          throw new Error(errorData?.errors?.[0]?.message ?? `Erreur ${res.status}`)
        }

        // Créer une contribution de type fix_data
        await fetch(`${DIRECTUS_URL}/items/contributions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            product_id: productId,
            type: 'fix_data',
            status: 'approved',
            data_before: {
              name_fr: existingProduct.name_fr,
              brand: existingProduct.brand,
            },
            data_after: patchData,
          }),
        }).catch(() => { /* contribution tracking optionnel */ })

        setSubmitted(true)
      } else {
        // Mode création
        const token = await getAccessToken()

        // ─── Mode ANONYME (sans login) ─────────────────────────────
        // Création basique via /bayen-api/contribute. Pas d'upload photo,
        // pas d'OCR (réservé aux utilisateurs connectés). Le produit est
        // immédiatement publié, la base s'enrichit sans friction.
        if (!token) {
          const anonPayload: Record<string, unknown> = {
            barcode,
            name_fr: productInfo.name_fr.trim(),
          }
          if (productInfo.brand.trim()) anonPayload.brand = productInfo.brand.trim()
          if (productInfo.ingredients_text?.trim()) anonPayload.ingredients_text = productInfo.ingredients_text.trim()
          if (productInfo.energy_kcal != null) anonPayload.energy_kcal = productInfo.energy_kcal
          if (productInfo.fat_total != null) anonPayload.fat_total = productInfo.fat_total
          if (productInfo.fat_saturated != null) anonPayload.fat_saturated = productInfo.fat_saturated
          if (productInfo.carbs_total != null) anonPayload.carbs_total = productInfo.carbs_total
          if (productInfo.sugars != null) anonPayload.sugars = productInfo.sugars
          if (productInfo.fiber != null) anonPayload.fiber = productInfo.fiber
          if (productInfo.proteins != null) anonPayload.proteins = productInfo.proteins
          if (productInfo.salt != null) anonPayload.salt = productInfo.salt

          const anonRes = await fetch(`${DIRECTUS_URL}/bayen-api/contribute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(anonPayload),
          })
          const anonData = await anonRes.json().catch(() => null) as { error?: string; existed?: boolean } | null

          if (!anonRes.ok) {
            if (anonRes.status === 429) throw new Error('Trop de contributions. Patiente quelques minutes.')
            throw new Error(anonData?.error ?? `Erreur ${anonRes.status}`)
          }

          // Si l'utilisateur avait sélectionné des photos, on lui rappelle gentiment
          if (photos.front || photos.nutrition || photos.ingredients) {
            setError('💡 Crée un compte pour ajouter les photos et débloquer l\'OCR auto.')
          }
          setSubmitted(true)
          return
        }

        // ─── Mode CONNECTÉ (avec photos + OCR + gamification) ──────
        // Données de base du produit
        const productData: Record<string, unknown> = {
          barcode,
          name_fr: productInfo.name_fr.trim(),
          brand: productInfo.brand.trim(),
          status: 'published',
          data_source: 'community',
        }

        // Si une photo nutrition est fournie, lancer le pipeline OCR
        if (photos.nutrition) {
          try {
            const ocrForm = new FormData()
            ocrForm.append('image_nutrition', photos.nutrition)
            ocrForm.append('barcode', barcode)

            const ocrRes = await fetch('/api/ocr-score', {
              method: 'POST',
              body: ocrForm,
            })

            if (ocrRes.ok) {
              const ocrData = await ocrRes.json() as {
                job_status: string
                parsed_data?: Record<string, unknown>
                ocr_text?: string
                ocr_confidence?: number
              }

              if (ocrData.job_status === 'done' && ocrData.parsed_data) {
                // Enrichir le produit avec les données OCR
                const pd = ocrData.parsed_data
                if (pd.energy_kcal != null) productData.energy_kcal = pd.energy_kcal
                if (pd.fat_total != null) productData.fat_total = pd.fat_total
                if (pd.fat_saturated != null) productData.fat_saturated = pd.fat_saturated
                if (pd.carbs_total != null) productData.carbs_total = pd.carbs_total
                if (pd.sugars != null) productData.sugars = pd.sugars
                if (pd.fiber != null) productData.fiber = pd.fiber
                if (pd.proteins != null) productData.proteins = pd.proteins
                if (pd.salt != null) productData.salt = pd.salt
                if (pd.ingredients_text) productData.ingredients_text = pd.ingredients_text
                if (pd.nova_group) productData.nova_group = pd.nova_group
                // Utiliser le nom/marque OCR si non saisi par l'utilisateur
                if (!productData.name_fr && pd.product_name) productData.name_fr = pd.product_name
                if (!productData.brand && pd.brand) productData.brand = pd.brand
                productData.data_source = 'ocr_tesseract'
                productData.ocr_raw_text = ocrData.ocr_text
                productData.ocr_confidence = ocrData.ocr_confidence
              }
              // Si low_confidence ou manual_required, on crée quand même avec les données saisies
            }
          } catch {
            // OCR a échoué — on continue avec les données manuelles
          }
        }

        // Créer le produit dans Directus
        const createRes = await fetch(`${DIRECTUS_URL}/items/products`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(productData),
        })

        if (!createRes.ok) {
          const errorData = await createRes.json().catch(() => null) as { errors?: Array<{ message: string; extensions?: { code?: string } }> } | null
          const code = errorData?.errors?.[0]?.extensions?.code
          const rawMsg = errorData?.errors?.[0]?.message ?? `Erreur ${createRes.status}`
          // Traduire les erreurs Directus courantes en français
          if (code === 'FORBIDDEN' || createRes.status === 403) {
            throw new Error("Tu n'as pas encore les permissions pour contribuer. Contacte un administrateur.")
          }
          if (code === 'RECORD_NOT_UNIQUE' || rawMsg.toLowerCase().includes('unique')) {
            throw new Error('Ce produit existe déjà dans la base — essaye de le scanner pour le voir.')
          }
          throw new Error(rawMsg)
        }

        // Récupérer l'ID du produit créé pour y attacher les images
        const createdProduct = await createRes.json().catch(() => null) as { data?: { id: string } } | null
        const productId = createdProduct?.data?.id

        // Uploader les photos et mettre à jour le produit
        if (productId && (photos.front || photos.nutrition || photos.ingredients)) {
          const imageUpdates: Record<string, string> = {}

          for (const [field, file] of Object.entries(photos) as Array<[string, File | undefined]>) {
            if (!file) continue
            try {
              const formData = new FormData()
              formData.append('file', file)
              formData.append('title', `${barcode}-${field}`)

              const uploadRes = await fetch(`${DIRECTUS_URL}/files`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
              })

              if (uploadRes.ok) {
                const uploadData = await uploadRes.json() as { data?: { id: string } }
                const fileId = uploadData?.data?.id
                if (fileId) {
                  if (field === 'front') imageUpdates.image_front = fileId
                  else if (field === 'nutrition') imageUpdates.image_nutrition = fileId
                  else if (field === 'ingredients') imageUpdates.image_ingredients = fileId
                }
              }
            } catch {
              // Upload individuel échoué — on continue avec les autres
            }
          }

          // Mettre à jour le produit avec les IDs des fichiers
          if (Object.keys(imageUpdates).length > 0) {
            await fetch(`${DIRECTUS_URL}/items/products/${productId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify(imageUpdates),
            }).catch(() => { /* silencieux si l'update image échoue */ })
          }
        }

        setSubmitted(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi. Vérifiez votre connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  // Rendu après soumission réussie
  if (submitted) {
    return (
      <div className="card grid justify-items-center gap-3 p-6 text-center md:p-8">
        {/* Contribution réussie : Naânaa applaudit */}
        <img src="/mascotte/naanaa-bravo.webp" alt="" width="96" height="141" className="naanaa-bob h-auto w-24" />
        <h2 className="disp d-l">{isEditMode ? 'Produit mis à jour !' : t('contribute.thanks')}</h2>
        <p className="muted text-sm">
          Le produit <span className="num font-semibold text-foreground">{barcode}</span> a été {isEditMode ? 'mis à jour' : 'soumis'}.
        </p>
        {!isEditMode && <p className="muted text-sm">Un modérateur vérifiera les données avant publication.</p>}
        {error && <Bubble pose="astuce"><p>{error}</p></Bubble>}
        <div className="mt-3 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          {isEditMode ? (
            <a href={`/produit/${barcode}`} className="btn primary">Voir la fiche produit</a>
          ) : (
            <button
              type="button"
              className="btn primary"
              onClick={() => { setSubmitted(false); setStep('barcode'); setBarcode(''); setPhotos({}); setProductInfo((p) => ({ ...p, name_fr: '', brand: '' })) }}
            >
              {t('contribute.addAnother')}
            </button>
          )}
          <a href="/scan" className="btn">Scanner un produit</a>
        </div>
      </div>
    )
  }

  // Étapes visibles selon le mode
  const visibleSteps: Step[] = isEditMode
    ? ['info', 'confirm']
    : ['barcode', 'photos', 'info', 'confirm']
  const stepLabelsMap: Record<Step, string> = {
    barcode: t('contribute.barcode'),
    photos: t('contribute.photos'),
    info: t('contribute.info'),
    confirm: t('contribute.confirm'),
  }

  const ErrorBubble = error ? <Bubble pose="oups" alert><p>{error}</p></Bubble> : null

  return (
    <div className="grid gap-5">
      {/* Indicateur d'étapes : pastilles rondes numérotées */}
      <ol className="flex items-center gap-2">
        {visibleSteps.map((s, i) => {
          const isCurrent = s === step
          const isPast = visibleSteps.indexOf(step) > i
          return (
            <li key={s} className="flex flex-1 items-center gap-2" aria-current={isCurrent ? 'step' : undefined}>
              <span className={cn(
                'grid size-8 flex-none place-items-center rounded-full border-2 font-display text-xs font-extrabold',
                isCurrent && 'border-encre bg-menthe text-encre',
                isPast && 'border-encre bg-citron text-encre',
                !isCurrent && !isPast && 'border-line bg-muted'
              )}>
                {isPast ? '✓' : i + 1}
              </span>
              <span className={cn('hidden text-xs sm:inline', isCurrent ? 'font-bold' : 'muted')}>
                {stepLabelsMap[s]}
              </span>
              {i < visibleSteps.length - 1 && <span className="h-0.5 flex-1 rounded-full bg-line/30" />}
            </li>
          )
        })}
      </ol>

      {/* Étape 1 : Code-barres (mode création uniquement) */}
      {step === 'barcode' && !isEditMode && (
        <form onSubmit={handleBarcodeSubmit} className={STEP_CARD}>
          {antibot.honeypot}
          <label className="grid gap-1.5">
            <span className="text-[13.5px] font-bold">{t('contribute.barcode')}</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={13}
              placeholder="6111080016394"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
              className={cn(FIELD, 'num text-center font-display text-lg tracking-wider')}
              autoFocus
            />
          </label>
          {barcode && !isValidEan(barcode) && (
            <p className="text-xs text-destructive">Format EAN-8 (8 chiffres) ou EAN-13 (13 chiffres)</p>
          )}
          <button type="submit" className="btn primary w-full" disabled={!isValidEan(barcode)}>
            {t('contribute.continue')}
          </button>
        </form>
      )}

      {/* Étape 2 : Photos (mode création uniquement) */}
      {step === 'photos' && !isEditMode && (
        <div className={STEP_CARD}>
          <div className="sec-head">
            <h2 className="disp d-m">{t('contribute.photos')}</h2>
            <span className="chip num">{barcode}</span>
          </div>

          {([
            { key: 'nutrition' as const, label: t('contribute.photoNutrition'), required: true, hint: 'Cadrez le tableau des valeurs nutritionnelles' },
            { key: 'ingredients' as const, label: t('contribute.photoIngredients'), required: false, hint: 'Photo de la liste des ingrédients' },
            { key: 'front' as const, label: t('contribute.photoFront'), required: false, hint: 'Photo du packaging face avant' },
          ]).map(({ key, label, required, hint }) => (
            <div key={key} className="grid gap-2 rounded-2xl border-2 border-line p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">
                  {label} {required && <span className="text-destructive">*</span>}
                </span>
                {photos[key] && <span className="chip fill bg-menthe"><Check strokeWidth={3} /> Ajoutée</span>}
              </div>
              <p className="muted text-xs">{hint}</p>
              <input
                type="file"
                accept="image/*"
                aria-label={label}
                onChange={(e) => handlePhoto(key, e.target.files?.[0] ?? null)}
                className={FILE}
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn" onClick={() => setStep('barcode')}>
              {t('contribute.back')}
            </button>
            <button type="button" className="btn primary" onClick={() => setStep('info')} disabled={!photos.nutrition}>
              {t('contribute.continue')}
            </button>
          </div>
        </div>
      )}

      {/* Étape 3 : Infos produit */}
      {step === 'info' && (
        <div className="grid gap-4">
          <div className={STEP_CARD}>
            <div className="sec-head">
              <h2 className="disp d-m">{t('contribute.info')}</h2>
              <span className="chip num">{barcode}</span>
            </div>
            <label className="grid gap-1.5">
              <span className="text-[13.5px] font-bold">{t('contribute.name')} <span className="text-destructive">*</span></span>
              <input
                type="text"
                placeholder="Ex: Bimo Chocolat"
                value={productInfo.name_fr}
                onChange={(e) => setProductInfo((p) => ({ ...p, name_fr: e.target.value }))}
                className={FIELD}
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-[13.5px] font-bold">{t('contribute.brand')} <span className="text-destructive">*</span></span>
              <input
                type="text"
                placeholder="Ex: Bimo"
                value={productInfo.brand}
                onChange={(e) => setProductInfo((p) => ({ ...p, brand: e.target.value }))}
                className={FIELD}
              />
            </label>
          </div>

          {/* Photos (mode édition — les 3 photos) */}
          {isEditMode && (
            <div className={STEP_CARD}>
              <h2 className="disp d-s flex items-center gap-2"><Camera size={18} /> Photos du produit</h2>
              {[
                { key: 'front' as const, label: 'Photo face avant', field: 'image_front' },
                { key: 'nutrition' as const, label: 'Tableau nutritionnel', field: 'image_nutrition' },
                { key: 'ingredients' as const, label: 'Liste des ingrédients', field: 'image_ingredients' },
              ].map(({ key, label, field }) => (
                <div key={key} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold">{label}</span>
                    {Boolean(existingProduct[field]) && (
                      <span className="chip fill bg-menthe"><Check strokeWidth={3} /> Image existante</span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    aria-label={label}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null
                      if (key === 'front') setFrontPhotoFile(file)
                      else if (file) setPhotos((p) => ({ ...p, [key]: file }))
                    }}
                    className={FILE}
                  />
                </div>
              ))}
              <Bubble pose="astuce">
                <p className="flex items-start gap-1.5"><Lightbulb size={15} className="mt-0.5 flex-none" /> Uploadez le tableau nutritionnel pour remplir automatiquement les valeurs via OCR</p>
              </Bubble>
            </div>
          )}

          {/* Valeurs nutritionnelles (mode édition) */}
          {isEditMode && (
            <div className={STEP_CARD}>
              <div className="sec-head">
                <h2 className="disp d-s flex items-center gap-2"><UtensilsCrossed size={18} /> Valeurs nutritionnelles</h2>
                <span className="eyebrow">pour 100 g</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { key: 'energy_kcal', label: 'Énergie (kcal)', placeholder: 'ex: 450' },
                  { key: 'fat_total', label: 'Lipides (g)', placeholder: 'ex: 25' },
                  { key: 'fat_saturated', label: 'dont AGS (g)', placeholder: 'ex: 12' },
                  { key: 'carbs_total', label: 'Glucides (g)', placeholder: 'ex: 55' },
                  { key: 'sugars', label: 'dont Sucres (g)', placeholder: 'ex: 30' },
                  { key: 'fiber', label: 'Fibres (g)', placeholder: 'ex: 2' },
                  { key: 'proteins', label: 'Protéines (g)', placeholder: 'ex: 6' },
                  { key: 'salt', label: 'Sel (g)', placeholder: 'ex: 0.5' },
                ].map(({ key, label, placeholder }) => (
                  <label key={key} className="grid gap-1 rounded-2xl border-2 border-line bg-background px-3.5 py-2.5">
                    <span className="muted text-[11.5px] font-semibold">{label}</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder={placeholder}
                      value={productInfo[key as keyof typeof productInfo] ?? ''}
                      onChange={(e) => setProductInfo((p) => ({
                        ...p,
                        [key]: e.target.value ? parseFloat(e.target.value) : null,
                      }))}
                      className="w-full min-w-0 border-0 bg-transparent p-0 font-display text-lg font-extrabold outline-none placeholder:text-sm placeholder:font-normal placeholder:text-muted-foreground"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Ingrédients (mode édition) */}
          {isEditMode && (
            <label className={STEP_CARD}>
              <span className="disp d-s flex items-center gap-2"><FileText size={18} /> Ingrédients</span>
              <textarea
                rows={3}
                placeholder="Liste des ingrédients..."
                value={productInfo.ingredients_text}
                onChange={(e) => setProductInfo((p) => ({ ...p, ingredients_text: e.target.value }))}
                className={cn(FIELD, 'resize-none py-3 text-sm')}
              />
            </label>
          )}

          {ErrorBubble}

          <div className={cn('grid gap-3', !isEditMode && 'grid-cols-2')}>
            {!isEditMode && (
              <button type="button" className="btn" onClick={() => setStep('photos')}>
                {t('contribute.back')}
              </button>
            )}
            <button
              type="button"
              className="btn primary"
              onClick={() => setStep('confirm')}
              disabled={!productInfo.name_fr.trim() || !productInfo.brand.trim()}
            >
              {t('contribute.continue')}
            </button>
          </div>
        </div>
      )}

      {/* Étape 4 : Confirmation */}
      {step === 'confirm' && (
        <div className="grid gap-4">
          <div className="card overflow-hidden">
            <h2 className="disp d-s border-b-[1.5px] border-line px-4 py-3">Récapitulatif</h2>
            {[
              ['Code-barres', barcode],
              ['Nom', productInfo.name_fr],
              ['Marque', productInfo.brand],
              ...(!isEditMode ? [['Photos', `${Object.values(photos).filter(Boolean).length}/3`]] : []),
              ...(isEditMode && frontPhotoUploaded ? [['Photo', 'Nouvelle photo uploadée']] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b-[1.5px] border-line px-4 py-3 text-sm last:border-b-0">
                <span className="muted">{k}</span>
                <span className="min-w-0 truncate font-semibold">{v}</span>
              </div>
            ))}
          </div>

          <Bubble pose="astuce">
            <p>
              {isEditMode
                ? 'Les modifications seront appliquées immédiatement au produit existant.'
                : 'Les photos seront analysées par notre IA (lecture visuelle Qwen, OCR en secours) pour extraire les données nutritionnelles et la liste des ingrédients. Un modérateur vérifiera les données avant publication.'}
            </p>
          </Bubble>

          {ErrorBubble}

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn" onClick={() => setStep('info')}>
              {t('contribute.back')}
            </button>
            <button type="button" className="btn primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {isEditMode ? 'Mise à jour...' : t('contribute.sending')}
                </>
              ) : (
                isEditMode ? 'Mettre à jour le produit' : t('contribute.submit')
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
