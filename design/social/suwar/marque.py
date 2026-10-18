"""Profil de marque « Bayen » dans Suwar (espace Netspace, projet Bayen), pour les visuels réseaux produits par
l'équipe (Meryem repère, Soukaina décline, Codex illustre) : palette nommée, logos (SVG encre, versions lait
générées par Suwar), typos et styles de texte des gabarits (templates.py), formats, tokens, voix éditoriale
(captionVoice) et guide (identité, voix, photo, règles, éléments visuels). Les visuels déjà envoyés par assets.py
sont réutilisés (uploads.json) ; s'y ajoutent les logos et les captures brutes de bayen.ma (social/ecrans).
Relançable : l'id du profil est gardé dans marque.json.   python3 marque.py"""
import base64, io, json, sys
from pathlib import Path
from PIL import Image
from suwar import call, PROJET

D = Path(__file__).resolve().parent
DESIGN = D.parents[1]
CACHE, MARQUE = D / 'uploads.json', D / 'marque.json'
U = json.loads(CACHE.read_text())


def envoie(nom, data, filename, mime):
    if nom not in U:
        U[nom] = call('upload_from_base64', {'data': base64.b64encode(data).decode(), 'filename': filename, 'mimeType': mime, 'projectId': PROJET})['url']
        CACHE.write_text(json.dumps(U, indent=1, ensure_ascii=False)); print('envoyé', nom)
    return U[nom]


# ---------- 1. Logos (encre, pour que Suwar puisse les recolorer) et captures réelles de bayen.ma ----------
LOGOS = {'logo-wordmark': 'bayen-wordmark-cuillere.svg', 'logo-sigle': 'bayen-b-cuillere.svg', 'logo-arabe': 'bayen-wordmark-arabe.svg'}
for nom, f in LOGOS.items():
    envoie(nom, (DESIGN / 'logo' / f).read_text().replace('fill="currentColor"', 'fill="#1B1B1B"').encode(), f, 'image/svg+xml')
CAPTURES = sorted(p for p in (DESIGN / 'social/ecrans').glob('*.png') if p.stem.split('-')[0] in ('tel', 'ipad', 'ordi'))
for p in CAPTURES:  # PNG pour garder le texte de l'interface net, réduit à 1600 px
    im = Image.open(p).convert('RGB'); im.thumbnail((1600, 1600), Image.LANCZOS); b = io.BytesIO(); im.save(b, 'PNG', optimize=True)
    envoie(f'capture-{p.stem}', b.getvalue(), f'bayen-capture-{p.stem}.png', 'image/png')

