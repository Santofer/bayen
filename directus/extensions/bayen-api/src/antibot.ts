/**
 * Anti-bot invisible (même contrat que nBot) — copie de frontend/src/lib/antibot.tsx.
 * Sur un robot : répondre 200 { ok: true } et ne rien faire.
 */
export function isBot(body: Record<string, unknown>): boolean {
  if (typeof body._gotcha === 'string' && body._gotcha.trim()) return true
  if (body.url || body.website) return true // anciens honeypots de /contribute
  if (body.startedAt === undefined) return false // client ancien, toléré
  const t = Number(body.startedAt)
  // ponytail: 60 s de tolérance sur les horloges en avance, nBot est strict
  return !Number.isFinite(t) || t > Date.now() + 60_000 || Date.now() - t < 3000
}

/** Retire les champs anti-bot avant de relayer un corps à un service tiers. */
export function stripAntibot<T extends Record<string, unknown>>(body: T): Omit<T, '_gotcha' | 'startedAt'> {
  const { _gotcha: _g, startedAt: _s, ...rest } = body
  return rest
}
