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

  // ── Recherche ───────────────────────────────────────────────
  'search.title':         { fr: 'Recherche',                                           ary: 'بحث' },
  'search.placeholder':   { fr: 'Rechercher un produit, une marque ou un code-barres...', ary: 'قلّب على منتوج، ماركة ولا كود...' },
  'search.filters':       { fr: 'Filtres',                                             ary: 'فيلتر' },
  'search.sort':          { fr: 'Trier par',                                           ary: 'رتّب حسب' },
  'search.sortMostScanned': { fr: 'Plus scannés',                                     ary: 'الأكثر سكان' },
  'search.sortBestScore':   { fr: 'Meilleur score',                                   ary: 'أحسن نتيجة' },
  'search.sortNewest':      { fr: 'Plus récents',                                     ary: 'الأحدث' },
  'search.category':      { fr: 'Catégorie',                                          ary: 'الفئة' },
  'search.allCategories':  { fr: 'Toutes les catégories',                              ary: 'كل الفئات' },
  'search.scoreMin':       { fr: 'Score minimum',                                     ary: 'أقل نتيجة' },
  'search.noAdditives':    { fr: 'Sans additifs à éviter',                            ary: 'بلا إضافات خايبة' },
  'search.halal':          { fr: 'Halal',                                             ary: 'حلال' },
  'search.bio':            { fr: 'Bio',                                               ary: 'بيو' },
  'search.results':        { fr: 'produit(s) trouvé(s)',                               ary: 'منتوج(ات) تلقاو' },
  'search.noResults':      { fr: 'Aucun produit trouvé',                               ary: 'ما لقينا والو' },
  'search.noResultsDesc':  { fr: 'Essayez de modifier vos filtres ou votre recherche.', ary: 'بدّل الفيلتر ولا البحث ديالك.' },
  'search.resetFilters':   { fr: 'Réinitialiser les filtres',                          ary: 'رجّع الفيلتر' },
  'search.loadMore':       { fr: 'Charger plus',                                      ary: 'حمّل المزيد' },
  'search.offResults':     { fr: 'Résultats Open Food Facts',                         ary: 'نتائج Open Food Facts' },
  'search.noLocalResults': { fr: 'Aucun résultat local',                               ary: 'ما كاينش فالقاعدة' },
  'search.searchingOff':   { fr: 'Recherche sur Open Food Facts...',                   ary: 'كنقلبو فـ Open Food Facts...' },

  // ── Produit (détails supplémentaires) ──────────────────────
  'product.source':        { fr: 'Source',                ary: 'المصدر' },
  'product.bio':           { fr: 'Bio',                   ary: 'بيو' },
  'product.halal':         { fr: 'Halal',                 ary: 'حلال' },
  'product.energy':        { fr: 'Énergie',               ary: 'الطاقة' },
  'product.fat':           { fr: 'Lipides',               ary: 'الدهون' },
  'product.saturatedFat':  { fr: 'dont AGS',              ary: 'دهون مشبعة' },
  'product.carbs':         { fr: 'Glucides',              ary: 'السكريات الكلية' },
  'product.sugars':        { fr: 'dont Sucres',           ary: 'السكر' },
  'product.fiber':         { fr: 'Fibres',                ary: 'الألياف' },
  'product.proteins':      { fr: 'Protéines',             ary: 'البروتينات' },
  'product.salt':          { fr: 'Sel',                   ary: 'الملح' },
  'product.notTranslated': { fr: 'non traduit',           ary: 'ما مترجمش' },
  'product.saveInBayen':   { fr: 'Sauvegarder dans Bayen', ary: 'حفظ فباين' },
  'product.saving':        { fr: 'Sauvegarde...',         ary: 'كيتحفظ...' },
  'product.saved':         { fr: 'Produit sauvegardé !',  ary: 'المنتوج تحفظ!' },
  'product.confirmations': { fr: 'confirmations',         ary: 'تأكيدات' },
  'product.confirm':       { fr: 'Confirmer',             ary: 'أكّد' },
  'product.report':        { fr: 'Signaler une erreur',   ary: 'بلّغ على غلط' },

  // ── Auth ───────────────────────────────────────────────────
  'auth.login':            { fr: 'Connexion',             ary: 'دخول' },
  'auth.register':         { fr: 'Inscription',           ary: 'تسجيل' },
  'auth.email':            { fr: 'Email',                 ary: 'الإيميل' },
  'auth.password':         { fr: 'Mot de passe',          ary: 'الباسوورد' },
  'auth.confirmPassword':  { fr: 'Confirmer le mot de passe', ary: 'أكّد الباسوورد' },
  'auth.displayName':      { fr: 'Nom affiché',           ary: 'الاسم المعروض' },
  'auth.loginBtn':         { fr: 'Se connecter',          ary: 'دخل' },
  'auth.registerBtn':      { fr: "S'inscrire",            ary: 'سجّل' },

  // ── Compte ─────────────────────────────────────────────────
  'account.title':         { fr: 'Mon compte',            ary: 'حسابي' },
  'account.stats':         { fr: 'Mes statistiques',      ary: 'الإحصائيات ديالي' },
  'account.contributions': { fr: 'Mes contributions',     ary: 'المساهمات ديالي' },
  'account.recentScans':   { fr: 'Mes scans récents',     ary: 'آخر السكانات' },
  'account.points':        { fr: 'Points',                ary: 'النقط' },
  'account.rank':          { fr: 'Rang',                  ary: 'المستوى' },
  'account.products':      { fr: 'Produits ajoutés',      ary: 'منتجات مزيودة' },

  // ── Contribuer (détails supplémentaires) ────────────────────
  'contribute.editTitle':   { fr: 'Corriger / Compléter',                 ary: 'صحح / كمّل' },
  'contribute.editSubtitle':{ fr: 'Améliorez les informations du produit', ary: 'حسّن المعلومات ديال المنتوج' },
  'contribute.name':        { fr: 'Nom du produit',                       ary: 'اسم المنتوج' },
  'contribute.brand':       { fr: 'Marque',                               ary: 'الماركة' },
  'contribute.photoFront':  { fr: 'Photo face avant',                     ary: 'تصويرة القدام' },
  'contribute.photoNutrition':{ fr: 'Tableau nutritionnel',               ary: 'الجدول الغذائي' },
  'contribute.photoIngredients':{ fr: 'Liste des ingrédients',            ary: 'لائحة المكونات' },
  'contribute.uploadImage': { fr: 'Uploader une image',                   ary: 'طلّع تصويرة' },

  // ── Commun ──────────────────────────────────────────────────
  'common.error':      { fr: 'Une erreur est survenue',  ary: 'وقع مشكل' },
  'common.retry':      { fr: 'Réessayer',                ary: 'عاود' },
  'common.loading':    { fr: 'Chargement...',             ary: 'كيتحمّل...' },
  'common.close':      { fr: 'Fermer',                   ary: 'سدّ' },
  'common.save':       { fr: 'Enregistrer',              ary: 'سجّل' },
  'common.cancel':     { fr: 'Annuler',                  ary: 'لغي' },
  'common.networkError':{ fr: 'Vérifiez votre connexion', ary: 'شوف الكونيكسيون ديالك' },
} as const

/** Clé de traduction valide */
export type TranslationKey = keyof typeof translations

/** Locale supportée */
export type Locale = 'fr' | 'ary'
