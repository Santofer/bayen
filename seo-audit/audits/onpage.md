# Audit on-page SEO — Bayen (bayen.ma)

**Date :** 2026-05-11 (mise à jour post-session hreflang + schemas + E-E-A-T)
**Auditeur :** Agent SEO On-Page (audit live par curl des 10 pages)
**Pages auditées :** 10 (/, /scan, /recherche, /additifs, /contribuer, /analyser-repas, /blog, /blog/comprendre-le-nutri-score, /blog/diabete-alimentation-maroc-produits-a-eviter, /produit/3017620422003)

---

## 1. Contexte — Ce qui a été fait le 11 mai 2026

Les éléments suivants sont **confirmés opérationnels** sur le HTML live :

- Hreflang `fr-MA` + `ar-MA` + `x-default` : présents sur les 10 pages.
- OG tags complets (og:title, og:description, og:image, og:type, og:locale, og:site_name) : présents.
- Twitter Card : présente.
- JSON-LD BlogPosting enrichi (author Person, wordCount, timeRequired) : confirmé sur les articles.
- JSON-LD Product complet (NutritionInformation, Brand, PropertyValue score/NOVA/Nutri-Score) : confirmé sur /produit/3017620422003.
- JSON-LD Blog + BreadcrumbList : confirmés sur /blog.
- Canonicals corrects sur les pages qui passent `path` : /blog, /blog/[slug], /produit/[barcode], /analyser-repas.

---

## 2. Audit page par page — État au 11 mai 2026

### Page 1 — Homepage (`/`)

| Critère | Valeur live | Statut |
|---|---|---|
| **Title** | `Bayen — Scannez. Comprenez. Choisissez mieux.` (45 chars) | SOUS-OPTIMAL — 45 chars, pas de mot-clé géo |
| **Meta description** | `Bayen — Scannez. Comprenez. Choisissez mieux.` (45 chars) — identique au title | CRITIQUE — duplique le title, 45 chars vs 140-160 cibles, zéro CTA |
| **H1** | Deux `<h1>` : "Scannez. Comprenez." + "Choisissez mieux." (split CSS) | PROBLEME — double H1, mots-clés cibles absents |
| **H2** | "Comment ça marche ?", "Articles récents", "Produits récents", "Un produit manque ?" | OK — 4 H2 logiques |
| **Mot-clés cibles dans le title** | Aucun — ni "Maroc", ni "scanner", ni "Nutri-Score" | PROBLEME |
| **Word count (contenu)** | ~614 mots HTML total (nav + footer inclus) | ACCEPTABLE |
| **Images** | 12 imgs, 0 sans alt, 2 avec alt="" vides (images décoratives — OK) | OK |
| **Liens internes** | 30+ uniques (nav + CTA + blog + produits + footer) | BON |
| **Canonical** | `path` non passé au Layout → SeoHead `path=undefined` → canonical = `https://bayen.ma/` | OK (homepage = root, pas de bug ici) |
| **OG tags** | Présents | OK |
| **JSON-LD** | Organization + WebSite auto-injectés sur la homepage | OK |

**Problèmes restants :**
1. Meta description = copie exacte du title. Aucune description unique, aucun mot-clé de niche, aucun CTA.
2. Double `<h1>` : le héro est codé avec deux balises `<h1>` distinctes pour l'effet CSS. Google lit le premier uniquement ("Scannez. Comprenez.") — ni "Maroc" ni le nom du service n'y figurent.
3. Title trop court (45 chars) et sans ancrage géographique.

**Title suggéré (55 chars) :** `Scanner produits alimentaires au Maroc — Bayen`
**Meta description suggérée (152 chars) :** `Scannez le code-barres de vos produits alimentaires et obtenez le Nutri-Score, les additifs et un score santé 0-100. 100% gratuit — fait pour le Maroc.`

---

### Page 2 — Scanner (`/scan`)

