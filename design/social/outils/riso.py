"""Briques riso de Bayen (logo, icône, textures, stickers, Naânaa, appareils) partagées par la planche
et le calendrier. Palette Marché Pop fixe ; les images sont embarquées en data: URI."""
import json, base64, io, math, random
from pathlib import Path
from PIL import Image
D = json.load(open(Path(__file__).parent / 'riso-paths.json'))
ROOT = Path(__file__).resolve().parents[2]; PUB = ROOT.parent / 'frontend/public'  # design/ et frontend/public/
def enc(im, q=80):
    b = io.BytesIO(); im.save(b, 'WEBP', quality=q); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
def img_uri(p, size, mode='RGBA', crop=None):
    im = Image.open(p).convert(mode)
    if crop: im = im.crop(crop)
    im.thumbnail(size, Image.LANCZOS); return enc(im)
def svg_uri(s): return 'data:image/svg+xml;base64,' + base64.b64encode(s.encode()).decode()
def mix(a, b, t):
    A = [int(a[i:i + 2], 16) for i in (1, 3, 5)]; B = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02X%02X%02X' % tuple(round(x + (y - x) * t) for x, y in zip(A, B))

C = dict(creme='#FFF8EC', encre='#1B1B1B', menthe='#19C08B', citron='#FFD43B', tomate='#FF5A3C', myrtille='#6B7BFF',
         figue='#B98CFF', framboise='#FF8FB1', aubergine='#3B1F5C', lait='#FFF3DF')

W = ''.join(f'<path d="{d}"/>' for d in D['word'])
S = ''.join(f'<path d="{d}"/>' for d in D['sig'])

def grain_filter(fid, freq, a, b, units=''):
    return (f'<filter id="{fid}" {units}><feTurbulence type="fractalNoise" baseFrequency="{freq}" numOctaves="2" seed="4" stitchTiles="stitch" result="n"/>'
            f'<feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 {a} {b}" result="m"/><feComposite in="SourceGraphic" in2="m" operator="in"/></filter>')

FILTERS = ('<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
  + grain_filter('grain', .9, -3.85, 3.1, 'x="-10%" y="-10%" width="120%" height="120%"')
  + grain_filter('grain-line', 1.6, -4.2, 3.5)
  + grain_filter('grain-soft', 1.1, -2.6, 2.3, 'x="-10%" y="-10%" width="120%" height="120%"')
  # Stickers riso : grain discret (le dessin reste net), et à peine visible sur la pastille de note
  + grain_filter('grain-light', 1.1, -2.5, 2.65, 'x="-10%" y="-10%" width="120%" height="120%"')
  + grain_filter('grain-faint', 1.1, -2.2, 2.9, 'x="-10%" y="-10%" width="120%" height="120%"')
  + '<filter id="st-sh" x="-25%" y="-25%" width="150%" height="160%"><feDropShadow dx="5" dy="16" stdDeviation="11" flood-color="#1B1B1B" flood-opacity=".34"/></filter>'
  + '<linearGradient id="gloss" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".62"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/>'
    '<stop offset=".78" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".22"/></linearGradient>'
  + f'<g id="W">{W}</g><g id="S">{S}</g></defs></svg>')

# ---------- Logo et icône riso (inchangés) ----------
def wordmark(fill, line, shadow=None, tilt=True, dx=34, dy=26):
    x, y, w, h = map(float, D['wvb'].split())
    t = 'rotate(-4 1900 -260) skewX(-9)' if tilt else ''
    sh = f'<use href="#W" fill="{shadow}" filter="url(#grain)" transform="translate({dx*2.2} {dy*2.4})"/>' if shadow else ''
    return (f'<svg viewBox="{x-80} {y-160} {w+260} {h+300}"><g transform="{t}">{sh}'
            f'<use href="#W" fill="{fill}" filter="url(#grain)" transform="translate({dx} {dy})"/>'
            f'<use href="#W" fill="none" stroke="{line}" stroke-width="30" stroke-linejoin="round" filter="url(#grain-line)"/></g></svg>')

