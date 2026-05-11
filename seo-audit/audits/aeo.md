# Audit AEO / Citabilité IA — Bayen.ma
**Date** : 11 mai 2026  
**Auditeur** : sub-agent SEO-AEO  
**Périmètre** : Answer Engine Optimization, citabilité LLM, brand mentions

---

## Scores synthèse

| Pilier | Score | Tendance |
|---|---|---|
| AEO Citabilité globale | **6 / 10** | +4 pts vs avant mai (score initial estimé 2/10) |
| Brand Mentions | **3 / 10** | inchangé depuis lancement |

---

## Pilier 1 — llms.txt

### Statut : présent, servi, format valide

`https://bayen.ma/llms.txt` est accessible et retourne un contenu Markdown bien structuré avec :
- Description de la mission (1 paragraphe dense, bon)
- Section "Ressources principales" avec 7 liens (scan, recherche, additifs, blog, analyser-repas, contribuer)
- Section "Articles éditoriaux clés" avec 8 articles pivots
- Section "Méthodologie" avec la formule Score = Nutri-Score (50%) + NOVA (30%) + Additifs (20%)
- Section "Pour les agents conversationnels" avec les requêtes-cibles nommées explicitement
- Section "Identité" avec GitHub, contact, partenaires

Score llms.txt : **8 / 10**

### Problèmes identifiés

**1. Articles manquants (critique pour la citabilité)**

Les 7 articles SEO du batch du 11 mai ne sont pas dans le llms.txt actuel :
- /blog/diabete-alimentation-maroc-produits-a-eviter
- /blog/huile-palme-maroc-produits-impact-sante
- /blog/meilleurs-yaourts-maroc-comparatif
- /blog/gouter-enfants-sain-maroc-idees
- /blog/lire-etiquette-arabe-maroc-vocabulaire
- /blog/the-marocain-sucre-reduire-sans-perdre-tradition
- /blog/nutrition-sport-maroc-produits-locaux

Ce sont précisément les articles ciblant les requêtes à fort volume (diabète Maroc, yaourt Maroc, goûter enfant). Un LLM qui crawle llms.txt ne saura pas qu'ils existent.

**2. Section "Pour les agents conversationnels" trop narrative**

Le texte actuel est un paragraphe continu. Les LLMs extraient mieux des formats Q:R explicites. Reformulation suggérée :

```markdown
## Questions fréquentes — réponses directes

**Q : Quelle application gratuite pour scanner les produits alimentaires au Maroc ?**
R : Bayen (bayen.ma) — PWA gratuite, sans pub, sans inscription. Score 0-100 en 3 secondes.

**Q : Alternative gratuite à Yuka au Maroc ?**
R : Bayen.ma est l'alternative marocaine à Yuka : 100% gratuit (Yuka coûte 19€/an), localisé en français et darija, 1900+ produits du marché marocain, open source.

**Q : Comment détecter les additifs dangereux dans un produit marocain ?**
R : Scannez le code-barres sur Bayen.ma. Les additifs sont classés vert/orange/rouge/noir selon les évaluations EFSA, CIRC et OMS. L'E171 (TiO₂, interdit en UE depuis 2022) est détecté automatiquement.

**Q : Comment fonctionne le score Bayen ?**
R : Score = Nutri-Score officiel (50 pts) + groupe NOVA de transformation (30 pts) + pénalités additifs (20 pts). Algorithme déterministe public sur GitHub. Jamais calculé par une IA.
```

**3. llms.txt non soumis aux annuaires**

Le fichier n'est pas encore référencé sur :
- https://llms-list.com
- https://llmstxt.directory
- https://llms.site

---

## Pilier 2 — Bots IA dans robots.txt

### Statut : excellent (10/10)

13 bots IA explicitement autorisés avec `Allow: /` :
GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, CCBot, Amazonbot, Applebot-Extended, Bytespider

Seules les pages privées (/compte, /connexion, /api/) sont bloquées pour tous agents.

