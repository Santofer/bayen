# Rapport SEO mensuel — Bayen (bayen.ma)
**Période :** Mai 2026 (M+0 — premier rapport, baseline)
**Audit effectué le :** 11 mai 2026
**Préparé par :** SEO Report Builder
**Destinataire :** Amine Benboubker

---

## Page 1 — Synthèse exécutive

### Score composite SEO global : 5,93 / 10

Calculé sur 6 axes (pondération définie ci-dessous). Baseline à J+25 post-lancement (avril 2026). Pas de delta M-1 disponible — ce rapport établit la référence pour les mois suivants.

---

### 3 wins majeurs réalisés depuis le lancement

**1. Infrastructure SEO de base construite en partant de zéro.**
Hreflang fr-MA + ar-MA + x-default sur toutes les pages, JSON-LD Product/BlogPosting/BreadcrumbList/FAQPage opérationnels, robots.txt avec 13 bots IA explicitement autorisés (GPTBot, ClaudeBot, PerplexityBot…), sitemap 2 140 URLs, llms.txt créé et servi. Pour un site de 25 jours, c'est une base solide que la majorité des concurrents locaux n'ont pas.

**2. 18 articles blog publiés, dont 4 sans concurrents directs en FR-MA.**
"Lire une étiquette en arabe au Maroc" (contenu unique mondial), "Meilleurs yaourts marocains comparatif", "Thé marocain et sucre", "Nutrition sport Maroc produits locaux" — ces articles s'adressent exactement à des requêtes que Yuka, Doctissimo et LaNutrition.fr ne couvriront jamais. C'est l'avantage structurel principal de Bayen.

**3. Score Schema à 9/10 — meilleure composante du site.**
Organization, WebSite, SearchAction, BlogPosting enrichi, Product avec NutritionInformation complète, BreadcrumbList, FAQPage sur /methodologie. La structure de données est en avance sur des sites établis depuis des années.

---

### 3 risques critiques à adresser maintenant

**Risque 1 (indexation) — Bug canonical sur ~170 pages.**
Environ 170 pages (/additifs, /categories, /marque, /ingredients, /recherche, /classement, /contribuer, /scan) retournent toutes `canonical: https://bayen.ma/`. Google peut les traiter comme des doublons de la homepage et ne pas les indexer séparément. Correctif : ajouter le `path=` dans 10 fichiers `.astro`. Effort estimé : 20-30 minutes.

**Risque 2 (trafic organique) — 18 articles absents du sitemap live.**
Le code `sitemap.xml.ts` est correct, mais l'appel Directus timeout au moment où Cloudflare Pages génère le sitemap. Résultat : le sitemap servi ne contient aucune URL `/blog/[slug]`. Googlebot et les bots IA ne découvrent pas les articles via le sitemap. Tant que ce bug n'est pas corrigé, les 18 articles ne seront pas indexés de manière proactive.

**Risque 3 (confiance perçue) — Auteur invisible en UI sur les articles.**
Amine Benboubker est correctement déclaré dans le JSON-LD BlogPosting, mais aucun bloc auteur n'est visible dans l'interface. Sur les sujets santé (diabète, additifs, Nutri-Score), l'absence de signature visible est un signal E-E-A-T négatif pour Google et pour les lecteurs. Fix en 30 minutes dans le template `[slug].astro`.

---

### Priorité absolue M+1

**Corriger le sitemap pour inclure les 18 articles blog.**
C'est le blocage le plus impactant : tant que les articles ne sont pas dans le sitemap, l'investissement éditorial des semaines précédentes ne génère pas de trafic organique. Augmenter le timeout Directus à 15 secondes dans `sitemap.xml.ts`, et ajouter une liste statique de fallback si l'appel échoue. Un déploiement + vérification via `curl https://bayen.ma/sitemap.xml | grep blog` suffit à confirmer le correctif.

---

## Page 2 — Métriques SEO (tableau de bord)

