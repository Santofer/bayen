/**
 * Error reporting léger vers /bayen-api/log-error
 *
 * - Capture window.onerror et window.onunhandledrejection
 * - Dédupe client-side (pas d'envoi répété pour la même erreur)
 * - Throttle 20 events / 5 min côté serveur (voir log-error.ts)
 * - Tout est fire-and-forget : jamais bloquant, jamais de boucle si
 *   l'endpoint lui-même échoue.
 */

const ENDPOINT = '/api/directus/bayen-api/log-error'

// Dédupe : clé = hash léger du message + première ligne de stack
const seen = new Set<string>()
const SEEN_TTL_MS = 60 * 60 * 1000 // 1h

function hashKey(message: string, stack?: string): string {
  const firstStackLine = stack?.split('\n')[1]?.trim() ?? ''
  return `${message.slice(0, 100)}::${firstStackLine.slice(0, 150)}`
}

function sendInternal(payload: {
  message: string
  stack?: string
  url?: string
  source?: 'frontend' | 'service-worker'
  severity?: 'error' | 'warning' | 'info'
  context?: Record<string, unknown>
}): void {
  // Ne pas essayer en SSR
  if (typeof window === 'undefined') return

  const key = hashKey(payload.message, payload.stack)
  if (seen.has(key)) return
  seen.add(key)
  // Nettoyage TTL basique
  setTimeout(() => seen.delete(key), SEEN_TTL_MS)

  const body = JSON.stringify({
    source: payload.source ?? 'frontend',
    severity: payload.severity ?? 'error',
    message: payload.message,
    stack: payload.stack,
    url: payload.url ?? window.location.href,
    context: payload.context,
  })

  // sendBeacon pour survivre aux page unload
  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon(ENDPOINT, blob)) return
    } catch { /* fallback */ }
  }

  // Fallback fetch fire-and-forget
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => { /* silencieux — ne jamais faire boucler */ })
}

/** Signale une erreur arbitrairement (utilisable depuis un try/catch) */
export function reportError(
  error: unknown,
  context?: Record<string, unknown>
): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined
  sendInternal({ message, stack, context })
}

/** Installe les hooks globaux — à appeler une seule fois au boot client */
export function installGlobalErrorReporter(): void {
  if (typeof window === 'undefined') return
  if ((window as { __bayenErrorReporterInstalled?: boolean }).__bayenErrorReporterInstalled) return
  ;(window as { __bayenErrorReporterInstalled?: boolean }).__bayenErrorReporterInstalled = true

  window.addEventListener('error', (event: ErrorEvent) => {
    sendInternal({
      message: event.message ?? 'window.onerror',
      stack: event.error instanceof Error ? event.error.stack : undefined,
      url: event.filename ?? window.location.href,
    })
  })

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason
    const message = reason instanceof Error ? reason.message : String(reason ?? 'unhandled rejection')
    const stack = reason instanceof Error ? reason.stack : undefined
    sendInternal({ message: `[unhandled promise] ${message}`, stack })
  })
}
