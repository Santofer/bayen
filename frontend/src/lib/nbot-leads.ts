/**
 * Formulaires du site → nBot (boîte « Formulaires » du widget Bayen), où une IA
 * trie chaque envoi (prospect ou non) avant de relayer les prospects.
 * Contrat des champs : src/lib/leads.ts côté nBot (prenom/nom ou name, email,
 * telephone, societe, message, form, formName, page, startedAt, _gotcha…).
 *
 * Adresse surchargeable au build par PUBLIC_NBOT_LEADS_URL.
 */

export const NBOT_LEADS_URL: string =
  import.meta.env.PUBLIC_NBOT_LEADS_URL || 'https://chat.nbot.ma/api/w/bayen/leads'

const GENERIC_ERROR = 'Une erreur est survenue. Réessayez dans quelques instants.'

/**
 * Envoie un formulaire à nBot. `fields` contient déjà form, formName, startedAt
 * (Date.now() à l'affichage du formulaire) et le honeypot `_gotcha` ; la page
 * courante est ajoutée ici. Renvoie null si c'est bon, sinon le message à
 * afficher tel quel (nBot répond en français).
 */
export async function sendLead(fields: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch(NBOT_LEADS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: window.location.href, ...fields }),
    })
    if (res.ok) return null
    if (res.status === 429) return 'Trop d’envois. Réessayez dans quelques minutes.'
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    return data?.error || GENERIC_ERROR
  } catch {
    return GENERIC_ERROR
  }
}