# ---------- 2. Kit ----------
ENCRE, CREME, LAIT, NUIT = '#1B1B1B', '#FFF8EC', '#FFF3DF', '#1D1430'
VIFS = ['#19C08B', '#FFD43B', '#FF5A3C', '#6B7BFF', '#B98CFF', '#FF8FB1']
PALETTE = [  # globals.css (Marché Pop)
    dict(name='Crème', hex=CREME, variable='couleur_fond', share=40, usage='Fond clair des visuels et du site'),
    dict(name='Encre', hex=ENCRE, variable='couleur_texte', share=12, usage='Texte, logo, contours et ombres nettes'),
    dict(name='Menthe', hex='#19C08B', variable='couleur_principale', share=18, usage='Principale : Naânaa, alimentation, note Excellent'),
    dict(name='Menthe texte', hex='#0B7A55', variable='menthe_texte', usage='Menthe en texte sur fond clair (contraste AA)'),
    dict(name='Citron', hex='#FFD43B', variable='couleur_accent', share=8, usage='Accent, aplats joyeux, pastilles'),
    dict(name='Tomate', hex='#FF5A3C', variable='tomate', share=4, usage='Alerte, « Faux », note Mauvais ; jamais pour un univers'),
    dict(name='Myrtille', hex='#6B7BFF', variable='myrtille', share=4, usage='Univers protéines'),
    dict(name='Figue', hex='#B98CFF', variable='figue', share=4, usage='Univers repas et IA'),
    dict(name='Framboise', hex='#FF8FB1', variable='framboise', share=4, usage='Univers beauté'),
    dict(name='Aubergine', hex='#3B1F5C', variable='couleur_secondaire', share=6, usage='Aplats sombres (fond zellige)'),
    dict(name='Nuit aubergine', hex=NUIT, variable='nuit', usage='Mode sombre, voile sur les photos'),
    dict(name='Lait', hex=LAIT, variable='lait', usage='Texte et logo sur photo ou fond sombre'),
    dict(name='Note Bon', hex='#A6E35F', variable='note_bon', usage='Réservée à la note Bon (50 à 74)'),
    dict(name='Note Médiocre', hex='#FFA24D', variable='note_mediocre', usage='Réservée à la note Médiocre (25 à 49)'),
]
LOGO_REGLES = dict(autoVariant=True, backgrounds=[CREME, '#FFFFFF', *VIFS], protection=1)
KIT_LOGOS = [
    dict(name='Wordmark « bayen » b-cuillère', role='principal', variable='logo', url=U['logo-wordmark'], rules={**LOGO_REGLES, 'minPx': 160}),
    dict(name='Sigle b-cuillère', role='symbole', variable='logo_sigle', url=U['logo-sigle'], rules={**LOGO_REGLES, 'minPx': 48}),
    dict(name='Wordmark arabe « باين »', role='secondaire', variable='logo_arabe', url=U['logo-arabe'], rules={**LOGO_REGLES, 'minPx': 140}),
]
T = lambda name, size, fam='Readex Pro', w='600', lh=1.3, fill=ENCRE, ls=0: dict(name=name, fontFamily=fam, fontWeight=w, fontSize=size, lineHeight=lh, letterSpacing=ls, fill=fill)
STYLES = [  # repris des gabarits (templates.py), canevas de 1080 px
    T('Titre', 80, 'Unbounded', '800', 1.04, ls=-2.4), T('Titre XXL', 97, 'Unbounded', '800', 1.04, ls=-2.9),
    T('Texte', 42), T('Rubrique (pastille)', 34, lh=1.2), T('Appel (pastille)', 34, lh=1.2),
    T('Titre darija', 85, w='700', lh=1.32), T('Texte darija', 45),
    T('Titre arabe (fêtes)', 68, w='700', fill=LAIT), T('Signature (fêtes)', 39, fill=LAIT),
]
TOKENS = {
    'radius': [dict(name='Pastille', value='999px', note='Rubrique et appel : pastille crème, contour encre 5 px'),
               dict(name='Carte', value='24px'), dict(name='Petit', value='12px')],
    'shadow': [dict(name='Ombre nette', value=f'3px 3px 0 {ENCRE}', note='Cartes : contour encre + ombre décalée, jamais floue'),
               dict(name='Ombre levée', value=f'5px 5px 0 {ENCRE}'),
               dict(name='Contour encre', value=f'0 0 0 5px {ENCRE}', note='Pastilles et stickers'),
               dict(name='Texte sur photo', value='0 4px 16px rgba(0,0,0,.35)', note='Seule ombre douce admise, sous le texte lait')],
    'spacing': [dict(name='Marge post', value='65px'), dict(name='Zone sûre story haut', value='260px'),
                dict(name='Zone sûre story bas', value='300px', note='Signature du logo au-dessus')],
    'gradient': [dict(name='Voile photo', value=f'linear-gradient(180deg, rgba(29,20,48,.78) 0%, rgba(29,20,48,.5) 32%, rgba(29,20,48,0) 58%)',
                      note='Sous le titre lait des illustrations plein écran')],
}
VOIX = """MARQUE : Bayen (باين, « c'est clair, ça se voit » en darija) — application web gratuite (bayen.ma) qui note sur 100 les produits alimentaires et cosmétiques vendus au Maroc. On scanne le code-barres, on voit ce que le produit contient vraiment. Comptes @bayenma (Instagram), page Facebook « Bayen », LinkedIn bayen-ma. Mascotte : Naânaa, un brin de menthe.

POSITIONNEMENT : l'ami qui lit l'étiquette avec toi, sans faire la morale. On rend clair ce qui est écrit en petit (sucre, sel, additifs, transformation, ingrédients cosmétiques) et on met en avant les bons produits plutôt que de dénoncer les mauvais.

TON : clair, simple, bienveillant, avec une pointe de malice (celle de Naânaa). Tutoiement (« tu scannes », « ton panier »), « on » pour l'équipe. Phrases courtes, un fait par phrase, un mot technique toujours expliqué. Jamais alarmiste, jamais culpabilisant.

LANGUES : français par défaut, ou darija en lettres arabes — jamais les deux mélangés dans une légende, jamais d'arabizi. En darija : le nom s'écrit « باين » (avec alif, jamais « بيّن ») ; les mots de la note sont ممتاز / مزيان / ضعيف / خايب ; « perturbateur endocrinien » se dit « مخلّ هرموني ».

RÈGLE D'OR — AUCUN CHIFFRE INVENTÉ : une note, une teneur, un prix ou un nombre de produits ne s'écrit que s'il est fourni dans la consigne (lu dans la base Bayen). Sinon, on parle sans chiffre. Le score Bayen vient d'un algorithme public et identique pour tous : Nutri-Score 50 points, transformation NOVA 30 points, additifs 20 points ; pour un cosmétique, la note est plafonnée par l'ingrédient INCI le plus préoccupant. Échelle : Excellent 75 et plus, Bon 50 à 74, Médiocre 25 à 49, Mauvais moins de 25. L'IA lit les étiquettes, elle ne fixe jamais une note. Le score ne s'achète pas.

INTERDITS :
- Tout conseil médical ou promesse santé (« guérit », « bon pour le diabète », « fait maigrir »). La photo d'un plat donne une estimation (fourchette de calories et de macros, avec un niveau de confiance), jamais une mesure ni un avis médical.
- Dénigrer une marque, ou nommer un produit mal noté. Un produit cité est un produit bien noté ; un comparatif oppose deux produits du même rayon.
- « Perturbateur endocrinien » sans « suspecté » ou « avéré » et sans liste officielle (UE, SCCS).
- Dire qu'un produit n'est pas halal : Bayen ne retire jamais ce statut, il le confirme avec la communauté.
- Les affirmations non sourcées : « sans pub », « open source », « interdit au Maroc », statistiques santé sans étude citée.
- Les mots creux et anxiogènes : révolutionnaire, incroyable, miracle, le meilleur, toxique, poison, « chimique » péjoratif, « 100 % naturel ». Pas de majuscules d'insistance ni de points d'exclamation en série.

STRUCTURE (400 à 600 caractères avant les hashtags) :
1. Une accroche d'une ligne : une situation du quotidien ou un fait concret, souvent une question.
2. Deux ou trois paragraphes courts : l'explication, un exemple précis, et ce que fait Bayen quand c'est utile.
3. Une chute.
Rubriques récurrentes : L'astuce de Naânaa ; Vrai ou faux ? (réponse franche VRAI ou FAUX, puis l'explication) ; Bayen en action (une fonction de l'app, montrée sur une vraie capture) ; Le bon produit du mois ; Mission ; Communauté ; fêtes nationales et religieuses (sobres, sans rien vendre).

REGISTRE MAISON (dans l'esprit — ne recopie JAMAIS ces exemples, ils sont déjà publiés) : les légendes Bayen partent d'un geste du quotidien (lire une étiquette au rayon, hésiter entre deux yaourts, photographier son assiette) et le rendent simple. Elles donnent la règle en une phrase, puis l'exemple concret qui la fait retenir.

ÉMOJIS : un ou deux au plus, en fin de phrase. 🌿 est la signature (Naânaa) ; 👇 pour une question au lecteur ; 😉 ; 👉 pour le lien. Jamais 🔥💯😱, jamais en rangée.

LIEN : sur Instagram « 👉 Lien en bio » (en darija « 👈 الرابط فالبيو ») ; sur Facebook et LinkedIn, l'adresse bayen.ma (ou la page précise). Pas de lien sur une fête.

HASHTAGS : en toute fin, 5 au plus sur Instagram, 4 sur Facebook. #Bayen #Maroc + un à trois thématiques (#ConsommerMieux, #Etiquette, #ProduitsMarocains, #AppMaroc). En darija : #باين #المغرب #Bayen + #استهلاك_واعي ou #نصائح. Une fête : #Bayen #Maroc + le hashtag de la fête, rien d'autre.

LINKEDIN : même fond, pour les marques, les partenaires et la presse : méthode, transparence, données, sans jeu ni darija.

CHUTE : RÉINVENTÉE à chaque publication, à partir du sujet. Trois registres à alterner : une question au lecteur ; une invitation à scanner un produit ou à compléter une fiche ; un renvoi vers le journal ou la méthodologie. Aucune formule ne revient d'un post à l'autre.

COHÉRENCE : la légende colle au visuel. Un écran montré est toujours une vraie capture de bayen.ma : on ne décrit jamais une fonction qui n'existe pas."""

