/**
 * Anti-bot invisible, commun à tous les formulaires (même contrat que nBot) :
 *  - honeypot `_gotcha` : champ hors écran qu'un humain ne remplit jamais ;
 *  - `startedAt` : Date.now() à l'affichage, un envoi en moins de 3 s est un robot.
 * Le serveur (isBot) répond 200 { ok: true } et ne fait rien. Copie de isBot
 * côté extension : directus/extensions/bayen-api/src/antibot.ts
 */
import { useState, type CSSProperties } from 'react'

export const HONEYPOT_STYLE: CSSProperties = { position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }

/** Vrai si l'envoi vient d'un robot. `startedAt` absent = client ancien, toléré. */
export function isBot(body: Record<string, unknown>): boolean {
  if (typeof body._gotcha === 'string' && body._gotcha.trim()) return true
  if (body.url || body.website) return true // anciens honeypots de /contribute
  if (body.startedAt === undefined) return false
  const t = Number(body.startedAt)
  // ponytail: 60 s de tolérance sur les horloges en avance, nBot est strict
  return !Number.isFinite(t) || t > Date.now() + 60_000 || Date.now() - t < 3000
}

/** Hook : `fields` à joindre au corps de la requête, `honeypot` à rendre dans le formulaire. */
export function useAntibot(id: string) {
  const [startedAt] = useState(() => Date.now())
  const [gotcha, setGotcha] = useState('')
  const honeypot = (
    <div aria-hidden="true" style={HONEYPOT_STYLE}>
      <label htmlFor={id}>Ne pas remplir ce champ</label>
      <input id={id} name="_gotcha" type="text" tabIndex={-1} autoComplete="off" value={gotcha} onChange={(e) => setGotcha(e.target.value)} />
    </div>
  )
  return { fields: { _gotcha: gotcha, startedAt }, honeypot, bot: () => isBot({ _gotcha: gotcha, startedAt }) }
}
