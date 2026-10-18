"""Images OG du site (1200×630), dans la famille « scène sur aplat » des réseaux : l'illustration riso à droite sur sa
propre couleur (grain compris), rubrique + titre + sous-titre + logo à gauche. JPEG < 300 Ko (aperçus WhatsApp).
   python3 og.py   → frontend/public/og/<page>.jpg (+ og-default.png, repli historique)
Correspondance chemin → image : frontend/src/components/SeoHead.astro (OG_PAGES)."""
import base64, io, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

D = Path(__file__).resolve().parent
SOC = D.parent
PUB = SOC.parents[1] / 'frontend' / 'public'
OUT = PUB / 'og'; OUT.mkdir(exist_ok=True)
LOGO = (SOC.parent / 'logo' / 'bayen-wordmark-cuillere.svg').read_text().replace('fill="currentColor"', 'fill="#1B1B1B"')
W, H = 1200, 630

# nom → (scène, rubrique, titre, sous-titre)
CARTES = {
    'default': ('s9-cest-clair', 'bayen.ma', 'Scanne. C\u2019est clair.', 'Le score des produits alimentaires et cosmétiques vendus au Maroc.'),
    'beaute': ('s3-salle-de-bain', 'Beauté', 'Ta crème, décodée.', 'Chaque ingrédient comparé aux listes officielles européennes.'),
    'proteines': ('s15-proteines', 'Protéines', 'Plus de protéines, moins de sucre.', 'Les produits riches en protéines, classés par score.'),
    'repas': ('s8-repas-photo', 'Repas', 'Ton plat en photo.', 'Calories et macros estimées, en fourchette.'),
    'comparer': ('s5-comparer', 'Comparer', 'Deux produits, un verdict.', 'Score, sucre, sel, additifs : côte à côte.'),
    'classement': ('s11-score', 'Classement', 'Les produits les mieux notés.', 'Rayon par rayon, selon le score Bayen.'),
    'methodologie': ('s12-promesse', 'Méthodologie', 'Un score qui ne s\u2019achète pas.', 'Nutri-Score, transformation et additifs : la méthode, en clair.'),
    'partenaires': ('s7-partenariat', 'Marques', 'Vos produits, en clair.', 'Corrigez et complétez les fiches de vos produits.'),
    'additifs': ('s16-additifs', 'Additifs', 'Les additifs, expliqués.', 'Ce que cache chaque code E, avec ses sources.'),
    'journal': ('s17-journal', 'Le journal', 'Mieux lire ses étiquettes.', 'Conseils et décryptages, en français et en darija.'),
    'contribuer': ('s6-cercle-vertueux', 'Participatif', 'Ajoute un produit.', 'Photographie l’étiquette : la fiche profite à tout le monde.'),
    'a-propos': ('s13-langues', 'À propos', 'Bayen, c’est clair.', 'Une initiative citoyenne, gratuite, en français et en darija.'),
    'rayons': ('s10-deux-univers', 'Rayons', 'Rayon par rayon.', 'Alimentation et beauté, notées au Maroc.'),
}


def visuel(scene):
    """Fond 1200×630 au grain de la scène (son bas, en miroir) et illustration fondue sur la droite."""
    im = np.asarray(Image.open(SOC / f'{scene}.png').convert('RGB'))
    h, w = im.shape[:2]
    bg = np.median(im[int(h * .93):].reshape(-1, 3), 0)
    diff = np.abs(im.astype(int) - bg).sum(2) > 60
    rows, cols = np.nonzero(diff.mean(1) > .02)[0], np.nonzero(diff.mean(0) > .02)[0]  # même seuil que le cadrage des scènes
    m = 36
    t, b, x0, x1 = max(0, rows.min() - m), min(h, rows.max() + m), max(0, cols.min() - m), min(w, cols.max() + m)
    bande = im[int(h * .66):]
    fond = np.pad(bande, ((0, max(0, H - bande.shape[0])), (0, max(0, W - bande.shape[1])), (0, 0)), mode='reflect')[:H, :W]
    carte = Image.fromarray(fond)
    v = Image.fromarray(im[t:b, x0:x1])
    s = min(570 / v.height, 500 / v.width)
    v = v.resize((round(v.width * s), round(v.height * s)), Image.LANCZOS)
    masque = Image.new('L', v.size, 0)
    masque.paste(255, (24, 24, v.width - 24, v.height - 24))
    masque = masque.filter(ImageFilter.GaussianBlur(14))  # bords fondus : pas de rectangle visible
    carte.paste(v, (W - 30 - v.width, (H - v.height) // 2), masque)
    b64 = io.BytesIO(); carte.save(b64, 'PNG')
    return 'data:image/png;base64,' + base64.b64encode(b64.getvalue()).decode()


CSS = '''* { box-sizing: border-box } body { margin: 0; background: #888 }
.og { position: relative; width: 1200px; height: 630px; overflow: hidden; background-size: cover; font-family: 'Readex Pro', sans-serif; color: #1B1B1B }
.txt { position: absolute; left: 64px; top: 70px; width: 580px; display: grid; gap: 22px; align-content: start }
.chip { justify-self: start; font: 600 26px/1 'Readex Pro', sans-serif; background: #FFF8EC; border: 4px solid #1B1B1B; border-radius: 999px;
        padding: 10px 24px; box-shadow: 5px 5px 0 #1B1B1B }
h1 { margin: 0; font: 800 60px/1.04 'Unbounded', sans-serif; letter-spacing: -.03em; text-wrap: balance }
p { margin: 0; font: 600 27px/1.3 'Readex Pro', sans-serif; max-width: 540px }
.logo { position: absolute; left: 64px; bottom: 54px; width: 210px } .logo svg { display: block; width: 100%; height: auto }'''

cartes = {k: (visuel(sc) if (SOC / f'{sc}.png').exists() else None, rub, ti, st) for k, (sc, rub, ti, st) in CARTES.items()}
manquantes = [k for k, v in cartes.items() if v[0] is None]
html = ('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800'
        '&family=Readex+Pro:wght@600&display=swap"><style>' + CSS + '</style>'
        + ''.join(f'<div class="og" id="{k}" style="background-image:url({img})"><div class="txt"><span class="chip">{rub}</span>'
                  f'<h1>{ti}</h1><p>{st}</p></div><div class="logo">{LOGO}</div></div>'
                  for k, (img, rub, ti, st) in cartes.items() if img))
(D / 'og.html').write_text(html)
js = f"""const {{ chromium }} = require(process.env.PW || '/Users/amine/Code/karakeep/node_modules/playwright')
;(async () => {{ const b = await chromium.launch(); const p = await b.newPage({{ viewport: {{ width: 1200, height: 630 }} }})
  await p.goto('file://{D}/og.html', {{ waitUntil: 'networkidle' }}); await p.waitForTimeout(1200)
  for (const el of await p.$$('.og')) await el.screenshot({{ path: '{D}/' + (await el.getAttribute('id')) + '.png' }})
  await b.close() }})()"""
(D / 'rendu.cjs').write_text(js)
subprocess.run(['node', str(D / 'rendu.cjs')], check=True)
for k in cartes:
    if k in manquantes: continue
    im = Image.open(D / f'{k}.png').convert('RGB')
    im.save(OUT / f'{k}.jpg', 'JPEG', quality=84, optimize=True, progressive=True)
    if k == 'default': im.save(PUB / 'og-default.png', optimize=True)
    (D / f'{k}.png').unlink()
    print(k, (OUT / f'{k}.jpg').stat().st_size // 1024, 'Ko')
if manquantes: print('scènes absentes :', manquantes)