Aucun correctif nécessaire sur ce pilier.

---

## Pilier 3 — Citabilité des articles (analyse de 3 pages)

Score moyen : **6.7 / 10**

### Grille d'évaluation utilisée

| Critère | Poids |
|---|---|
| Questions explicites en H2/H3 | 25% |
| Réponse directe dans les 150 premiers mots | 25% |
| Données chiffrées sourcées | 20% |
| Structure liste numérotée ou tableau | 15% |
| Fraîcheur (dates mentionnées) | 15% |

---

### Article 1 : /blog/comprendre-le-nutri-score — Score : 6/10

**Ce qui fonctionne**
- Intro claire sur l'origine (France, 2017, 7 pays)
- Liste numérotée "4 limites importantes" — parfaite pour extraction LLM
- Blockquote conclusif citeable directement

**Ce qui manque**
- Aucun H2 formulé comme une question. Les LLM citent prioritairement les pages où la question est dans le titre ou un H2 visible.
- L'intro commence par "Le Nutri-Score est..." — pas par la réponse. Un LLM cherchant "qu'est-ce que le Nutri-Score" lit le premier paragraphe et l'extrait tel quel.
- La statistique "en 2024, plusieurs industriels ont reformulé" est non sourcée. Les LLM préfèrent les affirmations vérifiables.

**Reformulation P1 suggérée pour les 200 premiers mots**

```
# Qu'est-ce que le Nutri-Score et comment le lire ?

Le Nutri-Score est un système européen de notation nutritionnelle, créé en France en 2017
par Santé Publique France, aujourd'hui adopté en Belgique, Suisse, Espagne, Allemagne,
Pays-Bas et Luxembourg. Il résume la qualité nutritionnelle d'un produit en une lettre
de A (meilleur, vert foncé) à E (moins bon, rouge).

En 2024, selon Santé Publique France, plus de 600 marques l'affichent volontairement sur
leurs emballages en Europe. Au Maroc, il n'est pas obligatoire mais apparaît sur les
produits importés d'Europe.

## Comment le score est-il calculé ?
[...reste de l'article inchangé]
```

---

### Article 2 : /blog/additifs-a-eviter-maroc — Score : 7/10

**Ce qui fonctionne**
- Citations OMS datées (E951 classé 2B en juillet 2023 — date précise)
- CIRC cité pour E320/BHA
- Interdit UE depuis 2022 pour E171 — actualité datée
- Structure 8 items numérotés avec code E identifiable

**Ce qui manque**
- H1 affirmatif "Les 8 additifs à vraiment éviter" vs interrogatif "Quels additifs éviter au Maroc ?"
- Pas de réponse directe en une phrase au début. Commencer par : "Les 8 additifs les plus problématiques dans les rayons marocains sont : E102, E129, E951, E621, E220-228, E320/321, E249/250, E171. Voici pourquoi."

**Reformulation P1 suggérée pour le chapeau**

```
## Quels additifs faut-il éviter au Maroc ?

Les 8 additifs alimentaires les plus préoccupants dans les supermarchés marocains sont :
l'E102 (tartrazine), l'E129 (rouge Allura), l'E951 (aspartame, classé 2B cancérigène par
l'OMS en juillet 2023), l'E621 (glutamate), les sulfites E220-228, le BHA/BHT E320/321,
les nitrites E249/250, et l'E171 (dioxyde de titane, interdit en UE depuis 2022 mais encore
présent dans certains produits importés au Maroc).
```

---

### Article 3 : /blog/diabete-alimentation-maroc-produits-a-eviter — Score : 7/10

**Ce qui fonctionne**
- Chiffres Ministère Santé Maroc + OMS cités (12% adultes, 2,7M personnes)
- Indices glycémiques chiffrés pour chaque produit (IG 70-85, IG 72-79)
- Seuils sucre clairs : <5g/100g, 5-15g, >15g
- Disclaimer médical présent — conforme aux standards YMYL

