# Bayen — fiche client SEO

## Identité
- **Nom** : Bayen (بَيَّن — "c'est clair, ça se voit" en darija marocaine)
- **URL principale** : https://bayen.ma
- **API publique** : https://api.bayen.ma
- **CDN** : https://cdn.bayen.ma (Cloudflare R2)
- **Hébergement** : Cloudflare Pages (frontend Astro), Unraid + Cloudflare Tunnel (Directus + services IA)
- **Marché** : Maroc (FR-MA + darija ary)
- **Lancé en** : avril 2026 (post-démo 16 avril)

## Proposition de valeur
PWA participative et open source de notation des produits alimentaires au Maroc.
Scanne un code-barres → score 0-100 transparent + Nutri-Score + groupe NOVA + détection additifs à risque.
Auto-import depuis Open Food Facts. 100% gratuit, sans pub, sans tracking invasif.

## Audiences cibles
1. **Mères/parents marocains** soucieux de la nutrition de leurs enfants
2. **Jeunes urbains** (18-35) sensibles à la consommation responsable
3. **Personnes avec restrictions** (diabète, hypertension, allergies)
4. **Diaspora marocaine** (FR, BE, NL, ES, USA, CAN — relais d'opinion)

## Stack
- Frontend : Astro 5 + React 18 + Tailwind v4 + shadcn/ui
- Backend : Directus 11 + Postgres 16
- IA locale : Tesseract + Ollama (gemma3:4b multimodal)
- Domain : bayen.ma — TLD pays Maroc

## Métriques actuelles (avril 2026)
- 1941 produits en base (75% OFF auto-importés, 25% community)
- 11 articles blog (lancement)
- ~25 scans/jour (early stage)
- Trafic organique : à mesurer (Umami récemment installé, GSC à connecter)

## Compétiteurs déclarés
- **Yuka** (yuka.io) — leader FR/EU, app payante 19€/an version pro, présent au Maroc via stores mais pas de localisation
- **Open Food Facts** (world.openfoodfacts.org) — base mondiale collaborative, pas d'expérience produit grand public
- **Foodvisor** (foodvisor.io) — analyse photo repas, payant
- **MyFitnessPal**, **Lifesum** — trackers alimentaires généraux

## Différenciateurs
- **Localisation Maroc** : focus produits du marché marocain, prix DH, darija
- **100% gratuit** vs Yuka 19€/an
- **Open source** (github.com/Santofer/bayen) — transparence algo
- **Score transparent** (vs Yuka closed-box)
- **Détection additifs interdits Maroc/UE** spécifique
- **Bilingue FR ↔ darija** (interface)
- **Photo de plat** (feature unique vs Yuka qui ne fait que code-barres)

## Contraintes
- **Aucun changement de design** demandé
- Pas de budget Ads (organique only)
- Équipe : 1 dev/founder (Amine, n0.ma + netspace.ma)

## Objectifs SEO
1. **Top 3 google.co.ma** sur les requêtes "nutrition maroc", "scanner produit alimentaire", "additifs alimentaires"
2. **Citabilité IA** (ChatGPT, Perplexity, Gemini) pour "comment manger sain au Maroc"
3. **Brand mentions** marocaines (presse, blogs santé, influenceurs lifestyle)
4. **Trafic blog → installs PWA** (taux conversion à mesurer)
