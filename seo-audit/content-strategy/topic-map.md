# Topic Map — Bayen.ma
**Date** : 11 mai 2026  
**Slug client** : bayen  
**Modèle** : hub-and-spoke (pilier → clusters)

---

## Architecture globale

5 piliers couvrent l'ensemble de l'intention de recherche sur google.co.ma dans le domaine nutrition/alimentation au Maroc. Chaque pilier a une URL `/guide/<theme>` à créer à terme ou un article pilier existant renforcé. Les clusters sont des articles individuels qui lient vers le pilier + 2 articles frères minimum.

```
Bayen.ma
├── PILIER 1 : Décoder les étiquettes alimentaires
│   ├── lire-une-etiquette-nutritionnelle (existant)
│   ├── comprendre-le-nutri-score (existant)
│   ├── lire-etiquette-arabe-maroc-vocabulaire (existant — leader absolu)
│   ├── dlc-vs-ddm-dates-etiquettes-maroc (à créer — gap fort)
│   ├── allegations-marketing-trompeuses-maroc (à créer — gap fort)
│   └── additifs-a-eviter-maroc (existant)
│
├── PILIER 2 : Nutrition & Maladies chroniques au Maroc
│   ├── diabete-alimentation-maroc-produits-a-eviter (existant — YMYL)
│   ├── hypertension-alimentation-maroc (à créer)
│   ├── grossesse-aliments-eviter-maroc (à créer — YMYL fort)
│   ├── the-marocain-sucre-reduire-sans-perdre-tradition (existant)
│   └── tableau-glycemique-aliments-maroc (à créer)
│
├── PILIER 3 : Habitudes alimentaires & Budget Maroc
│   ├── manger-sain-budget-maroc (à créer — gap identifié)
│   ├── alternatives-snacks-industriels (existant)
│   ├── courses-methode-3-minutes (existant)
│   ├── petit-dejeuner-marocain-equilibre (à créer)
│   ├── marche-vs-supermarche-sante-budget (à créer — M+3)
│   └── bien-manger-ramadan (existant)
│
├── PILIER 4 : Catégories de produits marocains
│   ├── meilleurs-yaourts-maroc-comparatif (existant — leader)
│   ├── huile-palme-maroc-produits-impact-sante (existant)
│   ├── gouter-enfants-sain-maroc-idees (existant)
│   ├── nutrition-sport-maroc-produits-locaux (existant)
│   ├── huiles-olive-marocaines-comparatif (à créer)
│   └── rapport-nutrition-maroc-2026 (à créer — M+3, data-driven)
│
└── PILIER 5 : Bayen — Application & Méthodologie
    ├── meilleure-alternative-yuka-maroc (à créer — priorité P0)
    ├── pourquoi-eviter-ultra-transforme (existant — NOVA)
    ├── parler-nutrition-enfants (existant — à enrichir)
    ├── comment-scanner-produit-alimentaire-maroc (à créer)
    └── /methodologie (page statique existante — pilier d'autorité)
```

---

## Pilier 1 — Décoder les étiquettes alimentaires

**URL pilier cible** : `/guide/lire-etiquettes-alimentaires-maroc`  
**Volume agrégé estimé** : 1 200–2 800 req/mois  
**Mots-clés pilier** : "lire étiquette alimentaire Maroc", "comprendre étiquette", "tableau nutritionnel"

| Cluster | Slug | Statut | Mots-clés principaux | Volume estimé (MA) | Intent |
|---|---|---|---|---|---|
| Article pilier | `lire-une-etiquette-nutritionnelle` | Existant (7/10) | "lire étiquette nutritionnelle", "comprendre tableau nutritionnel" | 300-600 | Informationnel |
| Nutri-Score | `comprendre-le-nutri-score` | Existant (6/10) | "nutri-score explication", "nutri-score maroc" | 200-600 | Informationnel |
| Étiquettes arabes | `lire-etiquette-arabe-maroc-vocabulaire` | Existant (9/10) — leader | "lire étiquette arabe maroc" | 100-300 | Informationnel |
| DLC vs DDM | `dlc-vs-ddm-dates-etiquettes-maroc` | A créer — gap P0 | "dlc ddm différence", "date péremption maroc" | 200-500 | Informationnel |
| Allégations trompeuses | `allegations-marketing-trompeuses-maroc` | A créer — gap P1 | "allégé maroc", "0% mg trompe", "naturel étiquette" | 200-400 | Informationnel |
| Additifs | `additifs-a-eviter-maroc` | Existant (7/10) | "additifs alimentaires maroc", "E-codes danger" | 300-800 | Informationnel |

