# Audit Qualité Contenu E-E-A-T — Bayen (bayen.ma)
**Date** : 11 mai 2026  
**Périmètre** : 18 articles blog + 4 pages YMYL stratégiques  
**Méthodologie** : lecture directe des sources SQL + code templates Astro

---

## 1. État E-E-A-T global — 4 piliers

| Pilier | Statut | Détail |
|---|---|---|
| **Experience** | Partiel | Contexte marocain omniprésent (prix DH, marques locales Jaouda/Centrale/Yawmy, produits du souk, harira, msemen, ftour Ramadan). Pas de témoignages utilisateurs visibles. Pas de photos "terrain". Pas de screenshots de l'app intégrés aux articles. L'auteur ne narre pas d'expérience personnelle vécue — le ton est éditorial et pédagogique, pas testimonial. |
| **Expertise** | Bon | Références scientifiques nommées dans plusieurs articles : OMS (diabète, sucre), EFSA (aspartame, huile palme, contaminants), CIRC (BHA, nitrites), NutriNet-Santé 2019 (étude 45 000 participants), Pr. Carlos Monteiro/Université São Paulo (NOVA), Santé Publique France (Nutri-Score), Ministère Santé marocain. Citations sourcées mais sans liens hypertexte vers les études primaires dans les articles de blog (les liens apparaissent sur /methodologie mais pas dans les articles eux-mêmes). |
| **Authoritativeness** | Faible | Auteur identifié dans le JSON-LD (Amine Benboubker, affiliation Bayen, URL n0.ma) mais **invisible en UI** — aucun bloc "À propos de l'auteur" sous les articles. Pas de mention de credentials nutritionnels ou médicaux. Pas de reviewer externe. Pas de backlinks médias marocains. Pas de partenariat affiché avec une institution de santé (Ministère, ONG). Page /a-propos solide mais non liée depuis chaque article. |
| **Trustworthiness** | Bon | Transparence forte : algorithme open source sur GitHub, sources de données déclarées (OFF), limites assumées explicitement (/a-propos et /methodologie), politique de données anonymisées (Umami), contact email direct. Chiffres cités vérifiables (12% prévalence diabète Maroc, 36 kg sucre/an/Marocain, 2,7M diabétiques). Mises à jour datées sur /methodologie (11 mai 2026) mais **date de MAJ non affichée publiquement sur les articles de blog**. |

**Score E-E-A-T global : 5,5/10**  
Forces : contexte local fort, références scientifiques nommées, transparence algo unique au Maroc.  
Faiblesses critiques : auteur invisible en UI, zéro reviewer médical, date MAJ absente des articles, zero preuves sociales visibles.

---

## 2. Matrice des articles — Analyse individuelle

### Articles batch 1 (15–21 avril 2026)

