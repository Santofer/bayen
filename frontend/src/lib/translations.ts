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
  'additives.title':     { fr: 'Additifs',                 ary: 'إضافات' },
  'additives.pageTitle': { fr: 'Additifs alimentaires',    ary: 'الإضافات الغذائية' },
  'additives.pageDesc':  { fr: 'Base de données des additifs E-xxx avec leur niveau de risque', ary: 'قاعدة بيانات الإضافات E-xxx مع مستوى الخطورة ديالهم' },
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
  'home.hero1':        { fr: 'Scannez. Comprenez.',                                                                                                            ary: 'سكاني. فهم.' },
  'home.hero2':        { fr: 'Choisissez mieux.',                                                                                                              ary: 'اختار حسن.' },
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
  'home.popular':      { fr: 'Produits récents',                                                                                                              ary: 'المنتجات الأخيرة' },
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
  'search.categories':   { fr: 'Catégories',                                         ary: 'الفئات' },
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

  // ── Alternatives ──────────────────────────────────────────
  'alt.title':          { fr: 'Alternatives plus saines',         ary: 'بدائل صحية أكثر' },
  'alt.bestInCategory': { fr: 'Meilleur de sa catégorie !',       ary: 'الأحسن فالفئة ديالو!' },
  'alt.score':          { fr: 'Score',                             ary: 'النتيجة' },
  'alt.see':            { fr: 'Voir',                              ary: 'شوف' },

  // ── Partage ───────────────────────────────────────────────
  'share.title':        { fr: 'Partager',                         ary: 'بارطاجي' },
  'share.whatsapp':     { fr: 'WhatsApp',                         ary: 'واتساب' },
  'share.copyLink':     { fr: 'Copier le lien',                   ary: 'كوبي الليان' },
  'share.facebook':     { fr: 'Facebook',                         ary: 'فيسبوك' },
  'share.copied':       { fr: 'Lien copié !',                     ary: 'تكوبيا!' },
  'share.text':         { fr: 'Découvre le score de ce produit sur Bayen', ary: 'شوف النتيجة ديال هاد المنتوج على باين' },

  // ── Additifs (page liste) ────────────────────────────────────
  'additives.search':     { fr: 'Rechercher un additif (E471, tartrazine, émulsifiant…)', ary: 'قلّب على إضافة (E471, تارترازين, مستحلب...)' },
  'additives.all':        { fr: 'Tous',                        ary: 'الكل' },
  'additives.found':      { fr: 'additif(s) trouvé(s)',        ary: 'إضافة/إضافات تلقاو' },
  'additives.noResult':   { fr: 'Aucun additif trouvé pour cette recherche.', ary: 'ما لقينا حتا إضافة فهاد البحث.' },
  'additives.loadError':  { fr: 'Impossible de charger les additifs. Vérifiez la connexion API.', ary: 'ما قدرناش نحملو الإضافات. شوف الكونيكسيون.' },

  // ── Scanner (page) ─────────────────────────────────────────
  'scan.tip1':       { fr: 'Placez le code-barres bien centré dans le cadre',         ary: 'حط الكود فوسط الكادر' },
  'scan.tip2':       { fr: 'Assurez un bon éclairage, évitez les reflets',            ary: 'خلّي الضو مزيان، تجنب الانعكاس' },
  'scan.tip3':       { fr: 'Distance idéale : 15–25 cm du produit',                  ary: 'المسافة المثالية: 15–25 سم من المنتوج' },
  'scan.retry':      { fr: 'Réessayer',                                              ary: 'عاود' },

  // ── Analyse santé ──────────────────────────────────────────
  'health.title':         { fr: 'Analyse santé',                                    ary: 'تحليل الصحة' },
  'health.alerts':        { fr: 'alerte',                                           ary: 'تنبيه' },
  'health.alertsPlural':  { fr: 'alertes',                                          ary: 'تنبيهات' },
  'health.positives':     { fr: 'point positif',                                    ary: 'نقطة إيجابية' },
  'health.positivesPlural': { fr: 'points positifs',                                ary: 'نقط إيجابية' },

  // Nutri-Score alertes
  'health.ns.a.title':    { fr: 'Nutri-Score A',                                    ary: 'نوتري سكور A' },
  'health.ns.a.desc':     { fr: 'Excellente qualité nutritionnelle. Ce produit fait partie des meilleurs choix de sa catégorie.',
                            ary: 'جودة غذائية ممتازة. هاد المنتوج من أحسن الخيارات فالفئة ديالو.' },
  'health.ns.b.title':    { fr: 'Nutri-Score B',                                    ary: 'نوتري سكور B' },
  'health.ns.b.desc':     { fr: 'Bonne qualité nutritionnelle. Un choix favorable pour une alimentation équilibrée.',
                            ary: 'جودة غذائية مزيانة. خيار مزيان لماكلة متوازنة.' },
  'health.ns.c.title':    { fr: 'Nutri-Score C',                                    ary: 'نوتري سكور C' },
  'health.ns.c.desc':     { fr: "Qualité nutritionnelle moyenne. À consommer avec modération dans le cadre d'une alimentation variée.",
                            ary: 'جودة غذائية متوسطة. كولو بالقياس فإطار ماكلة متنوعة.' },
  'health.ns.d.title':    { fr: 'Nutri-Score D',                                    ary: 'نوتري سكور D' },
  'health.ns.d.desc':     { fr: "Qualité nutritionnelle médiocre. Privilégiez des alternatives mieux notées quand c'est possible.",
                            ary: 'جودة غذائية ضعيفة. حاول تلقى بديل أحسن.' },
  'health.ns.e.title':    { fr: 'Nutri-Score E',                                    ary: 'نوتري سكور E' },
  'health.ns.e.desc':     { fr: 'Mauvaise qualité nutritionnelle. Ce produit est à limiter dans votre alimentation quotidienne.',
                            ary: 'جودة غذائية خايبة. حاول تنقص من هاد المنتوج فالماكلة ديالك.' },

  // NOVA alertes
  'health.nova.1.title':  { fr: 'NOVA 1 — Non transformé',                          ary: 'NOVA 1 — ما محولش' },
  'health.nova.1.desc':   { fr: "Aliment non transformé ou minimalement transformé. C'est le meilleur choix pour votre santé.",
                            ary: 'ماكلة ما محولاش ولا محولة شوية. أحسن حاجة لصحتك.' },
  'health.nova.2.title':  { fr: 'NOVA 2 — Ingrédient culinaire',                    ary: 'NOVA 2 — مكون ديال الطبخ' },
  'health.nova.2.desc':   { fr: 'Ingrédient culinaire transformé (huile, beurre, sucre...). Utilisé en cuisine pour préparer des plats.',
                            ary: 'مكون محول (زيت، زبدة، سكر...). كيتستعمل فالطبخ باش تحضر الماكلة.' },
  'health.nova.3.title':  { fr: 'NOVA 3 — Transformé',                              ary: 'NOVA 3 — محوّل' },
  'health.nova.3.desc':   { fr: 'Aliment transformé (conserves, fromages, pain...). Produit modifié par des procédés industriels simples.',
                            ary: 'ماكلة محولة (كونصيرفة، فروماج، خبز...). محولة بطريقة صناعية بسيطة.' },
  'health.nova.4.title':  { fr: 'NOVA 4 — Ultra-transformé',                        ary: 'NOVA 4 — محوّل بزاف' },
  'health.nova.4.desc':   { fr: "Produit ultra-transformé. Contient des additifs, arômes ou ingrédients qu'on ne trouve pas dans une cuisine domestique. La consommation régulière est associée à des risques pour la santé.",
                            ary: 'منتوج محوّل بزاف. فيه إضافات ونكهات ما كتلقاهمش فالطبخ ديال الدار. الاستهلاك المنتظم كيأثر على الصحة.' },

  // Sucres
  'health.sugars.high':      { fr: 'Sucres élevés',                                 ary: 'سكر عالي' },
  'health.sugars.high.desc': { fr: "Ce produit contient une quantité élevée de sucres (> 22,5 g/100g). L'OMS recommande de limiter les sucres ajoutés à moins de 25 g par jour.",
                               ary: 'هاد المنتوج فيه بزاف ديال السكر (< 22.5 غ/100غ). المنظمة العالمية للصحة كتوصي ما تفوتش 25 غ فالنهار.' },
  'health.sugars.mod':       { fr: 'Sucres modérés',                                 ary: 'سكر متوسط' },
  'health.sugars.mod.desc':  { fr: 'Ce produit contient une quantité modérée de sucres. Vérifiez les portions consommées.',
                               ary: 'هاد المنتوج فيه كمية متوسطة ديال السكر. رد بالك للكمية اللي كتاكل.' },
  'health.sugars.low':       { fr: 'Faible en sucres',                               ary: 'قليل السكر' },
  'health.sugars.low.desc':  { fr: 'Ce produit est faible en sucres (≤ 5 g/100g). Bon point !',
                               ary: 'هاد المنتوج فيه شوية ديال السكر (≤ 5 غ/100غ). نقطة مزيانة!' },

  // Graisses saturées
  'health.fat.high':         { fr: 'Graisses saturées élevées',                      ary: 'دهون مشبعة عالية' },
  'health.fat.high.desc':    { fr: "Riche en acides gras saturés (> 5 g/100g). Les AGS en excès augmentent le risque cardiovasculaire. Privilégiez les produits à base d'huile d'olive ou de colza.",
                               ary: 'فيه بزاف ديال الدهون المشبعة (< 5 غ/100غ). كثرتها كتزيد خطر أمراض القلب. استعمل زيت الزيتون أحسن.' },
  'health.fat.mod':          { fr: 'Graisses saturées modérées',                     ary: 'دهون مشبعة متوسطة' },
  'health.fat.mod.desc':     { fr: 'Teneur modérée en acides gras saturés.',
                               ary: 'كمية متوسطة ديال الدهون المشبعة.' },

  // Sel
  'health.salt.high':        { fr: 'Sel élevé',                                      ary: 'ملح عالي' },
  'health.salt.high.desc':   { fr: "L'excès de sel favorise l'hypertension. L'OMS recommande max 5 g/jour.",
                               ary: 'بزاف ديال الملح كيسبب ضغط الدم. المنظمة العالمية للصحة كتوصي ما تفوتش 5 غ فالنهار.' },
  'health.salt.mod':         { fr: 'Sel modéré',                                     ary: 'ملح متوسط' },
  'health.salt.mod.desc':    { fr: 'Teneur modérée en sel. Surveillez votre apport total journalier.',
                               ary: 'كمية متوسطة ديال الملح. رد بالك للكمية الكلية فالنهار.' },

  // Fibres
  'health.fiber.high':       { fr: 'Riche en fibres',                                ary: 'غني بالألياف' },
  'health.fiber.high.desc':  { fr: 'Excellente source de fibres (≥ 6 g/100g). Les fibres favorisent la digestion et la satiété.',
                               ary: 'مصدر ممتاز ديال الألياف (≥ 6 غ/100غ). الألياف كتساعد الهضم وكتخليك شبعان.' },
  'health.fiber.mod':        { fr: 'Source de fibres',                               ary: 'مصدر ديال الألياف' },
  'health.fiber.mod.desc':   { fr: 'Bonne source de fibres (≥ 3 g/100g).',
                               ary: 'مصدر مزيان ديال الألياف (≥ 3 غ/100غ).' },

  // Protéines
  'health.protein.high':     { fr: 'Riche en protéines',                             ary: 'غني بالبروتينات' },
  'health.protein.high.desc':{ fr: 'Excellente source de protéines. Les protéines contribuent au maintien de la masse musculaire.',
                               ary: 'مصدر ممتاز ديال البروتينات. كتساعد فالحفاظ على العضلات.' },

  // Énergie
  'health.energy.high':      { fr: 'Très calorique',                                 ary: 'سعرات حرارية عالية' },
  'health.energy.high.desc': { fr: 'Produit très riche en calories. Attention aux portions.',
                               ary: 'منتوج فيه بزاف ديال السعرات الحرارية. رد بالك للكمية.' },

  // Additifs
  'health.add.many':         { fr: 'additifs détectés',                              ary: 'إضافات تلقاو' },
  'health.add.many.desc':    { fr: "Ce produit contient un nombre élevé d'additifs. Certains additifs peuvent avoir des effets indésirables en cas de consommation régulière.",
                               ary: 'هاد المنتوج فيه بزاف ديال الإضافات. شي إضافات ممكن يكون عندها تأثير سلبي إلا تاكلتي بزاف.' },
  'health.add.some':         { fr: 'additifs détectés',                              ary: 'إضافات تلقاو' },
  'health.add.some.desc':    { fr: "Présence de plusieurs additifs. Consultez la liste pour vérifier s'ils sont à éviter.",
                               ary: 'كاينين شي إضافات. شوف اللائحة باش تعرف واش خاص تجنبهم.' },
  'health.add.few':          { fr: 'additif(s) détecté(s)',                           ary: 'إضافة/إضافات تلقاو' },
  'health.add.few.desc':     { fr: "Peu d'additifs dans ce produit.",
                               ary: 'هاد المنتوج فيه شوية ديال الإضافات.' },

  // ── Ingrédients (section) ──────────────────────────────────
  'ing.title':            { fr: 'Ingrédients',                                      ary: 'المكونات' },
  'ing.traces':           { fr: 'Peut contenir des traces de :',                     ary: 'ممكن يكون فيه آثار ديال :' },

  // ── Liens rapides accueil ───────────────────────────────────
  'home.import':        { fr: 'Importer (OFF)',                                    ary: 'استوراد (OFF)' },
  'home.ranking':       { fr: 'Classement',                                        ary: 'الترتيب' },

  // ── Footer ────────────────────────────────────────────────
  'footer.navigation':    { fr: 'Navigation',                                       ary: 'التنقل' },
  'footer.participate':   { fr: 'Participer',                                       ary: 'شارك' },
  'footer.info':          { fr: 'Informations',                                     ary: 'معلومات' },
  'footer.initiative':    { fr: 'Une initiative citoyenne de',                       ary: 'مبادرة مواطنة ديال' },
  'footer.dataFrom':      { fr: 'Données alimentaires issues de',                   ary: 'المعلومات الغذائية من' },

  // ── Classement ────────────────────────────────────────────
  'rank.title':           { fr: 'Classement des contributeurs',                      ary: 'ترتيب المساهمين' },
  'rank.subtitle':        { fr: 'Merci à tous ceux qui enrichissent la base de données Bayen !', ary: 'شكرا لكل واحد كيغني قاعدة بيانات باين!' },
  'rank.empty':           { fr: 'Aucun contributeur pour le moment.',                ary: 'مازال ما كاين حتا مساهم.' },
  'rank.beFirst':         { fr: 'Soyez le premier →',                               ary: 'كون الأول →' },
  'rank.howToEarn':       { fr: 'Comment gagner des points ?',                       ary: 'كيفاش تربح النقط؟' },
  'rank.levels':          { fr: 'Niveaux',                                           ary: 'المستويات' },
  'rank.addProduct':      { fr: 'Ajouter un produit complet',                        ary: 'زيد منتوج كامل' },
  'rank.addPhotos':       { fr: 'Ajouter des photos manquantes',                     ary: 'زيد تصاور ناقصة' },
  'rank.correctData':     { fr: 'Corriger des données',                              ary: 'صحح المعلومات' },
  'rank.scanProduct':     { fr: 'Scanner un produit',                                ary: 'سكاني منتوج' },
  'rank.confirmedX3':     { fr: 'Contribution confirmée ×3',                         ary: 'مساهمة مأكدة ×3' },
  'rank.nouveau':         { fr: 'Nouveau',                                           ary: 'جديد' },
  'rank.contributeur':    { fr: 'Contributeur',                                      ary: 'مساهم' },
  'rank.expert':          { fr: 'Expert',                                            ary: 'خبير' },
  'rank.verified':        { fr: 'Vérifié',                                           ary: 'مأكد' },
  'rank.contribution':    { fr: 'contribution',                                      ary: 'مساهمة' },
  'rank.contributions':   { fr: 'contributions',                                     ary: 'مساهمات' },
  'rank.anonymous':       { fr: 'Anonyme',                                           ary: 'مجهول' },
  'rank.pts':             { fr: 'pts',                                               ary: 'نقط' },

  // ── Connexion ─────────────────────────────────────────────
  'login.welcome':        { fr: 'Bienvenue sur Bayen',                               ary: 'مرحبا فباين' },
  'login.subtitle':       { fr: 'Connectez-vous pour contribuer et suivre vos scans', ary: 'دخل باش تساهم وتتبع السكانات ديالك' },

  // ── Additif (fiche) ───────────────────────────────────────
  'additive.back':             { fr: 'Tous les additifs',                             ary: 'كل الإضافات' },
  'additive.notFound':         { fr: 'Additif non trouvé',                            ary: 'الإضافة ما لقيناهاش' },
  'additive.notFoundDesc':     { fr: "Cet additif n'existe pas dans notre base.",     ary: 'هاد الإضافة ما كايناش عندنا.' },
  'additive.description':      { fr: 'Description',                                   ary: 'الوصف' },
  'additive.sources':          { fr: 'Sources',                                       ary: 'المصادر' },
  'additive.scoreImpact':      { fr: 'Impact sur le score Bayen',                     ary: 'التأثير على نتيجة باين' },
  'additive.risk.safe':        { fr: 'Sûr',                                           ary: 'آمن' },
  'additive.risk.limited':     { fr: 'Limité',                                        ary: 'محدود' },
  'additive.risk.avoid':       { fr: 'À éviter',                                      ary: 'حسن تجنبو' },
  'additive.risk.banned':      { fr: 'Interdit au Maroc',                              ary: 'ممنوع فالمغرب' },
  'additive.riskDesc.safe':    { fr: "Considéré comme sûr aux doses alimentaires normales (EFSA / Codex).", ary: 'آمن بالكميات العادية حسب EFSA والكوديكس.' },
  'additive.riskDesc.limited': { fr: "DJA limitée. Consommation occasionnelle sans risque, mais l'excès est déconseillé.", ary: 'جرعة يومية محدودة. من حين لآخر ما فيه باس، لكن الإفراط ما مستحسنش.' },
  'additive.riskDesc.avoid':   { fr: "Controversé et associé à des risques. Limiter la consommation, surtout pour les enfants.", ary: 'فيه جدل وممكن يضر. نقص منو، خصوصا عند الدراري.' },
  'additive.riskDesc.banned':  { fr: "Interdit au Maroc et/ou dans l'UE en raison de risques sanitaires avérés.", ary: 'ممنوع فالمغرب و/أو الاتحاد الأوروبي بسبب مخاطر صحية.' },
  'additive.impactNone':       { fr: "Aucune déduction — n'impacte pas le score.",     ary: 'حتا خصم — ما كيأثرش على النتيجة.' },
  'additive.impactLimited':    { fr: 'Déduction de 2 points sur la composante Additifs (20 pts max).', ary: 'خصم 2 نقط من الإضافات (20 نقطة كحد أقصى).' },
  'additive.impactAvoid':      { fr: 'Déduction de 5 points sur la composante Additifs (20 pts max).', ary: 'خصم 5 نقط من الإضافات (20 نقطة كحد أقصى).' },
  'additive.impactBanned':     { fr: 'Déduction de 10 points sur la composante Additifs (20 pts max).', ary: 'خصم 10 نقط من الإضافات (20 نقطة كحد أقصى).' },

  // ── Badge héro ────────────────────────────────────────────
  'home.badge':           { fr: '100% GRATUIT \u2022 OPEN SOURCE \u2022',             ary: '100% مجاني \u2022 مفتوح المصدر \u2022' },

  // ── Install PWA ───────────────────────────────────────────
  'install.title':       { fr: 'Installer Bayen',                              ary: 'ثبت باين' },
  'install.subtitle':    { fr: "Accès rapide depuis l'écran d'accueil",       ary: 'وصول سريع من الشاشة الرئيسية' },
  'install.button':      { fr: 'Installer',                                    ary: 'ثبت' },
  'install.later':       { fr: 'Plus tard',                                    ary: 'من بعد' },
  'install.ios.title':   { fr: "Ajouter à l'écran d'accueil",                 ary: 'زيد للشاشة الرئيسية' },
  'install.ios.step1':   { fr: "1. Touche l'icône Partager",                   ary: '1. كليك على أيقونة المشاركة' },
  'install.ios.step2':   { fr: '2. "Sur l\'écran d\'accueil"',                ary: '2. "على الشاشة الرئيسية"' },
} as const

/** Clé de traduction valide */
export type TranslationKey = keyof typeof translations

/** Locale supportée */
export type Locale = 'fr' | 'ary'
