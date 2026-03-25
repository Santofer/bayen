/**
 * Seed additifs alimentaires E-xxx — base complète pour le marché marocain
 *
 * Usage :
 *   npx tsx scripts/seed-additives.ts
 *
 * Prérequis :
 *   - Directus en marche sur DIRECTUS_URL
 *   - Token admin dans DIRECTUS_ADMIN_TOKEN
 *
 * Sources :
 *   - Réglementation UE 1333/2008
 *   - Réglementation marocaine ONSSA
 *   - Codex Alimentarius
 *   - EFSA / CIRC évaluations de risques
 */

import 'dotenv/config'

const DIRECTUS_URL = process.env.DIRECTUS_URL ?? 'http://localhost:8055'
const DIRECTUS_ADMIN_TOKEN = process.env.DIRECTUS_ADMIN_TOKEN

if (!DIRECTUS_ADMIN_TOKEN) {
  console.error('DIRECTUS_ADMIN_TOKEN requis. Ajoutez-le dans .env')
  process.exit(1)
}

interface Additive {
  id: string
  name_fr: string
  function: string
  risk_level: 'safe' | 'limited' | 'avoid' | 'banned_ma'
  description_fr: string
  sources: string[]
}

// ────────────────────────────────────────────────────────────────
// Liste complète des additifs courants dans les produits marocains
// risk_level : safe / limited / avoid / banned_ma
// ────────────────────────────────────────────────────────────────

