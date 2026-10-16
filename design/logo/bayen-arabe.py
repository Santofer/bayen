"""
Wordmark arabe « باين » de Bayen (« c'est clair » en darija, avec alif, sans chadda) : le mot mis en
forme par HarfBuzz dans une police arabe grasse (piste retenue : Alexandria Black), contours fusionnés,
puis un point de lettre remplacé par une petite cuillère, clin d'œil au « b-cuillère » du wordmark latin.
Sur le ن, la cuillère est centrée sur la panse de la lettre (pas sur la position du point de la police).

Usage : python bayen-arabe.py <police.ttf> <graisse> <nom> [noon|baa|aucun] [angle du manche, en degrés] [--final]
Version retenue (16/10/2026) : Alexandria.ttf 900 alexandria noon 135 --final
  → design/logo/bayen-wordmark-arabe.svg + arabe/logo-astro.txt (données de Logo.astro)
Sortie : design/logo/arabe/<nom>-<variante>.svg (chemin vectoriel pur, couleur = currentColor)
Dépendances : fonttools, skia-pathops, uharfbuzz
"""
import math
import sys
from pathlib import Path
import uharfbuzz as hb
import pathops
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.recordingPen import RecordingPen, DecomposingRecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

MOT = 'باين'
OUT = Path(__file__).parent / 'arabe'


def mot(path: str, wght: float) -> tuple[pathops.Path, dict[int, pathops.Path]]:
    """Contour du mot mis en forme (liaisons, signes placés par le GPOS), et contour de chaque lettre
    (indice du caractère dans MOT → chemin), pour retrouver une lettre précise dans le mot fusionné."""
    tt = TTFont(path)
    if 'fvar' in tt:
        tt = instantiateVariableFont(tt, {a.axisTag: (wght if a.axisTag == 'wght' else a.defaultValue) for a in tt['fvar'].axes})
    font = hb.Font(hb.Face(hb.Blob.from_file_path(path)))
    font.set_variations({'wght': wght})
    buf = hb.Buffer(); buf.add_str(MOT); buf.guess_segment_properties()
    hb.shape(font, buf, {})
    gs, order = tt.getGlyphSet(), tt.getGlyphOrder()
    out, lettres, x = pathops.Path(), {}, 0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):  # ordre visuel, de gauche à droite
        rec = DecomposingRecordingPen(gs); gs[order[info.codepoint]].draw(rec)  # glyphes composés : décomposés
        t = (1, 0, 0, 1, x + pos.x_offset, pos.y_offset)
        rec.replay(TransformPen(out.getPen(), t))
        rec.replay(TransformPen(lettres.setdefault(info.cluster, pathops.Path()).getPen(), t))
        x += pos.x_advance
    return pathops.simplify(out), lettres


def contours(path: pathops.Path) -> list[pathops.Path]:
    rec = RecordingPen(); path.draw(rec)
    res, cur = [], []
    for op, args in rec.value:
        cur.append((op, args))
        if op in ('closePath', 'endPath'):
            p = pathops.Path(); pen = p.getPen()
            for o, a in cur: getattr(pen, o)(*a)
            res.append(p); cur = []
    return res


def ellipse(cx, cy, rx, ry, rot) -> pathops.Path:
    """Ellipse en 4 cubiques (k = 0,5523), tournée de rot radians."""
    k, c, s = .5523, math.cos(rot), math.sin(rot)
    T = lambda x, y: (cx + x * c - y * s, cy + x * s + y * c)
    p = pathops.Path(); pen = p.getPen()
    pen.moveTo(T(rx, 0))
    for (x1, y1), (x2, y2), (x3, y3) in [((rx, k * ry), (k * rx, ry), (0, ry)), ((-k * rx, ry), (-rx, k * ry), (-rx, 0)),
                                          ((-rx, -k * ry), (-k * rx, -ry), (0, -ry)), ((k * rx, -ry), (rx, -k * ry), (rx, 0))]:
        pen.curveTo(T(x1, y1), T(x2, y2), T(x3, y3))
    pen.closePath()
    return p


def cuillere(cx, cy, d, angle) -> pathops.Path:
    """Petite cuillère : cuilleron ovale à la place du point, manche arrondi dans la direction angle."""
    a = math.radians(angle); u = (math.cos(a), math.sin(a)); n = (-u[1], u[0])
    bowl = ellipse(cx, cy, .62 * d, .48 * d, a)
    w, L = .17 * d, 1.85 * d                       # demi-largeur et longueur du manche
    x0, y0 = cx + u[0] * .45 * d, cy + u[1] * .45 * d
    x1, y1 = cx + u[0] * L, cy + u[1] * L
    stem = pathops.Path(); pen = stem.getPen()
    pen.moveTo((x0 + n[0] * w, y0 + n[1] * w)); pen.lineTo((x1 + n[0] * w, y1 + n[1] * w))
    pen.lineTo((x1 - n[0] * w, y1 - n[1] * w)); pen.lineTo((x0 - n[0] * w, y0 - n[1] * w)); pen.closePath()
    tip = ellipse(x1, y1, w * 1.35, w * 1.35, 0)    # bout du manche arrondi, un peu plus large
    return pathops.op(pathops.op(bowl, stem, pathops.PathOp.UNION), tip, pathops.PathOp.UNION)


def area(b): return (b[2] - b[0]) * (b[3] - b[1])