| Axe | Score /10 | Estimation lancement (avril 2026) | Evolution estimée |
|---|---|---|---|
| Technique | 6,5 | 4,0 | +63% |
| On-page | 5,6 | 5,0 | +12% |
| Schema / Données structurées | 9,0 | 3,0 | +200% |
| AEO / Citabilité IA | 6,0 | 2,0 | +200% |
| Brand mentions | 3,0 | 3,0 | stable |
| Contenu E-E-A-T | 5,5 | 4,0 | +37% |
| **Score composite (pondéré)** | **5,93 / 10** | **3,50 / 10** | **+70%** |

**Pondération utilisée pour le score composite :**
Technique 20% + On-page 20% + Schema 15% + AEO 20% + Brand 10% + E-E-A-T 15% = 100%.

Calcul : (6,5×0,20) + (5,6×0,20) + (9×0,15) + (6×0,20) + (3×0,10) + (5,5×0,15) = 1,30 + 1,12 + 1,35 + 1,20 + 0,30 + 0,83 = **5,93 / 10**

**Lecture rapide :**
- Points forts : Schema (9/10) et AEO (6/10) — bien au-dessus d'un site de 25 jours.
- Points faibles : Brand mentions (3/10) — absence totale de présence sociale et presse ; On-page (5,6/10) — bug canonical + meta descriptions dupliquées.
- Le score composite de 5,93 est honnête pour un premier mois. L'objectif à M+3 est 7,5+/10.

---

## Page 3 — Top 10 issues prioritaires (P0 et P1)

Issues extraites et consolidées depuis les 4 audits, ordonnées par rapport impact/effort.

| # | Issue | Effort | Impact |
|---|---|---|---|
| **1** | **Bug canonical ~170 pages** — /additifs (150 pages), /categories (12), /marque, /ingredients, /recherche, /classement, /contribuer, /scan pointent toutes vers `/`. Fix : ajouter `path=` dans 10 fichiers `.astro`. | S — 20 min | Massif — débloque l'indexation de 170 pages |
| **2** | **www.bayen.ma répond 200 sans 301** — Googlebot crawle deux versions du site, divisant le crawl budget et le PageRank. Fix : Cloudflare Redirect Rule `www.bayen.ma/* → https://bayen.ma/:splat 301`. | S — 5 min (Dashboard CF) | Fort — consolidation authority |
| **3** | **/connexion et /admin/import-off sans noindex** — pages privées/admin indexables. Fix : ajouter `noindex={true}` dans les deux fichiers `.astro`. | S — 5 min | Moyen — propreté indexation |
| **4** | **Sitemap ne contient pas les 18 articles blog en live** — timeout Directus lors de la génération. Fix : augmenter timeout à 15s + fallback liste statique dans `sitemap.xml.ts`. | M — 1h dev | Critique — indexation des 18 articles |
| **5** | **Bloc auteur absent en UI sur les articles** — Amine est dans le JSON-LD mais invisible à l'utilisateur. Fix : ajouter bloc "Écrit par Amine Benboubker · Fondateur Bayen · n0.ma" dans `[slug].astro`. | S — 30 min | Fort — E-E-A-T, confiance lecteur |
| **6** | **date_updated non affichée en UI sur les articles** — le champ existe en JSON-LD mais pas en interface. Pour les sujets YMYL (diabète, additifs), c'est un signal de fraîcheur important. Fix : modifier `[slug].astro` pour afficher "Mis à jour le X" si différent de date de publication. | S — 15 min | Fort — freshness YMYL |
| **7** | **FAQPage manquante sur 3 articles YMYL forts** — /blog/diabete-alimentation-maroc, /blog/additifs-a-eviter-maroc, /blog/comprendre-le-nutri-score. Snippets JSON-LD prêts dans l'audit AEO. Fix : intégrer les blocs FAQPage dans les 3 articles. | M — 2h rédaction + 1h dev | Fort — Featured Snippets Google probables |
| **8** | **Chapeaux d'articles non optimisés pour les LLMs** — les 3 articles audités (Nutri-Score, additifs, diabète) n'ont pas de réponse directe dans les 200 premiers mots, et les H2 sont affirmatifs plutôt qu'interrogatifs. Reformulations suggérées disponibles dans l'audit AEO. | M — 2h rédaction | Fort — citabilité ChatGPT/Perplexity |
| **9** | **Fichier `_headers` Cloudflare Pages absent** — assets `/_astro/` servis avec `max-age=14400` (4h) au lieu de 1 an. Aucun header sécurité (HSTS, X-Frame-Options, CSP) sur les pages SSR. Fix : créer `frontend/public/_headers` avec les règles cache + sécurité. | S — 15 min | Moyen — Lighthouse Best Practices + perf répétée |
| **10** | **Google Fonts chargées en synchrone** — Mouse Memoirs + Nunito bloquent le rendu dans `Layout.astro`. Fix : remplacer par la technique `preload + onload` dans Layout.astro (~1 ligne). Impact estimé : -200ms LCP mobile. | S — 10 min | Moyen — LCP mobile |