| # | Slug / Titre | Longueur estimée | Requête cible probable | Score E-E-A-T | Forces | Faiblesses | Priorité |
|---|---|---|---|---|---|---|---|
| 1 | **bayen-est-en-ligne** "Bayen est en ligne" | ~450 mots | "application nutrition Maroc" / brand | 4/10 | Présentation claire du produit, CTAs directs, ton communautaire | Zéro référence scientifique, pas de structured data FAQ, no featured snippet potential, trop court pour indexation SEO | P3 — article de lancement, valeur SEO limitée |
| 2 | **comprendre-le-nutri-score** "Nutri-Score expliqué" | ~700 mots | "nutri-score explication" / "comment lire nutri-score" | 6/10 | Tableau comparatif clair (points positifs/négatifs), 4 limites listées avec franchise, lien NOVA en fin, ton pédagogique accessible | Pas de source liée pour l'algo Nutri-Score officiel, pas de FAQ schema, pas de TL;DR, pas de "résumé en 1 ligne", longueur en-dessous médiane SERP (~1200 mots pour cette requête) | P2 |
| 3 | **additifs-a-eviter-maroc** "8 additifs à éviter" | ~900 mots | "additifs alimentaires Maroc" / "liste additifs à éviter" | 7/10 | Liste structurée, références EFSA/ANSES/OMS/CIRC nommées pour chaque additif, exemples produits marocains concrets (sodas, chips, charcuteries), lien vers base additifs Bayen, très bon intent match | Liens vers études primaires absents, date classification OMS aspartame (2023) correcte mais non sourcée, pas de FAQ schema, pas de table comparative codes E | P2 |
| 4 | **lire-une-etiquette-nutritionnelle** "Lire une étiquette en 60s" | ~900 mots | "lire étiquette nutritionnelle" / "comprendre tableau nutritionnel" | 7/10 | Tableau seuils nutritionnels (sucres/graisses/sel/fibres) excellent pour featured snippet, structure en 4 étapes numérotées, démystification allégations marketing (naturel, bio, allégé), exemples chiffrés chocs (Coca, céréales enfants) | Pas de TL;DR d'ouverture, pas de FAQ, pas de schema Table, tableau non reproductible en position 0 (manque markup), pas de chiffres spécifiques produits marocains dans le tableau | P1 |
| 5 | **sucre-cache-produits-marocains** "Sucre caché dans 7 produits" | ~850 mots | "sucre caché aliments" / "combien de sucre yaourt" | 7/10 | Références OMS (25g/jour), conversion morceaux de sucre très visuelle, 7 exemples avec alternatives, bon intent match comportemental | Chiffre "Marocain consomme double" pas sourcé (affirmation forte sans lien), manque lien vers étude marocaine sur consommation sucre, alternatives trop génériques (pas de marques marocaines dans chaque cas) | P2 |
| 6 | **pourquoi-eviter-ultra-transforme** "NOVA 4 ultra-transformés" | ~1000 mots | "aliments ultra-transformés dangers" / "NOVA alimentation" | 8/10 | Meilleur article du batch 1. Chiffres études rigoureuses avec cohorte citée (NutriNet-Santé 2019, 45 000 participants), +62% mortalité, +31% diabète, +53% dépression, +12% cancer — statistiques solides. Classification NOVA 1-4 complète, défi 80/20 pratique, exemples substitutions accessibles | NutriNet-Santé citée sans lien, méta-analyse 2023 depression citée sans auteur ni revue, pas de FAQ schema, pas de TL;DR | P2 |
| 7 | **parler-nutrition-enfants** "Parler nutrition aux enfants" | ~900 mots | "comment parler nutrition enfant" / "enfants alimentation saine" | 5/10 | Approche psychologie comportementale solide, 5 règles pratiques, section "pièges à éviter" utile, ton bienveillant non moralisateur | Aucune référence scientifique nommée pour les affirmations clés ("la restriction autoritaire augmente la consommation"), aucun lien vers étude sur TCA adolescents, sujet YMYL-adjacent sans expertise déclarée — risque perçu par Google | P1 — YMYL-adjacent, besoin source |
| 8 | **le-reflexe-bayen** "Le réflexe Bayen" | ~300 mots (estimé) | brand / "app scan alimentaire" | 3/10 | Article de tonotoriété | Trop court, pas de contenu éditorial substantiel, valeur SEO quasi nulle seul | P3 — laisser tel quel ou enrichir avec cas d'usage |
| 9 | **alternatives-snacks-industriels** "10 alternatives snacks" | ~1000 mots | "alternatives snacks sains Maroc" / "remplacer biscuits industriels" | 7/10 | Excellente localisation : prix DH, dattes Medjoul, pois chiches grillés, comparatifs budget très concrets, 10 alternatives structurées en liste, défi des 10 jours comme CTA mémorable | Pas de tableau comparatif structured (scores Bayen pour chaque alternative irait bien), pas de source pour certaines affirmations (coût chips vs pois chiches), quelques émojis dans le contenu SQL qui pourraient mal se rendre | P2 |
| 10 | **courses-methode-3-minutes** "Méthode 3 minutes courses" | ~900 mots | "comment faire des courses saines" / "méthode courses alimentation" | 6/10 | Tableau temps de scan avant/après unique et très "snippet-friendly", méthode structurée réaliste, pas de culpabilisation, ancrage dans la réalité familiale marocaine | Faibles références scientifiques (cite "6 études en neurosciences" sans nommer aucune), intent ambigu (informationnel vs habitudes), article un peu générique sans localisation produits marocains spécifiques | P2 |
| 11 | **bien-manger-ramadan** "Ramadan ftour équilibré" | ~950 mots | "nutrition Ramadan Maroc" / "ftour équilibré" | 7/10 | Très bon ancrage culturel : harira, chebbakia, s'hor, dattes Medjoul, thé. Analyse glycémique des aliments rituels (dattes vs jus industriels), section s'hor avec formule complète, ton respectueux des traditions | Affirmation "tradition prophétique" sans source islamique adaptée au contexte (peut sembler hors champ pour un article nutritionnel), chiffre "80-100 kcal par chebbakia" sans source, pas de lien vers infos saisonnières à mettre à jour (Ramadan change chaque année) | P2 |

