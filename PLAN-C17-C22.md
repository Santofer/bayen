# PLAN TECHNIQUE C17–C22 — Halal, contribution mobile, gamification, feedback repas, plats marocains, prix communautaire

> Plan rédigé avec Fable 5 (28/08/2026) — exécution prévue avec Opus 5.
> **Maquettes** : canvas Claude Design « Bayen Contribution » —
> https://claude.ai/code/artifact/ee0783b4-2969-429a-881a-2a5d8acc2fca
> (9 artboards : flux contribution 6 écrans + fiche produit halal/prix + feedback repas + profil points).

## État des lieux (vérifié dans le code le 28/08)

- `products.is_halal` **existe déjà** (boolean, non-null, mappé depuis OFF `labels_tags`,
  badge affiché fiche produit l.551-553 de `produit/[barcode].astro`) — mais jamais
  saisissable par l'utilisateur, sans notion de source.
- **Gamification déjà en place** dans `directus/extensions/bayen-hooks/src/index.ts` :
  `POINTS_MAP = { new_product: 50, add_image: 20, fix_data: 15, confirm: 10 }`,
  +1 pt/scan authentifié, rangs `nouveau 0 / contributeur 100 / expert 500 / vérifié 2000`,
  champs `points`, `contributions_count`, `rank` sur `directus_users`. UI :
  `AccountDashboard.tsx`, `Leaderboard.tsx`, `StreakWidget.tsx`, `/bayen-api/my-stats`.
- **Formulaire d'ajout existant** : `ContributeForm.tsx` (799 l.), wizard
  `barcode → photos → info → confirm`, photo nutrition obligatoire, 3 chemins de
  soumission (édition PATCH + contributions `fix_data` ; anonyme `POST /bayen-api/contribute`
  rate-limité sans photo ; connecté OCR `/api/ocr-score` puis `POST /items/products`).
- **Produit introuvable** : `produit/[barcode].astro` l.469-502 (bloc loupe + 2 CTA).
  `ScanPage.tsx` ne fait aucun appel API (redirige toujours vers `/produit/{barcode}`).