kit = dict(name='Bayen', projectId=PROJET, sector='food', captionVoice=VOIX, palette=PALETTE, logos=KIT_LOGOS, textStyles=STYLES,
           formats=[dict(name='Post', width=1080, height=1350), dict(name='Story', width=1080, height=1920)], tokens=TOKENS,
           fontPrimary='Unbounded', fontWeightPrimary=800, fontSecondary='Readex Pro', fontWeightSecondary=600,
           colorPrimary='#19C08B', colorSecondary='#3B1F5C', colorAccent='#FFD43B', colorText=ENCRE, colorBg=CREME, logo=U['logo-wordmark'],
           strict=dict(colors=False, fonts=True))
m = json.loads(MARQUE.read_text()) if MARQUE.exists() else {}
if 'id' in m:  # mise à jour : chaque liste remplace l'ancienne, on garde les id (les versions de logo y sont accrochées)
    avant = call('get_brand_profile', {'brandProfileId': m['id']})
    for cle in ('palette', 'logos', 'textStyles', 'formats'):
        ids = {x['name']: x['id'] for x in avant.get(cle) or [] if 'id' in x}
        kit[cle] = [{**x, **({'id': ids[x['name']]} if x['name'] in ids else {})} for x in kit[cle]]
    kit.pop('projectId'); call('update_brand_profile', {'brandProfileId': m['id'], **kit})
