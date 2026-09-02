# PLAN TECHNIQUE C23 — Univers Beauté : cosmétiques, INCI et perturbateurs endocriniens

> Plan rédigé avec Fable 5.1 (01/09/2026) — exécution prévue avec Opus 5.
> Décision validée : **un seul site bayen.ma, deux univers** (alimentaire / beauté), le
> code-barres décide. Même scanner, mêmes comptes, mêmes points, même wizard.

## Pourquoi ce plan est structuré ainsi (vérifié le 01/09)

- **Open Beauty Facts** (OBF) : même API que OFF (`world.openbeautyfacts.org/api/v2/product/{code}`,
  mêmes champs : `product_name`, `brands`, `quantity`, `categories_tags`, `ingredients_text`,
  `ingredients[]` (id, percent_estimate), `labels_tags`, `periods_after_opening`,
  `image_front_url`, `image_ingredients_url`). 74 478 produits au total, **5 641 tagués Maroc,
  dont seulement 755 avec liste INCI complétée** et 4 493 avec photo de face.
- **Qualité OBF médiocre** : exemple réel `6111259378377` — nom « Finny SOFT », marque
  « Crème hydratante » (inversés), et le texte marketing parsé comme liste INCI
  (« Creme hydratante et rafraîchissante… » = ingrédient n°1 à 52 %). Conséquence :
  **le parsing INCI d'OBF n'est jamais réutilisé tel quel** ; on ne prend que le texte brut
  et on re-parse avec notre normaliseur + la vision Qwen quand une photo existe.
- **CosIng (base européenne des ingrédients)** : exports CSV hébergés par OBF sur GitHub,
  téléchargeables sans authentification :
  `https://raw.githubusercontent.com/openfoodfacts/openbeautyfacts/develop/cosing/`
  `COSING_Ingredients-Fragrance.Inventory_v2.csv` (4,8 Mo, ~30 000 INCI),
  `COSING_Annex.II_v2.csv` (interdits, 651 Ko), `COSING_Annex.III_v2.csv` (restreints),
  `COSING_Annex.IV_v2.csv` (colorants), `COSING_Annex.V_v2.csv` (conservateurs),
  `COSING_Annex.VI_v2.csv` (filtres UV). Colonnes Annex II : `Reference Number,
  Chemical name / INN, CAS Number, EC Number, Regulation, Regulated By, …, Identified
  INGREDIENTS or substances e.g., CMR, Update date`.
- **Perturbateurs endocriniens (PE)** : liste prioritaire de la Commission européenne
  (2019) — 28 substances, dont 14 « haute priorité » : Benzophenone-3, Kojic acid,
  4-Methylbenzylidene Camphor, Propylparaben, Triclosan, Resorcinol, Octocrylene,
  Triclocarban, BHT, Benzophenone, Homosalate, Benzyl Salicylate, Genistein, Daidzein.
  Avis SCCS : Homosalate limité à 0,5 % (2021). Ces listes sont **les seules sources
  admises** pour la mention « perturbateur endocrinien » (voir « Garde-fous »).
