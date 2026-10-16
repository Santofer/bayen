"""
Génère le logo « b-cuillère » de Bayen à partir des vrais contours d'Unbounded (wght 800,
la graisse du logo du site) : la panse du b devient le cuilleron d'une cuillère dont le
manche, en creux, traverse la hampe et ressort à gauche (idée inspirée de prepd).

Sortie : design/logo/bayen-b-cuillere.svg (sigle seul) et bayen-wordmark-cuillere.svg
(« bayen », sans point ni arabe), chemins vectoriels purs (aucune police nécessaire).

Usage : python b-cuillere.py <Unbounded[wght].ttf>
Dépendances : fonttools, skia-pathops
"""
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
import pathops

OUT = Path(__file__).parent
font = instantiateVariableFont(TTFont(sys.argv[1]), {'wght': 800})
gs, cmap = font.getGlyphSet(), font.getBestCmap()
UPEM = font['head'].unitsPerEm
hmtx = font['hmtx']

def glyph_path(ch):
    """Contour d'un glyphe en pathops.Path (coordonnées police, y vers le haut)."""
    name = cmap[ord(ch)]
    p = pathops.Path()
    gs[name].draw(p.getPen())
    return p, hmtx[name][0]

def contours(path):
    """Découpe un chemin en contours (pour trouver la contre-forme de la panse)."""
    rec = RecordingPen(); path.draw(rec)
    out, cur = [], []
    for op, args in rec.value:
        cur.append((op, args))
        if op in ('closePath', 'endPath'):
            out.append(cur); cur = []
    res = []
    for c in out:
        rp = RecordingPen(); rp.value = c
        bp = BoundsPen(None); rp.replay(bp)
        res.append(bp.bounds)
    return res

def capsule(x0, x1, cy, h):
    """Rectangle aux extrémités rondes (manche de la cuillère)."""
    r = h / 2
    p = pathops.Path(); pen = p.getPen()
    k = 0.5523 * r  # bézier ≈ quart de cercle
    pen.moveTo((x0 + r, cy - r)); pen.lineTo((x1 - r, cy - r))
    pen.curveTo((x1 - r + k, cy - r), (x1, cy - k), (x1, cy))
    pen.curveTo((x1, cy + k), (x1 - r + k, cy + r), (x1 - r, cy + r))
    pen.lineTo((x0 + r, cy + r))
    pen.curveTo((x0 + r - k, cy + r), (x0, cy + k), (x0, cy))
    pen.curveTo((x0, cy - k), (x0 + r - k, cy - r), (x0 + r, cy - r))
    pen.closePath()
    return p

def spoon_b():
    b, adv = glyph_path('b')
    bounds = contours(b)
    outer = max(bounds, key=lambda bb: (bb[2] - bb[0]) * (bb[3] - bb[1]))
    counter = min(bounds, key=lambda bb: (bb[2] - bb[0]) * (bb[3] - bb[1]))
    cx = (counter[0] + counter[2]) / 2; cy = (counter[1] + counter[3]) / 2
    r = (counter[3] - counter[1]) / 2
    stem_left = outer[0]
    h = 0.44 * r            # épaisseur du manche
    wall = 0.38 * r         # paroi autour du bout du manche qui dépasse
    out_len = 1.45 * r      # longueur du manche hors de la hampe
    slot = capsule(stem_left - out_len, cx, cy, h)
    nub = capsule(stem_left - out_len - wall, stem_left + wall, cy, h + 2 * wall)
    shape = pathops.op(pathops.op(b, nub, pathops.PathOp.UNION), slot, pathops.PathOp.DIFFERENCE)
    return shape, adv, (stem_left - out_len - wall)

def to_svg_d(path, dx=0.0):
    """Chemin pathops → attribut d (repère SVG : y inversé)."""
    pen = SVGPathPen(None)
    from fontTools.pens.transformPen import TransformPen
    path.draw(TransformPen(pen, (1, 0, 0, -1, dx, 0)))
    return pen.getCommands()

ASC = 760  # hauteur utile (b) au-dessus de la ligne de base, en unités police
DESC = 260

# Sigle seul
b, adv_b, left_b = spoon_b()
bb = b.bounds
pad = 60
vb = (bb[0] - pad, -bb[3] - pad, bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad)
(OUT / 'bayen-b-cuillere.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb[0]:.0f} {vb[1]:.0f} {vb[2]:.0f} {vb[3]:.0f}" fill="currentColor">'
    f'<path d="{to_svg_d(b)}"/></svg>\n')

# Wordmark « bayen » + point menthe (approche du site : letter-spacing -0.04em)
track = -0.04 * UPEM
x = 0.0
parts = [f'<path d="{to_svg_d(b, x)}"/>']
x += adv_b + track
last_right = 0
for ch in 'ayen':
    p, adv = glyph_path(ch)
    parts.append(f'<path d="{to_svg_d(p, x)}"/>')
    last_right = x + (p.bounds[2] if p.bounds else adv)
    x += adv + track
# Plus de point menthe (décision d'Amine du 15/10) : le wordmark s'arrête au n
xmin = left_b - pad; xmax = last_right + pad
ymin = -bb[3] - pad; ymax = DESC + pad
(OUT / 'bayen-wordmark-cuillere.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{xmin:.0f} {ymin:.0f} {xmax - xmin:.0f} {ymax - ymin:.0f}" fill="currentColor">'
    + ''.join(parts) + '</svg>\n')
print('ok', vb, (xmin, ymin, xmax - xmin, ymax - ymin))

# Données pour la planche de présentation (chemins + cuilleron) en JSON
import json
_, _, _ = spoon_b()
bglyph, _ = glyph_path('b')
cbs = contours(bglyph)
counter = min(cbs, key=lambda bb: (bb[2] - bb[0]) * (bb[3] - bb[1]))
(OUT / 'cuillere-data.json').write_text(json.dumps({
    'b': to_svg_d(b), 'b_viewbox': vb,
    'word': [to_svg_d(b)] + [None] * 0,
    'word_svg': (OUT / 'bayen-wordmark-cuillere.svg').read_text(),
    'bowl': {'cx': (counter[0] + counter[2]) / 2, 'cy': -(counter[1] + counter[3]) / 2, 'r': (counter[3] - counter[1]) / 2},
}))