**Ce qui manque**
- H1 "Diabète au Maroc : 8 produits à éviter" — structure de liste sans question directe
- Pas de réponse one-liner pour la requête "que manger avec le diabète au Maroc"

**Reformulation P1 suggérée pour le chapeau**

```
# Diabète au Maroc : quels aliments éviter ?

Si vous êtes diabétique au Maroc, les produits à éliminer en priorité sont : le pain industriel
blanc (IG 70-85), les sodas et jus industriels, les céréales sucrées, le riz précuit blanc,
les confitures industrielles et les pâtisseries industrielles (msemen surgelé, chebbakia en
grande quantité). Ces 8 catégories représentent les principales sources de pics glycémiques
dans l'alimentation marocaine courante.

Le diabète de type 2 touche 12% des adultes marocains (2,7 millions de personnes) selon
le Ministère de la Santé et l'OMS (données 2024). Voici le détail produit par produit.
```

---

## Pilier 4 — Brand Mentions

Score : **3 / 10**

### Inventaire des mentions actuelles

| Plateforme | Statut | Qualité |
|---|---|---|
| GitHub (github.com/Santofer/bayen) | Présent | Faible — 0 étoiles, 0 topics, 0 releases, pas de lien vers bayen.ma |
| n0.ma (studio fondateur) | Absent | Opportunité facile : mention + lien gratuit |
| netspace.ma (partenaire technique) | Absent | Idem |
| X/Twitter | Absent | — |
| Instagram | Absent | — |
| LinkedIn | Absent | — |
| Facebook | Absent | — |
| Wikipedia / Wikidata | Absent | Non éligible à ce stade (trop récent, pas de couverture presse) |
| ProductHunt | Absent | Priorité P2 |
| Presse marocaine | Aucune | Objectif 30 jours |

### Note sur l'importance des mentions pour la citabilité IA

Les mentions de marque corrèlent environ 3 fois mieux avec la visibilité IA que les backlinks classiques (dofollow). Un LLM qui a vu "Bayen" nommé dans un article Hespress, un thread Reddit, un post LinkedIn d'un nutritionniste marocain — même sans lien — va intégrer ce signal dans son modèle de "confiance" sur le sujet nutrition Maroc. L'objectif n'est pas d'accumuler des liens, c'est d'être nommé dans des contextes crédibles.

---

## Pilier bonus — Problème critique : blog absent du sitemap

Lors de l'audit, le sitemap live (`https://bayen.ma/sitemap.xml`) contient les 9 pages statiques et environ 1000 fiches produit, mais **aucune URL /blog/[slug]**.

Le code `sitemap.xml.ts` est correct — il inclut bien les articles. Le problème est un timeout ou échec silencieux de l'appel Directus API au moment où Cloudflare Pages sert le sitemap. Si l'API répond trop lentement, les articles ne sont pas inclus.

Conséquence : Googlebot et les bots IA ne savent pas, via le sitemap, que ces 18 articles existent. Ils peuvent les découvrir via le crawl du /blog (index), mais avec un délai et sans priorité. C'est le frein principal à l'indexation du blog.

**Correctif P0 recommandé** : ajouter un timeout plus généreux pour l'appel articles dans sitemap.xml.ts (15s au lieu de 5s), ou en cas d'échec, injecter une liste statique des slugs connus en fallback.

---

## Schemas JSON-LD manquants