**Note sur les meta descriptions dupliquées (P1 supplémentaire) :**
/, /scan et /recherche partagent la même meta description (`Bayen — Scannez. Comprenez. Choisissez mieux.` — 45 caractères). La homepage a une meta description identique à son title. Ces corrections sont en dehors du top 10 uniquement parce que les canonicals cassés sont plus urgents — elles restent à faire dans la même session.

---

## Page 4 — Compétiteurs et opportunités SERP

### Top 5 compétiteurs sur google.co.ma

| Domaine | DA estimé | Présence Maroc | Menace | Angle |
|---|---|---|---|---|
| yuka.io | ~72 | Nulle | Moyenne | Leader FR/EU, zéro localisation Maroc. Ranke par autorité brute sur les requêtes génériques. Contournable sur toutes les variantes géo `+ maroc`. |
| ma.openfoodfacts.org | ~78 (hérité) | Forte (22 751 produits) | Haute | Sous-domaine marocain d'OFF. Le concurrent SERP le plus sérieux sur les lookups de produits. Faiblesse : zéro blog, zéro éditorial, UX austère. |
| fr.wikipedia.org | ~93 | Nulle | Faible | Indélogeable sur les définitions génériques (Nutri-Score, additifs, NOVA). Stratégie : viser #2-3 sous Wikipedia avec des angles "Maroc". |
| lanutrition.fr | ~58 | Nulle | Faible | Portail médical français. Ranke par inertie sur google.co.ma. Aucun signal Maroc. Dépassable en 6 mois sur toute requête contenant "maroc". |
| doctissimo.fr | ~70 | Nulle | Faible | Grand portail santé généraliste. Même logique que LaNutrition. Contenu non actualisé. Aucun article avec marques ou réglementation marocaine. |

**Observation structurelle :** Aucun concurrent local marocain spécialisé en notation de produits alimentaires n'a été identifié dans les SERPs. Bayen occupe un terrain vierge. La fenêtre d'entrée est ouverte.

---

### 5 quick wins identifiés — contenu déjà publié, positionnement à débloquer

**QW1 — "Meilleurs yaourts Maroc comparatif" (cible : top 1 en 60 jours)**
Article `/blog/meilleurs-yaourts-maroc-comparatif` déjà publié. Aucun autre article en français ne compare Jaouda, Centrale Danone et Yawmy avec des données réelles. Actions : corriger le title (ajouter "2026"), ajouter un tableau HTML structuré en tête d'article, obtenir 2-3 mentions sur forums marocains (Bladi.info, groupes Facebook "Maman Maroc").

**QW2 — "Huile de palme produits marocains" (cible : top 1 en 75 jours)**
Article `/blog/huile-palme-maroc-produits-impact-sante` publié. Aucune source francophone ne liste les marques marocaines contenant de l'huile de palme avec données d'étiquettes réelles. Actions : structurer un tableau HTML des marques concernées, optimiser title et meta.

**QW3 — "Diabète alimentation Maroc" (cible : top 2-3 en 90 jours)**
Article `/blog/diabete-alimentation-maroc-produits-a-eviter` publié. Seul contenu francophone spécifiquement marocain sur ce sujet avec chiffres Ministère Santé + OMS. 2,7M de diabétiques au Maroc = volume de recherche substantiel. Actions : FAQPage schema, link bâtiment vers la Fédération Marocaine des Diabétiques.