const additives: Additive[] = [
  // ═══════════════════════════════════════════════════════════
  // COLORANTS (E100–E199)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'E100',
    name_fr: 'Curcumine',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Colorant jaune naturel extrait du curcuma. Sans risque connu aux doses alimentaires.',
    sources: ['EFSA 2010', 'Codex Alimentarius'],
  },
  {
    id: 'E101',
    name_fr: 'Riboflavine (vitamine B2)',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Colorant jaune, également vitamine B2. Sans danger.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E102',
    name_fr: 'Tartrazine',
    function: 'colorant',
    risk_level: 'avoid',
    description_fr: 'Colorant azoïque jaune synthétique. Associé à l\'hyperactivité chez l\'enfant. Obligation d\'étiquetage spécial en UE.',
    sources: ['EFSA 2009', 'Southampton Study 2007'],
  },
  {
    id: 'E104',
    name_fr: 'Jaune de quinoléine',
    function: 'colorant',
    risk_level: 'limited',
    description_fr: 'Colorant jaune-vert synthétique. Interdit dans certains pays. DJA réduite par l\'EFSA.',
    sources: ['EFSA 2009'],
  },
  {
    id: 'E110',
    name_fr: 'Jaune orangé S (Sunset Yellow)',
    function: 'colorant',
    risk_level: 'avoid',
    description_fr: 'Colorant azoïque orange. Associé à l\'hyperactivité chez l\'enfant. Étiquetage spécial UE obligatoire.',
    sources: ['EFSA 2009', 'Southampton Study 2007'],
  },
  {
    id: 'E120',
    name_fr: 'Cochenille / Acide carminique',
    function: 'colorant',
    risk_level: 'limited',
    description_fr: 'Colorant rouge naturel d\'origine animale (insecte). Risque allergique rare.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E122',
    name_fr: 'Azorubine / Carmoisine',
    function: 'colorant',
    risk_level: 'avoid',
    description_fr: 'Colorant azoïque rouge synthétique. Associé à l\'hyperactivité chez l\'enfant.',
    sources: ['EFSA 2009', 'Southampton Study 2007'],
  },
  {
    id: 'E124',
    name_fr: 'Ponceau 4R / Rouge cochenille A',
    function: 'colorant',
    risk_level: 'avoid',
    description_fr: 'Colorant azoïque rouge synthétique. Associé à l\'hyperactivité. Interdit aux USA.',
    sources: ['EFSA 2009', 'FDA'],
  },
  {
    id: 'E127',
    name_fr: 'Érythrosine',
    function: 'colorant',
    risk_level: 'avoid',
    description_fr: 'Colorant rouge iodé. Perturbateur thyroïdien suspecté à fortes doses.',
    sources: ['EFSA 2011'],
  },
  {
    id: 'E129',
    name_fr: 'Rouge Allura AC',
    function: 'colorant',
    risk_level: 'avoid',
    description_fr: 'Colorant azoïque rouge. Associé à l\'hyperactivité chez l\'enfant.',
    sources: ['EFSA 2009', 'Southampton Study 2007'],
  },
  {
    id: 'E131',
    name_fr: 'Bleu patenté V',
    function: 'colorant',
    risk_level: 'limited',
    description_fr: 'Colorant bleu synthétique. Réactions allergiques possibles chez les sujets sensibles.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E132',
    name_fr: 'Indigotine / Carmin d\'indigo',
    function: 'colorant',
    risk_level: 'limited',
    description_fr: 'Colorant bleu synthétique. Généralement bien toléré mais DJA limitée.',
    sources: ['EFSA 2014'],
  },
  {
    id: 'E133',
    name_fr: 'Bleu brillant FCF',
    function: 'colorant',
    risk_level: 'limited',
    description_fr: 'Colorant bleu synthétique utilisé dans les confiseries et boissons.',
    sources: ['EFSA 2010'],
  },
  {
    id: 'E140',
    name_fr: 'Chlorophylles',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Colorant vert naturel extrait des plantes. Sans risque connu.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E141',
    name_fr: 'Complexes cuivriques de chlorophylles',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Dérivé stabilisé de chlorophylle. Sans risque aux doses alimentaires.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E150a',
    name_fr: 'Caramel ordinaire',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Caramel simple obtenu par chauffage de sucre. Sans risque.',
    sources: ['EFSA 2011'],
  },
  {
    id: 'E150b',
    name_fr: 'Caramel de sulfite caustique',
    function: 'colorant',
    risk_level: 'limited',
    description_fr: 'Caramel produit avec des sulfites. Contient du 4-MEI à surveiller.',
    sources: ['EFSA 2011'],
  },
  {
    id: 'E150c',
    name_fr: 'Caramel ammoniacal',
    function: 'colorant',
    risk_level: 'limited',
    description_fr: 'Caramel produit avec de l\'ammoniaque. Contient du 4-MEI, DJA limitée.',
    sources: ['EFSA 2011', 'CIRC'],
  },
  {
    id: 'E150d',
    name_fr: 'Caramel au sulfite d\'ammonium',
    function: 'colorant',
    risk_level: 'limited',
    description_fr: 'Caramel très courant (colas, sauces). Contient du 4-MEI, cancérogène possible.',
    sources: ['EFSA 2011', 'CIRC 2011'],
  },
  {
    id: 'E160a',
    name_fr: 'Bêta-carotène',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Colorant orange naturel, provitamine A. Sans risque aux doses alimentaires.',
    sources: ['EFSA 2012'],
  },
  {
    id: 'E160b',
    name_fr: 'Rocou / Annatto',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Colorant orange-rouge naturel d\'origine végétale.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E160c',
    name_fr: 'Extrait de paprika',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Colorant rouge-orange naturel extrait du paprika.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E161b',
    name_fr: 'Lutéine',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Colorant jaune naturel. Antioxydant bénéfique pour la vision.',
    sources: ['EFSA 2010'],
  },
  {
    id: 'E162',
    name_fr: 'Rouge de betterave / Bétanine',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Colorant rouge naturel extrait de la betterave. Sans risque.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E163',
    name_fr: 'Anthocyanes',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Colorants naturels (rouge-violet) extraits de fruits et légumes. Antioxydants.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E170',
    name_fr: 'Carbonate de calcium',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Pigment blanc minéral. Apport en calcium, sans risque.',
    sources: ['EFSA 2011'],
  },
  {
    id: 'E171',
    name_fr: 'Dioxyde de titane',
    function: 'colorant',
    risk_level: 'banned_ma',
    description_fr: 'Colorant blanc. Interdit dans l\'alimentation en UE depuis 2022 (génotoxicité). Interdit au Maroc.',
    sources: ['EFSA 2021', 'Règlement UE 2022/63', 'ONSSA'],
  },
  {
    id: 'E172',
    name_fr: 'Oxydes et hydroxydes de fer',
    function: 'colorant',
    risk_level: 'safe',
    description_fr: 'Colorants minéraux (jaune, rouge, noir). Sans risque aux doses alimentaires.',
    sources: ['EFSA 2015'],
  },

  // ═══════════════════════════════════════════════════════════
  // CONSERVATEURS (E200–E299)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'E200',
    name_fr: 'Acide sorbique',
    function: 'conservateur',
    risk_level: 'safe',
    description_fr: 'Conservateur antifongique naturellement présent dans certains fruits. Bien toléré.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E202',
    name_fr: 'Sorbate de potassium',
    function: 'conservateur',
    risk_level: 'safe',
    description_fr: 'Sel de l\'acide sorbique. Conservateur très courant, bien toléré.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E210',
    name_fr: 'Acide benzoïque',
    function: 'conservateur',
    risk_level: 'limited',
    description_fr: 'Conservateur antimicrobien. Peut former du benzène en présence de vitamine C.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E211',
    name_fr: 'Benzoate de sodium',
    function: 'conservateur',
    risk_level: 'avoid',
    description_fr: 'Conservateur très courant dans les boissons. Forme du benzène avec la vitamine C. Associé à l\'hyperactivité.',
    sources: ['EFSA 2016', 'Southampton Study 2007'],
  },
  {
    id: 'E212',
    name_fr: 'Benzoate de potassium',
    function: 'conservateur',
    risk_level: 'limited',
    description_fr: 'Conservateur similaire au E211. Mêmes précautions.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E220',
    name_fr: 'Dioxyde de soufre',
    function: 'conservateur',
    risk_level: 'avoid',
    description_fr: 'Conservateur et antioxydant. Dangereux pour les asthmatiques. Allergène majeur.',
    sources: ['EFSA 2016', 'OMS'],
  },
  {
    id: 'E221',
    name_fr: 'Sulfite de sodium',
    function: 'conservateur',
    risk_level: 'avoid',
    description_fr: 'Sulfite conservateur. Déclenche des crises chez les asthmatiques. Allergène.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E223',
    name_fr: 'Disulfite de sodium (métabisulfite)',
    function: 'conservateur',
    risk_level: 'avoid',
    description_fr: 'Sulfite très utilisé dans les fruits secs et le vin. Allergène.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E224',
    name_fr: 'Disulfite de potassium',
    function: 'conservateur',
    risk_level: 'avoid',
    description_fr: 'Sulfite conservateur. Même profil de risque que E223.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E228',
    name_fr: 'Bisulfite de potassium',
    function: 'conservateur',
    risk_level: 'avoid',
    description_fr: 'Sulfite conservateur. Allergène pour les asthmatiques.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E234',
    name_fr: 'Nisine',
    function: 'conservateur',
    risk_level: 'safe',
    description_fr: 'Peptide antibactérien naturel produit par des bactéries lactiques.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E235',
    name_fr: 'Natamycine (pimaricine)',
    function: 'conservateur',
    risk_level: 'safe',
    description_fr: 'Antifongique naturel utilisé en surface des fromages et charcuteries.',
    sources: ['EFSA 2009'],
  },
  {
    id: 'E249',
    name_fr: 'Nitrite de potassium',
    function: 'conservateur',
    risk_level: 'avoid',
    description_fr: 'Conservateur et fixateur de couleur dans les charcuteries. Forme des nitrosamines cancérogènes.',
    sources: ['EFSA 2017', 'CIRC 2015'],
  },
  {
    id: 'E250',
    name_fr: 'Nitrite de sodium',
    function: 'conservateur',
    risk_level: 'avoid',
    description_fr: 'Conservateur majeur des charcuteries. Forme des nitrosamines cancérogènes (CIRC groupe 2A).',
    sources: ['EFSA 2017', 'CIRC 2015', 'ANSES 2022'],
  },
  {
    id: 'E251',
    name_fr: 'Nitrate de sodium',
    function: 'conservateur',
    risk_level: 'limited',
    description_fr: 'Se convertit en nitrite dans l\'organisme. Risque indirect de nitrosamines.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E252',
    name_fr: 'Nitrate de potassium (salpêtre)',
    function: 'conservateur',
    risk_level: 'limited',
    description_fr: 'Conservateur traditionnel des charcuteries. Conversion en nitrites in vivo.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E260',
    name_fr: 'Acide acétique',
    function: 'conservateur',
    risk_level: 'safe',
    description_fr: 'Composant du vinaigre. Conservateur naturel, sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E270',
    name_fr: 'Acide lactique',
    function: 'conservateur',
    risk_level: 'safe',
    description_fr: 'Acide naturel produit par fermentation. Régulateur d\'acidité et conservateur. Sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E280',
    name_fr: 'Acide propionique',
    function: 'conservateur',
    risk_level: 'safe',
    description_fr: 'Conservateur antifongique naturel, utilisé dans le pain industriel.',
    sources: ['EFSA 2014'],
  },
  {
    id: 'E281',
    name_fr: 'Propionate de sodium',
    function: 'conservateur',
    risk_level: 'safe',
    description_fr: 'Sel de l\'acide propionique. Antifongique pour le pain.',
    sources: ['EFSA 2014'],
  },
  {
    id: 'E282',
    name_fr: 'Propionate de calcium',
    function: 'conservateur',
    risk_level: 'safe',
    description_fr: 'Conservateur du pain et des produits de boulangerie. Bien toléré.',
    sources: ['EFSA 2014'],
  },
  {
    id: 'E296',
    name_fr: 'Acide malique',
    function: 'acidifiant',
    risk_level: 'safe',
    description_fr: 'Acide naturellement présent dans les pommes. Acidifiant et exhausteur de goût.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E297',
    name_fr: 'Acide fumarique',
    function: 'acidifiant',
    risk_level: 'safe',
    description_fr: 'Acidifiant naturel. Intermédiaire du cycle de Krebs.',
    sources: ['EFSA 2013'],
  },

  // ═══════════════════════════════════════════════════════════
  // ANTIOXYDANTS (E300–E399)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'E300',
    name_fr: 'Acide ascorbique (vitamine C)',
    function: 'antioxydant',
    risk_level: 'safe',
    description_fr: 'Vitamine C. Antioxydant naturel essentiel. Sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E301',
    name_fr: 'Ascorbate de sodium',
    function: 'antioxydant',
    risk_level: 'safe',
    description_fr: 'Sel de la vitamine C. Antioxydant, sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E302',
    name_fr: 'Ascorbate de calcium',
    function: 'antioxydant',
    risk_level: 'safe',
    description_fr: 'Forme calcique de la vitamine C. Sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E304',
    name_fr: 'Palmitate d\'ascorbyle',
    function: 'antioxydant',
    risk_level: 'safe',
    description_fr: 'Ester de vitamine C, antioxydant liposoluble. Sans risque.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E306',
    name_fr: 'Extrait riche en tocophérols (vitamine E)',
    function: 'antioxydant',
    risk_level: 'safe',
    description_fr: 'Vitamine E naturelle. Antioxydant liposoluble bénéfique.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E307',
    name_fr: 'Alpha-tocophérol',
    function: 'antioxydant',
    risk_level: 'safe',
    description_fr: 'Forme synthétique de vitamine E. Sans risque aux doses alimentaires.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E310',
    name_fr: 'Gallate de propyle',
    function: 'antioxydant',
    risk_level: 'limited',
    description_fr: 'Antioxydant synthétique pour les graisses. DJA limitée.',
    sources: ['EFSA 2014'],
  },
  {
    id: 'E315',
    name_fr: 'Acide érythorbique',
    function: 'antioxydant',
    risk_level: 'safe',
    description_fr: 'Isomère de la vitamine C. Antioxydant efficace, sans risque.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E316',
    name_fr: 'Érythorbate de sodium',
    function: 'antioxydant',
    risk_level: 'safe',
    description_fr: 'Sel de l\'acide érythorbique. Antioxydant pour charcuteries.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E319',
    name_fr: 'TBHQ (tert-butylhydroquinone)',
    function: 'antioxydant',
    risk_level: 'limited',
    description_fr: 'Antioxydant synthétique pour les huiles. DJA stricte.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E320',
    name_fr: 'BHA (butylhydroxyanisole)',
    function: 'antioxydant',
    risk_level: 'avoid',
    description_fr: 'Antioxydant synthétique. Perturbateur endocrinien suspecté. Cancérogène possible (CIRC 2B).',
    sources: ['EFSA 2011', 'CIRC'],
  },
  {
    id: 'E321',
    name_fr: 'BHT (butylhydroxytoluène)',
    function: 'antioxydant',
    risk_level: 'limited',
    description_fr: 'Antioxydant synthétique pour les graisses. Controversé, DJA limitée.',
    sources: ['EFSA 2012'],
  },
  {
    id: 'E322',
    name_fr: 'Lécithines',
    function: 'émulsifiant',
    risk_level: 'safe',
    description_fr: 'Émulsifiant naturel (soja, tournesol). Très courant, sans risque. Allergène soja possible.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E325',
    name_fr: 'Lactate de sodium',
    function: 'régulateur d\'acidité',
    risk_level: 'safe',
    description_fr: 'Sel de l\'acide lactique. Sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E330',
    name_fr: 'Acide citrique',
    function: 'acidifiant',
    risk_level: 'safe',
    description_fr: 'Acide naturel des agrumes. L\'un des additifs les plus courants et les plus sûrs.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E331',
    name_fr: 'Citrates de sodium',
    function: 'régulateur d\'acidité',
    risk_level: 'safe',
    description_fr: 'Sels de l\'acide citrique. Régulateur d\'acidité, sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E332',
    name_fr: 'Citrates de potassium',
    function: 'régulateur d\'acidité',
    risk_level: 'safe',
    description_fr: 'Sels de l\'acide citrique. Apport en potassium.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E333',
    name_fr: 'Citrates de calcium',
    function: 'régulateur d\'acidité',
    risk_level: 'safe',
    description_fr: 'Sel de l\'acide citrique. Apport en calcium.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E334',
    name_fr: 'Acide tartrique',
    function: 'acidifiant',
    risk_level: 'safe',
    description_fr: 'Acide naturel du raisin. Sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E338',
    name_fr: 'Acide phosphorique',
    function: 'acidifiant',
    risk_level: 'limited',
    description_fr: 'Acidifiant des colas. Excès lié à la déminéralisation osseuse.',
    sources: ['EFSA 2019'],
  },
  {
    id: 'E339',
    name_fr: 'Phosphates de sodium',
    function: 'émulsifiant',
    risk_level: 'limited',
    description_fr: 'Excès de phosphates alimentaires associé à des risques cardiovasculaires.',
    sources: ['EFSA 2019'],
  },
  {
    id: 'E340',
    name_fr: 'Phosphates de potassium',
    function: 'émulsifiant',
    risk_level: 'limited',
    description_fr: 'Même famille que E339. À limiter en cas d\'insuffisance rénale.',
    sources: ['EFSA 2019'],
  },
  {
    id: 'E341',
    name_fr: 'Phosphates de calcium',
    function: 'émulsifiant',
    risk_level: 'limited',
    description_fr: 'Apport en calcium mais charge en phosphates à surveiller.',
    sources: ['EFSA 2019'],
  },

  // ═══════════════════════════════════════════════════════════
  // ÉMULSIFIANTS, STABILISANTS, ÉPAISSISSANTS (E400–E499)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'E400',
    name_fr: 'Acide alginique',
    function: 'épaississant',
    risk_level: 'safe',
    description_fr: 'Épaississant naturel extrait d\'algues brunes. Sans risque.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E401',
    name_fr: 'Alginate de sodium',
    function: 'épaississant',
    risk_level: 'safe',
    description_fr: 'Épaississant naturel d\'algues. Très utilisé, sans risque.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E406',
    name_fr: 'Agar-agar',
    function: 'gélifiant',
    risk_level: 'safe',
    description_fr: 'Gélifiant naturel extrait d\'algues rouges. Sans risque, riche en fibres.',
    sources: ['EFSA 2016'],
  },
  {
    id: 'E407',
    name_fr: 'Carraghénanes',
    function: 'épaississant',
    risk_level: 'limited',
    description_fr: 'Épaississant d\'algues. Inflammation intestinale suspectée à fortes doses.',
    sources: ['EFSA 2018'],
  },
  {
    id: 'E410',
    name_fr: 'Gomme de caroube',
    function: 'épaississant',
    risk_level: 'safe',
    description_fr: 'Épaississant naturel extrait des graines de caroubier. Sans risque.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E412',
    name_fr: 'Gomme de guar',
    function: 'épaississant',
    risk_level: 'safe',
    description_fr: 'Épaississant naturel. Fibre soluble, sans risque.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E414',
    name_fr: 'Gomme d\'acacia (gomme arabique)',
    function: 'épaississant',
    risk_level: 'safe',
    description_fr: 'Épaississant naturel d\'origine végétale. Fibre prébiotique.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E415',
    name_fr: 'Gomme xanthane',
    function: 'épaississant',
    risk_level: 'safe',
    description_fr: 'Épaississant produit par fermentation bactérienne. Très courant, sans risque.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E420',
    name_fr: 'Sorbitol',
    function: 'édulcorant',
    risk_level: 'limited',
    description_fr: 'Polyol édulcorant. Effet laxatif au-delà de 20g/jour.',
    sources: ['EFSA 2011'],
  },
  {
    id: 'E422',
    name_fr: 'Glycérol',
    function: 'humectant',
    risk_level: 'safe',
    description_fr: 'Humectant naturel. Métabolite normal du corps. Sans risque.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E440',
    name_fr: 'Pectines',
    function: 'gélifiant',
    risk_level: 'safe',
    description_fr: 'Gélifiant naturel extrait des fruits (pommes, agrumes). Fibre soluble bénéfique.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E450',
    name_fr: 'Diphosphates (pyrophosphates)',
    function: 'émulsifiant',
    risk_level: 'limited',
    description_fr: 'Agents levants, émulsifiants. Charge en phosphates à surveiller.',
    sources: ['EFSA 2019'],
  },
  {
    id: 'E451',
    name_fr: 'Triphosphates',
    function: 'émulsifiant',
    risk_level: 'limited',
    description_fr: 'Émulsifiant et rétenteur d\'eau (charcuteries). Charge en phosphates.',
    sources: ['EFSA 2019'],
  },
  {
    id: 'E452',
    name_fr: 'Polyphosphates',
    function: 'émulsifiant',
    risk_level: 'limited',
    description_fr: 'Émulsifiant dans les fromages fondus. Excès de phosphates préoccupant.',
    sources: ['EFSA 2019'],
  },
  {
    id: 'E460',
    name_fr: 'Cellulose',
    function: 'agent de charge',
    risk_level: 'safe',
    description_fr: 'Fibre végétale naturelle. Anti-agglomérant et agent de texture.',
    sources: ['EFSA 2018'],
  },
  {
    id: 'E461',
    name_fr: 'Méthylcellulose',
    function: 'épaississant',
    risk_level: 'safe',
    description_fr: 'Dérivé de cellulose. Épaississant et gélifiant, bien toléré.',
    sources: ['EFSA 2018'],
  },
  {
    id: 'E466',
    name_fr: 'Carboxyméthylcellulose (CMC)',
    function: 'épaississant',
    risk_level: 'limited',
    description_fr: 'Épaississant synthétique. Altération du microbiote intestinal suspectée.',
    sources: ['EFSA 2018', 'Nature 2015'],
  },
  {
    id: 'E471',
    name_fr: 'Mono et diglycérides d\'acides gras',
    function: 'émulsifiant',
    risk_level: 'safe',
    description_fr: 'Émulsifiant le plus courant. Dérivé de graisses alimentaires. Sans risque connu.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E472a',
    name_fr: 'Esters acétiques des mono et diglycérides',
    function: 'émulsifiant',
    risk_level: 'safe',
    description_fr: 'Dérivé du E471. Sans risque connu.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E472b',
    name_fr: 'Esters lactiques des mono et diglycérides',
    function: 'émulsifiant',
    risk_level: 'safe',
    description_fr: 'Dérivé du E471. Sans risque connu.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E472c',
    name_fr: 'Esters citriques des mono et diglycérides',
    function: 'émulsifiant',
    risk_level: 'safe',
    description_fr: 'Dérivé du E471. Sans risque connu.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E472e',
    name_fr: 'Esters diacétyltartriques des mono et diglycérides',
    function: 'émulsifiant',
    risk_level: 'safe',
    description_fr: 'Émulsifiant utilisé dans le pain. Sans risque connu.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E473',
    name_fr: 'Sucroesters d\'acides gras',
    function: 'émulsifiant',
    risk_level: 'safe',
    description_fr: 'Émulsifiant dérivé du sucre et des graisses. Bien toléré.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E476',
    name_fr: 'Esters polyglycériques de l\'acide ricinoléique (PGPR)',
    function: 'émulsifiant',
    risk_level: 'safe',
    description_fr: 'Émulsifiant du chocolat. Réduit la viscosité. Sans risque aux doses alimentaires.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E481',
    name_fr: 'Stéaroyl-2-lactylate de sodium',
    function: 'émulsifiant',
    risk_level: 'safe',
    description_fr: 'Émulsifiant et conditionneur de pâte (boulangerie). Sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E491',
    name_fr: 'Monostéarate de sorbitane',
    function: 'émulsifiant',
    risk_level: 'safe',
    description_fr: 'Émulsifiant. Sans risque aux doses alimentaires.',
    sources: ['EFSA 2017'],
  },

  // ═══════════════════════════════════════════════════════════
  // EXHAUSTEURS DE GOÛT (E600–E699)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'E620',
    name_fr: 'Acide glutamique',
    function: 'exhausteur de goût',
    risk_level: 'limited',
    description_fr: 'Acide aminé naturel. Base du goût umami. Sensibilité possible chez certaines personnes.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E621',
    name_fr: 'Glutamate monosodique (MSG)',
    function: 'exhausteur de goût',
    risk_level: 'limited',
    description_fr: 'Exhausteur de goût umami très courant. Controversé mais sans risque prouvé aux doses normales. Apport en sodium.',
    sources: ['EFSA 2017', 'OMS'],
  },
  {
    id: 'E627',
    name_fr: 'Guanylate disodique',
    function: 'exhausteur de goût',
    risk_level: 'limited',
    description_fr: 'Exhausteur de goût synergique du MSG. À éviter en cas de goutte (purines).',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E631',
    name_fr: 'Inosinate disodique',
    function: 'exhausteur de goût',
    risk_level: 'limited',
    description_fr: 'Exhausteur de goût synergique du MSG. À éviter en cas de goutte.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E635',
    name_fr: 'Ribonucléotides disodiques',
    function: 'exhausteur de goût',
    risk_level: 'limited',
    description_fr: 'Mélange de E627 et E631. Mêmes précautions.',
    sources: ['EFSA 2017'],
  },

  // ═══════════════════════════════════════════════════════════
  // ÉDULCORANTS (E900–E999)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'E900',
    name_fr: 'Diméthylpolysiloxane',
    function: 'anti-moussant',
    risk_level: 'safe',
    description_fr: 'Anti-moussant utilisé dans les huiles de friture. Sans risque aux doses alimentaires.',
    sources: ['EFSA 2020'],
  },
  {
    id: 'E901',
    name_fr: 'Cire d\'abeille',
    function: 'agent d\'enrobage',
    risk_level: 'safe',
    description_fr: 'Agent d\'enrobage naturel pour les fruits et confiseries.',
    sources: ['EFSA 2007'],
  },
  {
    id: 'E903',
    name_fr: 'Cire de carnauba',
    function: 'agent d\'enrobage',
    risk_level: 'safe',
    description_fr: 'Cire végétale naturelle. Agent d\'enrobage et de brillance.',
    sources: ['EFSA 2012'],
  },
  {
    id: 'E904',
    name_fr: 'Gomme-laque (shellac)',
    function: 'agent d\'enrobage',
    risk_level: 'safe',
    description_fr: 'Résine naturelle d\'origine animale. Enrobage de confiseries et comprimés.',
    sources: ['EFSA 2007'],
  },
  {
    id: 'E920',
    name_fr: 'L-cystéine',
    function: 'agent de traitement de la farine',
    risk_level: 'safe',
    description_fr: 'Acide aminé naturel. Améliorant de panification.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E938',
    name_fr: 'Argon',
    function: 'gaz d\'emballage',
    risk_level: 'safe',
    description_fr: 'Gaz inerte pour le conditionnement sous atmosphère modifiée.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E941',
    name_fr: 'Azote',
    function: 'gaz d\'emballage',
    risk_level: 'safe',
    description_fr: 'Gaz inerte constituant 78% de l\'air. Emballage sous atmosphère modifiée.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E942',
    name_fr: 'Protoxyde d\'azote',
    function: 'gaz propulseur',
    risk_level: 'safe',
    description_fr: 'Gaz propulseur des bombes de chantilly. Sans risque alimentaire.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E943',
    name_fr: 'Butane / Isobutane',
    function: 'gaz propulseur',
    risk_level: 'safe',
    description_fr: 'Gaz propulseur. S\'évapore complètement, sans résidu.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E948',
    name_fr: 'Oxygène',
    function: 'gaz d\'emballage',
    risk_level: 'safe',
    description_fr: 'Gaz d\'emballage pour maintenir la couleur des viandes.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E950',
    name_fr: 'Acésulfame K',
    function: 'édulcorant',
    risk_level: 'limited',
    description_fr: 'Édulcorant intense sans calories. Débat sur les effets à long terme sur le microbiote.',
    sources: ['EFSA 2013', 'OMS 2023'],
  },
  {
    id: 'E951',
    name_fr: 'Aspartame',
    function: 'édulcorant',
    risk_level: 'avoid',
    description_fr: 'Édulcorant intense controversé. Classé cancérogène possible (CIRC 2B) en 2023. Contre-indiqué en cas de phénylcétonurie.',
    sources: ['EFSA 2013', 'CIRC 2023', 'OMS 2023'],
  },
  {
    id: 'E952',
    name_fr: 'Cyclamate',
    function: 'édulcorant',
    risk_level: 'limited',
    description_fr: 'Édulcorant synthétique. Interdit aux USA. DJA stricte en UE.',
    sources: ['EFSA 2010'],
  },
  {
    id: 'E953',
    name_fr: 'Isomalt',
    function: 'édulcorant',
    risk_level: 'safe',
    description_fr: 'Polyol édulcorant à faible index glycémique. Effet laxatif possible.',
    sources: ['EFSA 2011'],
  },
  {
    id: 'E954',
    name_fr: 'Saccharine',
    function: 'édulcorant',
    risk_level: 'limited',
    description_fr: 'Plus ancien édulcorant synthétique. Études contradictoires sur la cancérogénicité.',
    sources: ['EFSA 2009', 'CIRC'],
  },
  {
    id: 'E955',
    name_fr: 'Sucralose',
    function: 'édulcorant',
    risk_level: 'limited',
    description_fr: 'Édulcorant intense dérivé du sucre. Débat sur les effets sur le microbiote intestinal.',
    sources: ['EFSA 2016', 'OMS 2023'],
  },
  {
    id: 'E960',
    name_fr: 'Glycosides de stéviol (stévia)',
    function: 'édulcorant',
    risk_level: 'safe',
    description_fr: 'Édulcorant d\'origine végétale (Stevia rebaudiana). Sans risque connu.',
    sources: ['EFSA 2010'],
  },
  {
    id: 'E965',
    name_fr: 'Maltitol',
    function: 'édulcorant',
    risk_level: 'limited',
    description_fr: 'Polyol. Effet laxatif au-delà de 30g/jour. Indice glycémique inférieur au sucre.',
    sources: ['EFSA 2011'],
  },
  {
    id: 'E966',
    name_fr: 'Lactitol',
    function: 'édulcorant',
    risk_level: 'limited',
    description_fr: 'Polyol dérivé du lactose. Effet laxatif possible.',
    sources: ['EFSA 2011'],
  },
  {
    id: 'E967',
    name_fr: 'Xylitol',
    function: 'édulcorant',
    risk_level: 'safe',
    description_fr: 'Polyol protecteur pour les dents. Bénéfique en dentaire, laxatif en excès.',
    sources: ['EFSA 2011'],
  },
  {
    id: 'E968',
    name_fr: 'Érythritol',
    function: 'édulcorant',
    risk_level: 'safe',
    description_fr: 'Polyol très bien toléré, quasi zéro calorie. Pas d\'effet laxatif notable.',
    sources: ['EFSA 2015'],
  },

  // ═══════════════════════════════════════════════════════════
  // DIVERS / AMIDONS MODIFIÉS (E1000+)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'E1100',
    name_fr: 'Amylase',
    function: 'enzyme',
    risk_level: 'safe',
    description_fr: 'Enzyme naturelle de dégradation de l\'amidon. Utilisée en boulangerie.',
    sources: ['EFSA 2009'],
  },
  {
    id: 'E1105',
    name_fr: 'Lysozyme',
    function: 'conservateur',
    risk_level: 'safe',
    description_fr: 'Enzyme antimicrobienne naturelle (blanc d\'œuf). Allergène œuf.',
    sources: ['EFSA 2015'],
  },
  {
    id: 'E1400',
    name_fr: 'Dextrine',
    function: 'amidon modifié',
    risk_level: 'safe',
    description_fr: 'Amidon partiellement hydrolysé. Épaississant, sans risque.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E1404',
    name_fr: 'Amidon oxydé',
    function: 'amidon modifié',
    risk_level: 'safe',
    description_fr: 'Amidon modifié par oxydation. Liant et épaississant.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E1412',
    name_fr: 'Phosphate de diamidon',
    function: 'amidon modifié',
    risk_level: 'safe',
    description_fr: 'Amidon modifié par phosphorylation. Épaississant stable à la chaleur.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E1414',
    name_fr: 'Phosphate de diamidon acétylé',
    function: 'amidon modifié',
    risk_level: 'safe',
    description_fr: 'Amidon doublement modifié. Très utilisé dans les plats préparés.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E1420',
    name_fr: 'Amidon acétylé',
    function: 'amidon modifié',
    risk_level: 'safe',
    description_fr: 'Amidon modifié par acétylation. Épaississant.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E1422',
    name_fr: 'Adipate de diamidon acétylé',
    function: 'amidon modifié',
    risk_level: 'safe',
    description_fr: 'Amidon modifié. Stabilisant pour les produits surgelés.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E1442',
    name_fr: 'Phosphate de diamidon hydroxypropylé',
    function: 'amidon modifié',
    risk_level: 'safe',
    description_fr: 'Amidon modifié courant dans les sauces et crèmes dessert.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E1450',
    name_fr: 'Octényl succinate d\'amidon sodique',
    function: 'amidon modifié',
    risk_level: 'safe',
    description_fr: 'Amidon modifié émulsifiant. Utilisé dans les boissons et sauces.',
    sources: ['EFSA 2017'],
  },
  {
    id: 'E1451',
    name_fr: 'Amidon oxydé acétylé',
    function: 'amidon modifié',
    risk_level: 'safe',
    description_fr: 'Amidon doublement modifié. Liant dans les produits enrobés.',
    sources: ['EFSA 2017'],
  },

  // ═══════════════════════════════════════════════════════════
  // ADDITIFS SUPPLÉMENTAIRES COURANTS AU MAROC (E500–E599)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'E500',
    name_fr: 'Carbonates de sodium (bicarbonate)',
    function: 'agent levant',
    risk_level: 'safe',
    description_fr: 'Bicarbonate de soude. Agent levant traditionnel, sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E501',
    name_fr: 'Carbonates de potassium',
    function: 'agent levant',
    risk_level: 'safe',
    description_fr: 'Agent levant et régulateur d\'acidité. Sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E503',
    name_fr: 'Carbonates d\'ammonium',
    function: 'agent levant',
    risk_level: 'safe',
    description_fr: 'Agent levant des biscuits. L\'ammoniaque s\'évapore à la cuisson.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E504',
    name_fr: 'Carbonates de magnésium',
    function: 'anti-agglomérant',
    risk_level: 'safe',
    description_fr: 'Anti-agglomérant et apport en magnésium. Sans risque.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E508',
    name_fr: 'Chlorure de potassium',
    function: 'sel de substitution',
    risk_level: 'safe',
    description_fr: 'Substitut du sel (NaCl). Apport en potassium.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E509',
    name_fr: 'Chlorure de calcium',
    function: 'affermissant',
    risk_level: 'safe',
    description_fr: 'Affermissant pour les conserves de fruits et légumes.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E511',
    name_fr: 'Chlorure de magnésium',
    function: 'affermissant',
    risk_level: 'safe',
    description_fr: 'Coagulant du tofu. Apport en magnésium.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E516',
    name_fr: 'Sulfate de calcium (gypse)',
    function: 'affermissant',
    risk_level: 'safe',
    description_fr: 'Coagulant du tofu et agent de texture. Apport en calcium.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E524',
    name_fr: 'Hydroxyde de sodium (soude)',
    function: 'régulateur d\'acidité',
    risk_level: 'safe',
    description_fr: 'Régulateur d\'acidité. Utilisé dans le traitement des olives et bretzels.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E551',
    name_fr: 'Dioxyde de silicium (silice)',
    function: 'anti-agglomérant',
    risk_level: 'safe',
    description_fr: 'Anti-agglomérant minéral naturel. Sans risque aux doses alimentaires.',
    sources: ['EFSA 2018'],
  },
  {
    id: 'E553',
    name_fr: 'Talc',
    function: 'anti-agglomérant',
    risk_level: 'safe',
    description_fr: 'Anti-agglomérant minéral. Sans risque en usage alimentaire (sans amiante).',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E570',
    name_fr: 'Acide stéarique',
    function: 'anti-agglomérant',
    risk_level: 'safe',
    description_fr: 'Acide gras saturé naturel. Agent de démoulage.',
    sources: ['EFSA 2013'],
  },
  {
    id: 'E575',
    name_fr: 'Glucono-delta-lactone (GDL)',
    function: 'acidifiant',
    risk_level: 'safe',
    description_fr: 'Acidifiant progressif. Coagulant du tofu et agent levant.',
    sources: ['EFSA 2013'],
  },
]

