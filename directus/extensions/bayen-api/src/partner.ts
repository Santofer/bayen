/**
 * Endpoint POST /bayen-api/partner-request
 *
 * Reçoit les demandes de la page /partenaires. L'ancien flux postait vers un
 * webhook n8n jamais configuré : aucune demande n'a jamais été transmise ni
 * stockée. Désormais chaque demande est :
 *   1. enregistrée dans `partner_requests` (consultable dans l'admin Directus)
 *   2. notifiée in-app à l'admin (icône cloche)
 *   3. envoyée par email à PARTNER_NOTIFY_EMAIL via le MailService Directus —
 *      uniquement si un transport est configuré (env EMAIL_TRANSPORT + SMTP) ;
 *      sans config, la demande reste stockée et l'email partira une fois le
 *      SMTP branché (colonne email_sent pour distinguer).
 *
 * Anti-abus : rate-limit 3/h/IP, honeypot `website`, validation stricte.
 */

import { randomUUID } from 'node:crypto'
import type { Router, Request } from 'express'

const ADMIN_NOTIFY_USER_ID =
  process.env.BAYEN_ADMIN_NOTIFY_USER || '0019e380-4150-4be5-805c-416c1b12d760'
const PARTNER_NOTIFY_EMAIL = process.env.PARTNER_NOTIFY_EMAIL || 'amine@netspace.ma'

interface PartnerRequest {
  company?: string
  role?: string
  name?: string
  email?: string
  message?: string
  website?: string // honeypot
}

const WINDOW_MS = 60 * 60 * 1000
const MAX = 3
const ipHits = new Map<string, number[]>()

function allowed(ip: string): boolean {
  const now = Date.now()
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  if (hits.length >= MAX) return false
  hits.push(now)
  ipHits.set(ip, hits)
  return true
}

function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string') return fwd.split(',')[0]?.trim() ?? 'unknown'
  if (Array.isArray(fwd)) return fwd[0] ?? 'unknown'
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown'
}

function clean(v: unknown, maxLen: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t.length > 0 ? t.slice(0, maxLen) : null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

interface KnexLike {
  (table: string): {
    insert(data: Record<string, unknown>): Promise<unknown>
    where(criteria: Record<string, unknown>): { update(data: Record<string, unknown>): Promise<unknown> }
  }
}

export function registerPartnerEndpoint(
  router: Router,
  context: {
    database: unknown
    services: Record<string, unknown>
    getSchema: () => Promise<unknown>
  },
) {
  router.post('/partner-request', async (req, res) => {
    try {
      if (!allowed(clientIp(req))) {
        res.status(429).json({ error: 'rate_limited' })
        return
      }

      const body = (req.body ?? {}) as PartnerRequest

      // Honeypot : un humain ne voit pas ce champ, un bot le remplit.
      if (body.website) {
        res.json({ ok: true })
        return
      }

      const company = clean(body.company, 120)
      const name = clean(body.name, 120)
      const email = clean(body.email, 255)
      if (!company || !name || !email || !EMAIL_RE.test(email)) {
        res.status(400).json({ error: 'invalid_payload' })
        return
      }
      const role = clean(body.role, 40)
      const message = clean(body.message, 4000)

      const knex = context.database as KnexLike
      const id = randomUUID()
      await knex('partner_requests').insert({
        id,
        company,
        role,
        name,
        email,
        message,
        status: 'new',
        email_sent: false,
        date_created: new Date(),
      })

      // Notification in-app admin — best effort
      try {
        await knex('directus_notifications').insert({
          timestamp: new Date(),
          status: 'inbox',
          recipient: ADMIN_NOTIFY_USER_ID,
          sender: null,
          subject: `🤝 Partenariat — ${company}`,
          message: `${name} (${email})\nProfil : ${role ?? '—'}\n\n${message ?? '(pas de message)'}`,
          collection: 'partner_requests',
          item: id,
        })
      } catch (err) {
        console.error('[bayen-api/partner] notification in-app échouée:', err)
      }

      // Email — uniquement si un transport est configuré côté Directus.
      // Sans EMAIL_TRANSPORT, MailService lèverait : la demande reste stockée
      // et `email_sent` reste false pour un rattrapage ultérieur.
      if (process.env.EMAIL_TRANSPORT) {
        try {
          const { MailService } = context.services as {
            MailService: new (opts: { schema: unknown }) => {
              send(mail: Record<string, unknown>): Promise<unknown>
            }
          }
          const mailer = new MailService({ schema: await context.getSchema() })
          await mailer.send({
            to: PARTNER_NOTIFY_EMAIL,
            subject: `[Bayen] Demande de partenariat — ${company}`,
            text:
              `Nouvelle demande de partenariat sur bayen.ma/partenaires\n\n`
              + `Entreprise : ${company}\n`
              + `Profil     : ${role ?? '—'}\n`
              + `Contact    : ${name}\n`
              + `Email      : ${email}\n\n`
              + `Message :\n${message ?? '(pas de message)'}\n\n`
              + `→ Répondre directement à ${email}\n`
              + `→ Voir dans l'admin : https://api.bayen.ma/admin/content/partner_requests/${id}`,
          })
          await knex('partner_requests').where({ id }).update({ email_sent: true })
        } catch (err) {
          // L'email est un canal de confort : la demande est déjà en base.
          console.error('[bayen-api/partner] envoi email échoué:', err)
        }
      }

      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ error: 'server_error', message: (err as Error).message })
    }
  })
}
