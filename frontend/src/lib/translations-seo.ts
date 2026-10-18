/**
 * Traductions du chantier SEO (fiches produit, rayons, pages introuvables).
 * Fusionnées dans `translations` (lib/translations.ts). Chaque clé : fr + ary (darija marocaine).
 * Les valeurs chiffrées viennent toujours des données stockées ({n}, {g}…), jamais du texte.
 */
export const seo = {
  // ── Title / meta description des fiches ──────────────────────────
  'seo.sep':            { fr: ', ', ary: '، ' },
  'seo.kcal':           { fr: '{n} kcal', ary: '{n} كالوري' },
  'seo.nutriscore':     { fr: 'Nutri-Score {g}', ary: 'نوتري سكور {g}' },
  'seo.score':          { fr: 'score {n}/100', ary: 'النقطة {n}/100' },
  'seo.titleBeauty':    { fr: 'ingrédients et score beauté', ary: 'المكونات ونقطة الجمال' },
  'seo.desc.score':     { fr: 'score Bayen {n}/100 ({w})', ary: 'نقطة Bayen {n}/100 ({w})' },
  'seo.desc.sugars':    { fr: '{n} g de sucres', ary: '{n} g ديال السكر' },
  'seo.desc.salt':      { fr: '{n} g de sel', ary: '{n} g ديال الملح' },
  'seo.desc.per100':    { fr: '{list} pour 100 g', ary: '{list} ف 100 g' },
  'seo.desc.foodTail':  { fr: 'Ingrédients, additifs et alternatives.', ary: 'المكونات، الإضافات والبدائل.' },
  'seo.desc.unscored':  { fr: 'fiche à compléter, pas encore de score Bayen.', ary: 'البطاقة خاصها تكمل، مازال ما عندهاش نقطة Bayen.' },
  'seo.desc.beautyScore': { fr: 'score beauté {n}/100 ({w})', ary: 'نقطة الجمال {n}/100 ({w})' },
  'seo.desc.flaggedN':  { fr: '{n} ingrédients à surveiller sur {m}', ary: '{n} مكونات خاصهم المراقبة من {m}' },
  'seo.desc.flagged1':  { fr: '1 ingrédient à surveiller sur {m}', ary: 'مكوّن واحد خاصو المراقبة من {m}' },
  'seo.desc.flagged0':  { fr: 'aucun ingrédient à risque connu sur {m}', ary: 'حتى مكوّن ما فيه خطر معروف من {m}' },
  'seo.desc.beautyTail': { fr: 'Liste INCI comparée aux listes officielles.', ary: 'لائحة INCI مقارنة مع اللوائح الرسمية.' },
  'seo.desc.inciMissing': { fr: 'liste INCI manquante, donc pas encore de score beauté. Photographie le dos du produit pour la compléter.', ary: 'لائحة INCI ناقصة، داكشي علاش مازال ما عندوش نقطة الجمال. صوّر ظهر المنتوج باش تكمّلها.' },
  'seo.desc.inciInsufficient': { fr: "trop d'ingrédients non reconnus pour le noter. Une photo nette de la liste INCI nous aide à le compléter.", ary: 'بزاف ديال المكونات ما عرفناهمش باش ننقّطوه. تصويرة واضحة ديال لائحة INCI غادي تعاونا نكمّلوه.' },

  // ── Phrase-verdict de la fiche (calculée sur le score déterministe) ─
  'verdict.food':       { fr: 'Score Bayen {total}/100 : {ns} ({nsp}/50), NOVA {nova} ({np}/30), additifs {ap}/20.', ary: 'نقطة Bayen {total}/100: {ns} ({nsp}/50)، NOVA {nova} ({np}/30)، الإضافات {ap}/20.' },
  'verdict.nsMissing':  { fr: 'Nutri-Score non calculé', ary: 'نوتري سكور ما تحسبش' },
  'verdict.biggest':    { fr: 'Ce qui pèse le plus : {what} (−{n} points).', ary: 'اللي كينقّص بزاف: {what} (−{n} نقط).' },
  'verdict.what.ns':    { fr: 'la composition nutritionnelle', ary: 'التركيبة الغذائية' },
  'verdict.what.nova':  { fr: 'le degré de transformation', ary: 'درجة التحويل' },
  'verdict.what.add':   { fr: 'les additifs', ary: 'الإضافات' },
  'verdict.full':       { fr: 'Aucun point perdu.', ary: 'حتى نقطة ما تنقصات.' },
  'verdict.per100':     { fr: 'Pour 100 g : {list}.', ary: 'ف 100 g: {list}.' },
  'verdict.incomplete': { fr: 'Score calculé sur des données incomplètes.', ary: 'النقطة محسوبة على معطيات ناقصة.' },
  'verdict.beauty.capped': { fr: 'Score beauté {n}/100, plafonné par {inci} ({level}).', ary: 'نقطة الجمال {n}/100، محدودة بسبب {inci} ({level}).' },
  'verdict.beauty.clean':  { fr: 'Score beauté {n}/100 : aucun ingrédient à risque connu parmi les {m} reconnus.', ary: 'نقطة الجمال {n}/100: حتى مكوّن ما فيه خطر معروف من {m} اللي عرفناهم.' },
  'verdict.beauty.watch':  { fr: 'À surveiller aussi : {list}.', ary: 'راقب حتى: {list}.' },

  // ── Rayons (/categories/<slug>) ──────────────────────────────────
  'seo.cat.title':      { fr: '{cat} au Maroc : score de {n} produits', ary: '{cat} فالمغرب: نقطة {n} منتوج' },
  'seo.cat.page':       { fr: 'page {n}', ary: 'صفحة {n}' },
  'seo.cat.desc':       { fr: 'Rayon {cat} au Maroc : {n} produits notés avec le score Bayen, Nutri-Score, NOVA et additifs, du plus scanné au moins scanné.', ary: 'رايون {cat} فالمغرب: {n} منتوج بنقطة Bayen، نوتري سكور، NOVA والإضافات، من الأكثر سكان للأقل.' },
  'seo.cat.median':     { fr: 'Score médian {m}/100.', ary: 'النقطة الوسطى {m}/100.' },
  'cat.intro.count':    { fr: '{n} produits dans ce rayon, du plus scanné au moins scanné.', ary: '{n} منتوج ف هاد الرايون، من الأكثر سكان للأقل.' },
  'cat.intro.median':   { fr: 'Score Bayen médian : {m}/100 sur {k} produits notés.', ary: 'نقطة Bayen الوسطى: {m}/100 على {k} منتوج متنقّط.' },
  'cat.intro.nova4':    { fr: '{p} % sont ultra-transformés (NOVA 4).', ary: '{p}% منهم محوّلين بزاف (NOVA 4).' },
  'cat.prev':           { fr: 'Page précédente', ary: 'الصفحة اللي قبل' },
  'cat.next':           { fr: 'Page suivante', ary: 'الصفحة اللي من بعد' },
  'cat.pageOf':         { fr: 'Page {a} sur {b}', ary: 'صفحة {a} من {b}' },
  'cat.pagination':     { fr: 'Pages du rayon', ary: 'صفحات الرايون' },

  // ── Service momentanément injoignable (réponse 503) ──────────────
  'seo.serviceDown':    { fr: 'Bayen est momentanément injoignable', ary: 'Bayen ما خدامش دابا، رجع من بعد شوية' },
} as const satisfies Record<string, { fr: string; ary: string }>
