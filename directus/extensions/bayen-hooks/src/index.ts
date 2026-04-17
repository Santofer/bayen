/**
 * Hooks Directus — Système de points + auto-role + notifications admin Bayen
 *
 * Filters :
 * - users.create → auto-assigner le rôle "Utilisateur" si absent
 *
 * Actions :
 * - scans.items.create → +1 pt au user
 * - contributions.items.update (status → approved) → +50/+20/+15 pts selon type
 * - products.items.create → notification admin in-app + webhook optionnel
 */

// ID du rôle "Utilisateur" — override via env var BAYEN_DEFAULT_USER_ROLE
const DEFAULT_USER_ROLE_ID =
  process.env.BAYEN_DEFAULT_USER_ROLE || '0e2f9c18-3d9f-4203-b296-43b329c3b25c'

// UUID admin destinataire des notifications
const ADMIN_NOTIFY_USER_ID =
  process.env.BAYEN_ADMIN_NOTIFY_USER || '0019e380-4150-4be5-805c-416c1b12d760'

// Webhook optionnel pour notifications externes (Slack/Discord/n8n)
// Format attendu : POST JSON { text: "...", product: {...} }
const NOTIFY_WEBHOOK_URL = process.env.BAYEN_NOTIFY_WEBHOOK_URL || ''

const POINTS_MAP: Record<string, number> = {
  new_product: 50,
  add_image: 20,
  fix_data: 15,
  confirm: 10,
}

const RANK_THRESHOLDS = [
  { rank: 'vérifié', min: 2000 },
  { rank: 'expert', min: 500 },
  { rank: 'contributeur', min: 100 },
  { rank: 'nouveau', min: 0 },
]

function computeRank(points: number, currentRank: string): string {
  if (currentRank === 'vérifié') return 'vérifié'
  for (const { rank, min } of RANK_THRESHOLDS) {
    if (rank === 'vérifié') continue
    if (points >= min) return rank
  }
  return 'nouveau'
}

// Signature : Directus passe { filter, action, init, schedule, embed } + services
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default ({ filter, action }: any) => {
  // ── Auto-role pour les nouveaux inscrits ────────────────────────
  filter('users.create', (payload: Record<string, unknown>) => {
    if (!payload.role) payload.role = DEFAULT_USER_ROLE_ID
    return payload
  })

  // ── +1 pt par scan authentifié ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action('scans.items.create', async (meta: any, context: any) => {
    const userId: string | undefined = meta?.payload?.user_id
    if (!userId) return
    const { database } = context
    try {
      await database('directus_users').where('id', userId).increment('points', 1)
      const user = await database('directus_users').where('id', userId).select('points', 'rank').first()
      if (user) {
        const newRank = computeRank(user.points, user.rank)
        if (newRank !== user.rank) {
          await database('directus_users').where('id', userId).update({ rank: newRank })
        }
      }
    } catch (err) {
      console.error('[bayen-hooks] Erreur attribution points scan:', err)
    }
  })

  // ── Points quand contribution approuvée ─────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action('contributions.items.update', async (meta: any, context: any) => {
    if (meta?.payload?.status !== 'approved') return
    const { database } = context
    try {
      const contribution = await database('contributions')
        .where('id', meta?.keys?.[0])
        .select('user_id', 'type')
        .first()
      if (!contribution?.user_id) return
      const points = POINTS_MAP[contribution.type] ?? 0
      if (points === 0) return

      await database('directus_users')
        .where('id', contribution.user_id)
        .increment('points', points)
        .increment('contributions_count', 1)

      const user = await database('directus_users')
        .where('id', contribution.user_id)
        .select('points', 'rank')
        .first()
      if (user) {
        const newRank = computeRank(user.points, user.rank)
        if (newRank !== user.rank) {
          await database('directus_users').where('id', contribution.user_id).update({ rank: newRank })
        }
      }
      console.log(`[bayen-hooks] +${points} pts → user ${contribution.user_id} (${contribution.type})`)
    } catch (err) {
      console.error('[bayen-hooks] Erreur attribution points contribution:', err)
    }
  })

  // ── Notification admin pour chaque nouveau produit ──────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  action('products.items.create', async (meta: any, context: any) => {
    const { database } = context
    const productId: string | undefined = meta?.key
    if (!productId) return

    try {
      const product = await database('products')
        .where('id', productId)
        .select('barcode', 'name_fr', 'brand', 'data_source', 'created_by')
        .first()
      if (!product) return

      const source = product.data_source as string
      const sourceLabel: Record<string, string> = {
        off: '🌍 Auto-import OFF',
        community: '👤 Contribution',
        ocr_tesseract: '📸 OCR',
        manual: '✍️ Manuel',
      }
      const tag = sourceLabel[source] ?? source

      // Notification in-app
      await database('directus_notifications').insert({
        timestamp: new Date(),
        status: 'inbox',
        recipient: ADMIN_NOTIFY_USER_ID,
        sender: product.created_by ?? null,
        subject: `${tag} — ${product.name_fr}`,
        message: `Code-barres : ${product.barcode}\nMarque : ${product.brand ?? '—'}\n\nSource : ${source}`,
        collection: 'products',
        item: productId,
      })

      // Webhook externe si configuré
      if (NOTIFY_WEBHOOK_URL) {
        // fire-and-forget — pas d'await pour ne pas bloquer le flow
        fetch(NOTIFY_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `[Bayen] ${tag} : ${product.name_fr} (${product.barcode})`,
            product: {
              id: productId,
              barcode: product.barcode,
              name_fr: product.name_fr,
              brand: product.brand,
              data_source: source,
            },
          }),
        }).catch((err) => console.warn('[bayen-hooks] webhook fail:', err.message))
      }
    } catch (err) {
      console.error('[bayen-hooks] Erreur notification nouveau produit:', err)
    }
  })
}