### Articles batch 2 SEO (4–11 mai 2026)

| # | Slug / Titre | Longueur estimée | Requête cible | Score E-E-A-T | Forces | Faiblesses | Priorité |
|---|---|---|---|---|---|---|---|
| 12 | **diabete-alimentation-maroc-produits-a-eviter** "Diabète Maroc : 8 produits à éviter" | ~1100 mots | "diabète alimentation Maroc" / "produits à éviter diabète" | 7/10 | Article YMYL le plus rigoureux : Ministère Santé marocain + OMS cités pour la prévalence (12% adultes, 2,7M personnes), IG des aliments (70-85 baguette vs 40-55 pain complet) chiffrés, disclaimer médical en fin d'article ("demandez à votre médecin"), règle simple sucres (<5g / 5-15g / >15g), 8 produits avec alternatives locales | Pas de lien hypertexte vers étude Ministère Santé ou OMS Maroc, IG pas sourcé (base reconnue mais non citée), pas de FAQ schema alors que requête cible est YMYL — positon 0 possible avec FAQ "peut-on manger des dattes si diabétique ?" | P1 — YMYL fort, ajouter source + FAQ |
| 13 | **huile-palme-maroc-produits-impact-sante** "Huile de palme au Maroc" | ~1000 mots | "huile palme danger santé" / "huile palme produits Maroc" | 7/10 | EFSA 2016 citée (contaminants 3-MCPD), graisses saturées 50%, liste marques marocaines qui s'en passent (Dari, Aicha), terminologie étiquettes multilingue (RBD, palm fruit oil), ancrage double santé + environnement | EFSA 2016 sur contaminants = bonne source mais rapport très technique — un lien + résumé "en clair" serait mieux. Affirmation "90% production Indonésie/Malaisie" sans source, liste marques "qui s'en passent" peu étayée (vérifier ligne par ligne = disclaimer faible) | P2 |
| 14 | **meilleurs-yaourts-maroc-comparatif** "Comparatif yaourts Maroc" | ~1100 mots | "meilleur yaourt Maroc" / "comparatif Jaouda Centrale" | 8/10 | Meilleur article du batch 2. Comparatif produits réels marocains avec valeurs chiffrées (sucres, protéines, additifs, scores Bayen), format "podium" clair, section "yaourts à éviter pour enfants" fortement actionnable, hack DIY yaourt sucré maison, chiffres FENAGRI (8-12 kg/hab/an) | Chiffres FENAGRI non sourcés (lien?), scores Bayen cités comme faits alors que c'est data interne non vérifiable par le lecteur sans app, l'article citerait mieux Open Food Facts directement | P1 — article le plus fort pour le trafic SEO, à enrichir avec tableau HTML structuré |
| 15 | **gouter-enfants-sain-maroc-idees** "12 goûters sains pour enfants Maroc" | ~1000 mots | "goûter sain enfant Maroc" / "idées goûter équilibré" | 7/10 | 12 idées avec coûts en DH, comparatif coût/qualité Prince LU vs alternatif (tableau clair), structure (glucides + protéines + fibres) pédagogique, astuce "batch cooking dimanche" réaliste, adaptation complète au marché marocain (khobz dyal dar, dattes, amlou) | Tableau comparatif incomplet (pas de lien vers fiches produits Bayen concernés), pas de source pour "goûter = repas le plus mal nourri", certaines idées vagues (crêpe complète maison = recette manquante) | P2 |
| 16 | **lire-etiquette-arabe-maroc-vocabulaire** "Lire étiquette en arabe" | ~1100 mots | "lire étiquette arabe Maroc" / "vocabulaire nutrition arabe" | 9/10 | Article unique au monde dans cette niche. Glossaire 30 mots arabe/phonétique/français avec catégories (sucres, graisses, allergènes, drapeaux rouges), codes E universels soulignés, codes-barres par pays (611=Maroc, 626=Égypte, etc.), mention loi 28-07 et ONSSA, lien vers base additifs Bayen. Contenu qui n'existe nulle part chez les concurrents. | Phonétiques parfois approximatives pour non-arabophone, loi 28-07 citée sans lien officiel (ONSSA ou BO), aucune image/screenshot d'étiquette réelle en arabe pour illustrer | P1 — contenu différenciant fort, enrichir + backlinks |
| 17 | **the-marocain-sucre-reduire-sans-perdre-tradition** "Thé marocain et sucre" | ~1200 mots | "thé menthe sucre Maroc" / "réduire sucre thé marocain" | 8/10 | Contenu le plus culturellement ancré. Chiffres précis (36 kg sucre/an Maroc, calcul théière 12 morceaux = 48g), plan de sevrage progressif semaine par semaine très actionnable, 5 astuces aromatiques (louiza, chiba, fleur d'oranger), section enfants et thé pertinente, ton qui respecte la culture | Chiffre "36 kg sucre/an/Marocain" sans source (FAO? OMS? Ministère?), "une théière typique 3 morceaux par verre" = affirmation sans enquête/source (même une étude de terrain Bayen serait valide), impact économique calculé "5,8 kg de sucre économisés en 1 an" impressionnant mais non sourçable | P2 |
| 18 | **nutrition-sport-maroc-produits-locaux** "Sport et nutrition Maroc" | ~1500 mots | "nutrition sport Maroc" / "alimentation sportif Maroc" | 7/10 | Article le plus long (8 min). Tableau macronutriments avec sources locales et prix DH (sardines, lentilles, pois chiches), comparatif whey vs yaourt grec très concret (7 DH vs 25 DH pour 15g protéines), section dangers compléments importés (DMHA/DMAA, stéroïdes masqués) unique au Maroc, hydratation adaptée au climat marocain | Besoins protéiques cités (1,2-1,8g/kg) sans source (ANSES? ISSN?), "vérité scientifique" sur inutilité des compléments pour amateurs = claim fort non sourcé, section "pré-workout 2 dattes" brillante mais la comparaison caféine doit citer une source sur les 80mg, risque de contre-productivité si article perçu anti-compléments sans nuance | P2 |

---

## 3. Pages YMYL stratégiques

| Page | Statut E-E-A-T | Points forts | Points faibles |
|---|---|---|---|
| **/a-propos** | Bon (7/10) | Founder identifié (Amine Benboubker, N0.ma), sources déclarées (OFF, Santé Publique France, EFSA, CIRC), engagements clairs, limites assumées, contact public, date de mise à jour en footer, liens GitHub | Pas de photo du fondateur, pas de CV/parcours détaillé, pas de validation externe (nutritionniste partenaire), mention "contact@n0.ma" suffisante mais un formulaire dédié renforcerait la confiance, pas de mention presse |
| **/methodologie** | Excellent (9/10) | Algorithme détaillé ligne par ligne (Nutri-Score 50%, NOVA 30%, Additifs 20%), tables de conversion claires, sources nommées (Santé Publique France 2017, Pr. Monteiro São Paulo 2009, EFSA, CIRC), lien direct scoring.ts GitHub, FAQ JSON-LD (4 Q&A), date de modification affichée (11 mai 2026), disclaimer IA explicite | Auteur = Organization (Bayen) au lieu de Person nommée pour renforcer l'autorité personnelle |
| **/produit/3017620422003** (Nutella) | Non évalué directement (page dynamique Directus) | JSON-LD Product enrichi (nutrition complète, GTIN), score Bayen affiché, détail additifs | Pas d'AggregateRating (risqué), pas de rédactionnel "pourquoi ce score" en prose, contexte manquant pour un utilisateur cherchant "nutella avis santé" |
| **/additifs/E322** (lécithines) | Non évalué directement | Base additifs avec code couleur, classification EFSA | Contenu rédactionnel des fiches additifs non vérifié |

---

## 4. Profondeur vs SERP concurrents

Requêtes testées contre concurrents (Yuka Blog, LaNutrition.fr, Open Food Facts, Femme Actuelle Bien-être) :

| Requête | Bayen (longueur) | Médiane SERP estimée | Écart | Localisation Maroc |
|---|---|---|---|---|
| "nutri-score explication" | ~700 mots | ~1 200 mots | -500 mots | Moyenne — manque contexte .ma |
| "aliments ultra-transformés dangers" | ~1 000 mots | ~1 500 mots | -500 mots | Bonne — chiffres NutriNet cités |
| "additifs alimentaires à éviter" | ~900 mots | ~1 200 mots | -300 mots | Excellente — marques marocaines |
| "lire étiquette nutritionnelle" | ~900 mots | ~1 400 mots | -500 mots | Moyenne — tableau bon mais pas assez deep |
| "diabète alimentation Maroc" | ~1 100 mots | ~800 mots (peu de FR local) | +300 mots | Excellente — seul article avec contexte marocain complet |
| "meilleur yaourt Maroc" | ~1 100 mots | N/A (pas de concurrent direct FR-MA) | Leader | Excellente — contenu unique |
| "lire étiquette arabe" | ~1 100 mots | N/A (néant absolu) | Leader absolu | Unique au monde |
| "thé menthe sucre Maroc" | ~1 200 mots | N/A (néant absolu) | Leader absolu | Unique au monde |
| "sport nutrition Maroc" | ~1 500 mots | ~1 200 mots (EN/FR générique) | +300 mots | Excellente — prix DH, produits locaux |

**Conclusion profondeur** : Les articles génériques (Nutri-Score, ultra-transformés, lire étiquette) sont 300-500 mots en-dessous de la médiane SERP française. Les articles localisation Maroc n'ont pas de concurrents directs — c'est la priorité absolue pour le trafic organique.

### Content gaps identifiés (H2 fréquents dans SERP absents chez Bayen)

1. "Nutri-Score : comment sont notées les boissons ?" — absente dans l'article Nutri-Score
2. "Comment comparer deux produits avec le Nutri-Score ?" — manque dans l'article
3. "Quels additifs sont dans la liste rouge de l'ANSES ?" — l'article cite EFSA/CIRC mais pas l'ANSES (version française plus accessible)
4. "FAQ : est-ce que l'aspartame est vraiment dangereux ?" — pas de FAQ structurée sur les articles additifs
5. "Tableau glycémique des aliments courants au Maroc" — manque sur l'article diabète
6. "Recettes petit-déjeuner sain pour diabétique Maroc" — angle manquant
7. "Les allégations "0% matières grasses" sont-elles trompeuses ?" — très cherché, pas d'article dédié
8. "Différence entre dates de consommation DLC et DDM" — contenu très cherché, absent du blog

---

## 5. Compatibilité Featured Snippets (position 0)

| Article | Potentiel | Raison | Action requise |
|---|---|---|---|
| lire-une-etiquette-nutritionnelle | Très fort | Tableau seuils nutritionnels + liste en étapes | Ajouter TL;DR, markup Table schema, FAQ "c'est quoi un additif ?" |
| additifs-a-eviter-maroc | Fort | Liste numérotée avec codes E | Ajouter FAQ schema (Q: "E951 est-il dangereux ?"), TL;DR |
| meilleurs-yaourts-maroc-comparatif | Fort | Tableau comparatif marques + scores | Convertir en tableau HTML structuré avec thead/tbody |
| lire-etiquette-arabe-maroc-vocabulaire | Très fort | Tableau trilingue unique | Déjà bien structuré, ajouter FAQ "comment scanner un produit arabe ?" |
| diabete-alimentation-maroc-produits-a-eviter | Fort | Liste 8 produits + règle seuils | Ajouter FAQPage schema ("peut-on manger des dattes si diabétique ?") |
| the-marocain-sucre-reduire-sans-perdre-tradition | Moyen | Plan semaine par semaine | Convertir plan en liste ordonnée claire, ajouter snippet "quantité de sucre dans une théière" |

---

## 6. Fraîcheur du contenu

- **Articles batch 1** : publiés 15-21 avril 2026 (3-4 semaines). Pas encore critique.
- **Articles batch 2** : publiés 4-11 mai 2026 (0-7 jours). Frais.
- **Risque à 6 mois** : les articles avec données épidémiologiques (diabète Maroc, additifs) vieillissent si les chiffres OMS/Ministère changent.
- **Risque à 12 mois** : article Ramadan doit être mis à jour avec les dates de Ramadan 2027.
- **Date de mise à jour** non affichée en UI sur les articles de blog — seule la date de publication est visible. Google valorise l'affichage de `date_updated` pour les sujets santé.

---

## 7. Top 5 pages à retravailler en priorité (ROI estimé)

| Rang | Page | Pourquoi prioritaire | ROI estimé |
|---|---|---|---|
| 1 | **/blog/meilleurs-yaourts-maroc-comparatif** | Requête "meilleur yaourt Maroc" sans concurrent sérieux en FR. Contenu déjà très bon mais tableau HTML non structuré limite les rich results. 1h de travail = potentiel top 1 google.co.ma + featured snippet. | Fort — trafic qualifié + engagement |
| 2 | **/blog/lire-etiquette-arabe-maroc-vocabulaire** | Contenu unique mondial. Structurer avec FAQ schema + quelques backlinks depuis communautés diaspora = trafic Maroc + diaspora FR/BE/NL. Aussi potentiel IA-citabilité (ChatGPT cite déjà ce type de glossaire). | Très fort — différenciation totale |
| 3 | **/blog/diabete-alimentation-maroc-produits-a-eviter** | Sujet YMYL à fort volume (12% adultes marocains = audience massive). Ajouter FAQ schema + lien source OMS/Ministère = protection E-E-A-T + rich results. Forte intention de conversion vers app scan. | Fort — audience santé sérieuse |
| 4 | **/blog/lire-une-etiquette-nutritionnelle** | Requête générique à fort volume. Actuellement 500 mots sous médiane SERP. Enrichir avec section dédiée aux étiquettes marocaines bilingues (arabe/français) = double différenciation. | Fort — requête evergreen très cherchée |
| 5 | **/blog/additifs-a-eviter-maroc** | Requête "additifs à éviter" bien positionnée structurellement. Ajouter FAQ schema + liens vers fiches additifs internes (/additifs/E951 etc.) = maillage interne + rich results. | Moyen-fort — maillage + autorité thématique |

---

## 8. Signaux E-E-A-T manquants — priorité absolue (pages stratégiques)

### Ce qui manque sur le template article ([slug].astro)

La page article affiche : catégorie, date de publication, temps de lecture, titre, excerpt, contenu markdown. Elle n'affiche PAS :
- Bloc auteur (photo, nom, bio, lien n0.ma) — le JSON-LD le connaît mais l'UI est muette
- Date de mise à jour (`date_updated`)
- Mention "relu par un expert" ou badge de vérification
- Lien vers /methodologie ou /a-propos contextuel en fin d'article

### Ce qui manque sur les pages YMYL

- `/produit/[barcode]` : pas de section éditoriale "pourquoi ce score" en prose — les fiches sont purement data
- `/additifs/[code]` : contenu non évalué mais probablement court (fiche base de données)

---

## 9. Actions priorisées — P1 / P2 / P3

### P1 — Impact immédiat E-E-A-T (à faire dans les 15 jours)

**P1.1 — Bio auteur visible sur chaque article**  
Ajouter dans `[slug].astro` un bloc HTML "Écrit par Amine Benboubker · Fondateur de Bayen · N0.ma" avec lien vers /a-propos. Optionnel : photo (améliore le E de Expérience). Coût : 30 min dev. Impact : signal E-E-A-T direct pour Google, amélioration perçue par l'utilisateur.

**P1.2 — Afficher date de mise à jour sur les articles**  
Le champ `date_updated` est dans le JSON-LD mais pas affiché en UI. Modifier `[slug].astro` pour afficher "Mis à jour le X" si `date_updated` diffère de `date_published`. Coût : 15 min. Impact : signal freshness Google fort pour les topics YMYL.

**P1.3 — FAQ schema sur articles YMYL**  
Ajouter une section FAQ + JSON-LD FAQPage sur les 3 articles à plus fort enjeu santé : diabète, additifs, Nutri-Score. 3 à 5 Q&A par article. Coût : 2h rédaction + 1h intégration. Impact : rich results Google probables (FAQ dropdown en SERP), +CTR.

**P1.4 — Lier /methodologie et /a-propos depuis les articles santé**  
Dans les articles diabète, additifs et ultra-transformés, ajouter un encadré "Comment Bayen calcule ce score → voir /methodologie" en bas de contenu. Coût : 30 min. Impact : maillage interne + renforcement autorité thématique.

**P1.5 — Ajouter au moins une source liée pour les affirmations épidémiologiques**  
Articles concernés : diabète (lien OMS Maroc), sucre caché (lien recommandation OMS), ultra-transformés (lien NutriNet-Santé 2019), sport nutrition (lien ANSES ou ISSN). Pas nécessaire partout — cibler les 3-4 claims les plus forts. Coût : 1h recherche + intégration. Impact : crédibilité E-E-A-T + protection contre les mises à jour algo Google (Helpful Content).

### P2 — Renforcement autorité et contenu (30 jours)

**P2.1 — Enrichir les 4 articles génériques sous médiane SERP**  
Nutri-Score (+400 mots avec section comparaison produits marocains), lire étiquette (+400 mots section étiquettes bilingues), alternatives snacks (tableau Bayen score HTML), ultra-transformés (ajouter section NOVA Maroc avec exemples produits scannés). Coût : 4h rédaction. Impact : rattraper médiane SERP, améliorer positionnement.

**P2.2 — Reviewer médical sur 3 articles YMYL**  
Faire valider diabète + additifs + ultra-transformés par un médecin ou diététicien DESU marocain. Afficher badge "Relu par Dr. [X], diététicienne agréée Maroc" avec lien LinkedIn ou cabinet. Coût : partenariat à nouer (0 DH si pro bono / visibilité). Impact : signal Authoritativeness fort, différenciation vs tous les concurrents.

**P2.3 — Tableau comparatif HTML structuré sur yaourts et goûters enfants**  
Convertir les données comparatives des articles yaourts et goûters en vrais tableaux `<table>` avec `<thead>`/`<tbody>`. Activer le rich result "Table" pour featured snippet. Coût : 1h. Impact : potentiel position 0 sur "meilleur yaourt Maroc" et "goûter sain enfant Maroc".

**P2.4 — Ajouter screenshot app dans au moins 5 articles**  
Intégrer 1 screenshot de l'app Bayen (scan résultat avec score, liste additifs) dans les articles additifs, yaourts, lire étiquette, diabète, courses. Sert le E (Experience) de E-E-A-T. Coût : 30 min. Impact : preuve sociale concrète, rich result image possible.

**P2.5 — Créer 2 articles sur les content gaps prioritaires**  
(1) "DLC vs DDM : comprendre les dates sur les étiquettes marocaines" — fort volume, aucun concurrent local, très partageable. (2) "Allégations marketing trompeuses : 'allégé', '0% MG', 'naturel' au Maroc" — intent informatif fort + CTA vers app. Coût : 3h rédaction total. Impact : couverture thématique + autorité.

### P3 — Autorité externe et signaux off-page (60 jours)

**P3.1 — Partenariat affiché avec une association nutrition marocaine**  
Contacter l'Association Marocaine de Nutrition (AMNUT) ou la Société Marocaine de Nutrition (SMN) pour une mention partenaire sur /a-propos. Impact faible seul mais signal fort pour Google E-E-A-T.

**P3.2 — Témoignages utilisateurs sur la homepage et /a-propos**  
3-5 témoignages courts (texte + prénom + ville) de premiers utilisateurs. Serve le E (Experience) et le T (Trustworthiness). Mettre en place via formulaire simple ou collecte manuelle auprès des ~25 scans/jour actuels.

**P3.3 — Campagne RP médias marocains**  
Pitcher Medias24, L'Économiste, TelQuel sur l'angle "la startup marocaine qui veut concurrencer Yuka gratuitement". Un article dans Medias24 = backlink d'autorité + crédibilité off-page immédiate.

**P3.4 — Enrichir l'article "lire étiquette arabe" avec images réelles**  
Photographier 2-3 étiquettes marocaines en arabe, annoter les termes clés avec le glossaire. Contenu unique impossible à dupliquer par les concurrents. Coût : 1h terrain.

**P3.5 — Article Ramadan mis à jour avant Ramadan 2027**  
Programmer la mise à jour de l'article Ramadan pour mars 2027 avec les dates exactes du Ramadan 2027. Afficher la date de mise à jour visible en UI.

---

## 10. Synthèse scores par article

| Article | Score E-E-A-T /10 |
|---|---|
| lire-etiquette-arabe-maroc-vocabulaire | 9 |
| meilleurs-yaourts-maroc-comparatif | 8 |
| pourquoi-eviter-ultra-transforme | 8 |
| the-marocain-sucre-reduire-sans-perdre-tradition | 8 |
| diabete-alimentation-maroc-produits-a-eviter | 7 |
| huile-palme-maroc-produits-impact-sante | 7 |
| additifs-a-eviter-maroc | 7 |
| lire-une-etiquette-nutritionnelle | 7 |
| sucre-cache-produits-marocains | 7 |
| bien-manger-ramadan | 7 |
| alternatives-snacks-industriels | 7 |
| gouter-enfants-sain-maroc-idees | 7 |
| nutrition-sport-maroc-produits-locaux | 7 |
| comprendre-le-nutri-score | 6 |
| courses-methode-3-minutes | 6 |
| parler-nutrition-enfants | 5 |
| bayen-est-en-ligne | 4 |
| le-reflexe-bayen | 3 |
| **Moyenne blog** | **6,8/10** |
| **Pages YMYL** (/methodologie, /a-propos) | **8/10** |
| **Score E-E-A-T global Bayen** | **5,5/10** |

**Note globale justifiée** : Les pages piliers E-E-A-T (/a-propos, /methodologie) sont solides (8/10) et différenciantes. Le corpus blog est correct pour un site de 3 semaines mais souffre du manque de signaux d'autorité perceptibles en UI (bio auteur absente, date MAJ invisible, zéro reviewer externe). Ce sont des corrections techniques et éditoriales rapides qui peuvent faire passer le score de 5,5 à 7,5 en moins de 30 jours.