| Critère | Valeur live | Statut |
|---|---|---|
| **Title** | `Scanner un produit — Bayen` (26 chars) | TROP COURT — 26 chars, manque "code-barres", "Maroc" |
| **Meta description** | `Bayen — Scannez. Comprenez. Choisissez mieux.` (45 chars) — fallback générique | CRITIQUE — duplique la homepage |
| **H1** | `Scanner un produit` (rendu SSR par le composant ScanPage ou Layout — présent dans le HTML) | OK |
| **H2** | `Conseils pour un bon scan` (1 H2 SSR) | INSUFFISANT — 1 seul, pas de structuration de contenu |
| **H3** | 3 H3 présents (conseils scan) | OK |
| **Word count (contenu)** | ~32 mots de contenu réel (hors nav/footer) | CRITIQUE — page quasi vide côté SSR |
| **Images** | 2 imgs, 0 sans alt | OK |
| **Liens internes** | 16 (nav + footer uniquement) | PROBLEME — zéro lien contextuel vers /additifs, /blog, /produit |
| **Canonical** | `path` non passé → `https://bayen.ma/` | CRITIQUE — canonical de /scan = homepage |
| **OG tags** | Présents (titre correct, description générique) | PARTIEL |

**Problèmes restants :**
1. **Canonical cassé** : `/scan` pointe canoniquement vers `https://bayen.ma/`. Google peut consolider ou ignorer cette page.
2. Meta description dupliquée de la homepage.
3. Contenu SSR quasi nul (32 mots) — la page n'offre aucun signal textuel pour le positionnement sur "scanner code-barres aliment".

**Title suggéré (50 chars) :** `Scanner code-barres aliment au Maroc — Bayen`
**Meta description suggérée (150 chars) :** `Scannez le code-barres de n'importe quel produit alimentaire. Score Bayen 0-100, Nutri-Score, groupe NOVA et additifs détectés — résultat en quelques secondes.`

---

### Page 3 — Recherche (`/recherche`)

| Critère | Valeur live | Statut |
|---|---|---|
| **Title** | `Recherche — Bayen` (17 chars) | TROP COURT — 17 chars, problématique |
| **Meta description** | `Bayen — Scannez. Comprenez. Choisissez mieux.` (45 chars) — fallback générique | CRITIQUE — triplicate avec homepage et /scan |
| **H1** | Absent dans le HTML live | CRITIQUE |
| **H2** | Absent | CRITIQUE |
| **Word count (contenu)** | ~17 mots de contenu réel | CRITIQUE |
| **Canonical** | `path` non passé → `https://bayen.ma/` | CRITIQUE — canonical = homepage |
| **OG tags** | Présents (title correct) | PARTIEL |

**Problèmes restants :**
1. Canonical cassé vers la homepage.
2. Aucun H1 ni H2 visible dans le HTML livré.
3. Meta description tripliquée avec homepage et /scan.
4. Contenu texte quasi inexistant côté serveur.

**Title suggéré (51 chars) :** `Recherche produits alimentaires Maroc — Bayen`
**Meta description suggérée (155 chars) :** `Recherchez parmi des milliers de produits alimentaires vendus au Maroc. Filtrez par Nutri-Score, NOVA, additifs, marque ou catégorie. Base Bayen à jour.`

---

### Page 4 — Additifs (`/additifs`)

| Critère | Valeur live | Statut |
|---|---|---|
| **Title** | `Additifs alimentaires — Bayen` (29 chars) | TROP COURT — 29 chars |
| **Meta description** | `Base de données complète des additifs alimentaires E-xxx avec niveaux de risque pour le consommateur marocain.` (110 chars) | TROP COURTE — 110 chars vs 140-160 cibles, mais mots-clés pertinents présents |
| **H1** | `Additifs alimentaires` — unique | OK |
| **H2** | Aucun H2 dans le HTML livré | PROBLEME |
| **Word count** | ~1 855 mots HTML (liste de 300+ additifs = fort contenu indexable) | BON |
| **Images** | 2 imgs, 0 sans alt | OK |
| **Liens internes** | 166 liens uniques dont ~150 vers /additifs/Exxx | BON — excellent maillage vers les fiches additifs |
| **Canonical** | `path` non passé → `https://bayen.ma/` | CRITIQUE — canonical = homepage |
| **OG tags** | Présents | OK |

**Problèmes restants :**
1. Canonical cassé (le plus impactant sur cette page : 300+ fiches additifs toutes liées depuis ici).
2. Title trop court, sans "Maroc" ni "E322 E330 danger".
3. Meta description à 30 chars sous la cible.

