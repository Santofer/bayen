/**
 * Boîte de réception des demandes de partenariat (admin du site).
 *
 * Les demandes n'étaient visibles que dans l'admin Directus, une interface
 * séparée avec ses propres identifiants. Ici, l'administrateur connecté sur
 * bayen.ma les consulte et les traite sans quitter son compte. Un compte
 * ordinaire qui ouvrirait la page reçoit un refus poli du serveur.
 */

import { useEffect, useState } from 'react'
import { Handshake, Mail, Check, X, Loader2, RotateCcw } from 'lucide-react'
import { authHeader } from '@/lib/auth'

const API = import.meta.env.PUBLIC_DIRECTUS_URL ?? 'https://api.bayen.ma'

interface PartnerRequest {
  id: string
  company: string
  role: string | null
  name: string
  email: string
  message: string | null
  status: 'new' | 'processed' | 'dismissed'
  email_sent: boolean
  date_created: string
}

const STATUS_META: Record<PartnerRequest['status'], { label: string; cls: string }> = {
  new: { label: 'Nouvelle', cls: 'bg-primary text-primary-foreground' },
  processed: { label: 'Traitée', cls: 'bg-secondary text-secondary-foreground' },
  dismissed: { label: 'Écartée', cls: 'bg-muted text-muted-foreground' },
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-MA', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function PartnerRequestsAdmin() {
  const [requests, setRequests] = useState<PartnerRequest[] | null>(null)
  const [forbidden, setForbidden] = useState(false)
  const [error, setError] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = async (): Promise<void> => {
    try {
      const res = await fetch(`${API}/bayen-api/partner-requests`, {
        headers: await authHeader(),
      })
      if (res.status === 403 || res.status === 401) {
        setForbidden(true)
        return
      }
      if (!res.ok) throw new Error('http')
      const data = (await res.json()) as { requests: PartnerRequest[] }
      setRequests(data.requests)
    } catch {
      setError(true)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setStatus = async (id: string, status: PartnerRequest['status']): Promise<void> => {
    setBusyId(id)
    try {
      const res = await fetch(`${API}/bayen-api/partner-request-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ id, status }),
      })
      if (res.ok) {
        setRequests((rs) => rs?.map((r) => (r.id === id ? { ...r, status } : r)) ?? null)
      }
    } catch { /* le rechargement de la page rattrapera */ } finally {
      setBusyId(null)
    }
  }

  if (forbidden) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Cette page est réservée à l'équipe Bayen.
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">Chargement impossible. Recharge la page.</p>
      </div>
    )
  }

  if (requests === null) {
    return (
      <div className="flex flex-col gap-3" aria-hidden="true">
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-28 w-full" />
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center">
        <Handshake size={28} className="mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Aucune demande de partenariat pour le moment. Elles apparaîtront ici dès
          qu'une marque remplira le formulaire de la page Partenaires.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {requests.map((r) => {
        const meta = STATUS_META[r.status]
        return (
          <div key={r.id} className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold leading-tight">{r.company}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {r.name}
                  {r.role ? ` · ${r.role}` : ''}
                </p>
              </div>
              <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-bold ${meta.cls}`}>
                {meta.label}
              </span>
            </div>

            {r.message && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {r.message}
              </p>
            )}

            <p className="mt-3 text-xs text-muted-foreground">{formatDate(r.date_created)}</p>

            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t pt-3.5">
              <a
                href={`mailto:${r.email}?subject=${encodeURIComponent(`Bayen — votre demande de partenariat (${r.company})`)}`}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground"
              >
                <Mail size={15} />
                Répondre à {r.email}
              </a>
              {r.status !== 'processed' && (
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, 'processed')}
                  disabled={busyId === r.id}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-primary/30 bg-card px-4 text-sm font-semibold text-primary disabled:opacity-60"
                >
                  {busyId === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Marquer traitée
                </button>
              )}
              {r.status === 'new' && (
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, 'dismissed')}
                  disabled={busyId === r.id}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold text-muted-foreground disabled:opacity-60"
                >
                  <X size={15} />
                  Écarter
                </button>
              )}
              {r.status !== 'new' && (
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, 'new')}
                  disabled={busyId === r.id}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border bg-card px-4 text-sm font-semibold text-muted-foreground disabled:opacity-60"
                >
                  <RotateCcw size={15} />
                  Rouvrir
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
