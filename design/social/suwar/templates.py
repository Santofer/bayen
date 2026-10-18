"""Crée (ou met à jour) dans Suwar les templates Bayen des réseaux, d'après les gabarits du calendrier
(design/social/calendrier/lot.py) : scène, photo, XXL, bulle, plein écran ; chacun en post 1080×1350
et en story 1080×1920, avec une variante « Darija » (lecture de droite à gauche, Readex Pro, « باين »).
Les identifiants sont gardés dans templates.json.   python3 templates.py"""
import json, re
from pathlib import Path
from suwar import call, PROJET

D = Path(__file__).resolve().parent
LOGO = D.parents[1] / 'logo'
CACHE = D / 'templates.json'
ids = json.loads(CACHE.read_text()) if CACHE.exists() else {}

ENCRE, CREME, LAIT = '#1B1B1B', '#FFF8EC', '#FFF3DF'
def logo(fichier):
    s = (LOGO / fichier).read_text()
    return ' '.join(re.findall(r' d="([^"]+)"', s)), re.search(r'viewBox="([^"]+)"', s).group(1)
LAT_D, LAT_VB = logo('bayen-wordmark-cuillere.svg')
AR_D, AR_VB = logo('bayen-wordmark-arabe.svg')
ratio = lambda vb: float(vb.split()[3]) / float(vb.split()[2])

# ---------- Briques ----------
def kicker(x, y, w=940):
    return {'id': 'kicker', 'name': 'Rubrique', 'type': 'text', 'content': '{{Rubrique}}', 'x': x, 'y': y, 'width': w, 'height': 72,
            'fontFamily': 'Readex Pro', 'fontWeight': 600, 'fontSize': 34, 'lineHeight': 1.2, 'fill': ENCRE, 'textAlign': 'left',
            'textBg': {'mode': 'box', 'color': CREME, 'borderColor': ENCRE, 'borderWidth': 5, 'padX': 26, 'padY': 7, 'radius': 99}}
def titre(x, y, w, h, size, fill=ENCRE):
    return {'id': 'titre', 'name': 'Titre', 'type': 'text', 'content': '{{Titre}}', 'x': x, 'y': y, 'width': w, 'height': h,
            'fontFamily': 'Unbounded', 'fontWeight': 800, 'fontSize': size, 'lineHeight': 1.04, 'letterSpacing': -size * .03, 'fill': fill, 'textAlign': 'left'}
def texte(x, y, w, h, size=42, fill=ENCRE):
    return {'id': 'texte', 'name': 'Texte', 'type': 'text', 'content': '{{Texte}}', 'x': x, 'y': y, 'width': w, 'height': h,
            'fontFamily': 'Readex Pro', 'fontWeight': 600, 'fontSize': size, 'lineHeight': 1.3, 'fill': fill, 'textAlign': 'left'}
def cta(x, y):
    return {'id': 'cta', 'name': 'Appel', 'type': 'text', 'content': '{{Appel}}', 'x': x, 'y': y, 'width': 900, 'height': 72,
            'fontFamily': 'Readex Pro', 'fontWeight': 600, 'fontSize': 34, 'lineHeight': 1.2, 'fill': ENCRE, 'textAlign': 'left',
            'textBg': {'mode': 'box', 'color': CREME, 'borderColor': ENCRE, 'borderWidth': 5, 'padX': 28, 'padY': 8, 'radius': 99}}
def signature(W, H, fill=ENCRE, bas=60):
    w = 238; h = round(w * ratio(LAT_VB))
    return {'id': 'logo', 'name': 'Logo', 'type': 'path', 'd': LAT_D, 'viewBox': LAT_VB, 'fill': fill,
            'x': W - 65 - w, 'y': H - bas - h, 'width': w, 'height': h}
def image(id_, var, x, y, w, h, fit='cover', name=None):
    return {'id': id_, 'name': name or var, 'type': 'image', 'src': '{{' + var + '}}', 'x': x, 'y': y, 'width': w, 'height': h, 'objectFit': fit}
def rect(id_, x, y, w, h, fill, **kw):
    return {'id': id_, 'type': 'rect', 'x': x, 'y': y, 'width': w, 'height': h, 'fill': fill, **kw}

def suit(els, id_, ancre, lignes=2):
    """« Sous la référence » de Suwar (10.62.1) : l'élément suit la dernière ligne de son ancre, au rendu comme dans l'éditeur.
    L'écart est celui du gabarit pour une ancre de `lignes` lignes : un titre d'une ligne ne laisse plus de vide dessous."""
    a, e = (next(x for x in els if x['id'] == i) for i in (ancre, id_))
    e.update(alignAnchor=ancre, autoAlignY='below', alignOffsetYPx=round(e['y'] - a['y'] - lignes * a['fontSize'] * a['lineHeight']))
    return els

