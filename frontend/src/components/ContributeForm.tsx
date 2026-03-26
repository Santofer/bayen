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

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { getAccessToken } from '@/lib/auth'

interface ContributeFormProps {
  initialBarcode?: string
  existingProduct?: Record<string, unknown> | null
}

type Step = 'barcode' | 'photos' | 'info' | 'confirm'

const DIRECTUS_URL = '/api/directus'

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
  })
  const [frontPhotoFile, setFrontPhotoFile] = useState<File | null>(null)
  const [frontPhotoUploading, setFrontPhotoUploading] = useState(false)
  const [frontPhotoUploaded, setFrontPhotoUploaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
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
        })

        setSubmitted(true)
      } else {
        // Mode création
        const token = await getAccessToken()
        if (!token) {
          setError('Session expirée. Veuillez vous reconnecter.')
          setSubmitting(false)
          return
        }

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
          const errorData = await createRes.json().catch(() => null) as { errors?: Array<{ message: string }> } | null
          throw new Error(errorData?.errors?.[0]?.message ?? `Erreur ${createRes.status}`)
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
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">
          {isEditMode ? 'Produit mis à jour !' : t('contribute.thanks')}
        </h2>
        <p className="text-sm text-muted-foreground mb-1">
          Le produit <span className="font-mono font-medium">{barcode}</span> a été {isEditMode ? 'mis à jour' : 'soumis'}.
        </p>
        {!isEditMode && (
          <p className="text-sm text-muted-foreground mb-6">
            Un modérateur vérifiera les données avant publication.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
          {isEditMode ? (
            <Button asChild>
              <a href={`/produit/${barcode}`}>Voir la fiche produit</a>
            </Button>
          ) : (
            <Button onClick={() => { setSubmitted(false); setStep('barcode'); setBarcode(''); setPhotos({}); setProductInfo({ name_fr: '', brand: '' }) }}>
              {t('contribute.addAnother')}
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href="/scan">Scanner un produit</a>
          </Button>
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

  return (
    <div className="space-y-6">
      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-2">
        {visibleSteps.map((s, i) => {
          const isCurrent = s === step
          const isPast = visibleSteps.indexOf(step) > i
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                isCurrent && 'bg-primary text-primary-foreground',
                isPast && 'bg-primary/20 text-primary',
                !isCurrent && !isPast && 'bg-muted text-muted-foreground'
              )}>
                {isPast ? '\u2713' : i + 1}
              </div>
              <span className={cn(
                'text-xs hidden sm:inline',
                isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>
                {stepLabelsMap[s]}
              </span>
              {i < visibleSteps.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          )
        })}
      </div>

      {/* Étape 1 : Code-barres (mode création uniquement) */}
      {step === 'barcode' && !isEditMode && (
        <form onSubmit={handleBarcodeSubmit} className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('contribute.barcode')}
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={13}
              placeholder="6111080016394"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ''))}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoFocus
            />
            {barcode && !isValidEan(barcode) && (
              <p className="text-xs text-destructive mt-1">Format EAN-8 (8 chiffres) ou EAN-13 (13 chiffres)</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={!isValidEan(barcode)}>
            {t('contribute.continue')}
          </Button>
        </form>
      )}

      {/* Étape 2 : Photos (mode création uniquement) */}
      {step === 'photos' && !isEditMode && (
        <div className="space-y-4">
          <Badge variant="outline" className="font-mono">{barcode}</Badge>

          <div className="space-y-3">
            {([
              { key: 'nutrition' as const, label: t('contribute.photoNutrition'), required: true, hint: 'Cadrez le tableau des valeurs nutritionnelles' },
              { key: 'ingredients' as const, label: t('contribute.photoIngredients'), required: false, hint: 'Photo de la liste des ingrédients' },
              { key: 'front' as const, label: t('contribute.photoFront'), required: false, hint: 'Photo du packaging face avant' },
            ]).map(({ key, label, required, hint }) => (
              <div key={key} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">
                    {label} {required && <span className="text-destructive">*</span>}
                  </label>
                  {photos[key] && (
                    <Badge variant="safe" className="text-xs">Ajoutée</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">{hint}</p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handlePhoto(key, e.target.files?.[0] ?? null)}
                  className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('barcode')} className="flex-1">
              {t('contribute.back')}
            </Button>
            <Button onClick={() => setStep('info')} className="flex-1" disabled={!photos.nutrition}>
              {t('contribute.continue')}
            </Button>
          </div>
        </div>
      )}

      {/* Étape 3 : Infos produit */}
      {step === 'info' && (
        <div className="space-y-4">
          <Badge variant="outline" className="font-mono">{barcode}</Badge>

          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contribute.name')} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Bimo Chocolat"
                value={productInfo.name_fr}
                onChange={(e) => setProductInfo((p) => ({ ...p, name_fr: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('contribute.brand')} <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Bimo"
                value={productInfo.brand}
                onChange={(e) => setProductInfo((p) => ({ ...p, brand: e.target.value }))}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {/* Section photo face avant (mode édition) */}
          {isEditMode && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <label className="block text-sm font-medium text-foreground">
                {t('contribute.photoFront')}
              </label>
              {existingProduct.image_front && !frontPhotoUploaded && (
                <p className="text-xs text-muted-foreground">
                  Une image existe déjà. Vous pouvez la remplacer ci-dessous.
                </p>
              )}
              {frontPhotoUploaded && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
                  Photo uploadée avec succès !
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setFrontPhotoFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer"
              />
              {frontPhotoFile && !frontPhotoUploaded && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleFrontPhotoUpload}
                  disabled={frontPhotoUploading}
                >
                  {frontPhotoUploading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Upload en cours...
                    </>
                  ) : (
                    t('contribute.uploadImage')
                  )}
                </Button>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            {!isEditMode && (
              <Button variant="outline" onClick={() => setStep('photos')} className="flex-1">
                {t('contribute.back')}
              </Button>
            )}
            <Button
              onClick={() => setStep('confirm')}
              className="flex-1"
              disabled={!productInfo.name_fr.trim() || !productInfo.brand.trim()}
            >
              {t('contribute.continue')}
            </Button>
          </div>
        </div>
      )}

      {/* Étape 4 : Confirmation */}
      {step === 'confirm' && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Récapitulatif</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Code-barres</span>
              <span className="font-mono font-medium">{barcode}</span>
              <span className="text-muted-foreground">Nom</span>
              <span>{productInfo.name_fr}</span>
              <span className="text-muted-foreground">Marque</span>
              <span>{productInfo.brand}</span>
              {!isEditMode && (
                <>
                  <span className="text-muted-foreground">Photos</span>
                  <span>{Object.values(photos).filter(Boolean).length}/3</span>
                </>
              )}
              {isEditMode && frontPhotoUploaded && (
                <>
                  <span className="text-muted-foreground">Photo</span>
                  <span className="text-green-700">Nouvelle photo uploadée</span>
                </>
              )}
            </div>
          </div>

          {!isEditMode && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs text-amber-800">
                Les photos seront analysées par notre IA (OCR + Mistral) pour extraire les données nutritionnelles
                et la liste des ingrédients. Un modérateur vérifiera les données avant publication.
              </p>
            </div>
          )}

          {isEditMode && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs text-blue-800">
                Les modifications seront appliquées immédiatement au produit existant.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('info')} className="flex-1">
              {t('contribute.back')}
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {isEditMode ? 'Mise à jour...' : t('contribute.sending')}
                </>
              ) : (
                isEditMode ? 'Mettre à jour le produit' : t('contribute.submit')
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
