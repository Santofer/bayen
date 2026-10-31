# Bayen (باين)

**Bayen** (« c'est clair, ça se voit » en darija) est une application web gratuite qui note sur 100 les produits
alimentaires et cosmétiques vendus au Maroc : **[bayen.ma](https://bayen.ma)**.

On scanne le code-barres d'un produit et Bayen affiche son score, ses additifs, son niveau de transformation et des
alternatives mieux notées du même rayon. L'interface existe en français et en darija.

- **Score sur 100**, calculé par un algorithme public et déterministe : Nutri-Score (50 points), groupe NOVA de
  transformation (30 points), additifs (20 points). Détail : [bayen.ma/methodologie](https://bayen.ma/methodologie),
  code : [`frontend/src/lib/scoring.ts`](frontend/src/lib/scoring.ts).
- **Cosmétiques** : chaque ingrédient de la liste INCI est comparé aux listes officielles européennes (CosIng,
  annexes du règlement cosmétique) ; la note est plafonnée par l'ingrédient le plus préoccupant.
- **Plats** : estimation des calories et des macros à partir d'une photo, en fourchette avec un niveau de confiance
  (jamais un avis médical).
- **Participatif** : un produit manquant se complète en photographiant son étiquette ; les prix sont relevés par la
  communauté.
- L'IA lit les étiquettes ; elle ne fixe jamais une note.

Questions fréquentes : [bayen.ma/questions](https://bayen.ma/questions).

## Données

Fiches issues d'[Open Food Facts](https://world.openfoodfacts.org/) et d'Open Beauty Facts (licence ODbL), complétées
par la communauté et par des photos d'étiquettes.

## Technique

Astro 5 + React (PWA) sur Cloudflare Pages, Directus 11 + PostgreSQL 16, OCR Tesseract et modèle de vision
auto-hébergés. Cahier des charges : [`SPEC.md`](SPEC.md).

## Équipe

Projet commun des agences [N0](https://n0.ma) et [Netspace](https://netspace.ma), à Casablanca, fondé par
[Amine Benboubker](https://aminebenboubker.com). Contact : contact@n0.ma.

Instagram [@bayenma](https://www.instagram.com/bayenma) · [Facebook](https://www.facebook.com/bayen.ma) ·
[LinkedIn](https://www.linkedin.com/company/bayen-ma)