def icon(bg, fill, line, shadow=None):
    x, y, w, h = map(float, D['svb'].split()); pad = 260
    sh = f'<use href="#S" fill="{shadow}" filter="url(#grain)" transform="translate(70 60)"/>' if shadow else ''
    r = (w + 2 * pad) * .22
    return (f'<svg viewBox="{x-pad} {y-pad} {w+2*pad} {h+2*pad}"><rect x="{x-pad}" y="{y-pad}" width="{w+2*pad}" height="{h+2*pad}" rx="{r}" fill="{bg}"/>'
            f'<rect x="{x-pad}" y="{y-pad}" width="{w+2*pad}" height="{h+2*pad}" rx="{r}" fill="#FFF8EC" opacity=".18" filter="url(#grain)"/>'
            f'<g transform="translate(0 20)">{sh}<use href="#S" fill="{fill}" filter="url(#grain)" transform="translate(34 26)"/>'
            f'<use href="#S" fill="none" stroke="{line}" stroke-width="30" stroke-linejoin="round" filter="url(#grain-line)"/></g></svg>')

# ---------- Textures riso (SVG raccordables : le grain est « stitché » au carreau) ----------
def tex(bg, fg, body, w, h=None, sparse=False):
    h = h or w
    a, b = (14, -9.4) if sparse else (-3.4, 2.75)
    g = grain_filter('g', .8, a, b, f'filterUnits="userSpaceOnUse" x="0" y="0" width="{w}" height="{h}"')
    return svg_uri(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><defs>{g}</defs>'
                   f'<rect width="{w}" height="{h}" fill="{bg}"/><g fill="{fg}" stroke="{fg}" stroke-width="0" filter="url(#g)">{body}</g></svg>')

def star(cx, cy, R):
    r = R * math.cos(math.pi / 4) / math.cos(math.pi / 8); pts = []
    for i in range(16):
        a = math.pi / 8 * i - math.pi / 2; rr = R if i % 2 == 0 else r
        pts.append(f'{cx + rr*math.cos(a):.1f},{cy + rr*math.sin(a):.1f}')
    return f'<polygon points="{" ".join(pts)}" fill="none" stroke-width="3.2" stroke-linejoin="round"/>'

def seeds(n=16, size=120, seed=5):
    rnd = random.Random(seed); out = ''
    for _ in range(n):
        x, y, a = rnd.uniform(0, size), rnd.uniform(0, size), rnd.uniform(0, 180)
        for ox in (-size, 0, size):
            for oy in (-size, 0, size):
                out += f'<ellipse cx="{x+ox:.1f}" cy="{y+oy:.1f}" rx="5.5" ry="2.8" transform="rotate({a:.0f} {x+ox:.1f} {y+oy:.1f})"/>'
    return out

def sunburst(bg, fg, cx=760, cy=1150, n=28):
    body = ''
    for i in range(0, n, 2):
        a1, a2 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        body += f'<path d="M{cx} {cy}L{cx+2400*math.cos(a1):.0f} {cy+2400*math.sin(a1):.0f}L{cx+2400*math.cos(a2):.0f} {cy+2400*math.sin(a2):.0f}Z"/>'
    return tex(bg, fg, body, 1080, 1350)

T = {
  'mouchete': ('Moucheté', tex(C['citron'], mix(C['citron'], C['encre'], .16), '<rect width="140" height="140"/>', 140, sparse=True)),
  'trame':    ('Trame de points', tex(C['menthe'], mix(C['menthe'], C['encre'], .13), '<circle cx="6" cy="6" r="4.6"/><circle cx="18" cy="18" r="4.6"/>', 24)),
  'etal':     ("Rayures d'étal", tex(C['tomate'], mix(C['tomate'], C['creme'], .16), '<rect x="0" y="0" width="22" height="44"/>', 44)),
  'zellige':  ('Zellige', tex(C['aubergine'], mix(C['aubergine'], C['creme'], .13),
               star(40, 40, 22) + ''.join(star(x, y, 22) for x in (0, 80) for y in (0, 80))
               + ''.join(f'<rect x="{x-4}" y="{y-4}" width="8" height="8" transform="rotate(45 {x} {y})"/>' for x, y in ((0, 40), (40, 0), (80, 40), (40, 80))), 80)),
  'vagues':   ('Vagues', tex(C['myrtille'], mix(C['myrtille'], C['creme'], .17), '<path d="M-5 16Q5 4 15 16T35 16T55 16T75 16T95 16" fill="none" stroke-width="5" stroke-linecap="round"/>', 80, 32)),
  'graines':  ('Graines semées', tex(C['framboise'], mix(C['framboise'], C['encre'], .12), seeds(), 120)),
  'damier':   ('Damier', tex(C['figue'], mix(C['figue'], C['creme'], .2), '<rect width="24" height="24"/><rect x="24" y="24" width="24" height="24"/>', 48)),
  'carnet':   ('Carnet de courses', tex(C['creme'], mix(C['creme'], C['encre'], .12), '<path d="M0 .75H32M.75 0V32" fill="none" stroke-width="1.5"/>', 32)),
}
RAYONS = sunburst(C['citron'], mix(C['citron'], C['tomate'], .14))

