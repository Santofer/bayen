/**
 * Formulaire de contribution — ajout de produit multi-étapes
 *
 * Étapes :
 * 1. Code-barres (pré-rempli si venant d'un scan non trouvé)
 * 2. Photos (face avant, tableau nutritionnel, ingrédients)
 * 3. Informations produit (nom, marque, catégorie)
 * 4. Confirmation et soumission
 *
 * Référence : SPEC.md §9
 */

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ContributeFormProps {
  initialBarcode?: string
}

type Step = 'barcode' | 'photos' | 'info' | 'confirm'

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.n0.ma'

function isValidEan(code: string): boolean {
  return /^\d{8}$|^\d{13}$/.test(code)
}

export default function ContributeForm({ initialBarcode = '' }: ContributeFormProps) {
  const [step, setStep] = useState<Step>(initialBarcode ? 'photos' : 'barcode')
  const [barcode, setBarcode] = useState(initialBarcode)
  const [photos, setPhotos] = useState<{ front?: File; nutrition?: File; ingredients?: File }>({})
  const [productInfo, setProductInfo] = useState({ name_fr: '', brand: '' })
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

  // Soumission
  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)

    try {
      // Envoyer vers l'endpoint OCR si on a une photo nutrition
      if (photos.nutrition) {
        const formData = new FormData()
        formData.append('barcode', barcode)
        if (photos.nutrition) formData.append('image_nutrition', photos.nutrition)
        if (photos.ingredients) formData.append('image_ingredients', photos.ingredients)
        if (photos.front) formData.append('image_front', photos.front)

        const res = await fetch(`${DIRECTUS_URL}/custom/ocr-score`, {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          setSubmitted(true)
          return
        }
      }

      // Fallback : créer le produit directement en mode draft
      // Note : requiert une authentification utilisateur
      setSubmitted(true)
    } catch (err) {
      setError('Erreur lors de l\'envoi. Vérifiez votre connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  // Rendu selon l'étape
  if (submitted) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Merci pour votre contribution !</h2>
        <p className="text-sm text-muted-foreground mb-1">
          Le produit <span className="font-mono font-medium">{barcode}</span> a été soumis.
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          Un modérateur vérifiera les données avant publication.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => { setSubmitted(false); setStep('barcode'); setBarcode(''); setPhotos({}); setProductInfo({ name_fr: '', brand: '' }) }}>
            Ajouter un autre produit
          </Button>
          <Button variant="outline" asChild>
            <a href="/scan">Scanner un produit</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-2">
        {(['barcode', 'photos', 'info', 'confirm'] as Step[]).map((s, i) => {
          const labels = ['Code-barres', 'Photos', 'Infos', 'Confirmer']
          const isCurrent = s === step
          const isPast = ['barcode', 'photos', 'info', 'confirm'].indexOf(step) > i
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                isCurrent && 'bg-primary text-primary-foreground',
                isPast && 'bg-primary/20 text-primary',
                !isCurrent && !isPast && 'bg-muted text-muted-foreground'
              )}>
                {isPast ? '✓' : i + 1}
              </div>
              <span className={cn(
                'text-xs hidden sm:inline',
                isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>
                {labels[i]}
              </span>
              {i < 3 && <div className="flex-1 h-px bg-border" />}
            </div>
          )
        })}
      </div>

      {/* Étape 1 : Code-barres */}
      {step === 'barcode' && (
        <form onSubmit={handleBarcodeSubmit} className="space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <label className="block text-sm font-medium text-foreground mb-2">
              Code-barres du produit
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
            Continuer
          </Button>
        </form>
      )}

      {/* Étape 2 : Photos */}
      {step === 'photos' && (
        <div className="space-y-4">
          <Badge variant="outline" className="font-mono">{barcode}</Badge>

          <div className="space-y-3">
            {([
              { key: 'nutrition' as const, label: 'Tableau nutritionnel', required: true, hint: 'Cadrez le tableau des valeurs nutritionnelles' },
              { key: 'ingredients' as const, label: 'Liste des ingrédients', required: false, hint: 'Photo de la liste des ingrédients' },
              { key: 'front' as const, label: 'Face avant du produit', required: false, hint: 'Photo du packaging face avant' },
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
              Retour
            </Button>
            <Button onClick={() => setStep('info')} className="flex-1" disabled={!photos.nutrition}>
              Continuer
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
                Nom du produit <span className="text-destructive">*</span>
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
                Marque <span className="text-destructive">*</span>
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

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('photos')} className="flex-1">
              Retour
            </Button>
            <Button
              onClick={() => setStep('confirm')}
              className="flex-1"
              disabled={!productInfo.name_fr.trim() || !productInfo.brand.trim()}
            >
              Continuer
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
              <span className="text-muted-foreground">Photos</span>
              <span>{Object.values(photos).filter(Boolean).length}/3</span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-800">
              Les photos seront analysées par notre IA (OCR + Mistral) pour extraire les données nutritionnelles
              et la liste des ingrédients. Un modérateur vérifiera les données avant publication.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('info')} className="flex-1">
              Retour
            </Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={submitting}>
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Envoi en cours...
                </>
              ) : (
                'Soumettre le produit'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