def cuillere_noon(word: pathops.Path, noon: pathops.Path, angle: float) -> pathops.Path:
    """Remplace le point du ن par une cuillère centrée sur la panse de la lettre."""
    cs = contours(pathops.simplify(noon))
    panse = max(cs, key=lambda c: area(c.bounds)).bounds
    point = min((c for c in cs if c.bounds[1] > panse[1] + .3 * (panse[3] - panse[1])), key=lambda c: area(c.bounds)).bounds
    reste = pathops.Path()
    for o in contours(word):  # le même point, retrouvé dans le mot fusionné
        if max(abs(a - b) for a, b in zip(o.bounds, point)) > 2: reste.addPath(o)
    d = max(point[2] - point[0], point[3] - point[1])
    # Creux du ن : sur quelques lignes de la moitié haute de la panse, l'intervalle vide entre le bras
    # gauche et la remontée droite ; le cuilleron se pose au milieu, un peu plus bas que le point d'origine
    plein = pathops.simplify(noon)
    milieux = []
    for f in (.55, .65, .75, .85):
        y = panse[1] + f * (panse[3] - panse[1])
        xs = [x for x in range(int(panse[0]), int(panse[2]), 4) if plein.contains((x, y))]
        trous = [(a, b) for a, b in zip(xs, xs[1:]) if b - a > 12]
        if trous: milieux.append(sum(trous[0]) / 2)
    cx = sum(milieux) / len(milieux) if milieux else (panse[0] + panse[2]) / 2
    # Haut du bras gauche du ن : le cuilleron descend jusqu'à l'ouverture du creux, un peu à gauche du milieu
    xb = panse[0] + .12 * (panse[2] - panse[0])
    bras = max((y for y in range(int(panse[1]), int(panse[3]), 4) if plein.contains((xb, y))), default=panse[3])
    sp = cuillere(cx - .3 * d, bras + .45 * d, d, angle)
    return pathops.op(reste, sp, pathops.PathOp.UNION)


def avec_cuillere(word: pathops.Path, ou: str, angle: float) -> pathops.Path:
    cs = contours(word)
    boxes = [c.bounds for c in cs]
    big = max((b[2] - b[0]) * (b[3] - b[1]) for b in boxes)
    # Points : petits contours à peu près carrés
    dots = [(c, b) for c, b in zip(cs, boxes)
            if (b[2] - b[0]) * (b[3] - b[1]) < .06 * big and .6 < (b[2] - b[0]) / max(1, b[3] - b[1]) < 1.7]
    if ou == 'noon':   # point du ن : au-dessus de la ligne, le plus à gauche (le mot se lit de droite à gauche)
        cand = [d for d in dots if (d[1][1] + d[1][3]) / 2 > 0]
        cible = min(cand, key=lambda d: d[1][0])
    else:              # point du ب : sous la ligne, le plus à droite
        cand = [d for d in dots if (d[1][1] + d[1][3]) / 2 < 0]
        cible = max(cand, key=lambda d: d[1][2])
    c, b = cible
    reste = pathops.Path()
    for o in cs:
        if o is not c: reste.addPath(o)
    d = max(b[2] - b[0], b[3] - b[1])
    sp = cuillere((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, d, angle)
    return pathops.op(reste, sp, pathops.PathOp.UNION)


def svg(path: pathops.Path) -> tuple[str, str]:
    pen = SVGPathPen(None); path.draw(pen)
    x0, y0, x1, y1 = path.bounds
    m = 40
    return pen.getCommands(), f'{x0 - m:.0f} {-y1 - m:.0f} {x1 - x0 + 2 * m:.0f} {y1 - y0 + 2 * m:.0f}'


def final(path: pathops.Path) -> None:
    """Wordmark retenu (16/10/2026 : cuillère couchée) : design/logo/bayen-wordmark-arabe.svg, y vers le bas,
    coordonnées arrondies, et sa ligne de données pour frontend/src/components/Logo.astro."""
    p = path.transform(scaleY=-1)
    x0, y0, x1, y1 = p.bounds
    pen = SVGPathPen(None, ntos=lambda v: f'{v:.1f}'.rstrip('0').rstrip('.')); p.draw(pen)
    d, vb = pen.getCommands(), f'{x0:.0f} {y0:.0f} {x1 - x0:.0f} {y1 - y0:.0f}'
    (Path(__file__).parent / 'bayen-wordmark-arabe.svg').write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" fill="currentColor"><path d="{d}"/></svg>\n')
    (OUT / 'logo-astro.txt').write_text(f"const AR = '{d}'\nconst AR_VB = '{vb}'\n")
    print('final', vb, len(d), 'caractères')


if __name__ == '__main__':
    police, wght, nom = sys.argv[1], float(sys.argv[2]), sys.argv[3]
    ou = sys.argv[4] if len(sys.argv) > 4 else 'noon'
    args = [a for a in sys.argv if a != '--final']
    angle = float(args[5]) if len(args) > 5 else (135 if ou == 'noon' else -40)
    w, lettres = mot(police, wght)
    if ou == 'noon':
        w = cuillere_noon(w, lettres[MOT.index('ن')], angle)
    elif ou == 'baa':
        w = avec_cuillere(w, ou, angle)
    if '--final' in sys.argv:
        OUT.mkdir(exist_ok=True); final(w); sys.exit()
    d, vb = svg(w)
    OUT.mkdir(exist_ok=True)
    suffixe = f'-{angle:.0f}' if len(args) > 5 else ''
    (OUT / f'{nom}-{ou}{suffixe}.svg').write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><path fill="currentColor" transform="scale(1 -1)" d="{d}"/></svg>\n')
    print(nom, ou, vb)
