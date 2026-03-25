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
import { getAccessToken, isAuthenticated } from '@/lib/auth'

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api-bayen.n0.ma'

interface ProductActionsProps {
  productId: string
  barcode: string
  confidenceScore: number
}

export default function ProductActions({ productId, barcode, confidenceScore }: ProductActionsProps) {
  const [loggedIn, setLoggedIn] = useState(false)
  const [userRank, setUserRank] = useState<string>('nouveau')
  const [confirmCount, setConfirmCount] = useState(0)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [reportText, setReportText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!isAuthenticated()) return
      setLoggedIn(true)

      const token = getAccessToken()
      if (!token) return

      try {
        // Récupérer le profil pour vérifier le rang
        const userRes = await fetch(`${DIRECTUS_URL}/users/me?fields=id,rank`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (userRes.ok) {
          const userData = await userRes.json()
          setUserRank(userData.data.rank ?? 'nouveau')

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
      const token = getAccessToken()
      const res = await fetch(`${DIRECTUS_URL}/items/contributions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_id: productId,
          type: 'confirm',
          status: 'approved', // Les confirmations sont auto-approuvées
          data_after: { confirmed: true },
        }),
      })
      if (res.ok) {
        setHasConfirmed(true)
        setConfirmCount((c) => c + 1)
        setFeedback('Confirmation enregistrée !')

        // Si 3 confirmations atteintes, incrémenter confidence_score
        if (confirmCount + 1 >= 3 && confidenceScore < 1) {
          const newScore = Math.min(1, confidenceScore + 0.1)
          await fetch(`${DIRECTUS_URL}/items/products/${productId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ confidence_score: newScore }),
          })
        }

        setTimeout(() => setFeedback(null), 3000)
      }
    } catch { /* erreur silencieuse */ }
    setSubmitting(false)
  }, [canAct, hasConfirmed, productId, confirmCount, confidenceScore])

  const handleReport = useCallback(async () => {
    if (!canAct || !reportText.trim()) return
    setSubmitting(true)
    try {
      const token = getAccessToken()
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

  // Ne rien afficher si pas connecté ou pas le niveau requis
  if (!loggedIn) return null
  if (!canAct) return null

  return (
    <div className="space-y-3">
      {/* Compteur de confirmations */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{confirmCount} confirmation{confirmCount > 1 ? 's' : ''}</span>
        {confidenceScore >= 0.8 && (
          <Badge variant="safe" className="text-xs">Vérifié</Badge>
        )}
      </div>

      {/* Boutons */}
      <div className="flex gap-2">
        <Button
          variant={hasConfirmed ? 'secondary' : 'outline'}
          size="sm"
          onClick={handleConfirm}
          disabled={hasConfirmed || submitting}
          className={cn(hasConfirmed && 'text-green-600')}
        >
          {hasConfirmed ? '✓ Confirmé' : '✓ Confirmer'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowReport(!showReport)}
          disabled={submitting}
        >
          ⚠️ Signaler une erreur
        </Button>
      </div>

      {/* Modale signalement */}
      {showReport && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
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
        <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          {feedback}
        </div>
      )}
    </div>
  )
}
