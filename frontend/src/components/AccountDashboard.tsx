/**
 * Dashboard compte utilisateur complet
 * - Statistiques (points, rang, contributions, taux d'approbation)
 * - Barre de progression vers le niveau suivant
 * - Scans récents (20 derniers)
 * - Contributions avec statut
 * - Modification du profil
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getAccessToken } from '@/lib/auth'

const DIRECTUS_URL = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api-bayen.n0.ma'

interface UserProfile {
  id: string
  email: string
  display_name: string | null
  points: number
  contributions_count: number
  rank: string
}

interface Contribution {
  id: string
  type: string
  status: string
  date_created: string
  product_id: { name_fr: string; barcode: string } | string
}

interface Scan {
  id: string
  date_created: string
  product_id: { name_fr: string; barcode: string; scan_score: number | null } | string
}

// Niveaux et seuils
const RANK_INFO: Record<string, { label: string; color: string; min: number; next: number | null }> = {
  nouveau: { label: 'Nouveau', color: '#a1a1aa', min: 0, next: 100 },
  contributeur: { label: 'Contributeur', color: '#84cc16', min: 100, next: 500 },
  expert: { label: 'Expert', color: '#f97316', min: 500, next: 2000 },
  'vérifié': { label: 'Vérifié', color: '#16a34a', min: 2000, next: null },
}

const TYPE_LABELS: Record<string, string> = {
  new_product: 'Nouveau produit',
  fix_data: 'Correction',
  add_image: 'Photo ajoutée',
  confirm: 'Confirmation',
}

const STATUS_BADGES: Record<string, { label: string; variant: 'safe' | 'limited' | 'avoid' }> = {
  pending: { label: 'En attente', variant: 'limited' },
  approved: { label: 'Approuvée', variant: 'safe' },
  rejected: { label: 'Rejetée', variant: 'avoid' },
}

async function fetchWithAuth(url: string) {
  const token = getAccessToken()
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export default function AccountDashboard() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [scans, setScans] = useState<Scan[]>([])
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const userData = await fetchWithAuth(`${DIRECTUS_URL}/users/me?fields=id,email,display_name,points,contributions_count,rank`)
        setUser(userData.data)
        setDisplayName(userData.data.display_name ?? '')

        const contribData = await fetchWithAuth(
          `${DIRECTUS_URL}/items/contributions?filter[user_id][_eq]=${userData.data.id}&sort=-date_created&limit=20&fields=id,type,status,date_created,product_id.name_fr,product_id.barcode`
        )
        setContributions(contribData.data ?? [])

        const scanData = await fetchWithAuth(
          `${DIRECTUS_URL}/items/scans?filter[user_id][_eq]=${userData.data.id}&sort=-date_created&limit=20&fields=id,date_created,product_id.name_fr,product_id.barcode,product_id.scan_score`
        )
        setScans(scanData.data ?? [])
      } catch {
        // Erreur silencieuse
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSaveProfile = useCallback(async () => {
    if (!user) return
    try {
      const token = getAccessToken()
      await fetch(`${DIRECTUS_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ display_name: displayName }),
      })
      setUser({ ...user, display_name: displayName })
      setEditing(false)
    } catch { /* erreur silencieuse */ }
  }, [user, displayName])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <p className="text-muted-foreground text-center py-12">Impossible de charger le profil.</p>
  }

  const rank = RANK_INFO[user.rank] ?? RANK_INFO.nouveau
  const progress = rank.next
    ? Math.min(100, ((user.points - rank.min) / (rank.next - rank.min)) * 100)
    : 100

  const approvedCount = contributions.filter((c) => c.status === 'approved').length
  const approvalRate = contributions.length > 0
    ? Math.round((approvedCount / contributions.length) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* En-tête profil */}
      <div className="flex items-start gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
          style={{ backgroundColor: rank.color }}
        >
          {(user.display_name ?? user.email)[0].toUpperCase()}
        </div>
        <div className="flex-1">
          {editing ? (
            <div className="flex gap-2">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveProfile}>Enregistrer</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annuler</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{user.display_name ?? user.email}</h2>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838.838-2.872a2 2 0 0 1 .506-.855z"/></svg>
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <Badge className="mt-1 text-white" style={{ backgroundColor: rank.color }}>{rank.label}</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{user.points}</p>
          <p className="text-xs text-muted-foreground">Points</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{user.contributions_count}</p>
          <p className="text-xs text-muted-foreground">Contributions</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{scans.length}</p>
          <p className="text-xs text-muted-foreground">Scans récents</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{approvalRate}%</p>
          <p className="text-xs text-muted-foreground">Taux d'approbation</p>
        </div>
      </div>

      {/* Barre de progression vers le prochain niveau */}
      {rank.next && (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">{rank.label}</span>
            <span className="text-muted-foreground">{user.points} / {rank.next} pts</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: rank.color }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Encore {rank.next - user.points} points pour atteindre{' '}
            {RANK_INFO[Object.keys(RANK_INFO).find((k) => RANK_INFO[k].min === rank.next) ?? '']?.label ?? 'le niveau suivant'}
          </p>
        </div>
      )}

      {/* Contributions */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Mes contributions</h3>
        {contributions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune contribution pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {contributions.map((c) => {
              const productName = typeof c.product_id === 'object' ? c.product_id.name_fr : c.product_id
              const productBarcode = typeof c.product_id === 'object' ? c.product_id.barcode : ''
              const status = STATUS_BADGES[c.status] ?? STATUS_BADGES.pending
              return (
                <div key={c.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {productBarcode ? (
                        <a href={`/produit/${productBarcode}`} className="hover:text-primary">{productName}</a>
                      ) : productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[c.type] ?? c.type} — {new Date(c.date_created).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Scans récents */}
      <div className="rounded-xl border bg-card p-4">
        <h3 className="text-sm font-semibold mb-3">Mes scans récents</h3>
        {scans.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun scan pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {scans.map((s) => {
              const productName = typeof s.product_id === 'object' ? s.product_id.name_fr : '—'
              const productBarcode = typeof s.product_id === 'object' ? s.product_id.barcode : ''
              const productScore = typeof s.product_id === 'object' ? s.product_id.scan_score : null
              return (
                <div key={s.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    {productBarcode ? (
                      <a href={`/produit/${productBarcode}`} className="text-sm font-medium hover:text-primary truncate block">{productName}</a>
                    ) : (
                      <p className="text-sm font-medium truncate">{productName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{new Date(s.date_created).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {productScore != null && (
                    <span className="text-sm font-bold text-primary">{productScore}/100</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