V = lambda name, label, typ='text', default='', help_=None, hide=None, maxlen=None: {k: v for k, v in {
    'name': name, 'label': label, 'type': typ, 'defaultValue': default, 'help': help_, 'hideLayers': hide, 'maxLength': maxlen}.items() if v is not None}
VAR_RUB = V('Rubrique', 'Rubrique (pastille du haut)', help_="« L'astuce de Naânaa », « Vrai ou faux ? »…", maxlen=40)
VAR_TITRE = V('Titre', 'Titre', help_='Une phrase courte, point final', maxlen=60)
VAR_TEXTE = V('Texte', 'Texte sous le titre (facultatif)', hide=[], maxlen=90)
VAR_APPEL = V('Appel', 'Appel en bas (facultatif)', help_='« Réponse en caption »', hide=[], maxlen=34)

# ---------- Gabarits : (post, story) ----------
def scene(W, H):
    img_h = 1350
    y = 842 if H == 1350 else 1240
    iy = y - 842  # story : même mise en page que le post, descendue contre le texte
    els = [rect('fond', 0, 0, W, H, '{{Fond}}'), image('image', 'Image', 0, iy, W, img_h)]
    variables = [VAR_RUB, VAR_TITRE, V('Image', 'Scène riso (4:5)', 'image'), V('Fond', 'Couleur du bas de la scène (story)', 'color', '#FFF8EC')]
    if iy:  # bande du haut à la couleur du haut de la scène ; fondu sur 140 px seulement si le décor touche le haut (sinon il voilerait le dessin)
        els += [rect('fond-haut', 0, 0, W, iy + 1, '{{FondHaut}}'),
                rect('fondu', 0, iy, W, 140, '{{Fondu}}', gradient={'type': 'linear', 'angle': 180, 'stops': [
                    {'color': '{{Fondu}}', 'position': 0, 'opacity': 1}, {'color': '{{Fondu}}', 'position': 100, 'opacity': 0}]})]
        variables += [V('FondHaut', 'Couleur du haut de la scène (story)', 'color', '#FFF8EC'),
                      V('Fondu', 'Fondu du haut (scène pleine page seulement)', 'color', '', hide=['fondu'])]
    els += [kicker(65, y), titre(65, y + 72, 950, 200 if H == 1350 else 260, 80), signature(W, H, bas=60 if H == 1350 else 300)]
    return els, variables

def photo(W, H):
    ph = 891 if H == 1350 else 1100
    y = ph + 50
    els = [image('image', 'Image', 0, 0, W, ph), rect('bande', 0, ph, W, H - ph, '{{Bande}}'), rect('filet', 0, ph - 3, W, 6, ENCRE),
           image('pastille', 'Pastille', W - 324, 32 if H == 1350 else 250, 292, 307, 'contain', 'Pastille de score'),
           kicker(65, y), titre(65, y + 80, 940, 155 if H == 1350 else 175, 71 if H == 1350 else 80),
           texte(65, y + 80 + (165 if H == 1350 else 185), 690, 110, 34), signature(W, H, bas=60 if H == 1350 else 300)]
    suit(els, 'texte', 'titre')
    return els, [VAR_RUB, VAR_TITRE, VAR_TEXTE, V('Image', 'Photo à écran réel', 'image'), V('Bande', 'Couleur de la bande', 'color', '#19C08B'),
                 V('Pastille', 'Pastille de score riso (facultatif)', 'image', hide=[])]

def xxl(W, H):
    s = H == 1350
    els = [image('fond', 'Fond', 0, 0, W, H, name='Fond texturé'), image('naanaa', 'Naanaa', 530, 519 if s else 980, 626, 939, 'contain', 'Naânaa'),
           image('sticker1', 'Sticker1', 22, 770 if s else 1150, 432, 310, 'contain', 'Sticker 1'),
           image('sticker2', 'Sticker2', 162, 932 if s else 1340, 432, 310, 'contain', 'Sticker 2'),
           kicker(70, 70 if s else 260), titre(70, 160 if s else 350, 930, 180 if s else 200, 82 if s else 90, '{{Encre}}'),
           texte(70, 360 if s else 570, 670, 160, 42, '{{Encre}}'), cta(70, 1236 if s else 1600)]
    suit(els, 'texte', 'titre')
    return els, [VAR_RUB, VAR_TITRE, VAR_TEXTE, VAR_APPEL, V('Fond', 'Fond texturé (image)', 'image'), V('Encre', 'Couleur du texte', 'color', ENCRE),
                 V('Naanaa', 'Naânaa (pose riso)', 'image'), V('Sticker1', 'Sticker 1 (facultatif)', 'image', hide=[]), V('Sticker2', 'Sticker 2 (facultatif)', 'image', hide=[])]

