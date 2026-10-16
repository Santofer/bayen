"""Déclinaisons riso calculées (pas de génération d'image) :
 - motif du pied de page en ton sur ton (aubergine sur aubergine) à partir de design/riso-ui/p1-footer-aubergine.png ;
 - stickers Naânaa : « vrai sticker » (découpe blanche + ombre) et « riso » (contre-forme citron décalée, grain).
   python3 riso-assets.py"""
from pathlib import Path
from PIL import Image, ImageFilter, ImageChops
import numpy as np

R = Path(__file__).resolve().parents[3] / 'design'
hexrgb = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], float)

# 1 · Ton sur ton : le dessin ne garde que sa valeur (clair → aubergine clair, trait → aubergine sombre)
src = np.asarray(Image.open(R / 'riso-ui/p1-footer-aubergine.png').convert('RGB')).astype(float)
bg_src = np.median(src.reshape(-1, 3), 0)
lum = src @ [.299, .587, .114]; t = np.clip((lum - bg_src @ [.299, .587, .114]) / 110, -1, 1)[..., None]
alpha = np.clip(np.abs(src - bg_src).sum(2) / 70, 0, 1)[..., None]
BG = hexrgb('#3B1F5C')
for name, light, dark in [('doux', '#4A2A70', '#301849'), ('marque', '#583583', '#2A1340')]:
    d = np.where(t > 0, t * (hexrgb(light) - BG), -t * (hexrgb(dark) - BG))
    Image.fromarray(np.clip(BG + alpha * d, 0, 255).astype('uint8')).save(R / f'riso-ui/p1-ton-sur-ton-{name}.png')

# 2 · Stickers Naânaa
def dilate(m, r):
    for _ in range(r // 3): m = m.filter(ImageFilter.MaxFilter(7))
    return m.filter(ImageFilter.GaussianBlur(r / 4)).point(lambda v: 255 if v > 110 else 0)

rng = np.random.default_rng(7)
for pose in ['salut', 'bravo', 'scan', 'astuce', 'loupe', 'oups', 'courses', 'nuit']:
    n = Image.open(R / f'naanaa-v2/riso/naanaa-{pose}.png').convert('RGBA'); n.thumbnail((520, 780))
    pad = 60; W, H = n.width + 2 * pad, n.height + 2 * pad
    body = Image.new('L', (W, H), 0); body.paste(n.getchannel('A').point(lambda v: 255 if v > 40 else 0), (pad, pad))
    # Vrai sticker : découpe blanche, ombre douce portée, léger reflet
    cut = dilate(body, 18)
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0)); sh = cut.filter(ImageFilter.GaussianBlur(9)).point(lambda v: v * .38)
    shadow.paste((27, 27, 27, 255), (7, 12), sh)
    out = Image.alpha_composite(shadow, Image.merge('RGBA', (*[Image.new('L', (W, H), 255)] * 3, cut)))
    out.alpha_composite(n, (pad, pad))
    gloss = Image.linear_gradient('L').rotate(-35, expand=False).resize((W, H)).point(lambda v: max(0, 70 - v) )
    out.paste((255, 255, 255), (0, 0), ImageChops.multiply(gloss, cut))
    out.save(R / f'social/stickers/naanaa-{pose}-sticker.png')
    # Riso : contre-forme citron décalée, criblée de grain (l'encre ne couvre pas partout)
    halo = dilate(body, 9)
    grain = Image.fromarray((rng.random((H, W)) > .12).astype('uint8') * 255).filter(ImageFilter.GaussianBlur(.6))
    riso = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    riso.paste((255, 212, 59, 255), (16, 14), ImageChops.multiply(halo, grain))
    riso.alpha_composite(n, (pad, pad))
    riso.save(R / f'social/stickers/naanaa-{pose}-riso.png')
print('ok')
