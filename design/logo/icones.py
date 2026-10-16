"""
Icônes et image de partage de Bayen à partir du b-cuillère (design/logo/*.svg).

Produit dans frontend/public : favicon.svg / .ico / -32.png, apple-touch-icon.png,
icon-192/512.png (+ copies dans icons/), icon-maskable-512.png, icon-monochrome-512.png,
logo-bayen.svg (wordmark encre) et og-default.png/.jpg (1200×630).

Usage : python icones.py <Unbounded[wght].ttf>   (dépendances : skia-python, pillow, fonttools)
"""
import re, sys, io
from pathlib import Path
import skia
from PIL import Image

HERE = Path(__file__).parent
PUB = HERE.parent.parent / 'frontend' / 'public'
MENTHE, ENCRE, CREME = '#19C08B', '#1B1B1B', '#FFF8EC'

def paths_of(svg_file):
    s = (HERE / svg_file).read_text()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', s).group(1).split()]
    ds = re.findall(r'd="([^"]+)"', s)
    # recadrage serré : le générateur ajoute 60 unités de marge
    return [vb[0] + 60, vb[1] + 60, vb[2] - 120, vb[3] - 120], ds

SIG_VB, SIG = paths_of('bayen-b-cuillere.svg')
WRD_VB, WRD = paths_of('bayen-wordmark-cuillere.svg')

def svg_icon(size=512, bg=MENTHE, fg=ENCRE, radius=0.22, scale=0.56, full=False):
    """Sigle centré sur un carré (arrondi sauf full=True)."""
    x, y, w, h = SIG_VB
    s = size * scale / max(w, h)
    tx = (size - w * s) / 2 - x * s
    ty = (size - h * s) / 2 - y * s
    r = 0 if full else size * radius
    bgsvg = f'<rect width="{size}" height="{size}" rx="{r}" fill="{bg}"/>' if bg else ''
    body = ''.join(f'<path d="{d}"/>' for d in SIG)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'{bgsvg}<g transform="translate({tx:.2f} {ty:.2f}) scale({s:.5f})" fill="{fg}">{body}</g></svg>')

def render(svg, size):
    """SVG → image PIL RGBA via Skia."""
    stream = skia.MemoryStream(svg.encode())
    dom = skia.SVGDOM.MakeFromStream(stream)
    dom.setContainerSize(skia.Size(size, size))
    surf = skia.Surface(size, size)
    surf.getCanvas().clear(skia.ColorTRANSPARENT)
    dom.render(surf.getCanvas())
    return Image.open(io.BytesIO(surf.makeImageSnapshot().encodeToData().bytes())).convert('RGBA')

# Favicon SVG (navigateurs récents) + PNG/ICO
(PUB / 'favicon.svg').write_text(svg_icon(64, radius=0.24, scale=0.6) + '\n')
render(svg_icon(32, radius=0.24, scale=0.62), 32).save(PUB / 'favicon-32.png')
ico = render(svg_icon(256, radius=0.24, scale=0.6), 256)
ico.save(PUB / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
# Écran d'accueil : iOS arrondit lui-même → carré plein
render(svg_icon(180, full=True, scale=0.5), 180).convert('RGB').save(PUB / 'apple-touch-icon.png')
(PUB / 'icons').mkdir(exist_ok=True)
render(svg_icon(180, full=True, scale=0.5), 180).convert('RGB').save(PUB / 'icons' / 'apple-touch-icon.png')
for n in (192, 512):
    im = render(svg_icon(n), n)
    im.save(PUB / f'icon-{n}.png'); im.save(PUB / 'icons' / f'icon-{n}.png')
# Maskable : plein cadre, sigle dans la zone sûre (≈ 60 %)
render(svg_icon(512, full=True, scale=0.42), 512).save(PUB / 'icon-maskable-512.png')
# Monochrome : seule l'opacité compte
render(svg_icon(512, bg=None, fg='#FFFFFF', scale=0.5), 512).save(PUB / 'icon-monochrome-512.png')

# Wordmark encre (logo de l'organisation dans le JSON-LD)
x, y, w, h = WRD_VB
(PUB / 'logo-bayen.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:.0f} {y:.0f} {w:.0f} {h:.0f}" fill="{ENCRE}">'
    + ''.join(f'<path d="{d}"/>' for d in WRD) + '</svg>\n')

# Image de partage 1200×630 : aplat citron (Naânaa, verte, ressort), wordmark encre
W, H = 1200, 630
ws = 560 / w
wx = 110 - x * ws; wy = (H - h * ws) / 2 - y * ws - 20
og_svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
          f'<rect width="{W}" height="{H}" fill="#FFD43B"/>'
          f'<g transform="translate({wx:.1f} {wy:.1f}) scale({ws:.5f})" fill="{ENCRE}">'
          + ''.join(f'<path d="{d}"/>' for d in WRD) + '</g></svg>')
stream = skia.MemoryStream(og_svg.encode()); dom = skia.SVGDOM.MakeFromStream(stream)
dom.setContainerSize(skia.Size(W, H)); surf = skia.Surface(W, H); dom.render(surf.getCanvas())
og = Image.open(io.BytesIO(surf.makeImageSnapshot().encodeToData().bytes())).convert('RGBA')
mascot = Image.open(PUB / 'mascotte' / 'naanaa-salut.webp').convert('RGBA')
mh = 500; mascot = mascot.resize((int(mascot.width * mh / mascot.height), mh), Image.LANCZOS)
og.alpha_composite(mascot, (W - mascot.width - 90, H - mh - 30))
og.convert('RGB').save(PUB / 'og-default.png', optimize=True)
og.convert('RGB').save(PUB / 'og-default.jpg', quality=88)
print('icônes et image de partage générées dans', PUB)