- **Angle marocain** : hydroquinone, mercure et corticoïdes sont interdits dans les
  produits éclaircissants mais restent répandus (crèmes de dépigmentation, détatouage à
  l'hydroquinone). C'est la raison d'exister immédiate de l'univers beauté au Maroc.

## Décisions d'architecture

1. **Un champ `product_type` ('food' | 'cosmetic') sur `products`**, pas une seconde
   collection : scanner, prix, halal, contributions, points, photos restent communs.
   Le halal est pertinent en cosmétique (alcool, dérivés porcins/animaux).
2. **Un référentiel dédié `cosmetic_ingredients`** (INCI + classes de risque + sources) et
   une jonction `products_cosmetic_ingredients` (rang, présence). Jamais mélangé avec
   `ingredients` (alimentaire).
3. **Un algorithme de score séparé et déterministe** (`scoring-cosmetic.ts`, dupliqué
   front/back comme `scoring.ts`), écrit dans les mêmes colonnes `scan_score` /
   `score_label` pour que cartes, classement et listes restent uniformes. L'IA ne calcule
   jamais le score (règle CLAUDE.md).
4. **Le scan décide de l'univers** : DB → OFF → OBF → introuvable. Trouvé sur OBF ⇒
   `product_type = 'cosmetic'`. Wizard de contribution : l'identification vision renvoie
   `kind` ('food' | 'cosmetic') et le wizard bascule ses étapes.
5. **Une teinte d'accent « beauté »** dans la charte pour que l'utilisateur sache toujours
   où il est : token `--color-beauty` (clair `hsl(190 45% 32%)`, sombre `hsl(185 55% 60%)`),
   teal distinct de tous les verts, de l'or IA (42°), de l'orange « médiocre » (25°) et du
   rouge (0°). Utilisé pour : badge d'univers, en-tête de la section INCI, chips de
   catégorie beauté. Les couleurs de risque restent celles des scores (score-*).

## Pièges connus (hérités, à respecter)

- Snapshot schéma avant/après (`pg_dump --schema-only`), migrations SQL dans
  `directus/migrations/`, redémarrer Directus après tout ajout de champ (cache de schéma).
- Clé auto-incrémentée : **jamais `special: 'uuid'`** sur un `id` SERIAL (erreur vécue).
- INSERT Knex = aucun hook → crédit de points via `points.ts` explicitement.
- Tester les endpoints via `https://api.bayen.ma` **avec `Origin: https://bayen.ma`**.
- Prompts app.py : ancrer les éditions sur du texte UNIQUE ; `python3 -c "import app"`
  avant déploiement.
- Îlots Astro en `display:contents` : espacement déjà géré par la règle globale.
- Classes Tailwind arbitraires non fiables → tokens `@theme` + classes standard.
- Fiches fantômes : une contribution sur une fiche existante COMPLÈTE les trous (déjà en
  place pour l'alimentaire, à conserver pour les cosmétiques).

---

## Étape 1 — Schéma (`20260901-cosmetics.sql`)

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type VARCHAR(12) NOT NULL DEFAULT 'food';
ALTER TABLE products ADD COLUMN IF NOT EXISTS inci_text TEXT;               -- liste brute normalisée
ALTER TABLE products ADD COLUMN IF NOT EXISTS period_after_opening VARCHAR(8); -- '12M'
ALTER TABLE products ADD COLUMN IF NOT EXISTS cosmetic_category VARCHAR(40); -- voir taxonomie
ALTER TABLE products ADD COLUMN IF NOT EXISTS cosmetic_risk JSONB;           -- résumé calculé
CREATE INDEX IF NOT EXISTS products_type_idx ON products (product_type, status);

CREATE TABLE IF NOT EXISTS cosmetic_ingredients (
  id             SERIAL PRIMARY KEY,                -- special NULL (pas uuid !)
  inci_name      VARCHAR(200) NOT NULL UNIQUE,      -- majuscules, sans parenthèses
  name_fr        VARCHAR(200),
  synonyms       JSONB,                             -- ["BHT", "BUTYLATED HYDROXYTOLUENE"]
  cas_number     VARCHAR(40),
  functions      JSONB,                             -- ["preservative","antioxidant"] (CosIng)
  risk_level     VARCHAR(10) NOT NULL DEFAULT 'unknown', -- none|low|moderate|high|banned|unknown
  risk_types     JSONB,                             -- ["endocrine","allergen","irritant","cmr","environment","restricted"]
  risk_status    VARCHAR(12),                       -- 'confirmed' | 'suspected' | null
  restriction_fr TEXT,                              -- ex. « max 0,5 % (SCCS 2021) »
  source_label   VARCHAR(120),                      -- « CosIng Annexe II », « CE liste PE 2019 »
  source_url     TEXT,
  note_fr        TEXT,
  status         VARCHAR(12) NOT NULL DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS products_cosmetic_ingredients (
  id           SERIAL PRIMARY KEY,
  products_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES cosmetic_ingredients(id) ON DELETE CASCADE,
  rank         INTEGER,
  raw_text     VARCHAR(200)                          -- tel qu'écrit sur l'emballage
);
CREATE INDEX IF NOT EXISTS pci_product_idx ON products_cosmetic_ingredients (products_id);
```

Déclarations Directus (collections + fields + dropdowns `risk_level` colorés + lecture
publique de `cosmetic_ingredients`). Permission `products.update` Utilisateur : ajouter
`inci_text, period_after_opening, cosmetic_category` à la liste blanche.

**Taxonomie `cosmetic_category`** (12, comme les 12 rayons alimentaires) : `visage`,
`corps`, `cheveux`, `hygiene` (douche, savon, déodorant), `dents`, `maquillage`, `parfum`,
`solaire`, `bebe`, `homme` (rasage), `eclaircissant` (catégorie volontairement explicite,
c'est l'angle marocain), `ongles`. Mapping depuis `categories_tags` OBF par regex, comme
`OFF_CATEGORY_RULES` dans scan.ts.

## Étape 2 — Référentiel `cosmetic_ingredients` (`scripts/seed-cosmetic-ingredients.py`)

Trois couches, dans cet ordre, idempotent (upsert par `inci_name`), dry-run `APPLY=0` :

1. **Inventaire CosIng** (CSV 4,8 Mo) → ~30 000 lignes : `inci_name`, `cas_number`,
   `functions`, `risk_level = 'none'` par défaut. Filtrer les lignes sans nom INCI.
2. **Annexes CosIng** :
   - Annexe II (interdits) → `risk_level = 'banned'`, `risk_types += ['cmr' si colonne CMR]`,
     `source_label = 'CosIng Annexe II (Règl. CE 1223/2009)'`. Matching par CAS puis par
     « Identified INGREDIENTS ».
   - Annexe III (restreints) → `risk_level >= 'moderate'`, `restriction_fr` = condition
     (concentration max, usage), et les **26 allergènes parfumants** à déclaration
     obligatoire → `risk_types += ['allergen']`, `risk_level = 'low'`.
   - Annexes IV/V/VI → `functions` (colorant, conservateur, filtre UV) seulement.
3. **Couche éditoriale `data/cosmetic-risks.json`** (≈ 200-300 entrées, committée dans le
   repo, relue humainement) qui SURCHARGE le niveau et pose `risk_status` + `source_url` :
   - **PE haute priorité CE 2019** (14 substances listées plus haut) → `high`,
     `risk_types ['endocrine']`, `risk_status 'suspected'` (ou `'confirmed'` quand un avis
     SCCS le dit), `source_url` = page CE de la liste prioritaire.
   - **PE priorité B** (les 14 autres de la liste de 28) → `moderate`, `'suspected'`.
   - **Parabènes longs** (propyl, butyl, isobutyl, isopropyl) → `high` ; méthyl/éthyl → `low`.
   - **Libérateurs de formaldéhyde** (DMDM Hydantoin, Imidazolidinyl urea, Diazolidinyl
     urea, Quaternium-15, Bronopol) → `high`, `['cmr','allergen']`.
   - **Isothiazolinones** (MIT, MCI) → `high` (allergène majeur, restreint rincés).
   - **Silicones cycliques** D4/D5/D6 → `moderate`, `['environment','endocrine']`.
   - **Filtres UV** : Benzophenone-3, Homosalate (max 0,5 %), Octocrylene, 4-MBC → `high`.
   - **Phénoxyéthanol** → `moderate` (max 1 %, interdit dans les lingettes bébé en France).
   - **Sulfates** SLS/SLES, **PEG**, **huiles minérales** (Paraffinum liquidum,
     Petrolatum) → `low`, `['irritant']` / `['environment']` — pas alarmistes.
   - **Angle Maroc** : Hydroquinone → `banned`, Mercure et ses sels → `banned`,
     **Clobetasol / Betamethasone / Fluocinolone** (corticoïdes, hors cosmétique) →
     `banned` avec note « médicament détourné », Kojic acid → `high` (PE suspecté),
     Arbutin → `moderate`. Note explicative en français pour chacun.
   Chaque entrée : `inci_name, synonyms, risk_level, risk_types, risk_status,
   restriction_fr, source_label, source_url, note_fr`. **Pas d'entrée sans source_url.**

## Étape 3 — Normalisation INCI et scoring

### `lib/inci.ts` (front + `bayen-api/src/inci.ts`)
- `parseInci(text)` : coupe sur virgules/points-virgules/retours, retire les préfixes
  « Ingredients / Ingrédients / INCI / المكونات », les « * » et « ± », les concentrations
  entre parenthèses, les mentions de langue (« AQUA/WATER » → garde `AQUA`, alias `WATER`),
  majuscules, trim. Ignore les tokens > 60 caractères ou contenant un verbe (heuristique
  anti-marketing : « hydrate », « pénètre », « formulée »…) — c'est précisément le piège
  OBF observé.
- `matchInci(tokens, referentiel)` : exact sur `inci_name`, puis `synonyms`, puis
  préfixe (« PARFUM (FRAGRANCE) »), sinon `unknown` (créé dans le référentiel en
  `risk_level 'unknown'`, `status 'draft'` pour revue).

### `scoring-cosmetic.ts` — déterministe, plafonné par le pire ingrédient
```
Entrée : liste d'ingrédients matchés {risk_level, risk_types, rank}, catégorie, rincé ou non.
1. Plafond selon le pire niveau présent :
   banned  → score max 5   (label « mauvais », bandeau rouge « ingrédient interdit »)
   high    → score max 25  (« mauvais »)
   moderate→ score max 50  (« médiocre »)
   low     → score max 75  (« bon »)
   aucun   → 100
2. Malus cumulatif dans le plafond : −8 par ingrédient high supplémentaire, −4 par
   moderate supplémentaire, −2 par low (allergène/irritant), plancher 0.
3. Pondération par position : un ingrédient dans les 5 premiers (donc concentré) compte
   plein ; au-delà du 10e, malus ÷ 2. Le plafond, lui, ne bouge jamais (un PE reste un PE).
4. Produits rincés (shampooing, gel douche) : malus « irritant » ÷ 2 (exposition brève),
   les PE ne sont pas atténués.
5. Inconnus : n'entrent pas dans le score, mais `incomplete = true` si > 20 % des
   ingrédients sont inconnus ou si la liste est vide → badge « Score incomplet ».
Sortie : { total, label, cap_reason (ingrédient plafonnant), worst: [...], counts par niveau,
           incomplete, unscored }
```
Labels : mêmes seuils/couleurs que l'alimentaire (excellent ≥ 80, bon ≥ 60, médiocre ≥ 40,
mauvais < 40) pour que classement et cartes restent cohérents.

## Étape 4 — Backend (`bayen-api`)

1. **scan.ts** : après l'échec OFF, appeler OBF (`OBF_API_URL`, même User-Agent). Nouveau
   `mapObfProduct()` : `product_type 'cosmetic'`, `inci_text` = `ingredients_text` brut,
   `period_after_opening`, `cosmetic_category` par regex, `is_halal` via labels, images
   (front + ingredients). Puis `parseInci` → jonction → `computeCosmeticScore` →
   `scan_score/score_label/cosmetic_risk`. `data_source 'obf'`.
2. **`GET /bayen-api/cosmetic-ingredients?q=`** : recherche publique dans le référentiel
   (page /ingredients-cosmetiques, autocomplétion du wizard).
3. **contribute.ts** : accepter `product_type`, `inci_text`, `cosmetic_category`,
   `period_after_opening` ; si cosmétique → parse + jonction + score cosmétique. La branche
   auto-réparation complète aussi ces champs.
4. **search.ts** : paramètre `type` (`food` | `cosmetic`, défaut `food` pour ne rien casser)
   + `cosmetic_category` + `risk_free=true` (aucun ingrédient ≥ moderate) + `no_endocrine=true`.
5. **Recalcul** : script `scripts/rescore-cosmetics.py` (ONLY_BARCODE, dry-run) après
   toute mise à jour du référentiel — le score dépend du référentiel, pas seulement de
   la fiche.

## Étape 5 — Vision (app.py)

1. **`/identify-product`** : ajouter `"kind":"food|cosmetic"` au schéma JSON + règle
   (« cosmetic si crème, shampooing, savon, parfum, maquillage, dentifrice, déodorant… »).
2. **`/inci-read`** (nouveau) : photo → liste INCI **telle qu'imprimée** (JSON
   `{"inci":[...], "period_after_opening":"12M|null", "confiance"}`), consigne : ne jamais
   reformuler ni traduire les noms INCI, ignorer les phrases marketing, lire FR/AR/EN.
   Image ≤ 768 px, `enable_thinking:false`, ancre unique pour le prompt.
3. **Proxy** `frontend/src/pages/api/inci-read.ts` (pattern `identify-product.ts`),
   log-ai type `inci`.
4. **Cron** `scripts/read-inci-images.py` (nightly 08:30, wrapper .sh + `/boot/config/go`) :
   cosmétiques avec `image_ingredients` et `inci_text` null → `/inci-read` → parse →
   jonction → score. Marqueur `inci_read_at` (idempotence).

## Étape 6 — Frontend

1. **Tokens** `--color-beauty` / `--color-beauty-foreground` (clair + `.dark`).
2. **Fiche produit** `produit/[barcode].astro` : si `product_type === 'cosmetic'` →
   - héros : badge d'univers « Beauté » (teal), catégorie beauté, PAO « 12M » avec icône pot ;
   - **pas** de Nutri-Score/NOVA/nutrition : à la place `CosmeticScore.tsx` (anneau +
     « ce qui plafonne le score » : le pire ingrédient, son niveau, sa source cliquable) ;
   - `InciList.tsx` : chaque ingrédient avec chip de niveau (couleurs score-*), types de
     risque (PE, allergène, irritant, CMR, environnement), « suspecté / avéré », et le
     lien source ; inconnus en gris « non évalué » ;
   - alternatives : même `cosmetic_category`, mieux notées, sans ingrédient ≥ moderate ;
   - halal, prix, contribution, confirmer/signaler : inchangés.
3. **Wizard** : étape « Le produit » gagne un sélecteur d'univers (pré-rempli par
   `kind`) ; en cosmétique, l'étape « Nutrition » devient « Ingrédients (INCI) » : photo →
   `/inci-read` → liste éditable en chips, PAO, catégorie beauté. Le récap de points ne
   change pas.
4. **Recherche** : onglet d'univers en tête (Alimentation | Beauté), filtres beauté :
   catégorie, « Sans perturbateur endocrinien suspecté », « Sans allergène déclaré ».
5. **Pages** : `/beaute` (landing de l'univers : promesse, catégories, top produits sûrs,
   article), `/ingredients-cosmetiques` et `/ingredients-cosmetiques/[inci]` (fiche
   ingrédient : niveau, pourquoi, sources, produits qui en contiennent — fort potentiel
   SEO/AEO, comme `/additifs`).
6. **Profil santé** : préférences « Éviter les PE suspectés », « Peau sensible (allergènes) »
   → `ProfileAlert` sur les fiches cosmétiques.
7. **i18n** : namespaces `beauty.*`, `inci.*` (fr + ary).
8. **Navigation** : entrée « Beauté » dans le mega-menu Explorer et lien dans la bottom
   nav ? Non — la bottom nav reste à 5 entrées ; l'univers est atteint par le scan, la
   recherche et `/beaute`.

## Étape 7 — Amorçage des données

1. Seed du référentiel (étape 2) → vérifier ~30 000 lignes, ~250 surchargées avec source.
2. `scripts/import-obf-morocco.py` : importer les produits OBF tagués Maroc **ayant une
   photo de face ET un `ingredients_text` non vide** (≈ 700), jamais les coquilles vides
   (leçon des fiches fantômes). Dry-run, `MAX_PRODUCTS`, idempotent par code-barres.
3. Lancer `read-inci-images` sur ces fiches quand la photo d'ingrédients existe (la vision
   fait mieux que le parsing OBF).
4. Tests bout-en-bout : scanner un shampooing (trouvé OBF → fiche beauté scorée), un produit
   éclaircissant à l'hydroquinone (score plafonné à 5, bandeau « ingrédient interdit »),
   une contribution cosmétique complète via le wizard, le filtre « sans PE » dans la
   recherche, la fiche ingrédient `/ingredients-cosmetiques/propylparaben`.

## Garde-fous éditoriaux et juridiques (non négociables)

- Le mot « perturbateur endocrinien » n'apparaît **que** pour une substance présente sur
  la liste prioritaire CE ou visée par un avis SCCS, toujours qualifié « suspecté » ou
  « avéré » selon la source, avec le lien.
- « Interdit » = présent en Annexe II CosIng ou interdit au Maroc (hydroquinone,
  mercure, corticoïdes) — la fiche affiche la référence réglementaire.
- Aucun jugement sur une marque ; le score parle d'ingrédients, jamais de « toxicité »
  du produit. Mention permanente : « Repères basés sur la réglementation européenne et
  les avis du SCCS — pas un avis médical ni dermatologique ».
- Le référentiel éditorial (`data/cosmetic-risks.json`) est relu avant mise en ligne ;
  chaque modification ultérieure passe par une PR.

## Ordre d'exécution recommandé (Opus 5)

1. Étape 1 (schéma + permissions + Directus) → snapshot.
2. Étape 2 (référentiel : CosIng puis couche éditoriale) → contrôles de volume.
3. Étape 3 (`inci.ts` + `scoring-cosmetic.ts` avec tests unitaires sur 10 listes réelles,
   dont la Finny SOFT et l'Intesa citées ici).
4. Étape 4 (scan OBF, contribute, search, recalcul) → tests curl avec `Origin: https://bayen.ma`.
5. Étape 5 (vision `kind` + `/inci-read` + cron).
6. Étape 6 (tokens, fiche, wizard, recherche, pages, profil) en 3 vagues, vérif mobile
   375 px à chaque vague (état connecté !).
7. Étape 7 (amorçage, tests bout-en-bout), CLAUDE.md (crons + règles), commit par
   chantier, suppression de ce PLAN au commit final.

## Hors scope explicite

- Score environnemental / emballage (v2).
- Détection des contrefaçons.
- Import OBF hors Maroc (l'univers se remplit par les scans, comme l'alimentaire).
- Traduction arabe des 30 000 INCI (les noms INCI sont internationaux ; seuls les
  ~250 ingrédients à risque reçoivent une note en français, l'arabe en phase 2).
