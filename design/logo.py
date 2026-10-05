"""Logo Bayen : « bayen » + « بيّن » en Baloo Bhaijaan 2 vectorisé, chadda menthe commune.

Prérequis : python -m venv v && v/bin/pip install uharfbuzz fonttools ;
police : https://github.com/google/fonts/raw/main/ofl/baloobhaijaan2/BalooBhaijaan2%5Bwght%5D.ttf -> fonts/baloo.ttf
Usage : v/bin/python logo.py <dossier-sortie>

Sorties : logo-lockup.svg (empilé), logo-wordmark.svg (horizontal, latin seul),
logo-mark.svg (icône carrée : chadda + b), en encre et en version claire.
"""
import io, sys, pathlib
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

OUT = pathlib.Path(sys.argv[1])
INK, MINT = "#1B1B1B", "#19C08B"

src = TTFont("fonts/baloo.ttf")
font = instancer.instantiateVariableFont(src, {"wght": 800})
buf = io.BytesIO(); font.save(buf); data = buf.getvalue()
gs = font.getGlyphSet()
upm = font["head"].unitsPerEm
hbfont = hb.Font(hb.Face(data))
order = font.getGlyphOrder()


def shape(text, direction, script, lang):
    b = hb.Buffer(); b.add_str(text); b.direction = direction
    b.script = script; b.language = lang
    hb.shape(hbfont, b, {"kern": True, "liga": True})
    out, x = [], 0
    for info, pos in zip(b.glyph_infos, b.glyph_positions):
        out.append((order[info.codepoint], x + pos.x_offset, pos.y_offset, info.cluster))
        x += pos.x_advance
    return out, x


def path(name, dx, dy, scale=1.0):
    pen = SVGPathPen(gs)
    gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, dx, dy)))
    return pen.getCommands()


def bounds(name):
    bp = BoundsPen(gs); gs[name].draw(bp); return bp.bounds


lat, lat_w = shape("bayen", "ltr", "Latn", "fr")
ara, ara_w = shape("بيّن", "rtl", "Arab", "ar")
shadda = [g for g in ara if "shadda" in g[0].lower() or g[0] in ("uni0651",)]
if not shadda:
    sys.exit("chadda introuvable : " + ", ".join(g[0] for g in ara))
sh_name = shadda[0][0]
sb = bounds(sh_name)
print("glyphes arabes :", [g[0] for g in ara], "| chadda :", sh_name)

asc = font["OS/2"].sTypoAscender


def lockup(ink, mint, stacked=True):
    parts = []
    # ligne latine : baseline à y=asc
    base1 = asc
    y_glyph = next(g for g in lat if g[0].lower().startswith("y"))
    for name, x, yo, _ in lat:
        parts.append(f'<path fill="{ink}" d="{path(name, x, base1 - yo)}"/>')
    yb = bounds(y_glyph[0])
    ycx = y_glyph[1] + (yb[0] + yb[2]) / 2
    shw = sb[2] - sb[0]
    xh = font["OS/2"].sxHeight or 500
    # chadda posée au-dessus du y, 12 % de l'em au-dessus de la hauteur d'x
    sx = ycx - (sb[0] + shw / 2)
    sy_top = base1 - xh - upm * 0.10
    parts.append(f'<path fill="{mint}" d="{path(sh_name, sx, sy_top + sb[1])}"/>')
    width = lat_w
    height = base1 + upm * 0.28
    if stacked:
        base2 = height + asc * 0.95
        off = (lat_w - ara_w) / 2
        for name, x, yo, _ in ara:
            fill = mint if name == sh_name else ink
            parts.append(f'<path fill="{fill}" d="{path(name, off + x, base2 - yo)}"/>')
        height = base2 + upm * 0.30
    top = base1 - xh - upm * 0.10 - (sb[3] - sb[1]) - upm * 0.06
    vb = f"0 {top:.0f} {width:.0f} {height - top:.0f}"
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-label="Bayen">' + "".join(parts) + "</svg>"


def mark(ink, mint, bg):
    # icône : b + chadda, sur pastille ronde
    b = next(g for g in lat if g[0].lower().startswith("b"))
    bb = bounds(b[0]); s = 0.62
    w = (bb[2] - bb[0]) * s; h = (bb[3] - bb[1]) * s
    S = 1000
    dx = (S - w) / 2 - bb[0] * s; dy = S / 2 + h / 2 + bb[1] * s + 60
    sw = (sb[2] - sb[0]) * s * 1.25
    parts = [f'<rect width="{S}" height="{S}" rx="{S*0.28:.0f}" fill="{bg}"/>',
             f'<path fill="{ink}" d="{path(b[0], dx, dy, s)}"/>']
    # chadda au-dessus de la panse du b
    s2 = s * 1.25
    cx = dx + (bb[0] + bb[2]) / 2 * s + w * 0.12
    parts.append(f'<path fill="{mint}" d="{path(sh_name, cx - (sb[0] + (sb[2]-sb[0]) / 2) * s2, dy - h - 40 + sb[1] * s2, s2)}"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {S} {S}">' + "".join(parts) + "</svg>"


OUT.mkdir(parents=True, exist_ok=True)
(OUT / "logo-lockup.svg").write_text(lockup(INK, MINT))
(OUT / "logo-lockup-light.svg").write_text(lockup("#FFF3DF", MINT))
(OUT / "logo-wordmark.svg").write_text(lockup(INK, MINT, stacked=False))
(OUT / "logo-wordmark-light.svg").write_text(lockup("#FFF3DF", MINT, stacked=False))
(OUT / "logo-mark.svg").write_text(mark(INK, MINT, "#FFF8EC"))
(OUT / "logo-mark-mint.svg").write_text(mark(INK, "#FFF8EC", MINT))
print("ok", sorted(p.name for p in OUT.iterdir()))
