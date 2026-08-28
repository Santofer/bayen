/**
 * Attribution de points aux contributeurs.
 *
 * Les endpoints custom écrivent via Knex (contournement du cache de schéma
 * d'ItemsService, cf. scan.ts) : les hooks Directus, qui écoutent les événements
 * d'ItemsService, ne se déclenchent donc PAS sur ces écritures. Ce module fait
 * le crédit explicitement.
 *
 * Barème et seuils de rang identiques à `bayen-hooks/src/index.ts` — toute
 * modification doit être répercutée des deux côtés.
 */

export const POINTS_MAP: Record<string, number> = {
  new_product: 50,
  add_image: 20,
  fix_data: 15,
  confirm: 10,
  add_price: 5,
  fix_meal: 10,
}

const RANK_THRESHOLDS = [
  { rank: 'expert', min: 500 },
  { rank: 'contributeur', min: 100 },
  { rank: 'nouveau', min: 0 },
]

/** Le rang « vérifié » est attribué manuellement : jamais recalculé. */
export function computeRank(points: number, currentRank: string): string {
  if (currentRank === 'vérifié') return 'vérifié'
  for (const { rank, min } of RANK_THRESHOLDS) {
    if (points >= min) return rank
  }
  return 'nouveau'
}

interface KnexLike {
  (table: string): {
    where(criteria: Record<string, unknown> | string, val?: unknown): {
      first(): Promise<Record<string, unknown> | undefined>
      update(data: Record<string, unknown>): Promise<unknown>
      increment(col: string, n: number): { increment(col: string, n: number): Promise<unknown> } & Promise<unknown>
      select(...cols: string[]): { first(): Promise<Record<string, unknown> | undefined> }
    }
  }
}

/**
 * Crédite les points d'une action et recalcule le rang.
 * Sans effet si l'utilisateur est anonyme ou le type inconnu.
 * Ne lève jamais : un échec de gamification ne doit pas casser la contribution.
 */
export async function creditPoints(
  database: unknown,
  userId: string | null | undefined,
  type: string,
  options: { countAsContribution?: boolean } = {},
): Promise<number> {
  const points = POINTS_MAP[type] ?? 0
  if (!userId || points === 0) return 0

  try {
    const knex = database as KnexLike
    const query = knex('directus_users').where({ id: userId }).increment('points', points)
    if (options.countAsContribution !== false) {
      await query.increment('contributions_count', 1)
    } else {
      await query
    }

    const user = await knex('directus_users').where({ id: userId }).select('points', 'rank').first()
    if (user) {
      const currentRank = String(user.rank ?? 'nouveau')
      const newRank = computeRank(Number(user.points ?? 0), currentRank)
      if (newRank !== currentRank) {
        await knex('directus_users').where({ id: userId }).update({ rank: newRank })
      }
    }
    return points
  } catch (err) {
    console.error('[bayen-api] credit points échoué:', (err as Error).message)
    return 0
  }
}
