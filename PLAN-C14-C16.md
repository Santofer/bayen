# PLAN C14–C16 — Historique de scans · Journal repas sans compte · Variantes

> Rédigé par Fable (planification) pour exécution par Opus 5, session du 2026-08-27.
> Contexte : CLAUDE.md + pièges connus listés dans le PLAN C11-C13 (commit 6b8096c,
> le fichier a été supprimé mais la section « Pièges connus » reste valable telle
> quelle : SW, classes arbitraires Tailwind, déploiement app.py/extension/crons,
> dry-run APPLY=0, build frontend avant chaque commit).
> Un commit par chantier, vérification E2E avant chaque commit, push après chaque
> commit. Supprimer ce fichier au dernier commit.

## Constats qui motivent (mesurés le 27/08)

- 0 meal_scan enregistré MAIS l'analyse repas est déjà publique : seule la
  **sauvegarde** exige un compte (`MealPhotoAnalyzer.tsx:404` → « Connecte-toi pour
  sauvegarder ») et l'usage sans sauvegarde n'est **pas mesuré** (la table `ai_logs`
  existe avec le bon schéma — id, product_id, type, input, output, duration_ms,
  success, error_message, date_created — mais reste vide : rien n'y écrit).
- Yuka fait payer l'« historique illimité » ; nous n'avons AUCUN historique de scans
  côté utilisateur (la maquette scanner v2 prévoyait pourtant « Scans récents »).
- Les « doublons » (Nutella ×6, Coca ×5, sergio ×3…) sont des **variantes EAN
  légitimes** (formats/parfums différents). L'utilisateur l'a confirmé en session
  pour TITAN. `products_barcode_unique` existe déjà → AUCUNE fusion à faire.
  Le vrai problème est l'ambiguïté d'affichage : 5 cards « Nutella / Ferrero »
  indistinguables faute de contenance visible.

---

## C14 — Historique de scans local (« Mes scans »)

**But** : chaque produit consulté est retrouvable — gratuit là où Yuka le fait payer.
100 % localStorage, zéro backend.

### C14a — lib `frontend/src/lib/scan-history.ts`
Copier le pattern de `cart.ts` (localStorage + CustomEvent + `storage`) :
```ts
export interface ScanHistoryEntry {
  barcode: string
  name_fr: string
  brand: string | null
  image_front: string | null
  scan_score: number | null
  score_label: string | null
  at: number            // Date.now()
}
```
- Clé `bayen_scan_history`, événement `bayen-history-change`.
- `addToHistory(entry)` : dédup par barcode (l'entrée remonte en tête, `at` rafraîchi),
  cap à 100 entrées. `getHistory()`, `clearHistory()`, `historyCount()`,
  `onHistoryChange(cb)`.

### C14b — enregistrement depuis la fiche produit
Le script inline C12 en bas de `frontend/src/pages/produit/[barcode].astro`
(`define:vars={{ trackBarcode: barcode }}`) est le bon endroit : étendre
`define:vars` avec un objet sérialisable
`historyEntry = { barcode, name_fr, brand, image_front, scan_score, score_label }`
construit dans le frontmatter depuis `product`/`score` (attention : `image_front`
peut être un UUID Directus OU une URL http — stocker tel quel, l'affichage
réutilisera la même logique que `ProductCard`). Dans le script :
```js
// Historique local (C14) — même si le scan réseau échoue
var H_KEY = 'bayen_scan_history';
var list = [];
try { list = JSON.parse(localStorage.getItem(H_KEY) || '[]') || []; } catch (e) {}
list = list.filter(function (e) { return e && e.barcode !== historyEntry.barcode; });
historyEntry.at = Date.now();
list.unshift(historyEntry);
localStorage.setItem(H_KEY, JSON.stringify(list.slice(0, 100)));
window.dispatchEvent(new CustomEvent('bayen-history-change'));
```
⚠️ Ce bloc va AVANT le garde `sessionStorage` du tracking (l'historique doit se
rafraîchir à chaque visite, le tracking réseau reste 1×/session). Restructurer le
script en conséquence sans casser le tracking C12 (revérifier après : nouvelle ligne
`scans` avec session stable — voir requête SQL de la mémoire bayen-usage-metrics).

### C14c — page `/mes-scans` + navigation
- `frontend/src/pages/mes-scans.astro` (prerender=false) : en-tête style /profil
  (badge « Sur cet appareil », titre display, sous-titre) + composant React
  `ScanHistory.tsx` `client:load` :
  - liste depuis `getHistory()`, rendu en grille dense v2 — RÉUTILISER
    `ProductCard variant="grid"` en mappant l'entrée vers le shape Product attendu ;
  - état vide : carte avec CTA « Scanner un produit » → /scan ;
  - bouton « Tout effacer » (avec `confirm()`), compteur.
- Mega menu **Outils** (Layout.astro) : entrée `/mes-scans` — réutiliser
  `NAV_ICONS.scan` est déjà pris par Scanner → ajouter une icône `history`
  (`<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>`).
- Page `/scan` (`ScanPage.tsx`) : sous le scanner, section « Scans récents »
  (3-5 dernières entrées, liens vers les fiches) — c'est la maquette scanner v2.
  Ne l'afficher que si l'historique est non vide.
- i18n (FR + darija) : `history.title`, `history.badge`, `history.subtitle`,
  `history.empty`, `history.clear`, `history.clearConfirm`, `history.recent`,
  `nav.history`, `nav.d.history`.

### C14d — E2E
1. Visiter 3 fiches produit → /mes-scans affiche les 3, la plus récente d'abord.
2. Re-visiter la 1re → elle remonte en tête, pas de doublon.
3. « Tout effacer » → état vide + la section de /scan disparaît.
4. Vérifier que le tracking C12 fonctionne toujours (SQL : nouvelle ligne scans).
5. Dark mode + darija/RTL. Build OK.

---

## C15 — Journal repas sans compte + mesure d'usage IA

**But** : ressusciter l'analyse repas (0 sauvegarde à ce jour) en supprimant la
friction compte, et enfin MESURER son usage.

### C15a — lib `frontend/src/lib/meal-history.ts`
Même pattern que scan-history (clé `bayen_meal_history`, événement
`bayen-meal-change`, cap 60 entrées) :
```ts
export interface LocalMealEntry {
  id: string            // crypto.randomUUID()
  plat: string
  kcal_min: number | null
  kcal_max: number | null
  proteines_g: number | null
  lipides_g: number | null
  glucides_g: number | null
  confiance: string | null
  at: number
}
```
(Pas de photo stockée — trop lourd pour localStorage.)

### C15b — MealPhotoAnalyzer : sauvegarde locale
Dans `frontend/src/components/MealPhotoAnalyzer.tsx` :
- Lire le shape exact du résultat (`/api/meal-score` → parsed : plat, fourchette
  kcal, macros, confiance) AVANT de coder le mapping.
- Remplacer le bloc `{!loggedIn && <a href="/connexion">…}` (~ligne 404) par un
  bouton « Sauver sur cet appareil » → `addMealToHistory(...)` + état `saved`
  (réutiliser l'UI verte existante, lien vers `/compte/journal`).
- Utilisateur connecté : comportement serveur INCHANGÉ.

### C15c — Journal accessible sans compte
`frontend/src/components/MealJournal.tsx` fait un redirect `/connexion` si non
connecté (lire le fichier d'abord). Modifier :
- non connecté ET historique local non vide → afficher les entrées locales
  (mêmes cards que le journal serveur, sans photo) + totaux kcal du jour calculés
  client + bandeau discret « Crée un compte pour synchroniser entre appareils »
  (CTA /connexion) ;
- non connecté ET local vide → écran d'invitation actuel (mais SANS redirect
  automatique : laisser voir la page) ;
- `NutritionDashboard` et `WeeklyCoach` restent réservés aux connectés : dans
  `compte/journal.astro`, ne les monter que côté client connecté OU les laisser
  gérer leur propre état vide — vérifier leur comportement non connecté avant de
  choisir (le plus simple qui ne casse rien).

### C15d — mesure d'usage : brancher ai_logs
- Extension : nouveau `directus/extensions/bayen-api/src/log-ai.ts` →
  `POST /bayen-api/log-ai` public, body `{ type, success, duration_ms }`,
  validation stricte (`type` ∈ {meal_analyze, estimate, compare, coach},
  success bool, duration int borné), INSERT Knex dans `ai_logs`
  (colonnes type/success/duration_ms/date_created=now, le reste null).
  Rate-limit simple : ignorer silencieusement si body invalide. Enregistrer dans
  index.ts, build + déploiement (piège n°6 du plan précédent).
- `frontend/src/pages/api/meal-score.ts` (proxy SSR) : après la réponse tesseract,
  fire-and-forget `fetch(DIRECTUS/bayen-api/log-ai, {type:'meal_analyze',
  success, duration_ms})` — ne JAMAIS bloquer ni faire échouer la réponse.
- Requête de suivi à mettre dans le message de commit :
  `SELECT date_trunc('week',date_created) s, COUNT(*), COUNT(*) FILTER (WHERE success) FROM ai_logs WHERE type='meal_analyze' GROUP BY 1 ORDER BY 1 DESC;`

### C15e — E2E
1. Non connecté : analyser une photo de plat (image de test : en télécharger une
   depuis OFF ou utiliser une photo locale quelconque de nourriture — l'important
   est le flux, pas la justesse) → « Sauver sur cet appareil » → visible dans
   /compte/journal sans connexion, totaux du jour corrects.
2. `ai_logs` : une ligne type=meal_analyze après l'analyse (SQL).
3. Connecté : rien ne change (ne pas pouvoir tester le flux connecté sans
   identifiants → vérifier par lecture de code que la branche loggedIn est intacte,
   le dire dans le commit).
4. Dark + darija. Build OK.

---

## C16 — Variantes lisibles (PAS de fusion)

**But** : différencier les 5 « Nutella / Ferrero » par leur contenance. La fusion
est explicitement exclue (variantes EAN légitimes, barcode déjà unique en DB).

### C16a — affichage quantity dans les cards
`frontend/src/components/ProductCard.tsx` variant `grid` : sous la marque,
afficher `quantity` si présent — l'ajouter au shape lu par la card
(`product.quantity`), et l'ajouter aux `fields` des requêtes qui alimentent les
grilles : SearchPage (buildQueryParams fields ? — vérifier : la requête items
utilise fields implicites ? lire ; l'endpoint SQL search-products → ajouter
`quantity` au SELECT de `directus/extensions/bayen-api/src/search.ts` + redéployer),
categories/[slug].astro (`fields=*` → ok), ingredients/[id] + additifs/[id]
(listes de fields explicites → ajouter `products_id.quantity` / `quantity`).
Rendu : `.br` → « Ferrero · 750 g » (séparateur « · » seulement si les deux).

### C16b — compléter quantity des groupes ambigus
`scripts/name-products.py` : étendre le ciblage — en PLUS des sans-nom/sans-marque,
inclure les produits dont (name_fr, brand) normalisés appartiennent à un groupe
d'au moins 2 produits published ET `quantity` vide ET image présente
(calcul du groupe en Python après fetch global ; plafonner cette sous-cible à 20
par run pour ne pas rallonger le cron). Le PATCH quantity existe déjà dans le
script. Dry-run montré avant run réel (règle habituelle).

### C16c — E2E
1. Recherche « nutella » → les cards affichent des contenances différentes quand
   disponibles.
2. Dry-run C16b : vérifier que les cibles sont bien des groupes ambigus.
3. Build OK. Commit final : supprimer PLAN-C14-C16.md.

---

## Hors périmètre exécution (rappels)

- Actions Cloudflare qui n'attendent que l'utilisateur : redirect www,
  cdn.bayen.ma 521, webhook n8n partenaires (mémoire bayen-infra-actions-pendantes).
- QA prod différée : vérifier sur bayen.ma que le SW v3 a bien purgé (une visite +
  un rechargement, puis fiches produit récentes visibles).
- Idées en réserve (non planifiées) : mode hors-ligne, rappels ONSSA, cosmétiques.

## Ordre des commits

1. `feat(historique): C14 — historique de scans local + scans récents`
2. `feat(repas): C15 — journal repas sans compte + mesure d'usage ai_logs`
3. `feat(produits): C16 — contenances visibles sur les variantes` (+ suppression du plan)
