/**
 * Hooks Directus — Système de points et niveaux Bayen
 *
 * Événements :
 * - scans.items.create → +1 pt au user
 * - contributions.items.update (status → approved) → +50/+20/+15 pts selon type
 * - Recalcul automatique du rank après chaque attribution de points
 *
 * Barème (SPEC.md §10) :
 *   Ajouter un produit complet : 50 pts
 *   Ajouter photos manquantes : 20 pts
 *   Corriger des données : 15 pts
 *   Scanner un produit : 1 pt
 *   Contribution confirmée par 3 utilisateurs : +10 pts bonus
 *
 * Niveaux :
 *   Nouveau     : 0 pts
 *   Contributeur : 100 pts
 *   Expert       : 500 pts
 *   Vérifié      : 2000 pts + validation manuelle
 */

import type { HookConfig } from '@directus/extensions'

// Points par type de contribution
const POINTS_MAP: Record<string, number> = {
  new_product: 50,
  add_image: 20,
  fix_data: 15,
  confirm: 10,
}

// Seuils de rang
const RANK_THRESHOLDS = [
  { rank: 'vérifié', min: 2000 },
  { rank: 'expert', min: 500 },
  { rank: 'contributeur', min: 100 },
  { rank: 'nouveau', min: 0 },
]

function computeRank(points: number, currentRank: string): string {
  // Le rang "vérifié" nécessite une validation manuelle — on ne rétrograde pas
  if (currentRank === 'vérifié') return 'vérifié'

  for (const { rank, min } of RANK_THRESHOLDS) {
    // Ne pas auto-promouvoir vers "vérifié" (validation manuelle requise)
    if (rank === 'vérifié') continue
    if (points >= min) return rank
  }
  return 'nouveau'
}

const hooks: HookConfig = {
  // Attribution de points lors d'un scan
  'scans.items.create': async (input, { database }) => {
    const userId = input.user_id
    if (!userId) return // Scan anonyme, pas de points

    try {
      await database('directus_users')
        .where('id', userId)
        .increment('points', 1)

      // Recalcul du rank
      const user = await database('directus_users')
        .where('id', userId)
        .select('points', 'rank')
        .first()

      if (user) {
        const newRank = computeRank(user.points, user.rank)
        if (newRank !== user.rank) {
          await database('directus_users')
            .where('id', userId)
            .update({ rank: newRank })
        }
      }
    } catch (err) {
      console.error('[bayen-hooks] Erreur attribution points scan:', err)
    }
  },

  // Attribution de points quand une contribution est approuvée
  'contributions.items.update': async (input, { database }) => {
    // Vérifier que le status passe à "approved"
    if (input.status !== 'approved') return

    try {
      // Récupérer la contribution complète
      const contribution = await database('contributions')
        .where('id', input.keys?.[0] ?? input.id)
        .select('user_id', 'type')
        .first()

      if (!contribution?.user_id) return

      const points = POINTS_MAP[contribution.type] ?? 0
      if (points === 0) return

      // Ajouter les points + incrémenter le compteur de contributions
      await database('directus_users')
        .where('id', contribution.user_id)
        .increment('points', points)
        .increment('contributions_count', 1)

      // Recalcul du rank
      const user = await database('directus_users')
        .where('id', contribution.user_id)
        .select('points', 'rank')
        .first()

      if (user) {
        const newRank = computeRank(user.points, user.rank)
        if (newRank !== user.rank) {
          await database('directus_users')
            .where('id', contribution.user_id)
            .update({ rank: newRank })
        }
      }

      console.log(
        `[bayen-hooks] +${points} pts → user ${contribution.user_id} (${contribution.type})`
      )
    } catch (err) {
      console.error('[bayen-hooks] Erreur attribution points contribution:', err)
    }
  },
}

export default hooks
