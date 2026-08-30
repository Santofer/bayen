/**
 * Boutons Confirmer et Signaler sur les fiches produit
 *
 * - Confirmer ✓ : crée une contribution type "confirm", incrémente confidence_score si 3 confirmations
 * - Signaler ⚠️ : modale avec texte libre, crée une contribution type "fix_data" en pending
 * - Visible uniquement pour les utilisateurs connectés niveau Contributeur+
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useLocale } from '@/lib/i18n'
import { getAccessToken, isAuthenticated } from '@/lib/auth'
import { deleteProduct } from '@/lib/directus'
import { Check, AlertTriangle, Trash2 } from 'lucide-react'

const DIRECTUS_URL = '/api/directus'

interface ProductActionsProps {
  productId: string
  barcode: string
  confidenceScore: number
}

export default function ProductActions({ productId, barcode, confidenceScore }: ProductActionsProps) {
  const { t } = useLocale()
  const [loggedIn, setLoggedIn] = useState(false)
  const [userRank, setUserRank] = useState<string>('nouveau')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [confirmCount, setConfirmCount] = useState(0)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportText, setReportText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!isAuthenticated()) return
      setLoggedIn(true)

      const token = await getAccessToken()
      if (!token) return

      try {
        // Récupérer le profil pour vérifier le rang
        const userRes = await fetch(`${DIRECTUS_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (userRes.ok) {
          const userData = await userRes.json()
          setUserRank(userData.data.rank ?? 'nouveau')

          // Détecter le rôle admin via l'UUID du rôle
          const roleId = userData.data.role
          if (typeof roleId === 'string' && roleId) {
            try {
              const roleRes = await fetch(`${DIRECTUS_URL}/roles/${roleId}?fields=name`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              if (roleRes.ok) {
                const roleData = await roleRes.json()
                if (roleData.data?.name === 'Administrator') {
                  setUserRole('admin')
                }
              }
            } catch { /* pas critique */ }
          }

          // Compter les confirmations existantes
          const confirmRes = await fetch(
            `${DIRECTUS_URL}/items/contributions?filter[product_id][_eq]=${productId}&filter[type][_eq]=confirm&aggregate[count]=id`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (confirmRes.ok) {
            const confirmData = await confirmRes.json()
            setConfirmCount(parseInt(confirmData.data?.[0]?.count?.id ?? '0', 10))
          }

          // Vérifier si l'utilisateur a déjà confirmé
          const myConfirmRes = await fetch(
            `${DIRECTUS_URL}/items/contributions?filter[product_id][_eq]=${productId}&filter[type][_eq]=confirm&filter[user_id][_eq]=${userData.data.id}&limit=1`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
          if (myConfirmRes.ok) {
            const myConfirm = await myConfirmRes.json()
            setHasConfirmed((myConfirm.data?.length ?? 0) > 0)
          }
        }
      } catch { /* silencieux */ }
    }
    load()
  }, [productId])

  const canAct = loggedIn && ['contributeur', 'expert', 'vérifié'].includes(userRank)

  const handleConfirm = useCallback(async () => {
    if (!canAct || hasConfirmed) return
    setSubmitting(true)
    try {
      const token = await getAccessToken()
      // Toute la logique (anti-doublon, seuil de 3, passage en « Vérifié »,
      // points) vit côté serveur : le client ne modifie jamais le produit.
      const res = await fetch(`${DIRECTUS_URL}/bayen-api/confirm-product`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ barcode }),
      })
      if (res.ok) {
        const data = (await res.json()) as { confirmations?: number; verified?: boolean }
        setHasConfirmed(true)
        setConfirmCount(data.confirmations ?? confirmCount + 1)
        setFeedback(data.verified ? 'Fiche vérifiée, merci !' : 'Confirmation enregistrée !')
        setTimeout(() => setFeedback(null), 3000)
      } else if (res.status === 409) {
        setHasConfirmed(true)
        setFeedback('Tu as déjà confirmé cette fiche.')
        setTimeout(() => setFeedback(null), 3000)
      }
    } catch { /* erreur silencieuse */ }
    setSubmitting(false)
  }, [canAct, hasConfirmed, barcode, confirmCount])

  const handleReport = useCallback(async () => {
    if (!canAct || !reportText.trim()) return
    setSubmitting(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`${DIRECTUS_URL}/items/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: productId,
          type: 'fix_data',
          status: 'pending',
          data_after: { report: reportText.trim() },
        }),
      })
      if (res.ok) {
        setShowReport(false)
        setReportText('')
        setFeedback('Signalement envoyé ! Un modérateur l\'examinera.')
        setTimeout(() => setFeedback(null), 3000)
      }
    } catch { /* erreur silencieuse */ }
    setSubmitting(false)
  }, [canAct, reportText, productId])

  const isAdmin = userRole === 'admin'

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const token = await getAccessToken()
      if (!token) return
      const success = await deleteProduct(productId, token)
      if (success) {
        window.location.href = '/'
      } else {
        setFeedback('Erreur lors de la suppression')
      }
    } catch {
      setFeedback('Erreur lors de la suppression')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }, [productId])

  // Ne rien afficher si pas connecté ou pas le niveau requis (sauf admin)
  // — retour null sans wrapper pour éviter le bloc vide sur la page produit.
  if (!loggedIn) return null
  if (!canAct && !isAdmin) return null

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
      {/* En-tête de carte — même anatomie que les autres sections de la fiche */}
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold leading-tight">{t('product.actionsTitle')}</h2>
          <p className="text-xs text-muted-foreground">
            {confirmCount}/3 {t('product.confirmHint')}
          </p>
        </div>
        {confidenceScore >= 0.8 && (
          <Badge variant="safe" className="flex-shrink-0 text-xs">Vérifié</Badge>
        )}
      </div>

      {/* Une seule rangée alignée : actions communauté à gauche, admin à droite */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={hasConfirmed || submitting}
          className={cn(
            'inline-flex min-h-[46px] items-center gap-2 rounded-full px-5 text-sm font-bold transition-colors',
            hasConfirmed
              ? 'bg-primary/10 text-primary'
              : 'border border-primary/30 bg-card text-primary hover:bg-primary/[0.06] disabled:opacity-60',
          )}
        >
          <Check size={16} />
          {hasConfirmed ? t('product.confirmed') : t('product.confirm')}
        </button>
        <button
          type="button"
          onClick={() => setShowReport(!showReport)}
          disabled={submitting}
          className="inline-flex min-h-[46px] items-center gap-2 rounded-full border bg-card px-5 text-sm font-semibold transition-colors hover:bg-accent disabled:opacity-60"
        >
          <AlertTriangle size={16} />
          {t('product.report')}
        </button>
        {isAdmin && !showDeleteConfirm && (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="sm:ms-auto inline-flex min-h-[46px] items-center gap-2 rounded-full border border-destructive/40 bg-card px-5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 size={16} />
            Supprimer ce produit
          </button>
        )}
      </div>

      {/* Confirmation suppression */}
      {showDeleteConfirm && (
        <div className="mt-3 rounded-xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">Supprimer définitivement ce produit ?</p>
          <p className="text-xs text-red-600 dark:text-red-400">Cette action est irréversible.</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Suppression...' : 'Confirmer la suppression'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Modale signalement */}
      {showReport && (
        <div className="mt-3 rounded-xl border bg-popover p-4 space-y-3">
          <p className="text-sm font-medium">Qu'est-ce qui est incorrect ?</p>
          <textarea
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            placeholder="Décrivez l'erreur (données nutritionnelles incorrectes, mauvaise image, etc.)"
            className="w-full h-24 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleReport} disabled={!reportText.trim() || submitting}>
              Envoyer le signalement
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowReport(false); setReportText('') }}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className="mt-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-800 dark:text-green-200">
          {feedback}
        </div>
      )}
    </div>
  )
}
