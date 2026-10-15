# Refonte v2 — appliquer EXACTEMENT les maquettes validées

Amine a validé un canevas de maquettes « Marché Pop ». La première passe de refonte a
repeint l'ancien site sans changer sa structure : c'est refusé. Cette passe reconstruit
chaque écran avec la STRUCTURE des maquettes (ordre des blocs, composants, hiérarchie,
textes d'interface), en gardant toutes les fonctionnalités existantes.

## Sources

- Maquettes : `design/maquettes/*.dc.html` + `design/maquettes/bayen.css` (vocabulaire CSS).
  Écrans mobiles 390 px : Main (accueil), FichePop (fiche produit), Recherche, Scan, Compte,
  Blog, Beaute, Proteines, Repas. Écran ordinateur : Desktop (accueil 1440 px).
  Les `{{cls}}` et `/_blob/...` sont des artefacts du canevas : ignorer / remplacer par les
  vraies données et les vraies images.
- Repo : `frontend/` (Astro 5 SSR + React 18 + Tailwind v4), branche `refonte/marche-pop`.
  Lire `CLAUDE.md` à la racine (conventions, règles métier : score toujours déterministe,
  halal jamais retiré automatiquement, « perturbateur endocrinien » encadré, etc.).

## Le vocabulaire des maquettes est déjà dans `frontend/src/styles/globals.css`

Mêmes noms de classes que `bayen.css`, en `@layer components` (les utilitaires Tailwind
les surchargent) : `disp d-xl d-l d-m d-s eyebrow muted num card btn (primary dark-btn sm flat)
icon-btn chips chip (fill) tile pcard (pn pm) topbar section sec-head scroller u-ico naanaa (m)
bubble nut (bar lab val) logo tabbar`. En plus :
- `.band` + `.on-fill` : bandeau d'aplat pleine largeur (variable `--band`), puces et icon-btn
  crème/encre dessus. C'est ce que rend `components/PageHero.astro`.
- `.screen` : conteneur d'écran (colonne mobile gap 26 px ; ≥ 768 px centré 1240 px,
  padding 40/32 px, `.section` sans gouttière). `<main class="screen">` sous l'en-tête/bandeau.
- `.score-sticker` = `.sticker` de la maquette (mot dans `<i>` au lieu de `<span>`).
  En React : `ScoreSticker` exporté par `@/components/ProductCard` (props score, size 'sm'|'lg',
  word, value, fill). En Astro : `<span class="score-sticker" style="--c: <fill>"><span><b>91</b><i>Excellent</i></span></span>`
  avec `scoreFill/scoreLevel/SCORE_WORD` de `@/lib/score-colors`.
- Teintes de vignette : `tint-menthe tint-citron tint-framboise tint-myrtille tint-figue tint-tomate tint-creme`
  (= `t-mint t-lemon t-pink t-blue t-fig t-tomato t-cream` des maquettes). `productTint(barcode)`
  dans ProductCard donne une teinte stable par produit.