# ---------- Stickers Bayen (SVG) : « vrai sticker » (découpe blanche, ombre, reflet) ou riso (2e encre décalée, grain) ----------
def sticker(vb, sil, inner, mode, ink2=C['citron'], b=50, cls='stk', grain='grain-light'):
    if mode == 'flat':  # dessin exact, découpe blanche seule (référence pour Codex)
        return f'<svg class="{cls}" viewBox="{vb}">{sil("#FFFFFF", "#FFFFFF", 2*b)}{inner}</svg>'
    if mode == 'cut':
        return (f'<svg class="{cls}" viewBox="{vb}"><g filter="url(#st-sh)">{sil("#FFFFFF", "#FFFFFF", 2*b)}</g>{inner}'
                f'{sil("url(#gloss)", "url(#gloss)", 2*b)}</svg>')
    return (f'<svg class="{cls}" viewBox="{vb}"><g transform="translate(16 14)" filter="url(#grain-soft)">{sil(ink2, ink2, 1)}</g>'
            f'{sil(C["creme"], C["creme"], 1)}<g filter="url(#{grain})">{inner}</g></svg>')

WT = 'translate(70 230) rotate(-6 70 230) scale(.25) translate(27 770)'
def st_wordmark(mode):
    sil = lambda f, s, w: (f'<g transform="{WT}"><use href="#W" fill="{f}" stroke="{s}" stroke-width="{w*4}" stroke-linejoin="round"/>'
                           f'<use href="#W" fill="{f}" stroke="{s}" stroke-width="{w*4}" stroke-linejoin="round" transform="translate(60 72)"/></g>')
    inner = (f'<g transform="{WT}"><use href="#W" fill="{C["encre"]}" stroke="{C["encre"]}" stroke-width="30" stroke-linejoin="round" transform="translate(60 72)"/>'
             f'<use href="#W" fill="{C["menthe"]}" stroke="{C["encre"]}" stroke-width="30" stroke-linejoin="round" paint-order="stroke"/></g>')
    return sticker('-10 50 1140 520', sil, inner, mode, ink2=C['framboise'])

def st_sigle(mode, bg=C['menthe']):
    sil = lambda f, s, w: f'<circle cx="300" cy="300" r="{236 if w > 1 else 236}" fill="{f}" stroke="{s}" stroke-width="{w}"/>'
    inner = (f'<circle cx="300" cy="300" r="230" fill="{bg}" stroke="{C["encre"]}" stroke-width="12"/>'
             f'<g transform="translate(300 312) scale(.42) translate(-384 376)"><use href="#S" fill="{C["creme"]}" stroke="{C["encre"]}" stroke-width="40" stroke-linejoin="round" paint-order="stroke"/></g>')
    return sticker('-20 -20 640 670', sil, inner, mode)

def st_plu(mode, ring=C['menthe'], fill=C['creme'], line="C'EST CLAIR · BAYEN.MA", center=None):
    g = 'rotate(-10 330 220)'
    sil = lambda f, s, w: f'<ellipse cx="330" cy="220" rx="290" ry="180" transform="{g}" fill="{f}" stroke="{s}" stroke-width="{w}"/>'
    inner = (f'<g transform="{g}"><ellipse cx="330" cy="220" rx="290" ry="180" fill="{fill}" stroke="{C["encre"]}" stroke-width="12"/>'
             f'<ellipse cx="330" cy="220" rx="256" ry="148" fill="none" stroke="{ring}" stroke-width="22"/>'
             + (center or f'<g transform="translate(330 205) scale(.088) translate(-1888 255)"><use href="#W" fill="{C["encre"]}"/></g>') +
             f'<text x="330" y="292" text-anchor="middle" font-family="Readex Pro" font-weight="600" font-size="25" letter-spacing="3" fill="{C["encre"]}">{line}</text></g>')
    return sticker('-40 -50 740 560', sil, inner, mode)

E171 = '<text x="330" y="250" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="120" letter-spacing="-4" fill="#1B1B1B">E171</text>'
def st_e171(mode): return st_plu(mode, ring=C['tomate'], fill=C['citron'], line='ADDITIF · DIOXYDE DE TITANE', center=E171)