else:
    m['id'] = call('create_brand_profile', kit)['id']; MARQUE.write_text(json.dumps(m, indent=1))
prof = call('get_brand_profile', {'brandProfileId': m['id']})
for lg in prof['logos']:  # version lait pour les photos et les fonds sombres
    if not any(v.get('name') == 'Monochrome lait' for v in lg.get('variants') or []):
        call('add_logo_version', {'brandProfileId': m['id'], 'logoId': lg['id'], 'name': 'Monochrome lait', 'color': LAIT})
print('profil', m['id'], '·', len(prof['palette']), 'couleurs ·', len(prof['logos']), 'logos ·', len(prof['textStyles']), 'styles')
if '--profil' in sys.argv: sys.exit()

# ---------- 3. Guide (brouillon : la version publique ne change qu'avec publish_brand_guide) ----------
I = lambda k, cap: dict(url=U[k], caption=cap)
REGLES = 'Ce qu\'on fait, ce qu\'on ne fait pas'
G = call('get_brand_guide', {'brandProfileId': m['id']})['sections']
if not any(s.get('name') == REGLES for s in G):  # 2e section « libre » : la cible par type viserait la première
    G.insert(next(i for i, s in enumerate(G) if s['type'] == 'photo') + 1, dict(type='libre', name=REGLES, title=REGLES, visibility='public', content={}))
    G = call('update_brand_guide', {'brandProfileId': m['id'], 'sections': G}) and call('get_brand_guide', {'brandProfileId': m['id']})['sections']
def S(**kw):  # une section nommée est visée par son id, les autres par leur type
    sid = next((s['id'] for s in G if kw.get('name') and s.get('name') == kw['name']), None)
    call('update_brand_guide_section', {'brandProfileId': m['id'], **kw, **({'sectionId': sid} if sid else {})})