Correspondance des variables de la maquette → tokens Tailwind :
`--surface` bg-card · `--fg` text-foreground · `--muted` text-muted-foreground (ou `.muted`) ·
`--line` border-line · `--shadow` var(--color-hard) (ex. `shadow-[3px_3px_0_var(--color-hard)]`) ·
`--soft` bg-muted · `--menthe/--citron/--tomate/--encre/--creme` bg-menthe… text-encre… ·
`--menthe-encre` text-brand-ink · `--u-food` menthe · `--u-beauty` bg-beauty · `--u-protein` bg-protein ·
`--u-meal` bg-ai · `--s-a/--s-b` bg-score-excellent / bg-score-bon · `--s-c/--s-d` bg-score-mediocre ·
`--s-e` bg-score-mauvais (l'app a 4 niveaux : 75/50/25, via `scoreFill`).

## Règles

1. **Structure = maquette.** Recopier le balisage de la maquette (classes identiques), convertir
   les `style="…"` en utilitaires Tailwind (valeurs arbitraires permises). Même ordre de blocs,
   mêmes titres de section, même tutoiement (« Ce que tu manges, enfin clair. »).
2. **Mobile = maquette au pixel près. Ordinateur (≥ 768 px)** = mêmes composants, mis en page
   comme la maquette Desktop : conteneur 1240 px, titres plus grands, grilles 2 à 4 colonnes
   (`md:grid-cols-…`), fiche produit en 2 colonnes (visuel | infos). Jamais une colonne de
   téléphone étirée.
3. **Photos produit : elles REMPLISSENT le cadre.** `.tile > img` est déjà en absolu
   `object-fit: cover`. Interdit : `object-contain`, `mix-blend-*`, padding autour d'une photo
   produit, détourage. La teinte n'apparaît que si la photo manque.
4. **Navigation.** `Layout.astro` gère l'en-tête ordinateur, la barre du haut mobile par défaut
   (logo + bouton panier), le pied de page et la barre d'onglets. Si la maquette de l'écran a sa
   propre barre du haut (retour, titre, partage…), passer `mobileTopbar={false}` au Layout et
   dessiner `<header class="topbar md:hidden">…</header>` dans la page. Le slot nommé
   `topbar-end` du Layout remplace le bouton de droite de la barre par défaut.
5. **Bandeaux.** Les pages sans maquette dédiée suivent le motif Beauté/Protéines :
   `<PageHero tone=… kicker=… title=… subtitle=… back=… mascot=…>CTA optionnel</PageHero>`
   posé en PREMIER enfant du Layout, HORS de tout conteneur, avec `mobileTopbar={false}`,
   puis `<main class="screen">` avec des `<section class="section">`. PageHero n'a plus
   d'image (props `image`/`size` supprimées).
6. **Aucune fonctionnalité perdue.** Garder chaque appel de données, interaction, composant,
   lien, SEO/JSON-LD, appel `t()`. Ce qui n'a pas de place dans la maquette va plus bas dans
   l'écran, dans le même langage (`section` + `sec-head` + `card`). Supprimer seulement les
   blocs purement décoratifs de l'ancien site (carrousel, bandeau de stats, images d'en-tête)
   et le lister dans le rapport.
7. **Pas de fausses données.** Les chiffres des maquettes sont des exemples. N'afficher que des
   données réelles ; si une donnée n'existe pas (ex. prix par enseigne absents), masquer le bloc
   ou afficher l'état vide prévu, jamais un nombre inventé.
8. **Textes.** Réutiliser les clés `t()` existantes ; pour un nouveau texte, l'écrire en français
   en dur (phase 1 = français) — ne PAS éditer `lib/translations.ts` (fichier partagé).
9. **Fichiers partagés interdits en écriture** : `styles/globals.css`, `layouts/Layout.astro`,
   `components/PageHero.astro`, `components/ProductCard.tsx`, `lib/translations.ts`, et les
   fichiers d'un autre lot. Besoin d'une classe CSS commune ? Utilitaires Tailwind, et le
   signaler dans le rapport.
10. **Conventions** : TypeScript strict sans `any`, commentaires en français, Tailwind v4,
    imports `@/`. shadcn/ui reste possible pour les primitives de formulaire (Input, Dialog…),
    mais l'aspect visible suit les classes de la maquette (`btn`, `chip`, `card`…).
11. **Vérification** : `cd frontend && npx astro check 2>&1 | grep -E "error|Error" | grep <tes fichiers>`
    (il existe ~14 erreurs anciennes ailleurs : ne pas en ajouter). Ne pas lancer de serveur ni
    utiliser le navigateur (la vérification visuelle est faite par l'orchestrateur). Ne pas
    committer.
12. **Rapport final** (court) : fichiers modifiés ; blocs de la maquette réalisés ; blocs
    non réalisables faute de données ; anciens blocs supprimés ou déplacés ; besoins CSS communs.