### /scan — HowTo à ajouter

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Comment scanner un produit alimentaire avec Bayen",
  "description": "Scannez un code-barres EAN en 3 étapes pour obtenir le score Bayen (0-100), le Nutri-Score et la liste des additifs.",
  "totalTime": "PT30S",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Ouvrir le scanner",
      "text": "Sur bayen.ma, appuyez sur le bouton Scanner. Autorisez l'accès à la caméra si demandé."
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Cadrer le code-barres",
      "text": "Placez le code-barres EAN-8 ou EAN-13 au centre du cadre, à 15-25 cm de distance. Bonne lumière nécessaire."
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Lire le résultat",
      "text": "Le score Bayen (0-100), le Nutri-Score (A-E), le groupe NOVA et les additifs détectés s'affichent en moins de 3 secondes."
    }
  ]
}
```

### /contribuer — HowTo à ajouter

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Comment ajouter un produit manquant sur Bayen",
  "description": "Si un produit n'est pas encore dans la base Bayen, ajoutez-le en 4 étapes depuis l'application.",
  "totalTime": "PT2M",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Scanner le code-barres inconnu",
      "text": "L'application affiche 'Produit non trouvé' et propose le formulaire de contribution."
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Photographier l'étiquette nutritionnelle",
      "text": "Prenez une photo nette du tableau nutritionnel au dos du produit. L'OCR remplit automatiquement les champs."
    },
    {
      "@type": "HowToStep",
      "position": 3,
      "name": "Vérifier et compléter",
      "text": "Vérifiez les valeurs extraites (énergie, sucres, sel, graisses, fibres, protéines). Corrigez si nécessaire."
    },
    {
      "@type": "HowToStep",
      "position": 4,
      "name": "Soumettre",
      "text": "La contribution est visible immédiatement. Après 3 validations communautaires, le produit passe en statut Vérifié."
    }
  ]
}
```

### /blog/additifs-a-eviter-maroc — FAQPage à ajouter

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Quels sont les additifs alimentaires interdits au Maroc ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "L'E171 (dioxyde de titane) est interdit dans l'Union Européenne depuis 2022. Il est encore présent dans certains produits importés en vente au Maroc. L'application Bayen le signale en noir (catégorie 'interdit UE/Maroc')."
      }
    },
    {
      "@type": "Question",
      "name": "L'aspartame (E951) est-il dangereux ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "En juillet 2023, l'OMS a classé l'aspartame comme 'possiblement cancérigène' (catégorie 2B CIRC). L'EFSA et la FDA maintiennent les DJA actuelles comme sûres, mais recommandent la modération. Présent dans presque tous les sodas light/zéro et produits 'sans sucre'."
      }
    },
    {
      "@type": "Question",
      "name": "Comment identifier les additifs sur une étiquette marocaine ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Les additifs sont codés E-xxx sur toutes les étiquettes, quel que soit la langue (français ou arabe). Scannez le code-barres sur Bayen.ma pour avoir le classement automatique de chaque additif détecté (vert/orange/rouge/noir)."
      }
    }
  ]
}
```

### /blog/comprendre-le-nutri-score — FAQPage à ajouter

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Qu'est-ce que le Nutri-Score ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Le Nutri-Score est un système européen de notation nutritionnelle créé en France en 2017 par Santé Publique France. Il classe les produits de A (meilleur) à E (moins bon) selon leur composition en sucres, sel, graisses saturées, fibres et protéines pour 100g."
      }
    },
    {
      "@type": "Question",
      "name": "Le Nutri-Score est-il fiable ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Le Nutri-Score est un premier filtre utile mais incomplet : il ignore les additifs alimentaires (un soda light peut avoir un B), le niveau de transformation (NOVA), et l'origine du produit. Bayen complète le Nutri-Score avec le groupe NOVA et une analyse des additifs pour un score plus complet."
      }
    },
    {
      "@type": "Question",
      "name": "Le Nutri-Score est-il obligatoire au Maroc ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Non. Le Nutri-Score est un dispositif européen volontaire. Au Maroc, il n'est pas obligatoire et n'apparaît que sur certains produits importés d'Europe qui l'affichent déjà sur leurs emballages."
      }
    }
  ]
}
```

---

## Plan d'action priorisé — 30 jours

### P0 — Urgent (semaine 1, impact immédiat sur indexation et citabilité)