def bulle_d(w, h, r=54, tx=150, tw=72, th=50):
    """Bulle de BD d'un seul tracé : rectangle arrondi dont le bord bas s'ouvre sur une pointe (pas de raccord visible)."""
    return (f'M{r} 0H{w - r}A{r} {r} 0 0 1 {w} {r}V{h - r}A{r} {r} 0 0 1 {w - r} {h}'
            f'H{tx + tw}L{tx + tw * .35} {h + th}L{tx} {h}H{r}A{r} {r} 0 0 1 0 {h - r}V{r}A{r} {r} 0 0 1 {r} 0Z')

def bulle(W, H):
    s = H == 1350
    bx, by, bw, bh, th = 70, (140 if s else 340), 920, (330 if s else 420), 50
    d, m = bulle_d(bw, bh, th=th), 4  # marge de tracé (trait de 5 px centré sur le contour)
    vb = f'{-m} {-m} {bw + 2 * m} {bh + th + 2 * m}'
    def forme(id_, dx, fill, stroke):
        e = {'id': id_, 'name': 'Bulle' if id_ == 'bulle' else 'Ombre de la bulle', 'type': 'path', 'd': d, 'viewBox': vb, 'fill': fill,
             'x': bx - m + dx, 'y': by - m + dx, 'width': bw + 2 * m, 'height': bh + th + 2 * m}
        return {**e, 'stroke': stroke, 'strokeWidth': 5, 'strokeLinejoin': 'round'} if stroke else e
    els = [image('fond', 'Fond', 0, 0, W, H, name='Fond texturé'),
           forme('bulle-ombre', 11, ENCRE, None), forme('bulle', 0, CREME, ENCRE),
           titre(120, by + 45, 820, bh - 90, 97 if s else 104),
           image('naanaa', 'Naanaa', -32, 583 if s else 1060, 540, 810, 'contain', 'Naânaa'),
           kicker(70, 62 if s else 260), signature(W, H, CREME, bas=60 if s else 300)]
    return els, [VAR_RUB, VAR_TITRE, V('Fond', 'Fond texturé (image)', 'image'), V('Naanaa', 'Naânaa (pose riso)', 'image')]

def plein(W, H):
    s = H == 1350
    y0 = 76 if s else 270
    voile = rect('voile', 0, 0, W, H, '#1D1430', gradient={'type': 'linear', 'angle': 180, 'stops': [
        {'color': '#1D1430', 'position': 0, 'opacity': .78}, {'color': '#1D1430', 'position': 32 if s else 34, 'opacity': .5},
        {'color': '#1D1430', 'position': 58 if s else 52, 'opacity': 0}]})
    ombre = {'shadowColor': 'rgba(0,0,0,0.35)', 'shadowX': 0, 'shadowY': 4, 'shadowBlur': 16}
    els = [image('image', 'Image', 0, 0, W, H), voile, kicker(70, y0),
           {**titre(70, y0 + 74, 940, 190, 80, LAIT), **ombre},
           {'id': 'titre-ar', 'name': 'Titre en arabe', 'type': 'text', 'content': '{{TitreAr}}', 'x': 70, 'y': y0 + 274, 'width': 940, 'height': 190,
            'fontFamily': 'Readex Pro', 'fontWeight': 700, 'fontSize': 68, 'lineHeight': 1.3, 'fill': LAIT, 'textAlign': 'right', **ombre},
           {**texte(70, y0 + 274, 860, 150, 42, LAIT), **ombre},
           {'id': 'signe', 'name': 'Signature', 'type': 'text', 'content': '{{Signature}}', 'x': 70, 'y': y0 + 400, 'width': 900, 'height': 54,
            'fontFamily': 'Readex Pro', 'fontWeight': 600, 'fontSize': 39, 'fill': LAIT, **ombre},
           signature(W, H, LAIT, bas=60 if s else 300)]
    suit(els, 'texte', 'titre'); suit(els, 'titre-ar', 'titre'); suit(els, 'signe', 'titre-ar', 1)  # fêtes : titre, titre arabe, signature
    return els, [VAR_RUB, VAR_TITRE, VAR_TEXTE, V('Image', 'Illustration plein écran (4:5)', 'image'),
                 V('TitreAr', 'Titre en arabe (fêtes, facultatif)', hide=[], maxlen=40), V('Signature', 'Signature (fêtes, facultatif)', hide=[], maxlen=40)]