**Maillage interne Pilier 1 :**
- `lire-une-etiquette-nutritionnelle` → liens vers `comprendre-le-nutri-score`, `lire-etiquette-arabe-maroc-vocabulaire`, `additifs-a-eviter-maroc`
- `comprendre-le-nutri-score` → liens vers `lire-une-etiquette-nutritionnelle`, `pourquoi-eviter-ultra-transforme`, `meilleurs-yaourts-maroc-comparatif`
- `dlc-vs-ddm` → liens vers `lire-une-etiquette-nutritionnelle`, `allegations-marketing-trompeuses-maroc`
- `allegations-marketing-trompeuses-maroc` → liens vers `lire-une-etiquette-nutritionnelle`, `additifs-a-eviter-maroc`, `/scan`

---

## Pilier 2 — Nutrition & Maladies chroniques au Maroc

**URL pilier cible** : `/guide/nutrition-sante-maroc`  
**Volume agrégé estimé** : 2 000–5 000 req/mois  
**Mots-clés pilier** : "nutrition santé Maroc", "diabète alimentation Maroc", "alimentation maladies chroniques"

| Cluster | Slug | Statut | Mots-clés principaux | Volume estimé (MA) | Intent |
|---|---|---|---|---|---|
| Diabète | `diabete-alimentation-maroc-produits-a-eviter` | Existant (7/10) — YMYL | "diabète alimentation maroc", "diabétique produits éviter" | 500-1 500 | Informationnel/YMYL |
| Hypertension | `hypertension-alimentation-maroc` | A créer — P2 | "hypertension alimentation maroc", "tension sel maroc" | 400-1 000 | Informationnel/YMYL |
| Grossesse | `grossesse-aliments-eviter-maroc` | A créer — P2 | "grossesse aliments éviter maroc", "alimentation femme enceinte maroc" | 300-800 | Informationnel/YMYL |
| Thé & sucre | `the-marocain-sucre-reduire-sans-perdre-tradition` | Existant (8/10) — leader | "thé menthe sucre maroc", "réduire sucre thé marocain" | 200-500 | Informationnel |
| Tableau glycémique | `tableau-glycemique-aliments-maroc` | A créer — P1 (extension diabète) | "tableau glycémique", "index glycémique maroc" | 300-700 | Informationnel |

**Maillage interne Pilier 2 :**
- `diabete-alimentation-maroc` → liens vers `tableau-glycemique-aliments-maroc`, `lire-une-etiquette-nutritionnelle`, `/methodologie`
- `hypertension-alimentation-maroc` → liens vers `additifs-a-eviter-maroc`, `meilleurs-yaourts-maroc-comparatif`, `/scan`
- `grossesse-aliments-eviter-maroc` → liens vers `additifs-a-eviter-maroc`, `lire-une-etiquette-nutritionnelle`, `/a-propos`
- `tableau-glycemique-aliments-maroc` → liens vers `diabete-alimentation-maroc`, `the-marocain-sucre`, `bien-manger-ramadan`

---

## Pilier 3 — Habitudes alimentaires & Budget Maroc

**URL pilier cible** : `/guide/manger-sain-maroc`  
**Volume agrégé estimé** : 1 500–3 500 req/mois  
**Mots-clés pilier** : "manger sain Maroc", "alimentation équilibrée Maroc", "habitudes alimentaires"

| Cluster | Slug | Statut | Mots-clés principaux | Volume estimé (MA) | Intent |
|---|---|---|---|---|---|
| Budget | `manger-sain-budget-maroc` | A créer — gap P1 | "manger sain pas cher maroc", "alimentation budget maroc" | 300-700 | Informationnel |
| Snacks | `alternatives-snacks-industriels` | Existant (7/10) | "alternatives snacks sains maroc", "remplacer biscuits" | 200-500 | Informationnel |
| Courses | `courses-methode-3-minutes` | Existant (6/10) | "faire courses saines maroc", "méthode courses alimentation" | 150-400 | Informationnel |
| Petit-déjeuner | `petit-dejeuner-marocain-equilibre` | A créer — P2 | "petit déjeuner marocain équilibré", "msemen sain maroc" | 200-500 | Informationnel |
| Marché vs Supermarché | `marche-vs-supermarche-sante-budget` | A créer — M+3 | "marché souk vs supermarché maroc", "achats sains maroc" | 150-400 | Informationnel |
| Ramadan | `bien-manger-ramadan` | Existant (7/10) | "nutrition ramadan maroc", "ftour équilibré" | 1 000-5 000 (pic) | Saisonnier |

