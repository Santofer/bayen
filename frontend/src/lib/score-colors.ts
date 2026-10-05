/**
 * Couleurs du score Bayen — système « Marché Pop ».
 *
 * Deux usages, jamais mélangés :
 *  - FILL : aplat d'une pastille / barre ; le texte posé dessus est TOUJOURS
 *    l'encre (SCORE_ON), y compris en mode sombre (contraste AA sur les 4 teintes).
 *  - TEXT : chiffre ou libellé coloré posé sur une surface (carte, fond) ;
 *    passe par une variable CSS qui s'éclaircit en mode sombre.
 *
 * Seuils identiques à scoreToLabel (scoring.ts) : 75 / 50 / 25.
 */
export type ScoreLevel = 'excellent' | 'bon' | 'mediocre' | 'mauvais'

export const SCORE_FILL: Record<ScoreLevel, string> = {
  excellent: '#19C08B',
  bon: '#A6E35F',
  mediocre: '#FFA24D',
  mauvais: '#FF5A3C',
}

/** Encre posée sur un aplat de score */
export const SCORE_ON = '#1B1B1B'
/** Aplat neutre quand le score est inconnu */
export const SCORE_NONE = '#E4D6BF'

export function scoreLevel(score: number | null | undefined): ScoreLevel | null {
  if (score == null || Number.isNaN(score)) return null
  if (score >= 75) return 'excellent'
  if (score >= 50) return 'bon'
  if (score >= 25) return 'mediocre'
  return 'mauvais'
}

/** Aplat (hex) pour un score ; neutre si inconnu */
export function scoreFill(score: number | null | undefined): string {
  const l = scoreLevel(score)
  return l ? SCORE_FILL[l] : SCORE_NONE
}

/** Couleur de TEXTE lisible sur la surface courante (variable CSS, suit le thème) */
export function scoreText(score: number | null | undefined): string {
  const l = scoreLevel(score)
  return l ? `var(--color-score-${l}-ink)` : 'var(--color-muted-foreground)'
}

/** Libellé court affiché dans la pastille (toujours chiffre + mot) */
export const SCORE_WORD: Record<ScoreLevel, string> = {
  excellent: 'Excellent',
  bon: 'Bon',
  mediocre: 'Médiocre',
  mauvais: 'Mauvais',
}