GABARITS = {'Scène': scene, 'Photo': photo, 'XXL': xxl, 'Bulle': bulle, 'Plein écran': plein}

# Variante darija : lecture de droite à gauche, titres en Readex Pro (Unbounded n'a pas d'arabe), logo « باين » à gauche
def darija(els):
    o = {}
    for e in els:
        if e['type'] == 'text' and e['id'] in ('kicker', 'titre', 'texte', 'cta', 'signe'):
            o[e['id']] = {'textAlign': 'right'}
            if e['id'] == 'titre':  # l'arabe demande plus d'interligne : la boîte grandit d'autant, le texte descend
                o['titre'].update({'fontFamily': 'Readex Pro', 'fontWeight': 700, 'letterSpacing': 0, 'lineHeight': 1.32,
                                   'fontSize': round(e['fontSize'] * 1.06), 'height': round(e['height'] * 1.3)})
            if e['id'] == 'texte':
                t = next(x for x in els if x['id'] == 'titre')
                o['texte']['fontSize'] = round(e['fontSize'] * 1.08)
                if e['y'] > t['y']: o['texte']['y'] = e['y'] + round(t['height'] * .3)
                o['texte']['x'] = t['x'] + t['width'] - e['width']  # aligné à droite sur le titre (bord droit commun)
        if e['id'] == 'logo':
            w = 205
            o['logo'] = {'d': AR_D, 'viewBox': AR_VB, 'width': w, 'height': round(w * ratio(AR_VB)), 'x': 65,
                         'y': e['y'] + e['height'] - round(w * ratio(AR_VB))}
    return o

def long(els, lignes=None):
    """Titre long : sa boîte gagne des lignes, et tout ce qui est dessous dans la colonne de texte descend d'autant."""
    o, t = {}, next((e for e in els if e['id'] == 'titre'), None)
    if not t: return o
    lignes = lignes or (2 if t['fontSize'] > 75 else 1)
    plus = round(t['fontSize'] * 1.04 * lignes)
    o['titre'] = {'height': t['height'] + plus}
    for e in els:
        if e['id'] in ('texte', 'titre-ar', 'signe') and e['y'] > t['y']: o[e['id']] = {'y': e['y'] + plus}
    return o

def fusion(*ds):
    out = {}
    for d in ds:
        for k, v in d.items(): out.setdefault(k, {}).update(v)
    return out

U = json.loads((D / 'uploads.json').read_text())
AR = lambda t: '\u202b' + t + '\u202c'  # texte arabe isolé en sens droite-à-gauche
def exemples(nom, h):
    """Valeurs d'exemple (posts réels du calendrier) : (français, darija)."""
    f = lambda k: U[f'fond-{k}-{h}']
    if nom == 'Scène':
        return ({'Rubrique': "L'astuce de Naânaa", 'Titre': 'Le sucre a plusieurs noms.', 'Image': U['scene-s2-frigo-sucre'], 'Fond': '#23CF92'},
                {'Rubrique': AR('نصيحة نعناعة'), 'Titre': AR('السكر عندو بزاف ديال السميات.')})
    if nom == 'Photo':
        return ({'Rubrique': 'Le bon produit du mois', 'Titre': 'Leben, Jaouda.', 'Texte': 'Sans additif · NOVA\u00a01 · Nutri-Score\u00a0B',
                 'Image': U['photo-F7-tablette'], 'Bande': '#19C08B', 'Pastille': U['sticker-score-90']},
                {'Rubrique': AR('باين فالخدمة · الوجبة'), 'Titre': AR('صوّر الطبسيل ديالك، وعرف شنو فيه.'), 'Texte': '',
                 'Image': U['photo-F5-repas-ar'], 'Bande': '#B98CFF', 'Pastille': ''})
    if nom == 'XXL':
        return ({'Rubrique': 'Vrai ou faux\u00a0?', 'Titre': '« Light » veut dire sans sucre.', 'Texte': '', 'Appel': 'Réponse en caption',
                 'Fond': f('rayons'), 'Encre': ENCRE, 'Naanaa': U['naanaa-loupe'], 'Sticker1': U['sticker-vrai'], 'Sticker2': U['sticker-faux']},
                {'Rubrique': AR('صحيح ولا غالط؟'), 'Titre': AR('لايت معناها ديما شوية ديال السكر.'), 'Appel': AR('الجواب تحت التصويرة'),
                 'Sticker1': U['sticker-sahih'], 'Sticker2': U['sticker-ghalet']})
    if nom == 'Bulle':
        return ({'Rubrique': "L'astuce de Naânaa", 'Titre': "Lis l'étiquette avant le prix.", 'Fond': f('trame'), 'Naanaa': U['naanaa-astuce']},
                {'Rubrique': AR('نصيحة نعناعة'), 'Titre': AR('شوف السكريات، ماشي غير الكالوري.')})
    return ({'Rubrique': '6 novembre', 'Titre': 'Commémoration de la Marche verte', 'Texte': '', 'Image': U['plein-P2-marche-verte'],
             'TitreAr': AR('ذكرى المسيرة الخضراء'), 'Signature': ''},
            {'Rubrique': AR('نية العام الجديد'), 'Titre': AR('منتوج واحد فالشهر.'), 'Texte': AR('بدّل كل شهر منتوج واحد بواحد عندو نقطة أحسن.'),
             'Image': U['plein-P13-resolutions'], 'TitreAr': '', 'Signature': ''})