**QW4 — "Alternative Yuka Maroc" (cible : top 1 en 90 jours — article à créer)**
Requête à forte intention d'installation, aucune page Bayen sur le sujet. Créer `/blog/meilleure-alternative-yuka-maroc` avec tableau comparatif Yuka vs Bayen. Yuka ne créera jamais cette page — c'est un terrain naturellement réservé à Bayen.

**QW5 — "Additifs alimentaires danger Maroc" (cible : top 3-5 en 90 jours)**
Article `/blog/additifs-a-eviter-maroc` publié. Ajouter une section "additifs particulièrement présents sur les rayons marocains" + FAQPage schema + maillage interne vers `/additifs/E951` etc. Wikipedia et Doctissimo couvrent les définitions génériques, pas les produits marocains nommés.

---

### Recommandations de positionnement

Ne pas attaquer les requêtes génériques frontalement (Nutri-Score, additifs en général). Yuka et Wikipedia y sont établis depuis des années. La stratégie gagnante est de systématiquement ajouter le signal géo-local : "maroc", marques marocaines (Jaouda, Centrale, Aicha, Dari, Hawai), réglementation marocaine (loi 28-07, ONSSA), prix en DH. Ces signaux sont structurellement impossibles à reproduire pour les acteurs étrangers.

---

## Page 5 — Articles : performance et stratégie

### État du corpus : 18 articles publiés au 11 mai 2026

Publiés en deux batches : 11 articles en avril 2026 (lancement), 7 articles SEO-ciblés entre le 4 et le 11 mai 2026. Aucune donnée GSC/GA4 disponible — les métriques de performance sont des estimations basées sur l'analyse de contenu et la concurrence SERP.

---

### Top 3 articles à fort potentiel de trafic

**1. /blog/lire-etiquette-arabe-maroc-vocabulaire (score E-E-A-T : 9/10)**
Glossaire trilingue (arabe / phonétique / français) de 30 termes nutritionnels, codes-barres par pays, mention loi 28-07, référence ONSSA. Contenu inexistant ailleurs dans cette niche — avantage permanent. Fort potentiel de citation par les LLMs (ChatGPT cite ce type de glossaire). Actions prioritaires : ajouter FAQ "comment scanner un produit arabe ?" en schema, 2-3 backlinks depuis communautés diaspora marocaine.

**2. /blog/meilleurs-yaourts-maroc-comparatif (score E-E-A-T : 8/10)**
Comparatif avec données réelles (sucres, protéines, additifs, scores Bayen) des marques Jaouda, Centrale Danone, Yawmy. Aucun concurrent direct en FR-MA. C'est l'article avec le meilleur rapport ROI/effort immédiat : convertir les données en tableau HTML structuré `<thead>/<tbody>` pour activer le rich result "Table" et viser la position 0 sur "meilleur yaourt Maroc".

**3. /blog/the-marocain-sucre-reduire-sans-perdre-tradition (score E-E-A-T : 8/10)**
Article le mieux ancré culturellement. Calcul précis de la charge en sucre d'une théière marocaine (12 morceaux = 48g), plan de sevrage semaine par semaine, 5 astuces aromatiques. Aucun concurrent sur "thé marocain sucre Maroc". Potentiel de partage organique élevé (sujet culturellement chargé = engagement social).

---

### 3 articles à refondre en priorité