S(type='identite', content=dict(
    mission="Rendre clair ce que contiennent les produits vendus au Maroc, pour que chacun choisisse en connaissance de cause.",
    promise="Un scan, et c'est clair : un score sur 100 calculé par un algorithme public, les additifs, la transformation et de meilleures alternatives du même rayon.",
    story="Bayen (باين) veut dire « c'est clair, ça se voit » en darija. L'application note les produits alimentaires et cosmétiques vendus au Maroc ; la base est participative (chacun peut compléter une fiche en photographiant l'étiquette). Naânaa, un brin de menthe (naânaa, c'est la menthe du thé), accompagne chaque scan. L'identité « Marché Pop » emprunte aux étals du marché : aplats vifs, contours à l'encre, finition riso.",
    values=[dict(title='Clarté', text="On rend lisible ce qui est écrit en petit, avec des mots simples."),
            dict(title='Indépendance', text="Le score vient d'un algorithme public et ne s'achète pas."),
            dict(title='Bienveillance', text="On met en avant les bons produits ; on n'effraie ni ne culpabilise personne."),
            dict(title='Participation', text="La base grandit avec ceux qui scannent et complètent les fiches."),
            dict(title='Ancrage marocain', text="En français et en darija, avec les produits, les plats et les fêtes du pays.")]))
S(type='voix', content=dict(
    weAre=['Clairs', 'Bienveillants', 'Factuels et sourcés', 'Malicieux (Naânaa)', 'Marocains, en français comme en darija'],
    weAreNot=['Moralisateurs', 'Alarmistes', 'Médecins ou nutritionnistes', 'Vendeurs', 'Corporate'],
    doSay="Tutoyer ; une idée par phrase ; une règle puis un exemple concret ; chiffres seulement s'ils viennent de la base Bayen ; « suspecté » ou « avéré » avec sa source ; « estimation » pour la photo d'un plat ; un ou deux émojis (🌿) ; une chute nouvelle à chaque post.",
    dontSay="Promesse santé ou conseil médical ; marque dénigrée ou produit mal noté nommé ; chiffre inventé ; « toxique », « poison », « miracle », « 100 % naturel », « le meilleur » ; « sans pub », « open source », « interdit au Maroc » ; mélange français-darija ou arabizi ; « بيّن » à la place de « باين »."))
S(type='photo', content=dict(
    style="Identité « Marché Pop » : aplats vifs de la palette (menthe, citron, tomate, myrtille, figue, framboise) sur crème ; contours à l'encre et ombres nettes, jamais floues ; finition riso au grain léger. Aliments vrais et appétissants, posés à plat ou en objets à ombre nette sur un aplat de couleur, sans texte dans l'image. Scènes marocaines lumineuses (marché, cuisine, ftour, salle de bain) dans le style riso de Naânaa. Les photos produit remplissent le cadre. Tout téléphone, tablette ou ordinateur montre une vraie capture de bayen.ma.",
    forbidden="Photos IA sombres façon banque d'images, éclaboussures ; vrais stickers (découpe blanche, reflet) — stickers riso uniquement ; étiquette ovale posée sur une photo ; écran inventé ou vide ; produit détouré ou rétréci dans son cadre ; motif multicolore derrière le logo ou le texte (motifs ton sur ton) ; texte incrusté dans une image générée ; marque mal notée visible ; texte blanc sur un aplat vif (le texte y est en encre) ; menthe vive en texte ; une teinte de note (Bon, Médiocre) pour un univers.",
    do=[I('scene-s1-marche-scan', 'Scène riso : Naânaa au marché, aplats vifs'), I('photo-F1-scan', "Vraie capture de bayen.ma dans une vraie scène"),
        I('plein-P15-naanaa', 'Illustration plein écran, titre lait sur voile'), I('naanaa-salut', 'Naânaa riso décalé, fond transparent')],
    dont=[dict(url=U['scene-s4-ftour'], caption='Image froide et terne', effect='froid'), dict(url=U['scene-s2-frigo-sucre'], caption='Couleurs saturées, criardes', effect='sature'),
          dict(url=U['scene-s5-comparer'], caption='Image floue', effect='flou'), dict(url=U['plein-P16-scan'], caption="Texte incrusté dans l'image", effect='texte')]))
