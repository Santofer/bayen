# Refonte « Marché Pop » — brief pour les agents

Projet : /Users/amine/Code/bayen/frontend (Astro 5 + React 18 + Tailwind v4). Branche `refonte/marche-pop`.
Maquette de référence (ce qu'on vise) : canevas https://claude.ai/artifact/5mVTUBFk9DjkedMUsbLfsL
(source HTML lisible : /private/tmp/claude-501/-Users-amine-Code-bayen/646bbcc4-e258-4a87-aead-0aa0d5001cf0/scratchpad/canvas/screens/*.html
et sa feuille canvas/project/bayen.css).

## Esprit
Les couleurs du marché frais en aplats francs. Crème `#FFF8EC`, encre `#1B1B1B`, menthe `#19C08B`,
citron `#FFD43B`, tomate `#FF5A3C`, myrtille `#6B7BFF`, figue `#B98CFF`, framboise `#FF8FB1`,
aubergine `#3B1F5C`. Contours encre 2 px, ombres NETTES décalées (3px 3px 0, sans flou),
pastilles de score rondes inclinées (-8°), titres en Unbounded, texte en Readex Pro.
Sombre : aubergine profonde (#1D1430), cartes #2A1E44, texte crème.

## Fichiers RÉSERVÉS (ne pas modifier)
`src/styles/globals.css`, `src/layouts/Layout.astro`, `src/components/PageHero.astro`,
`src/lib/score-colors.ts`, `src/components/ui/button.tsx`, `src/components/ui/badge.tsx`,
`src/lib/scoring.ts`. Si un besoin CSS global apparaît, l'écrire dans ton rapport final.

## Ce qui existe déjà (à utiliser)
- Utilitaires Tailwind de couleur : `menthe citron tomate myrtille figue framboise aubergine creme encre`,
  `brand-ink` (menthe lisible EN TEXTE), `line` (trait encre / crème en sombre), `hard` (ombre),
  `score-excellent|bon|mediocre|mauvais` (aplats) et `score-…-ink` (texte),
  `beauty|protein|ai` (aplats univers) et `beauty-ink|protein-ink|ai-ink` (texte).
  `primary` = aplat menthe avec `primary-foreground` = encre.
- Toute carte `bg-card border` (ou `border-2`) reçoit AUTOMATIQUEMENT contour encre 2 px + ombre nette
  (règle globale) ; une carte imbriquée perd l'ombre. Donc : pour une carte, `rounded-2xl border bg-card`.
- Classes : `.score-sticker` (+ `.sm`, `.lg`, `.none`) avec `<b>72</b><i>Bon</i>` et `style="--c: <fill>"` ;
  `.pop-chip` ; `.btn-pop` (+ `.ghost`, `.ink`) pour les `<a>` boutons ; `.naanaa` (img + `.bubble`) ;
  `.tint-menthe|citron|framboise|myrtille|figue|tomate|creme` (fonds de vignette, gèrent le sombre) ;
  `.naanaa-bob` (respiration de la mascotte) ; `.card-lift`.
- `src/lib/score-colors.ts` : `scoreLevel`, `scoreFill(score)` (aplat hex), `scoreText(score)`
  (var CSS de texte, suit le thème), `SCORE_ON` (encre à poser sur un aplat), `SCORE_WORD`.
- `<PageHero image title subtitle kicker tone mascot size>` : tone ∈ primary|citron|tomate|myrtille|figue|
  framboise|beauty|protein|ai ; mascot ∈ salut|astuce|bravo|loupe|oups|nuit|scan|courses.
- Mascotte Naânaa : `/mascotte/naanaa-<pose>.webp` (≈380×560, fond transparent). Poses :
  salut (accueil, onboarding), astuce (conseil), bravo (points, succès, contribution), loupe (chargement,
  analyse en cours, recherche vide), oups (erreur, produit inconnu, 404), nuit (mode sombre, Ramadan),
  scan (inviter à scanner), courses (panier, liste).
  Motif : `<div class="naanaa"><img src="/mascotte/naanaa-oups.webp" alt="" width="72" height="106" /><p class="bubble">…</p></div>`

## Règles
1. Texte posé sur un aplat de couleur vive (menthe, citron, tomate, score…) = ENCRE (`text-encre`), jamais blanc.
2. Score : supprimer toute fonction locale `scoreColor` à hex codés en dur et passer par `score-colors.ts`.
   Une pastille de score = `.score-sticker` (chiffre + mot). Plus de `text-white` sur un fond de score.
3. Plus aucune couleur codée en dur de l'ancienne charte : `#476a32 #b1cf3a #f0f2d2 #1c3014 #233317
   #16a34a #84cc16 #f97316 #ef4444 #e8ecd0 #d5dcb5`, ni `bg-white`, `text-black`, `gray-*`, `green-*`, `lime-*`,
   `emerald-*` (sauf Nutri-Score/NOVA officiels). Tout doit marcher en clair ET en sombre via les tokens.
4. Boutons : composant `Button` (déjà restylé) ou `.btn-pop` pour un `<a>`.
5. Mascotte dans les états vides, chargements, erreurs et succès quand c'est naturel (pas partout).
6. Ne supprimer AUCUNE fonctionnalité, prop, appel API ni clé i18n. Textes via `t()` inchangés ;
   une nouvelle clé i18n éventuelle va dans `src/lib/i18n.ts` (fr + ary).
7. TypeScript strict, zéro `any`, commentaires en français, imports `@/`.
8. Ne pas lancer de serveur, ne pas committer. Vérifier : `cd frontend && npx astro check 2>&1 | grep -E "<tes fichiers>"`
   (des erreurs préexistent ailleurs : n'introduis pas de nouvelle erreur dans tes fichiers).
9. Rapport final court : fichiers modifiés, choix notables, besoins CSS globaux éventuels.