**Title suggéré (56 chars) :** `Additifs alimentaires E-xxx — Risques au Maroc | Bayen`
**Meta description suggérée (154 chars) :** `Base complète des additifs alimentaires E100-E999 disponibles au Maroc. Niveaux de risque EFSA : interdits, à éviter, sans danger. Recherche par code E ou nom.`

---

### Page 5 — Contribuer (`/contribuer`)

| Critère | Valeur live | Statut |
|---|---|---|
| **Title** | `Ajouter un produit — Bayen` (26 chars) | TROP COURT |
| **Meta description** | `Aidez la communauté en ajoutant un produit alimentaire à la base Bayen` (70 chars) | TROP COURTE — 70 chars |
| **H1** | `Ajouter un produit` — unique | OK |
| **H2** | Aucun | OK — page formulaire |
| **Word count** | ~18 mots de contenu réel | TRÈS FAIBLE |
| **Canonical** | `path` non passé → `https://bayen.ma/` | CRITIQUE |
| **OG tags** | Présents | OK |

**Problèmes restants :**
1. Canonical cassé.
2. Title trop court, manque contexte Maroc.
3. Meta description sous la cible.

**Title suggéré (52 chars) :** `Ajouter un produit alimentaire marocain — Bayen`
**Meta description suggérée (153 chars) :** `Enrichissez la base alimentaire du Maroc. Ajoutez un produit avec son code-barres, ses photos et ses ingrédients. Contribution libre, sans inscription requise.`

---

### Page 6 — Analyser repas (`/analyser-repas`)

| Critère | Valeur live | Statut |
|---|---|---|
| **Title** | `Analyser mon repas — Bayen` (26 chars) | TROP COURT — manque "photo", "calories", "IA" |
| **Meta description** | `Prends une photo de ton assiette pour obtenir un score santé, la liste des ingrédients et une estimation calorique.` (115 chars) | TROP COURTE — 115 chars, mais pertinente |
| **H1** | `Analyser mon repas` — unique | OK |
| **H2** | Aucun | FAIBLE — page outil |
| **Word count** | ~33 mots de contenu réel | CRITIQUE |
| **Canonical** | `path="/analyser-repas"` passé → `https://bayen.ma/analyser-repas` | OK |
| **OG tags** | Présents | OK |
| **Mot-clés cibles** | "analyser repas photo IA" absents du title | MANQUE |

**Title suggéré (56 chars) :** `Analyser un repas en photo par IA — Calories | Bayen`
**Meta description suggérée (150 chars) :** `Prends une photo de ton plat pour obtenir un score santé, l'estimation calorique et la liste des ingrédients. Analyse IA gratuite — disponible au Maroc.`

---

### Page 7 — Blog (`/blog`)