**Maillage interne Pilier 3 :**
- `manger-sain-budget-maroc` → liens vers `alternatives-snacks-industriels`, `courses-methode-3-minutes`, `petit-dejeuner-marocain-equilibre`
- `alternatives-snacks-industriels` → liens vers `gouter-enfants-sain-maroc-idees`, `manger-sain-budget-maroc`, `/scan`
- `bien-manger-ramadan` → liens vers `the-marocain-sucre`, `tableau-glycemique-aliments-maroc`, `lire-une-etiquette-nutritionnelle`
- `petit-dejeuner-marocain-equilibre` → liens vers `comprendre-le-nutri-score`, `meilleurs-yaourts-maroc-comparatif`, `manger-sain-budget-maroc`

---

## Pilier 4 — Catégories de produits marocains

**URL pilier cible** : `/guide/produits-alimentaires-maroc`  
**Volume agrégé estimé** : 900–2 500 req/mois  
**Mots-clés pilier** : "produits alimentaires maroc", "comparatif marques maroc", "meilleurs produits sains"

| Cluster | Slug | Statut | Mots-clés principaux | Volume estimé (MA) | Intent |
|---|---|---|---|---|---|
| Yaourts | `meilleurs-yaourts-maroc-comparatif` | Existant (8/10) — leader | "meilleur yaourt maroc", "comparatif jaouda centrale" | 100-300 | Commercial |
| Huile de palme | `huile-palme-maroc-produits-impact-sante` | Existant (7/10) | "huile palme maroc produits", "éviter huile palme" | 150-400 | Informationnel |
| Goûters enfants | `gouter-enfants-sain-maroc-idees` | Existant (7/10) | "goûter sain enfant maroc", "idées goûter équilibré" | 200-500 | Informationnel |
| Sport & nutrition | `nutrition-sport-maroc-produits-locaux` | Existant (7/10) | "nutrition sport maroc", "alimentation sportif maroc" | 150-400 | Informationnel |
| Huiles d'olive | `huiles-olive-marocaines-comparatif` | A créer — P2 | "meilleure huile olive maroc", "mabrouka cherifa volubilis" | 150-400 | Commercial |
| Rapport data Bayen | `rapport-nutrition-maroc-2026` | A créer — M+3 | "statistiques nutrition maroc", "produits alimentaires maroc données" | 200-600 | Informationnel |

**Maillage interne Pilier 4 :**
- `meilleurs-yaourts-maroc-comparatif` → liens vers `gouter-enfants-sain-maroc-idees`, `comprendre-le-nutri-score`, fiches produits Jaouda/Centrale
- `huile-palme-maroc` → liens vers `additifs-a-eviter-maroc`, `lire-une-etiquette-nutritionnelle`, `alternatives-snacks-industriels`
- `gouter-enfants-sain-maroc-idees` → liens vers `parler-nutrition-enfants`, `meilleurs-yaourts-maroc-comparatif`, `/scan`
- `huiles-olive-marocaines-comparatif` → liens vers `meilleurs-yaourts-maroc-comparatif`, `manger-sain-budget-maroc`, fiches produits Bayen

---

## Pilier 5 — Bayen : Application & Méthodologie

**URL pilier cible** : `/guide/utiliser-bayen` ou `/a-propos` + `/methodologie`  
**Volume agrégé estimé** : 500–1 500 req/mois  
**Mots-clés pilier** : "alternative yuka maroc", "scanner produits alimentaires maroc", "application nutrition maroc"

| Cluster | Slug | Statut | Mots-clés principaux | Volume estimé (MA) | Intent |
|---|---|---|---|---|---|
| Alternative Yuka | `meilleure-alternative-yuka-maroc` | A créer — P0 URGENT | "alternative yuka maroc", "yuka maroc gratuit" | 100-300 | Transactionnel fort |
| Ultra-transformés | `pourquoi-eviter-ultra-transforme` | Existant (8/10) | "aliments ultra-transformés dangers", "NOVA alimentation" | 200-500 | Informationnel |
| Parents & enfants | `parler-nutrition-enfants` | Existant (5/10) — à enrichir | "parler nutrition enfant", "alimentation saine enfants" | 100-300 | Informationnel |
| Guide scan | `comment-scanner-produit-alimentaire-maroc` | A créer — P1 | "comment scanner produit maroc", "utiliser bayen" | 150-300 | Navigationnel/Transactionnel |
| Méthodologie | `/methodologie` | Existant (9/10) — pilier | "comment calculé score bayen", "nutri-score algorithme" | 100-200 | Informationnel |

