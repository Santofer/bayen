/**
 * Titres et descriptions des pages (balises <title> et meta description), audit SEO du 18/10/2026.
 * Fusionnés dans `translations` (lib/translations.ts). Chaque clé : fr + ary (darija marocaine).
 * Règle de gabarit : title ≤ 65 caractères avec un seul « | Bayen », description de 120 à 155 caractères.
 * Aucun chiffre non mesuré, jamais « sans pub » (règles éditoriales du client).
 */
export const seoPages = {
  'seo.home.title':      { fr: 'Application Bayen : scanne et note tes produits au Maroc', ary: 'تطبيق باين: سكاني ونقّط المنتوجات ديالك فالمغرب' },
  'seo.home.desc':       { fr: 'Application gratuite : scanne un produit, vois son score sur 100, ses additifs et des alternatives. Alimentation, beauté et repas au Maroc.', ary: 'تطبيق فابور: سكاني منتوج، شوف النقطة ديالو على 100، الإضافات اللي فيه والبدائل. الماكلة، التجميل والوجبات فالمغرب.' },
  'seo.beauty.title':    { fr: 'Cosmétiques au Maroc : score beauté et liste INCI | Bayen', ary: 'التجميل فالمغرب: نقطة الجمال ولائحة INCI | Bayen' },
  'seo.beauty.desc':     { fr: 'Crèmes, shampooings, savons, dentifrices : la liste INCI comparée aux listes officielles. Interdits, allergènes, perturbateurs endocriniens suspectés.', ary: 'كريمات، شامبوان، صابون، معجون السنان: لائحة INCI مقارنة مع اللوائح الرسمية. المواد الممنوعة، مسببات الحساسية والمخلات الهرمونية المشكوك فيها.' },
  'seo.protein.title':   { fr: 'Produits les plus riches en protéines au Maroc | Bayen', ary: 'المنتوجات اللي فيها كثر بروتين فالمغرب | Bayen' },
  'seo.protein.desc':    { fr: 'Classement des produits vendus au Maroc par protéines pour 100 g : thon, fromages, barres, poudres. Avec le score Bayen, le sucre et le sel.', ary: 'ترتيب المنتوجات اللي كتتباع فالمغرب حسب البروتين ف100 g: الطون، الفرماج، الباروات والپودرات. مع نقطة باين، السكر والملحة.' },
  'seo.additives.title': { fr: 'Additifs alimentaires (E-numéros) : risques et liste | Bayen', ary: 'الإضافات الغذائية (أرقام E): المخاطر واللائحة | Bayen' },
  'seo.additives.desc':  { fr: '{n} additifs alimentaires expliqués : colorants, conservateurs, édulcorants, avec niveau de risque, sources et produits concernés au Maroc.', ary: '{n} إضافة غذائية مشروحة: الملوّنات، المواد الحافظة والمحلّيات، مع مستوى الخطورة، المصادر والمنتوجات اللي فيها فالمغرب.' },
  'seo.additives.descNoCount': { fr: 'Additifs alimentaires expliqués : colorants, conservateurs, édulcorants, avec niveau de risque, sources et produits concernés au Maroc.', ary: 'الإضافات الغذائية مشروحة: الملوّنات، المواد الحافظة والمحلّيات، مع مستوى الخطورة، المصادر والمنتوجات اللي فيها فالمغرب.' },
  // Fiche additif : construite à partir des données (code, nom, fonction, niveau de risque, nombre de produits)
  'seo.additive.title':      { fr: '{id}, {name} : risques et produits concernés | Bayen', ary: '{id}، {name}: المخاطر والمنتوجات اللي فيه | Bayen' },
  'seo.additive.titleShort': { fr: '{id}, {name} : risques | Bayen', ary: '{id}، {name}: المخاطر | Bayen' },
  'seo.additive.risk.safe':      { fr: 'considéré comme sûr aux doses alimentaires', ary: 'آمن بالكميات العادية فالماكلة' },
  'seo.additive.risk.limited':   { fr: 'à limiter',                                  ary: 'خاصو يتنقّص' },
  'seo.additive.risk.avoid':     { fr: 'à éviter',                                   ary: 'حسن تتجنبو' },
  'seo.additive.risk.banned_ma': { fr: "interdit dans l'alimentation en UE",         ary: 'ممنوع فالماكلة فالاتحاد الأوروبي' },
  'seo.additive.lead':       { fr: '{id} ({name}), {fn} : {risk}.', ary: '{id} ({name})، {fn}: {risk}.' },
  'seo.additive.leadNoFn':   { fr: '{id} ({name}) : {risk}.',       ary: '{id} ({name}): {risk}.' },
  'seo.additive.products':   { fr: 'Produits concernés au Maroc : {n}.', ary: 'المنتوجات اللي فيه فالمغرب: {n}.' },
  'seo.additive.tail':       { fr: 'Sources et effet sur le score Bayen.', ary: 'المصادر والتأثير على نقطة باين.' },
  'seo.additive.notFound':   { fr: 'Additif {id} introuvable | Bayen', ary: 'الإضافة {id} ما كايناش | Bayen' },
  'seo.method.title':    { fr: 'Méthodologie du score Bayen : Nutri-Score, NOVA, additifs', ary: 'منهجية نقطة باين: Nutri-Score، NOVA، الإضافات' },
  'seo.method.desc':     { fr: 'Comment Bayen calcule la note sur 100 : Nutri-Score (50 points), NOVA (30) et additifs (20). Algorithme public et reproductible, sans IA dans le calcul.', ary: 'كيفاش باين كيحسب النقطة على 100: Nutri-Score (50 نقطة)، NOVA (30) والإضافات (20). خوارزمية علنية كتعطي ديما نفس النتيجة، بلا ذكاء اصطناعي فالحساب.' },
  'seo.about.title':     { fr: 'À propos : initiative citoyenne et score public | Bayen', ary: 'على باين: مبادرة مواطنة ونقطة علنية | Bayen' },
  'seo.about.desc':      { fr: "Bayen, initiative citoyenne et gratuite née à Casablanca : qui la porte, d'où viennent les données, comment le score est calculé et ses limites.", ary: 'باين، مبادرة مواطنة وفابور من كازا: شكون ورا المشروع، منين جاية المعطيات، كيفاش كتحسب النقطة والحدود ديالها.' },
  'seo.search.title':    { fr: 'Rechercher un produit vendu au Maroc : score, additifs | Bayen', ary: 'قلّب على منتوج كيتباع فالمغرب: النقطة والإضافات | Bayen' },
  'seo.search.desc':     { fr: 'Cherche parmi plus de 3 000 produits alimentaires et cosmétiques vendus au Maroc : score, Nutri-Score, additifs, prix et alternatives.', ary: 'قلّب فكثر من 3000 منتوج ديال الماكلة والتجميل كيتباعو فالمغرب: النقطة، Nutri-Score، الإضافات، الأثمنة والبدائل.' },
  'seo.partners.title':  { fr: 'Marques et producteurs : corriger vos fiches produit | Bayen', ary: 'الماركات والمنتجين: صححو البطاقات ديال المنتوجات ديالكم | Bayen' },
  'seo.partners.desc':   { fr: "Marques, producteurs, distributeurs : corrigez et complétez les fiches de vos produits sur Bayen. Le score, lui, reste calculé par l'algorithme public.", ary: 'الماركات، المنتجين والموزعين: صححو وكمّلو البطاقات ديال المنتوجات ديالكم فباين. النقطة كتبقى كتحسب بالخوارزمية العلنية.' },
  'seo.meal.title':      { fr: 'Analyser un repas en photo : calories estimées | Bayen', ary: 'حلّل وجبة بالتصويرة: تقدير الكالوري | Bayen' },
  'seo.meal.desc':       { fr: 'Photographie ton plat : estimation des calories en fourchette, macros et niveau de confiance. Une estimation, jamais un avis médical.', ary: 'صوّر الطبسيل ديالك: تقدير الكالوري بين حدّين، الماكرو ودرجة الثقة. غير تقدير، عمرو ما يكون نصيحة طبية.' },
  'seo.compare.title':   { fr: 'Comparer deux produits : score, additifs, verdict | Bayen', ary: 'قارن جوج منتوجات: النقطة، الإضافات والحكم | Bayen' },
  'seo.compare.desc':    { fr: 'Compare deux produits vendus au Maroc côte à côte : score Bayen, Nutri-Score, NOVA, sucres, sel et additifs, avec un verdict clair sur celui à choisir.', ary: 'قارن جوج منتوجات كيتباعو فالمغرب جنب لجنب: نقطة باين، Nutri-Score، NOVA، السكر، الملحة والإضافات، مع حكم واضح على اللي تختار.' },
  'seo.rank.title':      { fr: 'Classement des contributeurs : points et rangs | Bayen', ary: 'ترتيب المساهمين: النقط والرتب | Bayen' },
  'seo.rank.desc':       { fr: 'Le classement des contributeurs de Bayen : points gagnés en ajoutant et en complétant des fiches produit, rangs et podium de la communauté au Maroc.', ary: 'الترتيب ديال المساهمين فباين: النقط اللي ربحو بزيادة وتكميل البطاقات ديال المنتوجات، الرتب والبوديوم ديال المجتمع فالمغرب.' },
  'seo.contribute.title': { fr: 'Ajouter un produit manquant avec une photo | Bayen', ary: 'زيد منتوج ناقص بتصويرة | Bayen' },
  'seo.contribute.desc':  { fr: "Un produit alimentaire ou cosmétique manque sur Bayen ? Photographie-le avec son étiquette, vérifie les valeurs lues, et l'algorithme public le note.", ary: 'شي منتوج ديال الماكلة ولا التجميل ناقص فباين؟ صوّرو مع البطاقة ديالو، تأكد من القيم اللي تقراو، والخوارزمية العلنية كتنقّطو.' },

  // ── Méthodologie : FAQ visible (même texte que le balisage FAQPage) ──
  'method.faqTitle': { fr: 'Questions fréquentes', ary: 'أسئلة كتتعاود' },
  'method.faq1q':    { fr: 'Comment le score Bayen est-il calculé ?', ary: 'كيفاش كتحسب نقطة باين؟' },
  'method.faq1a':    { fr: "Le score Bayen, sur 100, additionne trois composantes : le Nutri-Score officiel (jusqu'à 50 points), le groupe NOVA de transformation (jusqu'à 30 points) et les additifs (20 points, moins une déduction par additif à risque). C'est un algorithme déterministe et public, sans intelligence artificielle dans le calcul.", ary: 'نقطة باين، على 100، كتجمع تلاتة ديال الأجزاء: Nutri-Score الرسمي (حتى ل50 نقطة)، مجموعة NOVA ديال التحويل (حتى ل30 نقطة) والإضافات (20 نقطة، ناقص خصم على كل إضافة فيها خطر). خوارزمية ثابتة وعلنية، بلا ذكاء اصطناعي فالحساب.' },
  'method.faq2q':    { fr: 'Pourquoi un produit Nutri-Score A peut-il avoir un score Bayen moyen ?', ary: 'علاش منتوج عندو Nutri-Score A تقدر تكون عندو نقطة باين متوسطة؟' },
  'method.faq2a':    { fr: 'Le Nutri-Score ne regarde que la composition nutritionnelle (sucres, sel, graisses saturées, fibres, protéines). Un produit peut être Nutri-Score A tout en étant ultra-transformé (NOVA 4) ou riche en additifs : le score Bayen tient aussi compte de ces deux dimensions.', ary: 'Nutri-Score كيشوف غير التركيبة الغذائية (السكر، الملحة، الدهون المشبعة، الألياف، البروتين). منتوج يقدر يكون Nutri-Score A وفنفس الوقت محوّل بزاف (NOVA 4) ولا فيه بزاف ديال الإضافات: نقطة باين كتحسب حتى هاد الجوج.' },
  'method.faq3q':    { fr: "D'où viennent les données ?", ary: 'منين جاية المعطيات؟' },
  'method.faq3a':    { fr: "La plupart des fiches viennent des bases collaboratives Open Food Facts et Open Beauty Facts. Elles sont complétées par la communauté et par des photos d'étiquettes lues par l'IA : l'IA recopie les valeurs, elle ne fixe jamais la note.", ary: 'أغلبية البطاقات جاية من القواعد التشاركية Open Food Facts وOpen Beauty Facts. المجتمع كيكمّلها، وحتى التصاور ديال البطاقات اللي كيقراها الذكاء الاصطناعي: الذكاء الاصطناعي كينقل القيم، عمرو ما كيعطي النقطة.' },
  'method.faq4q':    { fr: "L'IA décide-t-elle de la note d'un produit ?", ary: 'واش الذكاء الاصطناعي هو اللي كيقرر النقطة ديال المنتوج؟' },
  'method.faq4a':    { fr: "Non. L'IA (modèle Qwen3.5-9B, hébergé sur nos serveurs à Casablanca) lit les étiquettes et les listes d'ingrédients, identifie un produit encore sans fiche et estime les calories d'une photo de plat. Le score final est toujours calculé par l'algorithme déterministe et public.", ary: 'لا. الذكاء الاصطناعي (نموذج Qwen3.5-9B، مستضاف على السيرفورات ديالنا فكازا) كيقرا البطاقات ولوائح المكونات، كيتعرف على منتوج مازال ما عندو بطاقة، وكيقدّر الكالوري من تصويرة ديال طبسيل. النقطة النهائية ديما كتحسب بالخوارزمية الثابتة والعلنية.' },
} as const
