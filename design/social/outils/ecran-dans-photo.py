"""Pose une capture RÉELLE de bayen.ma dans l'écran vierge d'une photo (perspective + ombrage de la photo).
   python3 ecran-dans-photo.py           → incruste (sorties listées dans JOBS)
   python3 ecran-dans-photo.py mesure    → proportions de chaque écran (hauteur de capture à 390 px de large)
Les coins de l'écran sont détectés sur la couleur unie de l'écran vierge ; la capture doit avoir les mêmes
proportions que l'écran (voir les captures photo-* dans captures.mjs)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

R = Path(__file__).resolve().parents[3]
PUB, ECR, SOC = R / 'frontend/public', R / 'design/social/ecrans', R / 'design/social/photos-ecran'
V = SOC / 'vierges'  # photos d'origine à l'écran vide (sources, jamais écrasées)
# photo vierge, capture, zone de recherche de l'écran (x0, y0, x1, y1), tolérance couleur, sortie
JOBS = [
    (V / 'scan.jpg', 'photo-scan', (650, 200, 1060, 760), 40, SOC / 'scan-ecran.jpg'),
    (V / 'a-propos.jpg', 'photo-panier', (860, 385, 1040, 680), 25, PUB / 'hero/a-propos.jpg'),
    (V / 'bayen-est-en-ligne.webp', 'photo-en-ligne', (760, 110, 1000, 450), 40, PUB / 'blog/covers/bayen-est-en-ligne.webp'),
    (V / 'le-reflexe-bayen.webp', 'photo-reflexe', (800, 140, 1120, 560), 40, PUB / 'blog/covers/le-reflexe-bayen.webp'),
    (V / 'fallback-actualites.jpg', 'photo-actualites', (540, 215, 670, 462), 40, PUB / 'blog/fallback-actualites.jpg'),
]
# Photos Codex (écran magenta) : photo, capture, sortie
C = R / 'design/social/photos-codex'
JOBS += [(C / f'{k}.png', cap, None, None, SOC / f'{k}.jpg') for k, cap in [
    ('F1-scan', 'photo-F1'), ('F2-beaute', 'photo-F2'), ('F3-proteines', 'photo-F3'), ('F4-comparer', 'photo-F4'),
    ('F5-repas', 'photo-F5'), ('F6-courses', 'photo-F6'), ('F7-tablette', 'photo-F7'), ('F8-ordinateur', 'photo-F8')]]
# Variantes du lot 2 : même photo, autre écran (fiche couscous, interface en darija)
JOBS += [(C / f'{k}.png', cap, None, None, SOC / f'{k}-{suffixe}.jpg') for k, cap, suffixe in [
    ('F7-tablette', 'photo-F7-couscous', 'couscous'), ('F5-repas', 'photo-F5-ar', 'ar'), ('F2-beaute', 'photo-F2-ar', 'ar')]]

def extent(v):
    """Bornes du bloc dense le plus long (ignore les traits fins de même couleur, ex. le fil menthe)."""
    h, e = np.histogram(v, bins=np.arange(v.min(), v.max() + 2, 1))
    ok = np.nonzero(h > 0.35 * np.median(h[h > 0]))[0]
    run = max(np.split(ok, np.nonzero(np.diff(ok) > 2)[0] + 1), key=len)
    return e[run[0]], e[run[-1] + 1]

def screen_quad(im, box, tol):
    x0, y0, x1, y1 = box; sub = im[y0:y1, x0:x1]
    cy, cx = (y1 - y0) // 2, (x1 - x0) // 2
    ref = np.median(sub[cy - 15:cy + 15, cx - 10:cx + 10].reshape(-1, 3), axis=0)
    full = np.zeros(im.shape[:2], bool); full[y0:y1, x0:x1] = np.abs(sub - ref).sum(2) < tol
    ys, xs = np.nonzero(full); P = np.stack([xs, ys], 1).astype(float); c = P.mean(0)
    for _ in range(3):  # rectangle orienté par ACP, recentré sur le bloc dense
        a = np.linalg.svd(P - c, full_matrices=False)[2][0]; b = np.array([-a[1], a[0]])
        la, ha = extent((P - c) @ a); lb, hb = extent((P - c) @ b)
        P = P[((P - c) @ a >= la) & ((P - c) @ a <= ha) & ((P - c) @ b >= lb) & ((P - c) @ b <= hb)]
        c = c + a * (la + ha) / 2 + b * (lb + hb) / 2
    up = a if a[1] < 0 else -a; right = np.array([-up[1], up[0]]); right = right if right[0] > 0 else -right
    L, W = ha - la, hb - lb
    return [c + up * L / 2 - right * W / 2, c + up * L / 2 + right * W / 2, c - up * L / 2 + right * W / 2, c - up * L / 2 - right * W / 2], full, ref

def magenta_quad(im):
    """Écran magenta (photos Codex) : coins par les extrêmes diagonaux, puis chaque bord ajusté en droite
    sur sa partie centrale (les coins arrondis ne faussent pas l'angle) ; marche aussi en perspective."""
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    scr = (R > 170) & (B > 170) & (G < 110) & (np.abs(R - B) < 70)
    img = Image.fromarray((scr * 255).astype('uint8'))
    edge = np.asarray(img).astype(bool) & ~np.asarray(img.filter(ImageFilter.MinFilter(3))).astype(bool)
    ys, xs = np.nonzero(edge); P = np.stack([xs, ys], 1).astype(float)
    s, d = P.sum(1), P[:, 0] - P[:, 1]
    c0 = [P[s.argmin()], P[d.argmax()], P[s.argmax()], P[d.argmin()]]  # haut-gauche, haut-droite, bas-droite, bas-gauche
    lines = []
    for i in range(4):
        a, b = c0[i], c0[(i + 1) % 4]; v = b - a; L = np.hypot(*v); u = v / L; n = np.array([-u[1], u[0]])
        t, dist = (P - a) @ u, np.abs((P - a) @ n)
        pts = P[(t > .2 * L) & (t < .8 * L) & (dist < 12)]
        if len(pts) < .2 * L:  # bord en partie masqué (doigts) : droite parallèle à la corde, au point visible le plus éloigné
            out = n if (P.mean(0) - a) @ n < 0 else -n
            lines.append((a + out * max(0., np.percentile((P - a) @ out, 99.5)), u)); continue
        c = pts.mean(0); dirv = np.linalg.svd(pts - c, full_matrices=False)[2][0]
        lines.append((c, dirv))
    def cross(l1, l2):
        (p1, d1), (p2, d2) = l1, l2
        t = np.linalg.solve(np.array([d1, -d2]).T, p2 - p1); return p1 + t[0] * d1
    quad = [cross(lines[(i - 1) % 4], lines[i]) for i in range(4)]
    return quad, scr, np.array([250., 3., 252.])

def coeffs(dst, src):
    """Coefficients PERSPECTIVE de PIL : point de sortie (dst) → point source (src)."""
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A += [[x, y, 1, 0, 0, 0, -u * x, -u * y], [0, 0, 0, x, y, 1, -v * x, -v * y]]; B += [u, v]
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()

def side(q, i, j): return float(np.hypot(*(q[i] - q[j])))

def incruste(photo, cap, box, tol, out):
    img = Image.open(photo).convert('RGB'); im = np.asarray(img).astype(int)
    quad, scr, ref = magenta_quad(im) if box is None else screen_quad(im, box, tol)
    # Réduite d'abord à la taille de l'écran dans la photo (la déformation seule crénelle le texte)
    shot = Image.open(ECR / f'{cap}.png').convert('RGB')
    shot = shot.resize((round(side(quad, 0, 1) * 1.5), round(side(quad, 1, 2) * 1.5)), Image.LANCZOS); w, h = shot.size
    k = coeffs([tuple(p) for p in quad], [(0, 0), (w, 0), (w, h), (0, h)])
    warped = shot.transform(img.size, Image.PERSPECTIVE, k, Image.BICUBIC)
    warped = np.asarray(warped).astype(float)
    if box is None:
        # Écran magenta : la forme EXACTE de l'écran de l'appareil (ses vrais coins) sert de masque.
        # Chaque pixel = a·magenta + (1-a)·contour ; on remplace la part magenta par la capture.
        # Part de magenta = écart rouge/bleu au-dessus du vert (exact pour un mélange magenta + contour neutre)
        mag = np.array([250., 3., 252.])
        a = np.clip(np.minimum(im[..., 0] - im[..., 1], im[..., 2] - im[..., 1]) / 247, 0, 1)
        zone = Image.new('L', img.size, 0); ImageDraw.Draw(zone).polygon([tuple(p) for p in quad], fill=255)
        zone = np.asarray(zone.filter(ImageFilter.MaxFilter(9))) > 0   # contour de l'écran, élargi de 4 px
        a = np.where(zone & (a > .12), a, 0)[..., None]
        lum = np.clip(im.mean(2) / mag.mean(), .9, 1.03)[..., None]
        out_px = np.where(a > .97, warped * lum, im + a * (warped - mag))
    else:
        rr = Image.new('L', (w, h), 0); ImageDraw.Draw(rr).rounded_rectangle((0, 0, w - 1, h - 1), radius=int(min(w, h) * .11), fill=255)
        mask = np.asarray(rr.transform(img.size, Image.PERSPECTIVE, k, Image.BICUBIC)).astype(float) / 255
        # Jamais sur le contour du téléphone ni sur la main : seulement là où l'écran vierge était visible
        keep = np.asarray(Image.fromarray((scr * 255).astype('uint8')).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1))).astype(float) / 255
        m = (mask * keep)[..., None]
        # Ombrage de la photo conservé (léger reflet, ombre de la main)
        shade = np.clip(im.mean(2) / ref.mean(), .88, 1.04)[..., None]
        out_px = im * (1 - m) + warped * shade * m
    res = Image.fromarray(np.clip(out_px, 0, 255).astype('uint8'))
    out.parent.mkdir(parents=True, exist_ok=True)
    res.save(out, quality=90) if out.suffix != '.webp' else res.save(out, quality=86)
    return quad

if __name__ == '__main__':
    for photo, cap, box, tol, out in JOBS:
        if sys.argv[1:] == ['mesure']:
            im = np.asarray(Image.open(photo).convert('RGB')).astype(int)
            q = (magenta_quad(im) if box is None else screen_quad(im, box, tol))[0]
            print(cap, 'largeur/hauteur :', round(side(q, 0, 1) / side(q, 1, 2), 4), 'hauteur à 390 px :', round(390 * side(q, 1, 2) / side(q, 0, 1)), [tuple(round(x) for x in p) for p in q])
        elif sys.argv[1:] and cap not in sys.argv[1:]:
            continue
        else:
            print('ok', out.name, [tuple(round(x) for x in p) for p in incruste(photo, cap, box, tol, out)])