for nom, fn in GABARITS.items():
    for fmt, (W, H) in {'Post': (1080, 1350), 'Story': (1080, 1920)}.items():
        cle = f'{nom} · {fmt}'
        els, variables = fn(W, H)
        ex_fr, ex_ar = exemples(nom, H)
        for v in variables:
            if v['name'] in ex_fr: v['defaultValue'] = ex_fr[v['name']]
        args = {'name': f'Bayen · {cle}', 'width': W, 'height': H, 'elements': els, 'variables': variables, 'bgColor': CREME}
        if cle in ids:
            call('update_template', {'id': ids[cle]['id'], **args})
        else:
            ids[cle] = {'id': call('create_static_template', {**args, 'projectId': PROJET})['id']}
        tid = ids[cle]['id']
        variantes = {'Darija': darija(els)}
        if nom == 'Bulle':  # Naânaa occupe le bas gauche : le logo « باين » reste à droite
            variantes['Darija']['logo']['x'] = W - 65 - variantes['Darija']['logo']['width']
            # la bulle ne grandit pas avec l'interligne arabe : titre plus petit, dans la boîte d'origine
            t = next(e for e in els if e['id'] == 'titre')
            variantes['Darija']['titre'].update({'fontSize': round(t['fontSize'] * .8), 'height': t['height']})
        if nom in ('XXL', 'Photo', 'Plein écran'):
            lg = long(els, 1 if nom == 'Plein écran' else None)
            dl = fusion(darija(els), lg)
            dl['titre']['height'] = round(lg['titre']['height'] * 1.3)
            for k in ('texte', 'titre-ar', 'signe'):
                if k in lg: dl[k]['y'] = lg[k]['y'] + round(lg['titre']['height'] * .3)
            variantes |= {'Long': lg, 'Darija long': dl}
        for vn, ov in variantes.items():
            cle_v = vn.lower().replace(' ', '-')
            longs = {'XXL': ({'Titre': '« Sans sucres ajoutés » veut dire sans sucre.'}, {'Titre': AR('الياغورت «بلا سكر مضاف» ماعندوش السكر نهائيا.')}),
                     'Photo': ({'Titre': 'Ta crème, décodée ingrédient par ingrédient.', 'Image': U['photo-F2-beaute'], 'Bande': '#FF8FB1', 'Texte': '', 'Pastille': ''},
                               {'Titre': AR('الكريمة ديالك، مكوّن بمكوّن، مع اللوائح الرسمية.'), 'Image': U['photo-F2-beaute-ar'], 'Bande': '#FF8FB1'})}
            var = {'Darija': ex_ar, 'Long': longs.get(nom, ({}, {}))[0], 'Darija long': {**ex_ar, **longs.get(nom, ({}, {}))[1]}}.get(vn, {})
            ovs = {'elements': ov, 'variables': var}
            if cle_v in ids[cle]: call('update_variant', {'id': ids[cle][cle_v], 'overrides': ovs})
            else: ids[cle][cle_v] = call('create_variant', {'templateId': tid, 'name': vn, 'overrides': ovs})['id']
        CACHE.write_text(json.dumps(ids, indent=1, ensure_ascii=False))
        print('ok', cle, tid, list(variantes))