S(type='libre', name=REGLES, title=REGLES, intro='Les règles à vérifier avant de déposer un visuel en brouillon.', content=dict(text='\n'.join([
    "ON FAIT",
    "· Des aplats vifs de la palette sur crème, des contours à l'encre, des ombres nettes, une finition riso au grain léger.",
    "· Le texte en encre sur un aplat vif ; en lait sur une photo ou un fond sombre, avec le voile aubergine.",
    "· Le logo en signature, en bas à droite ; en darija, le wordmark « باين », à gauche.",
    "· Naânaa dans ses poses riso ; une nouvelle pose part de design/naanaa-v2/c-riso.png et passe par Codex.",
    "· Une vraie capture de bayen.ma dans tout écran (thème clair, produit bien noté).",
    "· Des photos produit qui remplissent le cadre.",
    "· Une couleur par univers : alimentation menthe, beauté framboise, protéines myrtille, repas et IA figue.",
    "· Des chiffres lus dans la base Bayen, revérifiés la veille de la publication.",
    "· En darija : tout en lettres arabes, de droite à gauche, en Readex Pro.",
    "", "ON NE FAIT PAS",
    "· D'image IA sombre façon banque d'images, d'éclaboussure, ni de texte dans une image générée.",
    "· De vrai sticker (découpe blanche, reflet) ni d'étiquette ovale sur une photo : stickers riso uniquement.",
    "· D'écran inventé ou vide.",
    "· De motif multicolore derrière le logo ou le texte : les motifs restent ton sur ton.",
    "· De texte blanc sur un aplat vif, ni de menthe vive en texte.",
    "· De teinte de note (Bon, Médiocre, Mauvais) pour un univers.",
    "· De produit détouré ou rétréci dans son cadre (sauf une photo d'étiquette, qui est un document).",
    "· De marque mal notée montrée ou nommée, de conseil médical, de chiffre inventé.",
    "· De logo déformé, recoloré hors palette, ou sans sa zone de protection.",
])))
S(type='libre', name='Éléments visuels', title='Éléments visuels', intro='Ce qui existe déjà, téléversé dans le projet Suwar « Bayen ».', content=dict(text='\n'.join([
    "Tout est déjà téléversé dans le projet Suwar « Bayen ». Sources dans le dépôt Bayen (design/…). Aucune image IA nouvelle sans brief : les illustrations sont produites par Codex à partir du style de Naânaa (design/naanaa-v2/c-riso.png).",
    "", "LOGOS (SVG encre, versions lait générées) : wordmark b-cuillère design/logo/bayen-wordmark-cuillere.svg · sigle design/logo/bayen-b-cuillere.svg · wordmark arabe design/logo/bayen-wordmark-arabe.svg (variante darija). Régénérables : design/logo/b-cuillere.py, icones.py, bayen-arabe.py.",
    "", "NAÂNAA (PNG transparents, riso décalé, sources design/naanaa-v2/riso/) : " + ', '.join(k[7:] for k in U if k.startswith('naanaa-')) + '.',
    "", "FONDS TEXTURÉS (post 1350 et story 1920, suwar/assets.py) : " + ', '.join(sorted({k.split('-')[1] for k in U if k.startswith('fond-')})) + '.',
    "", "STICKERS RISO (outils/riso.py) : " + ', '.join(k[8:] for k in U if k.startswith('sticker-')) + '.',
    "", "SCÈNES RISO (design/social/scenes) : " + ', '.join(k[6:] for k in U if k.startswith('scene-')) + '.',
    "", "ILLUSTRATIONS PLEIN ÉCRAN (design/social/plein) : " + ', '.join(k[6:] for k in U if k.startswith('plein-')) + '.',
    "", "PHOTOS À ÉCRAN RÉEL (design/social/photos-ecran, outils/ecran-dans-photo.py) : " + ', '.join(k[6:] for k in U if k.startswith('photo-')) + '.',
    "", "CAPTURES BRUTES DE BAYEN.MA (design/social/ecrans, outils/captures.mjs, thème clair, produit bien noté) : " + ', '.join(k[8:] for k in U if k.startswith('capture-')) + '.',
    "", "GABARITS SUWAR (design/social/suwar/templates.py) : Scène, Photo, XXL, Bulle, Plein écran, chacun en post 1080×1350 et story 1080×1920, avec une variante Darija (droite à gauche, Readex Pro, logo « باين »).",
    "", "Pas d'éléments 3D à ce jour.",
]), images=[I(k, k) for k in ('logo-wordmark', 'logo-sigle', 'logo-arabe', 'naanaa-astuce', 'fond-zellige-1350', 'sticker-score-90', 'capture-tel-produit', 'capture-ordi-accueil')]))
print('guide rempli (brouillon)')
