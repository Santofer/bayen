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
import { useLocale } from '@/lib/i18n'
import type { Locale, TranslationKey } from '@/lib/translations'

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

// Puce de statut : aplat + texte encre (nouvelle), puce contour sinon
const STATUS_META: Record<PartnerRequest['status'], { label: TranslationKey; cls: string }> = {
  new: { label: 'partnerAdmin.status.new', cls: 'chip fill bg-citron' },
  processed: { label: 'partnerAdmin.status.processed', cls: 'chip' },
  dismissed: { label: 'partnerAdmin.status.dismissed', cls: 'chip text-muted-foreground' },
}

function formatDate(iso: string, locale: Locale): string {
  try {
    return new Date(iso).toLocaleDateString(locale === 'ary' ? 'ar-MA' : 'fr-MA', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function PartnerRequestsAdmin() {
  const { t, locale } = useLocale()
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
      <section className="section">
        <div className="card p-4">
          <div className="naanaa">
            <div className="m"><img src="/mascotte/naanaa-oups.webp" alt="" /></div>
            <p className="bubble">{t('partnerAdmin.forbidden')}</p>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="section">
        <div className="card p-6 text-center">
          <p className="text-sm text-muted-foreground">{t('partnerAdmin.loadError')}</p>
        </div>
      </section>
    )
  }

  if (requests === null) {
    return (
      <section className="section md:grid-cols-2" aria-hidden="true">
        <div className="skeleton h-28 w-full" />
        <div className="skeleton h-28 w-full" />
      </section>
    )
  }

  if (requests.length === 0) {
    return (
      <section className="section">
        <div className="card p-8 text-center">
          <Handshake size={28} className="mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t('partnerAdmin.empty')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section md:grid-cols-2 md:items-start md:gap-6">
      {requests.map((r) => {
        const meta = STATUS_META[r.status]
        return (
          <div key={r.id} className="card p-5">
            <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
              <div className="min-w-0 flex-1">
                <p className="disp d-s">{r.company}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {r.name}
                  {r.role ? ` · ${r.role}` : ''}
                </p>
              </div>
              <span className={`flex-shrink-0 ${meta.cls}`}>
                {t(meta.label)}
              </span>
            </div>

            {r.message && (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {r.message}
              </p>
            )}

            <p className="mt-3 text-xs text-muted-foreground">{formatDate(r.date_created, locale)}</p>

            <div className="mt-3.5 flex flex-wrap items-center gap-2.5 border-t-[1.5px] border-line pt-3.5">
              <a
                href={`mailto:${r.email}?subject=${encodeURIComponent(`Bayen — votre demande de partenariat (${r.company})`)}`}
                className="btn sm primary"
              >
                <Mail size={15} />
                {t('partnerAdmin.reply').replace('{email}', r.email)}
              </a>
              {r.status !== 'processed' && (
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, 'processed')}
                  disabled={busyId === r.id}
                  className="btn sm"
                >
                  {busyId === r.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  {t('partnerAdmin.markDone')}
                </button>
              )}
              {r.status === 'new' && (
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, 'dismissed')}
                  disabled={busyId === r.id}
                  className="btn sm flat"
                >
                  <X size={15} />
                  {t('partnerAdmin.dismiss')}
                </button>
              )}
              {r.status !== 'new' && (
                <button
                  type="button"
                  onClick={() => void setStatus(r.id, 'new')}
                  disabled={busyId === r.id}
                  className="btn sm flat"
                >
                  <RotateCcw size={15} />
                  {t('partnerAdmin.reopen')}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </section>
  )
}