- **Analyse repas** : `MealPhotoAnalyzer.tsx` → `/api/meal-score` → `/meal-analyze`
  (app.py). Connecté → `meal_scans` (schéma réel = migrations `20260615` + `20260622`,
  PAS le snapshot d'avril) ; anonyme → localStorage `bayen_meal_history`. **Aucun feedback.**
- **Prix : rien** (aucune collection, aucun champ).
- Logo halal officiel recoloré : **`frontend/src/assets/halal-logo.svg`** (déjà dans le
  repo, fills `currentColor` + blanc, viewBox 919×909).
- i18n : clés plates `'ns.key'` dans `frontend/src/lib/translations.ts` (fr + ary
  obligatoires, `as const` → clé manquante casse le build).

## Pièges connus (hérités des chantiers C11-C16 — à respecter)

- Snapshot schéma AVANT toute modification : `npx directus schema snapshot ./directus/snapshots/$(date +%Y%m%d).yaml`.
- Migrations SQL dans `directus/migrations/*.sql`, appliquées via `docker exec` psql, puis
  déclarer champs/collections dans Directus (ou snapshot apply).
- `ai_logs.id` (et toute collection créée à la main) : UUID **sans default en base** →
  toujours fournir `randomUUID()` dans les INSERT Knex.
- Endpoints custom : tester via `https://api.bayen.ma/bayen-api/...` (404 sur localhost:8055).
- Extension : `cd directus/extensions/bayen-api && npm run build` → scp `dist/*.js` vers
  `/mnt/user/appdata/bayen/directus/extensions/bayen-api/dist/` → `docker restart bayen-directus`.
- app.py : scp → `docker cp ... bayen-tesseract:/app/app.py` → restart → health :5055.
  Prompts : ancrer les remplacements sur du texte UNIQUE (leçon de la corruption du 28/08).
- Classes Tailwind arbitraires non fiables → styles inline ou classes composants dans
  `globals.css`.
- Jamais de fusion de « doublons » produits : les EAN distincts sont des variantes légitimes.
- Scripts batch : dry-run `APPLY=0` d'abord, idempotents, `ONLY_BARCODE` pour cibler.

---

## C17 — Statut halal sourcé (badge officiel + saisie + filtre)

### Schéma (migration `20260828-halal-source.sql`)
```sql
ALTER TABLE products ADD COLUMN halal_source varchar(20) NULL; -- 'off' | 'packaging_user' | 'vision'
ALTER TABLE products ADD COLUMN halal_confirmations integer NOT NULL DEFAULT 0;
```
Backfill : `UPDATE products SET halal_source = 'off' WHERE is_halal = true;`

### Backend
1. `scan.ts` (import OFF) : quand `labels_tags` contient halal → `halal_source: 'off'`.
2. Nouvel endpoint `POST /bayen-api/confirm-halal` dans `bayen-api` :
   body `{barcode, present: boolean}` ; anonyme autorisé, rate-limit 30/h/IP (pattern
   `log-ai.ts`). `present=true` → `halal_confirmations + 1` et si `is_halal=false` →
   `is_halal=true, halal_source='packaging_user'`. `present=false` → décrémenter (min 0) ;
   si confirmations retombe à 0 ET source `vision` → repasser `is_halal=false`
   (ne JAMAIS rétrograder une source `off` ou `packaging_user` automatiquement).
   Si user connecté (header Authorization) → créer `contributions` type `confirm` approved
   (les hooks créditent +10).
3. Vision (app.py `/identify-product`) : ajouter au prompt IDENTIFY la détection du logo :
   champ `halal_logo: true|false|null` (null = pas sûr). `scripts/name-products.py` :
   si `halal_logo === true` et `is_halal=false` → PATCH `{is_halal: true, halal_source: 'vision'}`.
   Ne jamais mettre à false depuis la vision.

### Frontend
1. Composant `HalalBadge.tsx` : logo `frontend/src/assets/halal-logo.svg` importé en
   `?raw` (inline SVG, hérite `currentColor` = `text-primary`), pill « Halal » + ligne
   source sous le héros : « Logo visible sur l'emballage — confirmé par N personnes »
   (sources : off → « Signalé halal par Open Food Facts », packaging_user → « Logo vu sur
   l'emballage », vision → « Logo détecté sur la photo ») + bouton « Confirmer » (appelle
   confirm-halal, garde anti-double-clic sessionStorage). Remplace le badge statique
   l.551-553. Maquette : artboard « Fiche · Halal + Prix ».
2. Filtre recherche : chip « Halal » dans `SearchPage.tsx` → `search-products` (endpoint
   SQL `search.ts`) : ajouter `filter halal=1` → `AND is_halal = true`.
3. Saisie wizard : voir C19 étape 2 (toggle « Logo halal sur l'emballage ? Oui / Non vu »).
4. i18n : clés `halal.*` (badge, sources, confirmer, filtre) fr + ary.

---

## C19 — Flux contribution produit inconnu, mobile-first (refonte)

Maquettes : artboards 1→6 du canvas. Principes : **gros boutons (≥44 px), une décision
par écran, IA préremplit, l'utilisateur valide**. La face avant devient LA photo
obligatoire (identification IA) ; nutrition et ingrédients optionnelles mais récompensées.

### Écran d'entrée (artboard 1)
`produit/[barcode].astro` l.469-502 : remplacer le bloc « non trouvé » par le design
maquette : icône scan barré, « Produit inconnu au bataillon », code-barres en évidence,
encart « +50 points si tu l'ajoutes », CTA plein `Ajouter ce produit` →
`/contribuer/{barcode}`, CTA secondaire `Rescanner`. (SSR pur, pas de JS.)

### Wizard (refonte `ContributeForm.tsx` — garder le fichier, refondre le rendu)
- **Étape 1 — Photos** (artboard 2) : 3 tuiles (face obligatoire, ingrédients, nutrition),
  état pris/à prendre, capture `input capture="environment"`. Dès la photo face prise →
  appel identification (voir proxy ci-dessous) → spinner discret « l'IA identifie… ».
- **Étape 2 — Le produit** (artboard 3) : nom / marque / contenance préremplis
  (bandeau « Prérempli par l'IA — vérifie et corrige »), contenance et catégorie en chips,
  toggle halal (C17). Si identification `confiance: faible` → champs vides, pas de bandeau.
- **Étape 3 — Nutrition** (artboard 4) : si photo nutrition prise → OCR via
  `/api/ocr-score` (existant) → grille 8 valeurs éditables ; champs incohérents surlignés
  « À vérifier » (règle : kcal ≈ 9×lipides + 4×(glucides+protéines) à ±25 %, bornes
  g ≤ 100, kcal ≤ 950 — leçon Pipas). Bouton « Le tableau n'est pas sur l'emballage »
  (skippe proprement). Étape skippable (« Passer »).
- **Étape 4 — Prix** (artboard 5) : optionnel, voir C22. Saisie prix + chips magasins
  (Marjane, Carrefour, BIM, Aswak Assalam, Épicerie du coin, Autre…) + ville (défaut :
  dernière ville utilisée, localStorage `bayen_city`).
- **Récompense** (artboard 6) : détail des points gagnés + barre de progression rang
  (connecté : données réelles `/bayen-api/my-stats` ; anonyme : total des points « perdus »
  + CTA « Crée un compte pour garder tes points » — pas d'attribution rétroactive, hors scope).

### Backend
1. **Proxy identification** : `frontend/src/pages/api/identify-product.ts` (pattern
   `meal-score.ts`) → `POST {OCR_PIPELINE_URL}/identify-product` multipart, timeout 60 s,
   log-ai fire-and-forget type `identify`.
2. **Contribution anonyme avec photos** : étendre `POST /bayen-api/contribute`
   (`contribute.ts`) en multipart (busboy/multer déjà dispo ? sinon `express.raw` +
   parsing — vérifier ce que l'extension utilise pour les uploads existants) : accepter
   jusqu'à 3 images (≤ 8 MB chacune), créer les `directus_files` via ItemsService
   accountability admin, produit `status: 'draft'` + `data_source: 'user_anonymous'`,
   rate-limit existant conservé. Réponse `{ok, barcode}`.
   Alternative si multipart trop lourd dans l'extension : petit endpoint upload dédié
   `POST /bayen-api/upload-photo` (1 fichier, renvoie file id, rate-limit 10/h/IP), le
   front envoie ensuite le JSON à `/contribute` avec les file ids. **Choisir la plus simple.**
3. Chemin connecté : conserver l'existant (POST /items/products), y ajouter les nouveaux
   champs (halal, quantity — quantity existe déjà).

### i18n
Nouvelles clés `contribute.*` (une vingtaine). RTL : le wizard doit fonctionner en `ary`
(flex + `inset-inline`, pas de left/right codés en dur).

---

## C20 — Gamification étendue (à la Waze)

### Hooks (`bayen-hooks/src/index.ts`)
1. `POINTS_MAP` : ajouter `add_price: 5`, `fix_meal: 10`.
2. Nouveau `action('prices.items.create')` : si `user_id` non nul → +5 pts + recalcul rang.
3. Nouveau `action('meal_feedback.items.create')` : si `user_id` non nul ET
   `correction` non vide → +10 pts (un simple thumbs ne crédite pas — anti-farm).
4. Anti-farm prix : max 10 prix crédités / user / jour (compter les prices du jour
   dans le hook avant de créditer).

### Frontend
1. **Page « Mes contributions »** (artboard « Profil · Points ») : section dans
   `AccountDashboard.tsx` ou page `/compte/points` : carte rang (existant, restylée),
   grille « Comment gagner des points » (6 tuiles, barèmes réels), activité récente
   (GET `/bayen-api/my-stats` étendu : dernières `contributions` + `prices` +
   `meal_feedback` du user, 10 entrées, type + points + date).
2. **Incitation partout** : pills « +N pts » dans le wizard (déjà dans les maquettes),
   sur le bouton confirmer halal, sur « J'ai payé un autre prix ». Composant utilitaire
   `PointsPill.tsx` (petit, réutilisable).
3. Anonymes : afficher les pills quand même (incitation à créer un compte) ; après une
   contribution anonyme, l'écran récompense liste les points NON crédités + CTA compte.

---

## C21 — Feedback estimation repas + référentiel plats marocains

### Collections (migration `20260828-meal-feedback.sql`)
```sql
CREATE TABLE meal_feedback (
  id uuid PRIMARY KEY,                      -- fourni par le code (randomUUID)
  meal_scan_id uuid NULL REFERENCES meal_scans(id) ON DELETE SET NULL,
  user_id uuid NULL,
  session_id varchar(64) NULL,
  plat_detecte varchar(255),
  rating varchar(8) NOT NULL,               -- 'up' | 'down'
  correction jsonb NULL,                    -- {plat?, portion_g?, calories_kcal?}
  confiance_ia varchar(10) NULL,
  date_created timestamptz DEFAULT now()
);
CREATE TABLE moroccan_dishes (
  id serial PRIMARY KEY,
  name_fr varchar(120) NOT NULL,
  name_ar varchar(120) NULL,
  aliases jsonb NULL,                       -- ["tajine poulet", "tagine de poulet", ...]
  portion_typique_g integer,
  kcal_min integer, kcal_max integer,       -- PAR PORTION typique
  proteines_g numeric, glucides_g numeric, lipides_g numeric,
  verdict_typique varchar(20),              -- sain|equilibre|a_limiter|occasionnel
  notes text NULL,
  status varchar(12) DEFAULT 'published'
);
```
Déclarer les 2 collections dans Directus (lecture publique pour `moroccan_dishes`,
`meal_feedback` en écriture endpoint uniquement).

### Seed `moroccan_dishes` (`scripts/seed-moroccan-dishes.py`, idempotent, upsert par name_fr)
~40 plats, valeurs d'ordre de grandeur CIQUAL/USDA (fourchettes larges, jamais de faux
précis) : tajine poulet olives, tajine kefta œufs, tajine légumes, tajine agneau pruneaux,
couscous 7 légumes, couscous tfaya, harira, bissara, loubia, adas, rfissa, seffa medfouna,
pastilla poulet, tanjia, mrouzia, briouates (viande/fromage), msemen, baghrir, harcha,
batbout, sellou, chebakia, zaalouk, taktouka, salade marocaine, kalinté, maakouda,
brochettes, kefta grillée, sardines grillées/farcies, poisson chermoula, tride,
chorba, thé à la menthe sucré, café au lait, jus d'avocat, raib, petit-déj msemen+miel,
sandwich maakouda. Colonnes complètes pour chacun.

### Boucle IA (app.py `/meal-analyze`)
1. Au démarrage + cache TTL 1 h : charger `moroccan_dishes` depuis Directus
   (réseau interne `http://bayen-directus:8055`, token env `DTOKEN` déjà monté ? sinon
   lecture publique sans token — la collection est publique).
2. **Prompt** : injecter dans MEAL_SYSTEM la liste des `name_fr` (noms seuls, compact)
   avec la consigne « si le plat correspond à un de ces plats marocains, utilise
   EXACTEMENT ce nom dans `plat` ». (Ancrer l'édition du prompt sur un marqueur unique !)
3. **Post-match** : après la réponse IA, matcher `analysis.plat` contre name_fr + aliases
   (normalisation minuscules/accents, match par tokens). Si match → recaler
   `calories_kcal.{min,max}` et macros au prorata `portion_estimee_g / portion_typique_g`
   (bornes ±60 % pour ne pas écraser une portion réellement atypique), ajouter
   `reference: {dish_id, name_fr}` à la réponse.
4. Front (`MealPhotoAnalyzer.tsx`) : si `reference` présent → ligne « Calé sur la fiche
   “X” du référentiel marocain Bayen » (maquette artboard « Repas · Feedback »).

### Feedback UI + endpoint
1. `POST /bayen-api/meal-feedback` : anonyme, rate-limit 30/h/IP, INSERT Knex avec
   `randomUUID()`, répond 204 toujours (pattern `log-ai.ts`). Si Authorization valide →
   remplir `user_id` (les hooks créditent si correction).
2. `MealPhotoAnalyzer.tsx` : après le résultat, bloc « Cette estimation te semble juste ? »
   (thumbs up/down, gros boutons). Thumbs down → bottom sheet correction : plat (texte),
   portion (g), calories (kcal) — tout optionnel. Envoi fire-and-forget + état « Merci ! ».
   1 feedback par analyse (état local).
3. **Exploitation des corrections** (honnêteté : pas de réentraînement du modèle) :
   script cron hebdo `scripts/refine-dishes.py` (dimanche 09:00) : pour chaque plat avec
   ≥ 5 corrections de calories, si la médiane des corrections sort de [kcal_min, kcal_max]
   → log + dry-run d'ajustement de la fourchette (APPLY=0 par défaut, revue manuelle).
   Les thumbs alimentent un taux de fiabilité par confiance_ia dans `nutrition-summary`.

### Alimentation de la base par les repas uploadés
Les photos des utilisateurs CONNECTÉS sont déjà stockées (`meal_scans.image`).
Ne rien stocker de plus pour les anonymes (ni photo ni analyse — RGPD/poids). Le signal
anonyme passe par `meal_feedback` (texte seul). Le préciser dans la fiche produit ? Non —
hors scope.

---

## C22 — Prix communautaire

### Collection (migration `20260828-prices.sql`)
```sql
CREATE TABLE prices (
  id uuid PRIMARY KEY,                      -- randomUUID côté code
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  price_mad numeric(8,2) NOT NULL CHECK (price_mad BETWEEN 0.5 AND 10000),
  store varchar(60) NOT NULL,
  city varchar(60) NULL,
  user_id uuid NULL,
  session_id varchar(64) NULL,
  status varchar(12) NOT NULL DEFAULT 'published',
  date_created timestamptz DEFAULT now()
);
CREATE INDEX prices_product_date ON prices (product_id, date_created DESC);
```

### Backend (`bayen-api/src/prices.ts`, nouveau fichier + register dans index)
1. `POST /bayen-api/price` : body `{barcode, price_mad, store, city?}` ; anonyme autorisé,
   rate-limit 20/h/IP + 1 prix / produit / session / jour (session_id) ; normaliser le
   store (trim, capitalisation, mapping des 5 enseignes connues) ; INSERT randomUUID.
2. `GET /bayen-api/prices/:barcode` : agrégat 6 derniers mois, `status='published'` :
   `{count, min, max, by_store: [{store, median, count, last}], updated}` (médiane SQL
   `percentile_cont(0.5)`). Cache HTTP 5 min (`Cache-Control`).
3. Modération : rien d'automatique au-delà des bornes/rate-limit ; la médiane par magasin
   absorbe les valeurs farfelues. `status='flagged'` réservé à un usage admin futur.

### Frontend
1. Composant `PriceSection.tsx` (artboard « Fiche · Halal + Prix ») : fourchette globale,
   barres par magasin (médiane), footer fraîcheur/ville, CTA « J'ai payé un autre prix
   (+5 pts) » → bottom sheet (prix + chips magasin + ville). Chargé client-side
   (`client:visible`) via le GET agrégé. Si `count === 0` → carte compacte « Aucun prix
   partagé — sois le premier (+5 pts) ».
   Insertion dans `produit/[barcode].astro` : **entre la grille nutrition (l.687) et les
   photos (l.689)**.
2. Wizard étape 4 (C19) : même bottom sheet en pleine page ; le POST part avec la création
   du produit (après succès de la fiche, avec le barcode).
3. i18n `price.*`.

---

## Ordre d'exécution recommandé (Opus 5)

1. **Migrations + collections** (C17, C21, C22 en un lot) : snapshot AVANT, SQL, déclaration
   Directus, snapshot APRÈS. Vérifier `curl /items/moroccan_dishes` public.
2. **C22 backend** (prices.ts, POST + GET, tests curl) puis **C17 backend**
   (confirm-halal, scan.ts halal_source) — même build/deploy d'extension.
3. **C21 IA** : seed moroccan_dishes (dry-run puis APPLY), app.py (cache + prompt + post-match,
   ancres uniques, vérif `python3 -c "import app"` avant deploy), meal-feedback endpoint.
4. **C20 hooks** (POINTS_MAP + 2 actions + anti-farm) — build/deploy bayen-hooks.
5. **Frontend en 3 vagues** : (a) fiche produit : HalalBadge + PriceSection + bloc
   « introuvable » ; (b) wizard contribution complet + proxy identify ; (c) feedback repas
   + page points. Build + vérif locale à chaque vague, deploy = push (Cloudflare Pages).
6. **Tests bout-en-bout** : produit inconnu → wizard complet anonyme puis connecté (points
   crédités), prix visible sur fiche, confirm halal, meal-analyze avec plat du référentiel
   (« tajine de poulet » → reference présent), feedback + correction en base.
7. Commit par chantier (`feat(halal): …`, `feat(contrib): …`, etc.), supprimer ce PLAN au
   commit final.

## Hors scope explicite

- Attribution rétroactive des points anonymes à la création de compte.
- Réentraînement/fine-tuning du modèle IA (les corrections recalent le référentiel, pas le modèle).
- Historique de prix temporel (graphes) — v2 possible.
- C18 « Interpeller la marque » — non validé, à planifier séparément.
