/**
 * Traductions UI — français (fr) et darija marocaine (ary)
 * Chaque clé doit exister dans les deux locales.
 */

export const translations = {
  // ── Navigation ──────────────────────────────────────────────
  'nav.home':       { fr: 'Accueil',       ary: 'الرئيسية' },
  'nav.scan':       { fr: 'Scanner',       ary: 'سكان' },
  'nav.search':     { fr: 'Recherche',     ary: 'بحث' },
  'nav.additives':  { fr: 'Additifs',      ary: 'إضافات' },
  'nav.contribute': { fr: 'Contribuer',    ary: 'ساهم' },
  'nav.account':    { fr: 'Compte',        ary: 'حسابي' },
  'nav.login':      { fr: 'Connexion',     ary: 'دخول' },
  'nav.logout':     { fr: 'Déconnexion',   ary: 'خروج' },

  // ── Score ───────────────────────────────────────────────────
  'score.excellent':  { fr: 'Excellent',        ary: 'ممتاز' },
  'score.bon':        { fr: 'Bon',              ary: 'مزيان' },
  'score.mediocre':   { fr: 'Médiocre',         ary: 'دون المستوى' },
  'score.mauvais':    { fr: 'Mauvais',          ary: 'خايب' },
  'score.incomplete': { fr: 'Score incomplet',  ary: 'النتيجة ناقصة' },
  'score.unverified': { fr: 'Non vérifié',      ary: 'ما مأكدش' },

  // ── Nutri-Score ─────────────────────────────────────────────
  'nutriscore.title': { fr: 'Nutri-Score',                        ary: 'نوتري سكور' },
  'nutriscore.a':     { fr: 'Excellente qualité nutritionnelle',  ary: 'جودة غذائية ممتازة' },
  'nutriscore.b':     { fr: 'Bonne qualité nutritionnelle',       ary: 'جودة غذائية مزيانة' },
  'nutriscore.c':     { fr: 'Qualité nutritionnelle moyenne',     ary: 'جودة غذائية متوسطة' },
  'nutriscore.d':     { fr: 'Qualité nutritionnelle médiocre',    ary: 'جودة غذائية ضعيفة' },
  'nutriscore.e':     { fr: 'Mauvaise qualité nutritionnelle',    ary: 'جودة غذائية خايبة' },

  // ── NOVA ────────────────────────────────────────────────────
  'nova.title': { fr: 'Transformation NOVA',   ary: 'التحويل NOVA' },
  'nova.1':     { fr: 'Non transformé',         ary: 'ما محولش' },
  'nova.2':     { fr: 'Ingrédient culinaire',   ary: 'مكون ديال الطبخ' },
  'nova.3':     { fr: 'Transformé',             ary: 'محوّل' },
  'nova.4':     { fr: 'Ultra-transformé',       ary: 'محوّل بزاف' },

  // ── Additifs ────────────────────────────────────────────────
  'additives.title':   { fr: 'Additifs',                 ary: 'إضافات' },
  'additives.safe':    { fr: 'Sûr',                      ary: 'آمن' },
  'additives.limited': { fr: 'Limité',                   ary: 'محدود' },
  'additives.avoid':   { fr: 'À éviter',                 ary: 'حسن تجنبو' },
  'additives.banned':  { fr: 'Interdit MA',              ary: 'ممنوع فالمغرب' },
  'additives.none':    { fr: 'Aucun additif détecté',    ary: 'ما كاين حتا إضافة' },

  // ── Scanner ─────────────────────────────────────────────────
  'scan.title':      { fr: 'Scanner un produit',                                  ary: 'سكاني منتوج' },
  'scan.subtitle':   { fr: 'Scannez le code-barres pour obtenir le score',         ary: 'سكاني الكود باش تعرف النتيجة' },
  'scan.place':      { fr: 'Placez le code-barres dans le cadre',                  ary: 'حط الكود فالكادر' },
  'scan.manual':     { fr: 'Saisir manuellement',                                 ary: 'دخل الكود يدوي' },
  'scan.camera':     { fr: 'Utiliser la caméra',                                  ary: 'استعمل الكاميرا' },
  'scan.search':     { fr: 'Chercher',                                            ary: 'قلّب' },
  'scan.loading':    { fr: 'Recherche du produit',                                ary: 'كنقلبو على المنتوج' },
  'scan.tips.title': { fr: 'Conseils pour un bon scan',                            ary: 'نصائح باش يمشي السكان مزيان' },

  // ── Produit ─────────────────────────────────────────────────
  'product.notFound':     { fr: 'Produit non trouvé',                                  ary: 'المنتوج ما لقيناهش' },
  'product.notFoundDesc': { fr: "Ce produit n'est pas encore dans notre base.",         ary: 'هاد المنتوج مازال ما كاينش عندنا.' },
  'product.addThis':      { fr: 'Ajouter ce produit',                                  ary: 'زيد هاد المنتوج' },
  'product.scanAnother':  { fr: 'Scanner un autre',                                    ary: 'سكاني منتوج آخر' },
  'product.nutrition':    { fr: 'Valeurs nutritionnelles (pour 100g)',                  ary: 'القيم الغذائية (لكل 100غ)' },
  'product.ingredients':  { fr: 'Ingrédients',                                         ary: 'المكونات' },
  'product.fix':          { fr: 'Corriger / compléter',                                ary: 'صحح / كمّل' },
  'product.scoreDetail':  { fr: 'Détail du score',                                     ary: 'تفاصيل النتيجة' },

  // ── Accueil ─────────────────────────────────────────────────
  'home.hero1':        { fr: 'Scannez. Comprenez.',                                                                                                            ary: '.سكاني. فهم' },
  'home.hero2':        { fr: 'Choisissez mieux.',                                                                                                              ary: '.اختار حسن' },
  'home.subtitle':     { fr: 'Bayen note les produits alimentaires au Maroc de 0 à 100. Scannez un code-barres pour tout savoir sur ce que vous mangez.',       ary: 'باين كيعطي نقطة للمنتجات الغذائية فالمغرب من 0 حتى 100. سكاني الكود باش تعرف شنو كتاكل.' },
  'home.scanBtn':      { fr: 'Scanner un produit',                                                                                                             ary: 'سكاني منتوج' },
  'home.searchBtn':    { fr: 'Rechercher',                                                                                                                     ary: 'قلّب' },
  'home.howTitle':     { fr: 'Comment ça marche ?',                                                                                                            ary: 'كيفاش خدّام؟' },
  'home.step1':        { fr: 'Scannez',                                                                                                                        ary: 'سكاني' },
  'home.step1Desc':    { fr: 'Pointez la caméra vers le code-barres du produit',                                                                               ary: 'وجّه الكاميرا على الكود ديال المنتوج' },
  'home.step2':        { fr: 'Comprenez',                                                                                                                      ary: 'فهم' },
  'home.step2Desc':    { fr: 'Score 0–100, Nutri-Score, NOVA, additifs détaillés',                                                                             ary: 'نتيجة 0–100، نوتري سكور، NOVA، إضافات مفصلة' },
  'home.step3':        { fr: 'Choisissez',                                                                                                                     ary: 'اختار' },
  'home.step3Desc':    { fr: 'Faites de meilleurs choix pour votre santé',                                                                                     ary: 'اختار حسن لصحتك' },
  'home.popular':      { fr: 'Produits populaires',                                                                                                            ary: 'المنتجات المشهورة' },
  'home.seeAll':       { fr: 'Voir tout',                                                                                                                      ary: 'شوف كلشي' },
  'home.missingTitle': { fr: 'Un produit manque ?',                                                                                                            ary: 'كاين منتوج ناقص؟' },
  'home.missingDesc':  { fr: 'Bayen est construit par la communauté marocaine. Ajoutez les produits que vous trouvez dans vos épiceries et grandes surfaces.',  ary: 'باين مبني بالمجتمع المغربي. زيد المنتجات اللي كتلقى فالحانوت ولا المارشي.' },
  'home.addProduct':   { fr: 'Ajouter un produit',                                                                                                             ary: 'زيد منتوج' },
  'home.products':     { fr: 'Produits',                                                                                                                       ary: 'منتجات' },
  'home.scans':        { fr: 'Scans',                                                                                                                          ary: 'سكانات' },
  'home.free':         { fr: 'Gratuit',                                                                                                                        ary: 'بلا فلوس' },

  // ── Contribuer ──────────────────────────────────────────────
  'contribute.title':      { fr: 'Ajouter un produit',                                                           ary: 'زيد منتوج' },
  'contribute.subtitle':   { fr: 'Aidez la communauté en ajoutant un produit alimentaire à la base Bayen',       ary: 'عاون المجتمع وزيد منتوج غذائي فقاعدة باين' },
  'contribute.barcode':    { fr: 'Code-barres du produit',                                                       ary: 'كود المنتوج' },
  'contribute.photos':     { fr: 'Photos',                                                                       ary: 'تصاور' },
  'contribute.info':       { fr: 'Infos',                                                                        ary: 'معلومات' },
  'contribute.confirm':    { fr: 'Confirmer',                                                                    ary: 'أكّد' },
  'contribute.continue':   { fr: 'Continuer',                                                                    ary: 'كمّل' },
  'contribute.back':       { fr: 'Retour',                                                                       ary: 'رجع' },
  'contribute.submit':     { fr: 'Soumettre le produit',                                                         ary: 'سيفط المنتوج' },
  'contribute.sending':    { fr: 'Envoi en cours...',                                                             ary: 'كيتسيفط...' },
  'contribute.thanks':     { fr: 'Merci pour votre contribution !',                                              ary: 'شكرا على المساهمة ديالك!' },
  'contribute.addAnother': { fr: 'Ajouter un autre produit',                                                     ary: 'زيد منتوج آخر' },

  // ── Commun ──────────────────────────────────────────────────
  'common.error':   { fr: 'Une erreur est survenue', ary: 'وقع مشكل' },
  'common.retry':   { fr: 'Réessayer',               ary: 'عاود' },
  'common.loading': { fr: 'Chargement...',            ary: 'كيتحمّل...' },
} as const

/** Clé de traduction valide */
export type TranslationKey = keyof typeof translations

/** Locale supportée */
export type Locale = 'fr' | 'ary'