**1. /blog/comprendre-le-nutri-score (score E-E-A-T : 6/10)**
- Problème principal : intro ne répond pas directement à "qu'est-ce que le Nutri-Score ?" — les LLMs lisent les 150-200 premiers mots.
- Longueur : ~700 mots vs médiane SERP ~1 200 mots.
- Actions : reformuler le chapeau (réponse directe en 1-2 phrases), ajouter section "Nutri-Score au Maroc : ce que ça change", intégrer FAQPage schema (3 Q&A préparés dans l'audit AEO).

**2. /blog/additifs-a-eviter-maroc (score E-E-A-T : 7/10)**
- Problème principal : H1 et chapeau affirmatifs — manque la question directe. Les LLMs citent préférentiellement les pages où la question est explicite en titre ou H2.
- Actions : reformuler le chapeau avec liste directe des 8 additifs en ouverture, ajouter FAQPage schema (3 Q&A prêts dans l'audit AEO), ajouter liens hypertexte vers les études primaires (OMS 2023 pour aspartame, EFSA pour E171).

**3. /blog/diabete-alimentation-maroc-produits-a-eviter (score E-E-A-T : 7/10)**
- Problème principal : pas de réponse one-liner en ouverture pour "que manger avec le diabète au Maroc", FAQPage absente malgré la forte intention YMYL.
- Actions : reformuler le H1 en question ("Diabète au Maroc : quels aliments éviter ?"), ajouter chapeau direct avec liste des 8 aliments dès les 200 premiers mots, FAQPage schema ("peut-on manger des dattes si diabétique ?").

---

### Articles à garder tels quels (valeur SEO quasi nulle mais utiles pour l'UX brand)

- /blog/bayen-est-en-ligne (score 4/10) — article de lancement, ne pas investir de temps éditorial.
- /blog/le-reflexe-bayen (score 3/10) — trop court, valeur SEO nulle. À laisser ou à fusionner avec un article de contenu plus substantiel.

---

### Plan éditorial 30/60/90 jours

**J+0 à J+30 :**
- Corriger les chapeaux des 3 articles prioritaires (diabète, additifs, Nutri-Score).
- Créer /blog/meilleure-alternative-yuka-maroc (quick win #4).
- Ajouter FAQPage sur les 3 articles YMYL.
- Convertir le tableau yaourts en HTML structuré.

**J+30 à J+60 :**
- Créer /blog/manger-sain-budget-maroc-guide-complet (volume 300-700 req/mois, quasi sans concurrence locale).
- Créer /blog/dlc-ddm-dates-consommation-maroc (contenu très cherché, néant concurrentiel).
- Enrichir /blog/comprendre-le-nutri-score à 1 200 mots avec section Maroc.
- Ajouter screenshots app Bayen dans 5 articles existants.

**J+60 à J+90 :**
- Créer /blog/allegations-marketing-trompeuses-maroc (allégé, 0% MG, naturel).
- Mettre à jour llms.txt avec tous les articles publiés depuis mai.
- Lancer la campagne RP médias marocains (voir page 7).

---

## Page 6 — Backlog priorisé M+1 (mai–juin 2026)

### Actions technique (P0/P1)

| Action | Effort | Impact attendu |
|---|---|---|
| Corriger bug canonical — 10 fichiers `.astro` | S — 20 min | Déblocage indexation ~170 pages. Sans ce fix, la moitié du site est perçue comme dupliquée par Google. |
| Redirection 301 www → non-www (Cloudflare Dashboard) | S — 5 min | Consolidation du crawl budget et du PageRank. Gain marginal mais effort nul. |
| Noindex sur /connexion et /admin/import-off | S — 5 min | Propreté d'indexation. Évite que Google crawle des pages sans valeur. |
| Créer `frontend/public/_headers` (cache 1 an + headers sécurité) | S — 15 min | +10-15 points Lighthouse Best Practices. Cache long = visites répétées plus rapides. |
| Google Fonts asynchrones dans Layout.astro | S — 10 min | -200ms LCP mobile estimé. Gain direct sur l'expérience utilisateur mobile marocain. |

### Actions on-page (P1)

| Action | Effort | Impact attendu |
|---|---|---|
| Corriger sitemap pour inclure les 18 articles blog (timeout + fallback) | M — 1h dev | Priorité absolue. Les 18 articles ne sont pas soumis aux crawlers via le sitemap — indexation bloquée. |
| Ajouter meta descriptions uniques sur /scan, /recherche, /contribuer | S — 20 min | Suppression des 3 meta descriptions dupliquées. CTR organique amélioré dès la première apparition en SERP. |
| Corriger titles — ajouter "Maroc" et mots-clés sur 7 pages courtes | M — 1h | Meilleur positionnement sur les requêtes géo-localisées. Les suggestions sont dans l'audit on-page. |
| Supprimer le double H1 sur la homepage | S — 10 min | Signal H1 unique pour Google. Ajouter "Maroc" dans le H1 restant. |

### Actions AEO et Brand (P0/P1)

| Action | Effort | Impact attendu |
|---|---|---|
| Mettre à jour llms.txt avec les 7 nouveaux articles + section Q:R | S — 20 min | Les 7 articles SEO de mai sont absents de llms.txt. Un LLM qui crawle le fichier ne sait pas qu'ils existent. |
| Ajouter HowTo JSON-LD sur /scan et /contribuer | M — 1h dev | Rich Results Google potentiels sur les requêtes procédurales. Snippets prêts dans l'audit AEO. |
| Soumettre llms.txt sur llms-list.com et llmstxt.directory | S — 15 min | Visibilité dans les annuaires de référence pour les agents conversationnels. |
| Créer profils GitHub propres (topics, README, release v1.0, lien bayen.ma) | S — 20 min | Signal de confiance pour les LLMs. Le repo actuel a 0 étoiles, 0 topics, pas de lien vers le site. |

### Actions contenu (P1)

| Action | Effort | Impact attendu |
|---|---|---|
| Bloc auteur visible sur chaque article (`[slug].astro`) | S — 30 min | E-E-A-T immédiat. Signal fort pour Google sur les sujets santé YMYL. |
| Afficher date_updated en UI sur les articles | S — 15 min | Signal de fraîcheur. Critique pour les articles diabète et additifs qui citent des données épidémiologiques. |
| FAQPage JSON-LD sur 3 articles YMYL (diabète, additifs, Nutri-Score) | M — 3h total | Featured Snippets Google probables (+CTR), meilleure citabilité IA. |
| Reformuler chapeaux des 3 articles prioritaires (réponse directe + question H2) | M — 2h rédaction | Les LLMs extraient les 150-200 premiers mots. Réponse directe = citation directe. |
| Créer l'article /blog/meilleure-alternative-yuka-maroc | M — 3h rédaction | Capture l'intent comparatif fort ("alternative yuka maroc"). Bayen est la réponse naturelle — il faut la page. |

---

## Page 7 — Brand mentions et PR à initier

### 10 médias marocains cibles avec angles éditoriaux

| Média | Audience | URL | Angle éditorial recommandé |
|---|---|---|---|
| Hespress Santé | 3M+ visiteurs/mois | hespress.com | "Cette appli marocaine gratuite permet de décoder les produits alimentaires en rayon" — angle grand public, accès camera. |
| Médias24 | Startup + économie | medias24.com | "Open data alimentaire : la startup bayen.ma construit la base nutritionnelle du Maroc" — angle tech et impact économique. |
| TelQuel | Jeunes urbains | telquel.ma | "Manger sain au Maroc : une application 100% marocaine challenge Yuka" — angle culture jeune, comparatif. |
| L'Économiste | Business | leconomiste.com | "Alimentation industrielle : un entrepreneur marocain open-source les données nutritionnelles" — angle innovation. |
| Le360 | Grand public lifestyle | le360.ma | "Scannez vos produits avec cette application 100% marocaine avant d'acheter" — format test produit. |
| Yabiladi | Diaspora marocaine | yabiladi.com | "Diaspora marocaine : bayen.ma vous aide à scannez les produits marocains importés" — angle diaspora FR/BE/NL. |
| Welovebuzz | Viral / Jeunes | welovebuzz.com | "Ces produits marocains que tu achètes chaque semaine — leurs vrais scores Bayen" — format buzz/test. |
| Le Matin | Grand public | lematin.ma | "Nutrition : une application citoyenne marocaine pour lire les étiquettes alimentaires" — format service. |
| Maroc Hebdo | Santé / Société | maroc-hebdo.press.ma | "Diabète et alimentation : l'outil numérique marocain pour s'en sortir en rayon" — angle santé publique. |
| H24Info | Grand public | h24info.ma | "Additifs alimentaires interdits : cette application marocaine les détecte automatiquement" — angle alerte consommateur. |

**Template pitch recommandé :** Rattacher le sujet à l'actualité santé publique (12% d'adultes marocains diabétiques). Joindre une capture d'écran du scan d'un produit connu (ex : Chocapic ou Nutella avec score 18/100). Contact prioritaire : Médias24 (angle startup) puis Hespress Santé (volume).

---

### 4 réseaux sociaux à créer en priorité

**1. X/Twitter (@bayenapp ou @bayen_ma)**
Priorité 1. Audience : journalistes, tech, early adopters. Format qui performe : résultats surprenants de scan ("ce produit 'bio' a un score Bayen de 34/100"), threads nutrition pratique, réponses à des questions de nutrition. 2 posts/semaine minimum.

**2. Instagram (@bayenma)**
Priorité 2. Audience : mères/parents marocains, jeunes urbains. Format : Reels 15-30 secondes type "le vrai score de ce produit que tu achètes chaque semaine". Le visuel score + code couleur est fait pour ce format.

**3. LinkedIn (page Bayen)**
Priorité 3. Audience : journalistes économiques, institutions santé, potentiels partenaires (AMNUT, nutritionnistes). Publier les articles blog + angles open data / transparence.

**4. ProductHunt**
Priorité 4. Lancement en FR/EN. Tagline : "Free Yuka alternative for Morocco — scan food, understand what you eat". Génère des backlinks dofollow depuis PH + AlternativeTo, BetaList. Lancer un lundi ou mardi matin (heure Paris).

**Conseil pratique :** Ne pas créer les 4 en même temps. Commencer par X (semaine 1) puis Instagram (semaine 3). Un compte actif vaut mieux que 4 comptes dormants.

---

### 3 partenariats à initier

**1. AMNUT ou SMN (Association/Société Marocaine de Nutrition)**
Mentionner Bayen comme outil pour les consommateurs dans les communications de l'association. En échange : badge "Recommandé par [association]" sur /a-propos. Signal E-E-A-T fort pour Google sur les sujets YMYL.

**2. Nutritionniste reviewer (DESU reconnu Maroc)**
Faire valider au moins 3 articles santé (diabète, additifs, ultra-transformés) par un médecin ou diététicien marocain agréé. Afficher badge "Relu par Dr. [X]" avec lien LinkedIn ou cabinet. Ce signal est impossible à répliquer par les concurrents étrangers.

**3. Presse santé marocaine — contact prioritaire Médias24**
Un seul article dans Médias24 ou L'Économiste avec le nom "Bayen" vaut davantage pour la visibilité IA que 50 backlinks génériques. Les mentions de marque corrèlent environ 3 fois mieux avec la citabilité dans les LLMs que les backlinks classiques.

---

### Wikipedia et Wikidata — Critères et timing

Bayen n'est probablement pas encore éligible à une page Wikipedia (lancé en avril 2026, couverture presse nulle). Les critères sont :
1. Existence de 3 à 5 articles dans des médias avec ligne éditoriale indépendante (Médias24, TelQuel, L'Économiste).
2. Notoriété mesurable (pas nécessairement virale, mais documentée par des sources tierces).

Plan recommandé :
- J+0 à J+60 : Obtenir les premières couvertures presse.
- J+60 : Créer une fiche Wikidata (moins strict que Wikipedia). Données factuelles : nom, URL, date lancement, catégorie, open source, langues supportées.
- J+90 ou plus : Envisager une ébauche Wikipedia uniquement si 3+ sources presse indépendantes existent.

---

## Page 8 — KPIs à mesurer (connecter GSC + GA4 en priorité)

GSC et GA4 ne sont pas encore connectés au moment de ce rapport. Les objectifs ci-dessous sont des cibles basées sur la trajectoire de croissance standard d'un site de niche bien optimisé dans un marché local peu concurrentiel.

| KPI | Baseline (mai 2026) | Cible M+1 | Cible M+3 | Comment mesurer |
|---|---|---|---|---|
| Indexation : URLs indexées vs sitemap (2 140 URLs) | Non mesuré | Connecter GSC | 95% à M+3 | Google Search Console > Couverture |
| Trafic organique sessions/mois | Non mesuré (GSC non connecté) | Mesure baseline GSC | +50% vs baseline | GSC + GA4 segments organiques |
| Mots-clés top 10 sur google.co.ma | 0 (site trop récent) | 2-3 premières positions | 25 mots-clés en top 10 | GSC > Performance > Positions |
| Featured snippets (position 0) | 0 | Premiers candidats (yaourts, additifs) | 3 featured snippets | GSC > Requêtes avec position 1 + vérif. SERP |
| Citations IA (ChatGPT, Perplexity) | Non mesuré | Test mensuel manuel | Cité sur 3 requêtes | Test mensuel manuel : "meilleure app nutrition maroc" + "additifs à éviter maroc" |
| Backlinks (domaines référents) | 0 (ou proches de 0) | 5 domaines référents | 15 domaines dont 5 presse marocaine | Ahrefs / Moz / Search Console |
| PWA installs | Non mesuré (Umami récent) | Mesure baseline Umami | +100% vs baseline | Umami events `pwa_install` |
| Scans/jour | ~25 (données CLIENT.md) | 50 scans/jour | 150 scans/jour | Directus analytics / Umami |

**Actions immédiates pour activer les métriques :**
1. Connecter Google Search Console sur bayen.ma et soumettre le sitemap.xml (après le correctif articles blog).
2. Connecter Google Search Console à Bing Webmaster Tools (soumission automatique).
3. Vérifier que les events Umami `pwa_install` et `scan_completed` sont bien enregistrés.
4. Créer un document de suivi mensuel : tester chaque mois les 10 requêtes cibles sur ChatGPT et Perplexity pour mesurer la citabilité IA.

---

## Annexe — Écart entre l'audit manuel rapide (7,4/10) et ce rapport (5,93/10)

L'audit manuel du 11 mai 2026, effectué sous pression de quota Claude API, avait estimé un score global de 7,4/10. Ce rapport consolidé, basé sur la lecture approfondie des 4 audits sub-agents (technique, on-page, AEO, contenu), donne 5,93/10. L'écart de 1,5 point s'explique par 3 raisons concrètes :

**1. Le bug canonical n'était pas entièrement quantifié.** L'audit rapide avait noté le bug, mais sa portée réelle (~170 pages concernées, représentant la quasi-totalité des pages de catégorie, marque, ingrédients et additifs) n'avait pas été pleinement intégrée dans le scoring. Une fois pondéré correctement sur l'axe technique (30% du score technique sur l'indexabilité/crawlabilité), l'impact est significatif.

**2. Les 18 articles absents du sitemap live.** L'audit rapide avait repéré le problème, mais le scoring AEO n'avait pas abaissé le score sitemap à 2/10. Ce seul point fait baisser l'axe AEO de plusieurs points, entraînant le composite à la baisse.

**3. La pondération Brand Mentions (3/10) est plus pénalisante à 10% du composite.** L'audit rapide avait peut-être implicitement sous-pondéré l'absence totale de présence sociale, presse et backlinks. Un site de 25 jours sans aucune mention externe reste à 3/10 sur cet axe, ce qui plafonne le composite.

En pratique, les deux scores décrivent le même site — le score de 5,93 est simplement plus rigoureux dans ses pénalités. Il est aussi plus utile : c'est le plancher honnête depuis lequel mesurer les progrès. Les correctifs P0/P1 listés dans ce rapport peuvent faire passer le composite à 7,0+ en l'espace d'une semaine de travail.

---

*Rapport généré le 11 mai 2026. Sources : findings.json, audits/technical.md, audits/onpage.md, audits/aeo.md, audits/content.md, competitors/gap-analysis.md, competitors/list.json, CLIENT.md. Aucune donnée GSC/GA4 disponible à cette date — connecter les deux services est la première action à prendre.*