def st_score(mode, value='100', word='EXCELLENT', fill=C['menthe']):
    """Pastille de score (chiffre + mot), comme .score-sticker du site."""
    sil = lambda f, s, w: f'<circle cx="260" cy="260" r="206" fill="{f}" stroke="{s}" stroke-width="{w}"/>'
    inner = (f'<circle cx="260" cy="260" r="200" fill="{fill}" stroke="{C["encre"]}" stroke-width="12"/>'
             f'<text x="260" y="292" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="{148 if len(value) > 2 else 170}" letter-spacing="-6" fill="{C["encre"]}">{value}</text>'
             f'<text x="260" y="352" text-anchor="middle" font-family="Readex Pro" font-weight="600" font-size="34" letter-spacing="5" fill="{C["encre"]}">{word}</text>')
    return sticker('-30 -30 590 620', sil, inner, mode, ink2=C['figue'], grain='grain-faint')

def st_pill(text, bg, mode, w=560, h=190, rot=6, size=92, font='Readex Pro', weight=600, rtl=False, ink2=C['framboise']):
    g = f'rotate({rot} {w/2} {h/2})'; dr = 'direction="rtl"' if rtl else ''
    sil = lambda f, s, ww: f'<rect width="{w}" height="{h}" rx="{h/2}" transform="{g}" fill="{f}" stroke="{s}" stroke-width="{ww}"/>'
    inner = (f'<g transform="{g}"><rect width="{w}" height="{h}" rx="{h/2}" fill="{bg}" stroke="{C["encre"]}" stroke-width="12"/>'
             f'<text x="{w/2}" y="{h/2 + size*.36}" text-anchor="middle" {dr} font-family="{font}" font-weight="{weight}" font-size="{size}" fill="{C["encre"]}">{text}</text></g>')
    m = 90
    return sticker(f'{-m} {-m-40} {w+2*m} {h+2*m+80}', sil, inner, mode, ink2=ink2)

def st_barcode(mode):
    rnd = random.Random(4); x = 56; bars = ''
    while x < 400:
        bw = rnd.choice([5, 5, 9, 13]); bars += f'<rect x="{x}" y="52" width="{bw}" height="150" rx="2.5"/>'; x += bw + rnd.choice([6, 6, 10])
    g = 'rotate(-5 230 150)'
    sil = lambda f, s, w: f'<rect width="460" height="300" rx="40" transform="{g}" fill="{f}" stroke="{s}" stroke-width="{w}"/>'
    inner = (f'<g transform="{g}"><rect width="460" height="300" rx="40" fill="{C["creme"]}" stroke="{C["encre"]}" stroke-width="12"/>'
             f'<g fill="{C["encre"]}">{bars}</g><text x="230" y="254" text-anchor="middle" font-family="Readex Pro" font-weight="600" font-size="27" letter-spacing="3" fill="{C["encre"]}">SCANNÉ SUR BAYEN</text></g>')
    return sticker('-70 -90 600 500', sil, inner, mode, ink2=C['menthe'])

def stickers_row(mode):
    return ''.join(f'<figure>{s}</figure>' for s in (
        st_wordmark(mode), st_sigle(mode), st_plu(mode), st_score(mode),
        st_pill('واضح وباين', C['citron'], mode, rtl=True), st_barcode(mode)))

def nn(name, size=(360, 540)):
    return img_uri(ROOT / 'social/stickers' / f'naanaa-{name}.png', size)

# ---------- Appareils avec les vraies captures ----------
ECR = ROOT / 'social/ecrans'
def shot(name, w=540): return img_uri(ECR / f'{name}.png', (w, 2000), 'RGB')
def tel(name, style): return f'<div class="dev tel" style="{style}"><img src="{shot(name)}" alt=""></div>'
def tab(name, style): return f'<div class="dev tab" style="{style}"><img src="{shot(name, 900)}" alt=""></div>'
def pc(name, style): return f'<div class="dev pc" style="{style}"><img src="{shot(name, 1100)}" alt=""></div>'

def photo_crop(path, cx, cy, h):  # recadrage 1/(0,66*1,25) autour du téléphone
    w = round(h / (.66 * 1.25)); return img_uri(path, (760, 760), 'RGB', (cx - w // 2, cy - h // 2, cx + w - w // 2, cy + h - h // 2))
def riso(pose, size=(520, 780)): return img_uri(ROOT / 'naanaa-v2/riso' / f'naanaa-{pose}.png', size)
