# Passe darija — tous les textes de la refonte doivent basculer en darija

La refonte Marché Pop a écrit de nombreux textes d'interface en français EN DUR (consigne
de l'époque). Amine veut que la version darija soit complète et soignée : chaque texte visible,
y compris les bulles de Naânaa, les puces, les titres de section, les boutons, les états vides,
les `aria-label`, les mots de score.

## Mécanique i18n (lire `frontend/src/lib/i18n.ts` et `frontend/src/lib/translations.ts`)

- Locale : cookie/localStorage `bayen_locale` = `fr` | `ary`. Le Layout passe `dir="rtl"` en darija.
- Astro (serveur) : `const locale = getLocale(Astro.cookies?.get('bayen_locale')?.value ?? null)` puis
  `t('clé', locale)`.
- React : `const { t, locale } = useLocale()` dans un composant hydraté (`client:*`).
  Dans un composant rendu SANS directive client (SSR pur, pas de hook utile), recevoir `locale`
  en prop depuis la page et appeler `t('clé', locale)`.
- `ProductCard` et `ScoreSticker` (`@/components/ProductCard`) acceptent une prop `locale` :
  en Astro, TOUJOURS la passer (`<ProductCard … locale={locale} />`), sinon le rendu serveur
  sort en français. En React hydraté, passer `locale` de `useLocale()`.
- Mots de score : `t('score.excellent' | 'score.bon' | 'score.mediocre' | 'score.mauvais', locale)`
  (darija : ممتاز / مزيان / ضعيف / خايب). Ne jamais réécrire ces mots en dur.
- Interpolation : pas de moteur ; composer en JS (`${n} ${t('x', locale)}`) ou prévoir deux clés.
  Attention à l'ordre des mots en arabe : préférer des clés complètes avec un marqueur remplacé
  (`t('k', locale).replace('{n}', String(n))`) quand la phrase contient un nombre au milieu.

## Où écrire les nouvelles clés

Chaque lot a SON fichier, pour travailler en parallèle sans conflit :
`frontend/src/lib/translations-refonte-1.ts` (lot 1), `-2.ts` (lot 2), `-3.ts` (lot 3).
Ils sont fusionnés dans `translations` : une clé ajoutée est immédiatement typée.
Format : `'page.cle': { fr: '…', ary: '…' },`. Préfixer les clés par l'écran (`home.`, `product.`,
`search.`…) et vérifier qu'elle n'existe pas déjà dans `translations.ts` (réutiliser l'existant).
Ne PAS éditer `translations.ts` ni les fichiers des autres lots.

## Style de la darija

- Darija marocaine en écriture arabe, comme les traductions existantes (lire 30 entrées de
  `translations.ts` pour le ton) : « ما كافيينش المعطيات باش نحسبو »,  « عاوننا »,  « ديال ».
  Pas d'arabe classique guindé (« دون المستوى », « يرجى ») : du parler marocain, naturel, simple.
- Tutoiement (impératif singulier : « سكاني »، « قلّب »، « صوّر »).
- Naânaa = « نعناعة ». Bayen = « بيّن » dans une phrase, la marque latine « Bayen » dans les logos.
- Garder en latin : Nutri-Score, NOVA, INCI, codes E (E322), unités (g, kcal, kJ, ml, DH), noms
  de marques et de produits, sigles (OFF, IA → « الذكاء الاصطناعي » ou « IA » selon la place).
- Chiffres occidentaux (0-9). Ponctuation arabe « ، » « ؟ » dans les phrases arabes.
- Textes courts sur les puces et les boutons (une puce ne doit pas exploser en largeur).
- Règles métier inchangées en darija : « perturbateur endocrinien » = « مخلّ هرموني » (pluriel « المخلات الهرمونية ») toujours
  qualifié (« مشكوك فيه » suspecté / « مثبت » avéré) avec sa source ; repas = ESTIMATION, jamais
  un avis médical ; halal jamais retiré automatiquement.

## Périmètre

- OBLIGATOIRE : tout texte d'interface (titres, sous-titres, puces, boutons, liens, placeholders,
  `aria-label`, `alt` signifiants, messages d'erreur, états vides, bulles et astuces de Naânaa,
  textes des bandeaux `PageHero`, méta « 5 min de lecture », dates relatives…).
- Longs textes éditoriaux (paragraphes de méthodologie, à propos, partenaires) : les traduire
  aussi, en darija claire. Les articles du blog (contenu Directus) ne sont PAS à traduire.
- Les `<title>`/meta SEO : traduire seulement s'ils l'étaient avant (sinon garder le français).
- Ne rien changer à la mise en page ni à la logique. RTL : vérifier que les icônes de direction
  ont `rtl:rotate-180` (flèches) et que les marges utilisent `ms-/me-/ps-/pe-/start-/end-`.

## Vérification

`cd frontend && npx astro check 2>&1 | grep -E "error" | grep <tes fichiers>` : zéro nouvelle
erreur (il y en a 0 au départ). Puis un contrôle par grep de ton lot : aucun texte français
visible restant en dur dans le JSX/Astro (hors noms propres, unités, Nutri-Score…).
Pas de serveur, pas de navigateur, pas de commit. Rapport court : fichiers, nombre de clés
ajoutées, textes laissés en français et pourquoi.