| Critère | Valeur live | Statut |
|---|---|---|
| **Title** | `Le blog Bayen — Bayen` (21 chars) | TROP COURT + "Bayen" en doublon |
| **Meta description** | `Bien-être, habitudes de consommation et réflexe Bayen.` (54 chars) | TRÈS COURTE — 54 chars, aucun mot-clé |
| **H1** | `Le blog Bayen` — unique | OK |
| **H2** | Aucun H2 dans le listing (articles en composants React) | MANQUE — structure SSR absente |
| **H3** | 21 H3 (titres d'articles rendus en SSR ?) | OK si ce sont les articles |
| **Word count** | ~813 mots HTML total | ACCEPTABLE |
| **Images** | 5 imgs, 0 sans alt | OK |
| **Liens internes** | 38 uniques (articles + nav + footer) | BON |
| **Canonical** | `path="/blog"` passé → `https://bayen.ma/blog` | OK |
| **JSON-LD** | Blog + BreadcrumbList présents | OK |

**Problèmes restants :**
1. Title trop court et doublon "Bayen".
2. Meta description à 54 chars, sans mot-clé "nutrition Maroc" ni "alimentation saine".

**Title suggéré (55 chars) :** `Blog nutrition et alimentation saine Maroc — Bayen`
**Meta description suggérée (160 chars) :** `Conseils nutrition, guides alimentation et actualités bien-être pour les Marocains. Nutri-Score, additifs, manger sain au quotidien — articles publiés chaque semaine.`

---

### Page 8 — Article blog : Nutri-Score (`/blog/comprendre-le-nutri-score`)

| Critère | Valeur live | Statut |
|---|---|---|
| **Title** | `Le Nutri-Score expliqué simplement (et ses limites) — Bayen` (59 chars) | BON — dans la plage, mot-clé présent |
| **Meta description** | `A, B, C, D, E : tu vois ces lettres partout mais tu n'es pas sûr de ce qu'elles veulent dire. On démêle tout en 4 minutes.` (122 chars) | TROP COURTE — 122 chars vs 140-160, mais pertinente |
| **H1** | `Le Nutri-Score expliqué simplement (et ses limites)` — unique | OK |
| **H2** | 5 H2 : "D'où vient le Nutri-Score", "Pourquoi c'est utile", "Ses 4 limites importantes", "Notre conseil", "Articles similaires" | BON — structure logique |
| **H3** | 8 H3 | OK |
| **Word count** | ~640 mots HTML | OK — au-dessus de 500 |
| **Images** | 3 imgs, 0 sans alt | OK |
| **Liens internes** | 20 (4 articles similaires + nav + footer) | BON |
| **Canonical** | `https://bayen.ma/blog/comprendre-le-nutri-score` | OK |
| **OG image** | `https://api.bayen.ma/assets/51930d2b-...` (Directus direct, pas cdn.bayen.ma) | ATTENTION — OG image sur api.bayen.ma |
| **JSON-LD** | BlogPosting enrichi (author, datePublished, wordCount, timeRequired) | EXCELLENT |
| **Mots-clés cibles** | "Nutri-Score" présent partout — OK. "Maroc" absent du title et peu présent dans le corps | MANQUE géo |

**Title suggéré (60 chars) :** `Nutri-Score expliqué : A B C D E et ses limites — Bayen`
**Meta description à allonger (156 chars) :** `A, B, C, D, E : tu vois ces lettres partout mais tu ne sais pas ce qu'elles veulent dire. On démêle le Nutri-Score en 4 minutes — valable pour les produits du Maroc.`

---

### Page 9 — Article blog : Diabète (`/blog/diabete-alimentation-maroc-produits-a-eviter`)

| Critère | Valeur live | Statut |
|---|---|---|
| **Title** | `Diabète au Maroc : 8 produits à éviter dans les rayons — Bayen` (62 chars) | LÉGÈREMENT LONG — 62 chars, risque de troncature |
| **Meta description** | `Le diabète touche plus de 2,7 millions de Marocains. Voici les produits du quotidien qui font le plus grimper la glycémie.` (122 chars) | TROP COURTE — 122 chars |
| **H1** | `Diabète au Maroc : 8 produits à éviter dans les rayons` — unique | OK — mot-clé géo présent |
| **H2** | 8 H2 (1 intro + 7 produits numérotés) | BON — structure liste riche |
| **H3** | 6 H3 | OK |
| **Word count** | ~843 mots HTML | BON |
| **Images** | 3 imgs, 0 sans alt | OK |
| **Liens internes** | 19 (3 articles similaires + nav/footer + /scan CTA) | BON |
| **Canonical** | `https://bayen.ma/blog/diabete-alimentation-maroc-produits-a-eviter` | OK |
| **JSON-LD** | BlogPosting enrichi | EXCELLENT |
| **Mots-clés cibles** | "diabète Maroc", "produits à éviter", marques locales (Aicha, Hawai, Pulpy) | EXCELLENT — contenu très ciblé |
| **Lien vers /produit/** | Aucun lien direct vers les fiches Bayen des produits mentionnés | OPPORTUNITE MANQUEE |

**Title ajusté (58 chars) :** `Diabète au Maroc : 8 produits à éviter en rayon — Bayen`
**Meta description à allonger (156 chars) :** `Le diabète touche 2,7 millions de Marocains. Sodas, jus, céréales, pain blanc : voici les 8 produits du quotidien qui font grimper la glycémie, avec les chiffres.`

---

### Page 10 — Fiche produit Nutella (`/produit/3017620422003`)

| Critère | Valeur live | Statut |
|---|---|---|
| **Title** | `Nutella (Nutella) — Score 18/100 | Bayen` (40 chars) | TROP COURT — 40 chars, "Nutella (Nutella)" = marque répétée |
| **Meta description** | `Nutella de Nutella : score 18/100, Nutri-Score E, NOVA 4.` (57 chars) | TRÈS COURTE — 57 chars, aucun contexte Maroc ni CTA |
| **H1** | `Nutella` — unique | OK |
| **H2** | "Analyse santé", "Valeurs nutritionnelles (pour 100g)", "Ingrédients" | OK — 3 H2 pertinents |
| **H3** | 8 H3 | OK |
| **Word count** | ~202 mots de contenu réel | FAIBLE — peu de texte éditorial |
| **Images** | 10 imgs, 0 sans alt | OK |
| **Liens internes** | 22 uniques (marque, catégorie, alternatives, /contribuer, /scan) | BON |
| **Canonical** | `https://bayen.ma/produit/3017620422003` | OK |
| **OG image** | `https://bayen.ma/og-default.png` — image générique, pas la photo Nutella | PROBLEME — l'image produit n'est pas utilisée en OG |
| **JSON-LD** | Product complet (NutritionInformation, Brand, PropertyValue) | EXCELLENT |
| **Mots-clés cibles** | "Nutella Maroc avis", "Nutella Nutri-Score", "Nutella score santé" | PARTIEL — score dans le title, mais "Maroc" absent |

**Title suggéré (56 chars) :** `Nutella — Score 18/100, Nutri-Score E | Bayen Maroc`
**Meta description suggérée (152 chars) :** `Nutella de Ferrero : score Bayen 18/100, Nutri-Score E, NOVA 4. Ultra-transformé, 56g de sucres/100g. Voir les alternatives plus saines au Maroc.`

---

## 3. Duplicats inter-pages

### Meta descriptions dupliquées

| Valeur | Pages | Gravité |
|---|---|---|
| `Bayen — Scannez. Comprenez. Choisissez mieux.` | /, /scan, /recherche | CRITIQUE — 3 pages avec meta description identique |

**Diagnostic :** Le `Layout.astro` (ligne 34) définit `description = 'Bayen — Scannez. Comprenez. Choisissez mieux.'` comme valeur par défaut. Les pages `/scan`, `/recherche` ne passent pas de `description` prop → elles héritent du fallback identique au title de la homepage.

### Titles dupliqués

Aucun title identique entre pages, mais plusieurs partagent le pattern `[mot court] — Bayen` trop générique, sans différenciation géographique ou sémantique.

---

## 4. Problème systémique : Canonical cassé sur 4 pages clés

**Cause racine :** Dans `SeoHead.astro` (ligne 33-38), `canonicalUrl = \`${siteUrl}${path}\`` avec `path = '/'` comme défaut. Quand une page ne passe pas `path` au `<Layout>`, le canonical est `https://bayen.ma/`.

**Pages affectées (confirmées par curl live) :**

| Page | Canonical effectif | Attendu |
|---|---|---|
| `/scan` | `https://bayen.ma/` | `https://bayen.ma/scan` |
| `/recherche` | `https://bayen.ma/` | `https://bayen.ma/recherche` |
| `/additifs` | `https://bayen.ma/` | `https://bayen.ma/additifs` |
| `/contribuer` | `https://bayen.ma/` | `https://bayen.ma/contribuer` |

**Fix :** Ajouter `path="/scan"`, `path="/recherche"`, `path="/additifs"`, `path="/contribuer"` dans les appels `<Layout>` respectifs. Alternativement, modifier le défaut dans `SeoHead.astro` pour utiliser `Astro.url.pathname` quand `path` est absent.

---

## 5. Maillage interne

### Densité par page

| Page | Liens internes sortants (uniques) | Qualité |
|---|---|---|
| `/` | 30+ | BON — CTA + blog + produits + nav + footer |
| `/scan` | 16 (nav + footer uniquement) | FAIBLE — zéro lien contextuel |
| `/recherche` | 16 (nav + footer uniquement) | FAIBLE |
| `/additifs` | 166 (150 vers /additifs/Exxx) | EXCELLENT |
| `/contribuer` | 16 (nav + footer uniquement) | FAIBLE |
| `/analyser-repas` | 16 (nav + footer uniquement) | FAIBLE |
| `/blog` | 38 (articles + catégories + nav) | BON |
| `/blog/comprendre-le-nutri-score` | 20 (4 articles similaires + nav + footer) | BON |
| `/blog/diabete-...` | 19 (3 articles similaires + nav + footer) | BON |
| `/produit/3017620422003` | 22 (alternatives + marque + catégorie) | BON |

### Opportunité manquée : articles → fiches produit

L'article diabète cite Chocapic, Aicha, Hawai, Pulpy, Bonne Maman — aucun lien vers les fiches `/produit/[barcode]` correspondantes. Ces liens augmenteraient le maillage interne ET le temps passé sur le site.

### Ancres non descriptives

- "Voir tout" (homepage → /recherche) — acceptable.
- "Mon repas" (nav mobile → /analyser-repas) — trop court, pourrait être "Analyser un repas".
- Ancres de navigation standard "Scanner", "Recherche", "Additifs" — OK en contexte nav.

---

## 6. Images — Bilan global

| Problème | Pages | Impact |
|---|---|---|
| OG image générique sur /produit/[barcode] quand l'image produit est disponible | Toutes les fiches produit (ex: Nutella → og-default.png au lieu de la photo) | Preview WhatsApp/Facebook non représentative du produit |
| OG image sur articles pointe vers `api.bayen.ma/assets/` (Directus direct) au lieu de `cdn.bayen.ma` | Articles avec cover_image | Potentiellement non-public si auth requise, latence |
| Alt="" sur 2 images décoratives homepage | Homepage | OK — conforme (images décoratives) |
| Zéro image sans alt sur les 10 pages | Toutes | BON |

---

## 7. Top 10 issues priorisées

### P1 — Bloquants (à corriger en priorité absolue)

| # | Issue | Fichiers à modifier | Action concrète | Impact attendu |
|---|---|---|---|---|
| **P1-1** | **Canonical cassé sur /scan, /recherche, /additifs, /contribuer** — ces 4 pages ont canonical = homepage. Google peut les désindexer ou fusionner leur contenu vers `/`. | `frontend/src/pages/scan.astro`, `frontend/src/pages/recherche.astro`, `frontend/src/pages/additifs/index.astro`, `frontend/src/pages/contribuer/index.astro` | Ajouter `path="/scan"`, `path="/recherche"`, `path="/additifs"`, `path="/contribuer"` dans chaque appel `<Layout ...>` | Désindexation évitée, equity de lien distribuée correctement |
| **P1-2** | **Meta description dupliquée 3x** — /, /scan, /recherche partagent `Bayen — Scannez. Comprenez. Choisissez mieux.` | `frontend/src/pages/scan.astro`, `frontend/src/pages/recherche.astro` | Ajouter `description="..."` unique dans `<Layout>` sur chaque page (voir suggestions ci-dessus) | CTR organique en hausse, pas de signal doublon pour Google |
| **P1-3** | **Meta description homepage = title** — 45 chars, zéro CTA, zéro mot-clé géo | `frontend/src/pages/index.astro` (ligne 103) | Modifier `<Layout title="..." >` pour ajouter `description="Scannez le code-barres..."` (152 chars, voir suggestion) | CTR homepage amélioré |

### P2 — Importants (dans les 2 semaines)

| # | Issue | Fichiers à modifier | Action concrète | Impact attendu |
|---|---|---|---|---|
| **P2-1** | **Titles trop courts et sans ancrage géo** sur /scan (26 chars), /recherche (17 chars), /contribuer (26 chars), /blog (21 chars), /analyser-repas (26 chars), /produit (40 chars) | Chaque page `.astro` correspondante | Remplacer les titles par les suggestions de la section 2 (50-60 chars avec "Maroc" et le mot-clé principal) | Meilleur positionnement sur les requêtes géolocalisées |
| **P2-2** | **Double `<h1>` sur la homepage** — le héro utilise deux `<h1>` pour l'effet CSS | `frontend/src/pages/index.astro` (lignes 121-127) | Remplacer le second `<h1>` par `<span>` ou `<p>` (même style CSS via classe) — ne garder qu'un seul `<h1>` | Signal H1 unique, mot-clé principal mieux valorisé |
| **P2-3** | **Meta descriptions trop courtes** : /additifs (110 chars), /contribuer (70 chars), /blog (54 chars), /analyser-repas (115 chars), /blog/nutriscore (122 chars), /blog/diabete (122 chars), /produit (57 chars) | Pages `.astro` et données CMS articles | Allonger chaque description à 140-160 chars (voir suggestions section 2) | CTR amélioré sur les SERPs |
| **P2-4** | **OG image générique sur les fiches produit** — quand l'image produit est disponible, elle n'est pas transmise en OG | `frontend/src/pages/produit/[barcode].astro` (ligne 377) | Vérifier que `ogImage` reçoit bien l'URL de l'image produit quand elle existe ; le code est présent mais l'image OFF n'est peut-être pas accessible publiquement depuis WhatsApp | Previews produit sur WhatsApp/iMessage = meilleur partage viral |

### P3 — Optimisations (à planifier sur 30 jours)

| # | Issue | Fichiers à modifier | Action concrète | Impact attendu |
|---|---|---|---|---|
| **P3-1** | **Lien articles blog → fiches produit** — l'article diabète cite Chocapic, Aicha, Hawai sans lier vers `/produit/[barcode]` | Contenu CMS Directus (articles) | Ajouter des liens Markdown vers les fiches produit dans les articles qui citent des produits nommés | Maillage interne +, temps de session +, conversion scan + |
| **P3-2** | **Contenu SSR minimal** sur /scan (32 mots) et /analyser-repas (33 mots) — pages outils quasi vides pour les crawlers | `frontend/src/pages/scan.astro`, `frontend/src/pages/analyser-repas.astro` | Ajouter un bloc `<section>` SSR sous l'outil : 100-150 mots décrivant le fonctionnement, les cas d'usage, 2-3 liens internes contextuels vers /blog ou /additifs | Contenu indexable pour positionner sur "scanner code-barres aliment Maroc" |
| **P3-3** | **OG images des articles** pointent vers `api.bayen.ma/assets/` (Directus non-CDN) | `frontend/src/pages/blog/[slug].astro` (ligne 65-69) | Faire passer les cover_image via `cdn.bayen.ma` au lieu de `api.bayen.ma/assets` | Latence OG image réduite, évite potentielle restriction auth |
| **P3-4** | **Title produit "Nutella (Nutella)"** — marque répétée car `product.brand === product.name_fr` | `frontend/src/pages/produit/[barcode].astro` (ligne 303-304) | Dans la construction du `pageTitle`, détecter si brand est inclus dans name_fr et dans ce cas supprimer la parenthèse — ex: `Nutella — Score 18/100 | Bayen` | Title plus propre, évite duplication dans SERP snippet |

---

## 8. Score on-page global

| Dimension | Note | Commentaire |
|---|---|---|
| Infrastructure (SeoHead, hreflang, JSON-LD) | 8/10 | Excellent après la session du 11 mai — hreflang OK, JSON-LD OK sur pages clés |
| Titles | 4/10 | 7/10 pages trop courtes ou sans mot-clé géo, doublon "Bayen" sur /blog |
| Meta descriptions | 3/10 | 3 duplicatas, 7/10 pages sous 140 chars, meta homepage = title |
| Structure Hn | 6/10 | Double H1 homepage, absence H1 sur /recherche, bon sur blog et produits |
| Canonicals | 5/10 | 4 pages sur 10 cassées (pointent vers /), 6 pages correctes |
| Maillage interne | 6/10 | Homepage, blog et /additifs bien maillés ; /scan, /recherche, /contribuer = nav/footer uniquement |
| Contenu textuel | 5/10 | Blog et /additifs bons, pages outils quasi vides côté SSR |
| Images | 8/10 | Zéro img sans alt, mais OG image produit = générique |
| OG / Social | 7/10 | Tags présents partout, description dupliquée pour 3 pages, OG image produit non optimale |
| Mots-clés cibles | 4/10 | "Maroc" absent de la majorité des titles, mots-clés niche absents des meta |

**Score on-page global : 5,6 / 10**

Progression de 0,7 point par rapport à l'audit précédent (4,9/10), grâce à l'ajout du hreflang, des JSON-LD enrichis et des pages E-E-A-T. Les gains les plus rapides restent dans les balises meta (titles, descriptions, canonicals) — modifications de quelques lignes dans les fichiers `.astro`, impact immédiat à la prochaine crawl de Google.