**Maillage interne Pilier 5 :**
- `meilleure-alternative-yuka-maroc` → liens vers `/scan`, `/methodologie`, `comprendre-le-nutri-score`, `additifs-a-eviter-maroc`
- `pourquoi-eviter-ultra-transforme` → liens vers `additifs-a-eviter-maroc`, `meilleurs-yaourts-maroc-comparatif`, `/methodologie`
- `comment-scanner-produit-alimentaire-maroc` → liens vers `/scan`, `meilleure-alternative-yuka-maroc`, `lire-une-etiquette-nutritionnelle`

---

## Matrice de maillage inter-piliers

| Article source | Article cible (pilier différent) | Raison |
|---|---|---|
| `diabete-alimentation-maroc` (P2) | `meilleurs-yaourts-maroc-comparatif` (P4) | Yaourts = produit concret dans l'article diabète |
| `diabete-alimentation-maroc` (P2) | `lire-une-etiquette-nutritionnelle` (P1) | Lire les sucres sur l'étiquette |
| `meilleure-alternative-yuka-maroc` (P5) | `lire-etiquette-arabe-maroc-vocabulaire` (P1) | Différenciateur Bayen vs Yuka |
| `manger-sain-budget-maroc` (P3) | `meilleurs-yaourts-maroc-comparatif` (P4) | Yaourt = produit budget key |
| `gouter-enfants` (P4) | `parler-nutrition-enfants` (P5) | Audience parents commune |
| `rapport-nutrition-maroc-2026` (P4) | `meilleure-alternative-yuka-maroc` (P5) | Data Bayen = argument différenciation |
| `bien-manger-ramadan` (P3) | `tableau-glycemique-aliments-maroc` (P2) | Glycémie ftour = lien naturel |
| `hypertension` (P2) | `meilleurs-yaourts-maroc-comparatif` (P4) | Sel dans les produits laitiers |

---

## Score d'opportunité par article à créer

Formule : `score = volume × intent_value × (1 − difficulty/100) × business_value`

- `intent_value` : transactionnel 1.0 / commercial 0.8 / informationnel 0.6 / navigationnel 0.3
- `business_value` : installs directes 1.0 / santé/YMYL 0.8 / lifestyle 0.6 / édito pur 0.4

| Article à créer | Volume (midpoint) | Intent | Difficulty | Business | Score |
|---|---|---|---|---|---|
| `meilleure-alternative-yuka-maroc` | 200 | 1.0 (transact.) | 40 | 1.0 | **120** |
| `dlc-vs-ddm-dates-etiquettes-maroc` | 350 | 0.6 | 25 | 0.6 | **94** |
| `tableau-glycemique-aliments-maroc` | 500 | 0.6 | 35 | 0.8 | **156** |
| `hypertension-alimentation-maroc` | 700 | 0.6 | 40 | 0.8 | **201** |
| `allegations-marketing-trompeuses-maroc` | 300 | 0.6 | 30 | 0.6 | **76** |
| `manger-sain-budget-maroc` | 500 | 0.6 | 50 | 0.6 | **90** |
| `grossesse-aliments-eviter-maroc` | 550 | 0.6 | 45 | 0.8 | **145** |
| `petit-dejeuner-marocain-equilibre` | 350 | 0.6 | 40 | 0.6 | **76** |
| `huiles-olive-marocaines-comparatif` | 275 | 0.8 | 35 | 0.6 | **86** |
| `rapport-nutrition-maroc-2026` | 400 | 0.6 | 20 | 0.8 | **154** |
| `comment-scanner-produit-alimentaire-maroc` | 225 | 0.3 | 35 | 1.0 | **44** |
| `marche-vs-supermarche-sante-budget` | 275 | 0.6 | 45 | 0.4 | **36** |

**Classement par priorité** : hypertension (201) > tableau glycémique (156) > rapport data (154) > grossesse (145) > alternative Yuka (120) > DLC/DDM (94) > manger sain budget (90) > huiles olive (86) > allégations (76) > petit déjeuner (76)

---

## Articles existants à retravailler (sous 7/10)

| Slug | Score actuel | Priorité refonte | Action principale |
|---|---|---|---|
| `comprendre-le-nutri-score` | 6/10 | M+1 | +400 mots, section "Au Maroc", FAQ schema, chapeau direct LLM |
| `courses-methode-3-minutes` | 6/10 | M+2 | +300 mots, localisation marques marocaines, sources neurosciences nommées |
| `parler-nutrition-enfants` | 5/10 | M+2 | Sources scientifiques (TCA), reviewer médical, +400 mots |
| `bayen-est-en-ligne` | 4/10 | M+3 (ou supprimer) | Transformer en page "À propos du lancement" ou rediriger vers /a-propos |
| `le-reflexe-bayen` | 3/10 | M+2 | Enrichir avec 5 cas d'usage scans réels ou fusionner avec `comment-scanner-produit-alimentaire-maroc` |
