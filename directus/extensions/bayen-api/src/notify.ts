/**
 * Helpers pour notifier l'admin d'un nouveau produit.
 *
 * Appelé depuis les endpoints qui créent des produits via Knex direct
 * (et qui shuntent donc le hook bayen-hooks → products.items.create).
 *
 * - notification in-app dans Directus (bell icon)
 * - webhook externe optionnel (Slack/Discord/n8n) si BAYEN_NOTIFY_WEBHOOK_URL
 */

const ADMIN_NOTIFY_USER_ID =
  process.env.BAYEN_ADMIN_NOTIFY_USER || '0019e380-4150-4be5-805c-416c1b12d760'

const NOTIFY_WEBHOOK_URL = process.env.BAYEN_NOTIFY_WEBHOOK_URL || ''

const SOURCE_LABELS: Record<string, string> = {
  off: '🌍 Auto-import OFF',
  community: '👤 Contribution',
  ocr_tesseract: '📸 OCR',
  manual: '✍️ Manuel',
}

export async function notifyNewProduct(
  database: Record<string, (...args: unknown[]) => unknown>,
  product: { id: string; barcode: string; name_fr: string; brand?: string | null; data_source: string }
): Promise<void> {
  const tag = SOURCE_LABELS[product.data_source] ?? product.data_source

  // Notification in-app — best effort, ne fait pas échouer le flow
  try {
    const knex = database as unknown as {
      (table: string): { insert(data: Record<string, unknown>): Promise<unknown> }
    }
    await knex('directus_notifications').insert({
      timestamp: new Date(),
      status: 'inbox',
      recipient: ADMIN_NOTIFY_USER_ID,
      sender: null,
      subject: `${tag} — ${product.name_fr}`,
      message: `Code-barres : ${product.barcode}\nMarque : ${product.brand ?? '—'}\n\nSource : ${product.data_source}`,
      collection: 'products',
      item: product.id,
    })
  } catch (err) {
    console.error('[bayen-api/notify] in-app fail:', err)
  }

  // Webhook externe — fire-and-forget
  if (NOTIFY_WEBHOOK_URL) {
    fetch(NOTIFY_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[Bayen] ${tag} : ${product.name_fr} (${product.barcode})`,
        product,
      }),
    }).catch((err) => console.warn('[bayen-api/notify] webhook fail:', err.message))
  }
}