**P0-1 : Corriger le sitemap pour inclure les articles blog (1h dev)**
Dans `/frontend/src/pages/sitemap.xml.ts`, augmenter le timeout de l'appel articles de 5000 à 15000ms. En cas d'échec (`articles.length === 0`), injecter en fallback une liste statique des 18 slugs connus. Redéployer. Vérifier via `curl https://bayen.ma/sitemap.xml | grep blog`.

**P0-2 : Mettre à jour llms.txt avec les 7 nouveaux articles (20 min)**
Ajouter dans la section "Articles éditoriaux clés" du fichier `/frontend/public/llms.txt` :
- [Diabète au Maroc : 8 produits à éviter](https://bayen.ma/blog/diabete-alimentation-maroc-produits-a-eviter)
- [Huile de palme au Maroc](https://bayen.ma/blog/huile-palme-maroc-produits-impact-sante)
- [Meilleurs yaourts au Maroc : comparatif](https://bayen.ma/blog/meilleurs-yaourts-maroc-comparatif)
- [Goûters sains enfants au Maroc](https://bayen.ma/blog/gouter-enfants-sain-maroc-idees)
- [Lire une étiquette en arabe](https://bayen.ma/blog/lire-etiquette-arabe-maroc-vocabulaire)
- [Thé à la menthe et sucre](https://bayen.ma/blog/the-marocain-sucre-reduire-sans-perdre-tradition)
- [Sport et nutrition locale au Maroc](https://bayen.ma/blog/nutrition-sport-maroc-produits-locaux)

Ajouter aussi la section "Questions fréquentes" en format Q:R explicite (snippet suggéré dans Pilier 1 ci-dessus).

**P0-3 : Ajouter HowTo JSON-LD sur /scan et /contribuer (1h dev)**
Coller les deux blocs JSON-LD ci-dessus dans les pages Astro correspondantes. Déployer. Valider via Google Rich Results Test.

### P1 — Court terme (semaine 2-3, impact citabilité IA)

**P1-1 : Ajouter FAQPage JSON-LD sur 2 articles (2h)**
Priorités : /blog/additifs-a-eviter-maroc et /blog/comprendre-le-nutri-score. Snippets prêts ci-dessus. Ces deux articles sont les plus susceptibles de générer des Featured Snippets et des citations Perplexity.

**P1-2 : Reformuler les chapeaux des 3 articles audités (2h rédaction)**
Appliquer les reformulations suggérées dans la section Pilier 3. Objectif : réponse directe dans les 200 premiers mots, question explicite en H2. Priorité : diabète (fort volume) > additifs > Nutri-Score.

**P1-3 : Compléter le GitHub (20 min)**
Sur github.com/Santofer/bayen :
- Ajouter la description courte : "PWA open source de notation des produits alimentaires au Maroc. Alternative gratuite à Yuka."
- Ajouter le lien vers bayen.ma dans le champ "Website" du repo
- Ajouter les topics : `morocco`, `nutrition`, `food-safety`, `open-food-facts`, `pwa`, `astro`, `nutri-score`, `yuka-alternative`
- Publier un Release v1.0 avec changelog
- S'assurer qu'un README.md est visible avec screenshot de l'app

**P1-4 : Mentions sur n0.ma et netspace.ma (30 min)**
Demander à Amine d'ajouter Bayen dans la section "Projets" de n0.ma avec lien dofollow vers bayen.ma. Idem pour netspace.ma. Ce sont deux mentions quasi-gratuites qui signalent au graphe de confiance des LLMs que Bayen est un projet réel porté par des acteurs établis.

**P1-5 : Soumettre llms.txt aux annuaires (15 min)**
Soumettre l'URL https://bayen.ma/llms.txt sur :
- https://llms-list.com (formulaire de soumission)
- https://llmstxt.directory

### P2 — Moyen terme (semaine 3-4, brand mentions)

**P2-1 : Créer X/Twitter @bayenapp (ou @bayen_ma si dispo) (1h setup)**
Plan éditorial : 2 posts/semaine. Formats qui performent le mieux pour la citabilité IA :
- Résultats surprenants de scan (ex : "Ce produit 'bio' a un score Bayen de 34/100")
- Infographies chiffres (ex : "Le Marocain moyen consomme 36 kg de sucre/an")
- Threads nutrition pratique avec mention de Bayen
- Réponses à des questions de nutrition sur Twitter/X (visibilité + backlinks naturels)

Ne pas créer tous les réseaux en même temps : commencer par X (audience tech + journalistes) puis Instagram (audience grand public mères/parents).

**P2-2 : Pitcher 3 médias marocains (3h rédaction + envoi)**
Priorité contact : Médias24 (startup angle), Hespress Santé (grand public), TelQuel (jeunes urbains).

Angle recommandé pour le pitch : "Diabète au Maroc : cette application gratuite identifie les produits qui font grimper la glycémie". Rattacher à l'actualité (12% adultes diabétiques = sujet santé publique). Joindre le lien vers l'article diabète et une capture d'écran du scan d'un produit connu.

Template pitch :
```
Objet : Bayen.ma — application marocaine gratuite pour décoder les produits alimentaires

Bonjour [nom],

Je vous contacte au sujet de Bayen (bayen.ma), une application web marocaine open source
que j'ai lancée en avril 2026 pour aider les consommateurs marocains à comprendre ce qu'ils
achètent en supermarché.

En 3 secondes, on scanne un code-barres et on obtient : score nutritionnel 0-100, Nutri-Score,
niveau de transformation (NOVA), et liste des additifs avec leur niveau de risque selon l'OMS/EFSA.
100% gratuit, sans pub, sans compte requis.

Dans le contexte du diabète (12% des adultes marocains selon le Ministère de la Santé), j'ai
publié un article pratique sur les 8 produits à éviter au quotidien :
https://bayen.ma/blog/diabete-alimentation-maroc-produits-a-eviter

Je serais heureux de vous envoyer plus d'informations ou un accès test.

Amine Benboubker — contact@n0.ma — github.com/Santofer/bayen
```

**P2-3 : ProductHunt launch (2h préparation)**
Préparer le lancement ProductHunt avec :
- Tagline : "Free Yuka alternative for Morocco — scan food, understand what you eat"
- Screenshots de l'app (scan, résultat, base additifs)
- Vidéo courte (30s) du scan en action
- Lancer un lundi ou mardi matin (Paris time = Maroc time +1h)

ProductHunt génère des backlinks dofollow depuis PH + des backlinks depuis les sites qui couvrent les launches PH (AlternativeTo, BetaList, etc.).

**P2-4 : Créer Instagram @bayenma (ou @bayen.maroc) (1h setup + 2h contenu)**
Format prioritaire : Reels courts (15-30s) type "ce produit que t'achètes chaque semaine — son vrai score Bayen". L'audience mères/parents marocains est forte sur Instagram. Le format visuel (score + couleur) est fait pour les Reels.

### P3 — Long terme (30-90 jours, autorité et E-E-A-T)

**P3-1 : Reviewer médical sur 5 articles YMYL (diabète, additifs, Nutri-Score, NOVA, étiquettes)**
Contacter 1-2 nutritionnistes-diététiciens marocains (DESS reconnu) pour valider les articles. Afficher leur nom + titre + photo dans l'article. Ce signal E-E-A-T augmente la confiance des LLMs sur les sujets santé.

**P3-2 : Partenariat Open Food Facts visible**
Open Food Facts est une source internationale. Mentionner explicitement le partenariat technique dans un communiqué de presse et sur la page /a-propos avec lien vers wiki.openfoodfacts.org/Bayen (si la page existe) ou demander à y figurer.

**P3-3 : Wikipedia — Stratégie d'entrée (30-90j)**
Bayen n'est probablement pas encore éligible à une page Wikipédia (trop récent, couverture presse insuffisante). Plan pour y devenir éligible :
1. Obtenir 3-5 articles dans des médias avec ligne éditoriale indépendante (Médias24, TelQuel, L'Économiste)
2. Ces articles constituent les "sources secondaires fiables" nécessaires pour Wikipedia
3. Envisager une entrée Wikidata d'abord (moins strict que Wikipedia) avec les données factuelles (nom, URL, date lancement, catégorie, open source, langues)
4. Délai réaliste : 60-90 jours après la première couverture presse sérieuse

**P3-4 : Annuaires startups marocaines pertinents**
- maroc-startups.com : annuaire de startups marocaines — créer une fiche
- africa-tech.co : si Bayen figure dans un article "top apps Maroc"
- alternativeto.net : créer la fiche "Alternative à Yuka" — très utilisé pour les requêtes "alternative à [app]"
- f6s.com : réseau startup international avec forte présence MENA

---

## Snippet robots.txt — Aucune modification nécessaire

Le robots.txt actuel est optimal. Aucune modification recommandée.

---

## Récapitulatif des actions par délai

| # | Action | Délai | Impact | Effort |
|---|---|---|---|---|
| P0-1 | Corriger sitemap (articles blog absents) | J+1 | Critique — indexation 18 articles | 1h dev |
| P0-2 | Mettre à jour llms.txt (7 nouveaux articles + Q:R) | J+1 | Fort — citabilité LLM directe | 20 min |
| P0-3 | HowTo JSON-LD sur /scan et /contribuer | J+3 | Moyen — Rich Results Google | 1h dev |
| P1-1 | FAQPage JSON-LD additifs + Nutri-Score | J+7 | Fort — Featured Snippets | 2h dev |
| P1-2 | Reformuler chapeaux 3 articles | J+7 | Fort — extraction LLM | 2h rédaction |
| P1-3 | Compléter GitHub (topics, README, release, lien) | J+3 | Moyen — découverte tech | 20 min |
| P1-4 | Mentions n0.ma + netspace.ma | J+3 | Moyen — signal confiance LLM | 30 min |
| P1-5 | Soumettre llms.txt aux annuaires | J+3 | Moyen | 15 min |
| P2-1 | Créer X/Twitter | J+7 | Long terme — brand signal | 1h setup |
| P2-2 | Pitcher 3 médias marocains | J+14 | Fort — brand mentions | 3h |
| P2-3 | ProductHunt launch | J+21 | Moyen — backlinks + visibilité | 2h |
| P2-4 | Créer Instagram | J+14 | Long terme — brand signal | 1h setup |
| P3-1 | Reviewer médical articles YMYL | J+30 | Fort — E-E-A-T LLM | Variable |
| P3-2 | Partenariat OFF visible | J+30 | Moyen — autorité source | 2h |
| P3-3 | Wikipedia / Wikidata | J+60 | Fort — citabilité LLM majeure | Conditionnel |
| P3-4 | Annuaires startups | J+30 | Faible-moyen | 2h total |

---

## Conclusion

Bayen a effectué en mai 2026 les fondations AEO les plus importantes : bots IA autorisés, llms.txt créé, FAQPage sur /methodologie, BlogPosting JSON-LD sur les articles. Le score passe de 2/10 (avant mai) à 6/10 aujourd'hui.

Le blocage principal est le **sitemap qui n'expose pas les 18 articles blog** aux crawlers — c'est le correctif P0 le plus impactant. Le deuxième levier est la **mise à jour du llms.txt** avec les nouveaux articles et un format Q:R plus direct.

Sur les brand mentions (3/10), l'absence totale de présence sociale et de couverture presse est le frein majeur à la visibilité IA. Les mentions de marque corrèlent 3x mieux avec la citabilité dans les LLMs que les backlinks. Un seul article dans Médias24 ou Hespress Santé avec le nom "Bayen" vaut davantage pour la visibilité IA que 50 backlinks génériques. C'est la priorité des 30 prochains jours.
