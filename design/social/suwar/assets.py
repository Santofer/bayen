"""Prépare et téléverse dans Suwar (projet Bayen) les images des templates :
fonds texturés (post 1080×1350 et story 1080×1920), stickers riso, Naânaa riso, scènes, illustrations
plein écran et photos à écran réel. Les URL obtenues sont gardées dans uploads.json (un fichier déjà
envoyé n'est pas renvoyé).   python3 assets.py
Rendu des SVG (stickers, textures) par Playwright, emprunté à ~/Code/karakeep (variable PW)."""
import base64, io, json, os, subprocess, sys
from pathlib import Path
from PIL import Image
D = Path(__file__).resolve().parent
sys.path.insert(0, str(D.parent / 'outils'))
from riso import C, T, RAYONS, ROOT, FILTERS, tex, star, mix, st_pill, st_plu, st_e171, st_wordmark, st_barcode, st_score  # noqa: E402
from suwar import call, PROJET  # noqa: E402

SOC, OUT = ROOT / 'social', D / 'assets'
OUT.mkdir(exist_ok=True)
CACHE = D / 'uploads.json'
uploads = json.loads(CACHE.read_text()) if CACHE.exists() else {}

# ---------- 1. Stickers riso et fonds texturés, rendus par le navigateur ----------
code = lambda c, ligne, ring, fill: (lambda m: st_plu(m, ring=ring, fill=fill, line=ligne, center=f'<text x="330" y="250" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="120" letter-spacing="-4" fill="#1B1B1B">{c}</text>'))
STICKERS = {
    'vrai': st_pill('VRAI', C['menthe'], 'riso', w=420, h=170, rot=-8, size=88, font='Unbounded', weight=800),
    'faux': st_pill('FAUX', C['tomate'], 'riso', w=420, h=170, rot=7, size=88, font='Unbounded', weight=800),
    'sahih': st_pill('صحيح', C['menthe'], 'riso', w=420, h=170, rot=-8, size=96, rtl=True),
    'ghalet': st_pill('غالط', C['tomate'], 'riso', w=420, h=170, rot=7, size=96, rtl=True),
    'e171': st_e171('riso'), 'e300': code('E300', 'ADDITIF · VITAMINE C', C['menthe'], C['citron'])('riso'),
    'wordmark': st_wordmark('riso'), 'scanne': st_barcode('riso'),
    'score-90': st_score('riso', '90'), 'score-100': st_score('riso', '100'),
}
ZELLIGE_TOMATE = tex(C['tomate'], mix(C['tomate'], C['encre'], .12), star(40, 40, 22) + ''.join(star(x, y, 22) for x in (0, 80) for y in (0, 80)), 80)
# nom → (image du carreau, taille CSS du carreau, couleur de fond). Tailles = multiples ENTIERS du carreau SVG :
# une taille fractionnaire (ex. 173 px pour 80) laisse un interstice d'1 px entre deux répétitions (ligne verticale).
FONDS = {
    'trame': (T['trame'][1], '72px', C['menthe']), 'damier': (T['damier'][1], '96px', C['figue']),
    'vagues': (T['vagues'][1], '160px 64px', C['myrtille']), 'graines': (T['graines'][1], '240px', C['framboise']),
    'zellige': (T['zellige'][1], '160px', C['aubergine']), 'fete': (ZELLIGE_TOMATE, '160px', C['tomate']),
    'rayons': (RAYONS, 'cover', C['citron']),
}
page = ('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=Readex+Pro:wght@400;600;700&display=swap">'
        '<style>body{margin:0;background:transparent}.s{width:900px;padding:20px}.s svg{width:100%;height:auto;display:block;overflow:visible}.f{background-position:70% 80%}</style>' + FILTERS
        + ''.join(f'<div class="s" id="stk-{k}">{v}</div>' for k, v in STICKERS.items())
        + ''.join(f'<div class="f" id="fond-{k}-{h}" style="width:1080px;height:{h}px;background:{bg} url({u}) {"70% 80%" if s == "cover" else "0 0"}/{s} repeat"></div>'
                  for k, (u, s, bg) in FONDS.items() for h in (1350, 1920)))
(OUT / 'page.html').write_text(page)
js = f"""const {{ chromium }} = require(process.env.PW || '/Users/amine/Code/karakeep/node_modules/playwright')
;(async () => {{ const b = await chromium.launch(); const p = await b.newPage({{ viewport: {{ width: 1100, height: 1000 }} }})
  await p.goto('file://{OUT}/page.html', {{ waitUntil: 'networkidle' }}); await p.waitForTimeout(1200)
  for (const el of await p.$$('.s, .f')) {{ const id = await el.getAttribute('id')
    if (id.startsWith('stk-')) await (await el.$('svg')).screenshot({{ path: '{OUT}/' + id + '.png', omitBackground: true }})
    else await el.screenshot({{ path: '{OUT}/' + id + '.png' }}) }}
  await b.close() }})()"""
(OUT / 'rendu.cjs').write_text(js)
subprocess.run(['node', str(OUT / 'rendu.cjs')], check=True)

# ---------- 2. Liste des images à téléverser (nom Suwar → fichier, taille max, format) ----------
A = {}
for k in STICKERS: A[f'sticker-{k}'] = (OUT / f'stk-{k}.png', 700, 'PNG')
for k in FONDS:
    for h in (1350, 1920): A[f'fond-{k}-{h}'] = (OUT / f'fond-{k}-{h}.png', 1920, 'JPEG')
for p in sorted((ROOT / 'naanaa-v2/riso').glob('naanaa-*.png')): A[f'naanaa-{p.stem[7:]}'] = (p, 900, 'PNG')
for p in sorted((SOC / 'scenes').glob('s*.png')): A[f'scene-{p.stem}'] = (p, 1350, 'JPEG')
for p in sorted((SOC / 'plein').glob('P*.png')): A[f'plein-{p.stem}'] = (p, 1402, 'JPEG')
for p in sorted((SOC / 'photos-ecran').glob('F*.jpg')): A[f'photo-{p.stem}'] = (p, 1536, 'JPEG')

import sys as _sys
for nom, (src, taille, fmt) in A.items():
    if nom in uploads and not ('--fonds' in _sys.argv and nom.startswith('fond-')): continue
    im = Image.open(src); im = im.convert('RGBA' if fmt == 'PNG' else 'RGB'); im.thumbnail((taille, taille), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, fmt, **({'quality': 88} if fmt == 'JPEG' else {'optimize': True}))
    ext, mime = ('png', 'image/png') if fmt == 'PNG' else ('jpg', 'image/jpeg')
    r = call('upload_from_base64', {'data': base64.b64encode(b.getvalue()).decode(), 'filename': f'bayen-{nom}.{ext}', 'mimeType': mime, 'projectId': PROJET})
    uploads[nom] = r['url']; CACHE.write_text(json.dumps(uploads, indent=1, ensure_ascii=False))
    print('envoyé', nom, im.size, len(b.getvalue()) // 1024, 'Ko')
print(len(uploads), 'images dans Suwar')