// ────────────────────────────────────────────────────────────────
// Exécution du seed
// ────────────────────────────────────────────────────────────────

async function seedAdditives(): Promise<void> {
  console.log(`Seed de ${additives.length} additifs dans ${DIRECTUS_URL}...`)

  let created = 0
  let skipped = 0
  let errors = 0

  for (const additive of additives) {
    try {
      // Vérifier si l'additif existe déjà
      const checkRes = await fetch(
        `${DIRECTUS_URL}/items/additives/${additive.id}`,
        {
          headers: {
            Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
          },
        }
      )

      if (checkRes.ok) {
        skipped++
        continue
      }

      // Créer l'additif
      const createRes = await fetch(`${DIRECTUS_URL}/items/additives`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DIRECTUS_ADMIN_TOKEN}`,
        },
        body: JSON.stringify({
          id: additive.id,
          name_fr: additive.name_fr,
          function: additive.function,
          risk_level: additive.risk_level,
          description_fr: additive.description_fr,
          sources: additive.sources,
        }),
      })

      if (createRes.ok) {
        created++
      } else {
        const err = await createRes.text()
        console.error(`Erreur ${additive.id}: ${err}`)
        errors++
      }
    } catch (e) {
      console.error(`Erreur réseau ${additive.id}:`, e)
      errors++
    }
  }

  console.log(`\nRésultat :`)
  console.log(`  Créés   : ${created}`)
  console.log(`  Existants : ${skipped}`)
  console.log(`  Erreurs  : ${errors}`)
  console.log(`  Total    : ${additives.length}`)
}

seedAdditives().catch(console.error)
