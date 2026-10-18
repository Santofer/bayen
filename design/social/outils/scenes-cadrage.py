"""Famille 1 : même cadrage pour toutes les scènes riso (même bande verticale pour l'illustration,
le bas reste libre pour le texte du template).  python3 scenes-cadrage.py → design/social/scenes/*.png"""
from pathlib import Path
from PIL import Image
import numpy as np

D = Path(__file__).resolve().parents[1]
SCENES = ['s1-marche-scan', 's2-frigo-sucre', 's3-salle-de-bain', 's4-ftour', 's5-comparer', 's6-cercle-vertueux', 's7-partenariat', 's8-repas-photo',
          's9-cest-clair', 's10-deux-univers', 's11-score', 's12-promesse', 's13-langues', 's14-surprise']  # semaine de présentation
BAS, HAUT = .60, .56   # bas de l'illustration à 60 % de la hauteur, illustration haute de 56 %

for k in SCENES:
    if not (D / f'{k}.png').exists(): print(k, 'absente'); continue
    src = Image.open(D / f'{k}.png').convert('RGB'); W, H = src.size; im = np.asarray(src)
    bg = np.median(im[int(H * .93):].reshape(-1, 3), 0)
    diff = np.abs(im.astype(int) - bg).sum(2) > 60
    rows, cols = np.nonzero(diff.mean(1) > .02)[0], np.nonzero(diff.mean(0) > .02)[0]
    t, b, x0, x1 = rows.min(), rows.max(), cols.min(), cols.max()
    pleine = diff[:5].mean() > .3  # décor qui touche le haut (marché) : on ne fait que le recaler
    s = 1.0 if pleine else min(HAUT * H / (b - t), .96 * W / (x1 - x0), 1.08)
    sc = src.resize((round(W * s), round(H * s)), Image.LANCZOS)
    cx = (x0 + x1) / 2; ox = round(cx - cx * s); oy = round(BAS * H - b * s)  # mise à l'échelle autour du centre du dessin
    # fond prolongé en miroir (le grain riso reste continu)
    P = 600; big = np.pad(np.asarray(sc), ((P, P), (P, P), (0, 0)), mode='reflect')
    out = big[P - oy:P - oy + H, P - ox:P - ox + W]
    Image.fromarray(out).save(D / 'scenes' / f'{k}.png')
    print(k, f'échelle {s:.3f}', f'décalage {ox},{oy}', 'plein cadre' if pleine else '')
