"""Photos de profil et couvertures des pages Bayen (Instagram, Facebook, LinkedIn), en riso.
   python3 profil.py   → design/social/profil/*.png  (rendu Playwright, PW = chemin de playwright)"""
import re, subprocess, sys
from pathlib import Path
D = Path(__file__).resolve().parent
sys.path.insert(0, str(D.parent / 'outils'))
from riso import C, FILTERS, ROOT, riso, st_score, st_barcode, icon  # noqa: E402

AR = (ROOT / 'logo/bayen-wordmark-arabe.svg').read_text()
AR_D, AR_VB = re.search(r' d="([^"]+)"', AR).group(1), re.search(r'viewBox="([^"]+)"', AR).group(1)
W_VB = '-27 -770 3829 1030'
TILT = 'rotate(-4 1900 -260) skewX(-9)'

def riso_mark(href, vb, fill, line, ombre=None, dx=34, dy=26):
    """Wordmark riso incliné : aplat décalé + trait encre, chacun avec son grain (comme la planche validée)."""
    x, y, w, h = map(float, vb.split())
    sh = f'<use href="{href}" fill="{ombre}" filter="url(#grain)" transform="translate({dx*2.2} {dy*2.4})"/>' if ombre else ''
    return (f'<svg viewBox="{x-80} {y-160} {w+260} {h+300}" style="overflow:visible"><g transform="{TILT}">{sh}'
            f'<use href="{href}" fill="{fill}" filter="url(#grain)" transform="translate({dx} {dy})"/>'
            f'<use href="{href}" fill="none" stroke="{line}" stroke-width="30" stroke-linejoin="round" filter="url(#grain-line)"/></g></svg>')

RAYONS = (f"repeating-conic-gradient(from 0deg at var(--cx) var(--cy), {C['citron']} 0deg 6.43deg, #F8C52C 6.43deg 12.86deg)")
GRAIN = ('<svg class="grain" preserveAspectRatio="none" viewBox="0 0 100 100"><rect width="100" height="100" fill="#FFF8EC" opacity=".16" '
         'filter="url(#grain)"/></svg>')
DEFS = FILTERS.replace('</defs>', f'<g id="A"><path d="{AR_D}"/></g></defs>')

def profil(bg, fill, line, ombre=None):
    """Carré plein (Instagram et Facebook le recadrent en cercle) : sigle riso centré, dans le cercle inscrit."""
    return f'<div class="pp" style="background:{bg}">{GRAIN}<div class="sig">{icon(bg, fill, line, ombre)}</div></div>'

nn = lambda pose: riso(pose, (900, 1350))
CSS = '''
  * { box-sizing: border-box; }
  body { margin: 0; background: #ccc; font-family: 'Readex Pro', sans-serif; }
  .frame { position: relative; overflow: hidden; }
  .grain { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
  .pp { width: 1080px; height: 1080px; position: relative; overflow: hidden; display: grid; place-items: center; }
  .pp .sig { width: 880px; height: 880px; transform: translateY(-14px); }  /* marge dans le cercle de recadrage */
  .pp .sig svg { width: 100%; height: 100%; }
  .pp .sig svg > rect { display: none; }  /* le carré arrondi de l'icône d'app n'a pas lieu d'être : le fond est plein */
  .tag { font: 800 var(--t1) / 1 'Unbounded', sans-serif; letter-spacing: -.03em; color: #1B1B1B; }
  .tag-ar { font: 700 var(--t2) / 1.2 'Readex Pro', sans-serif; color: #1B1B1B; direction: rtl; }
  .chip { display: inline-block; font: 600 var(--t3) / 1 'Readex Pro', sans-serif; color: #1B1B1B; background: #FFF8EC;
          border: 4px solid #1B1B1B; border-radius: 999px; padding: .32em .9em; box-shadow: 5px 5px 0 #1B1B1B; }
  .abs { position: absolute; }
  .abs svg, .abs img { display: block; width: 100%; height: auto; overflow: visible; }
'''

def cover(W, H, cx, cy, blocs):
    return (f'<div class="frame" style="width:{W}px;height:{H}px;--cx:{cx};--cy:{cy};background:{RAYONS}">{GRAIN}{blocs}</div>')

# Facebook n'affiche sur mobile que le centre (≈ 1 110 px de large) : tout l'essentiel tient entre x 290 et 1370
fb = cover(1640, 624, '56%', '120%', f'''
  <div class="abs" style="left:300px;top:70px;width:160px;transform:rotate(-8deg)">{st_score('riso', '100')}</div>
  <div class="abs" style="left:318px;top:318px;width:150px;transform:rotate(6deg)">{st_barcode('riso')}</div>
  <div class="abs" style="left:478px;top:96px;width:390px">{riso_mark('#W', W_VB, C['menthe'], C['encre'], C['framboise'])}</div>
  <div class="abs" style="left:880px;top:78px;width:230px">{riso_mark('#A', AR_VB, C['menthe'], C['encre'], C['framboise'])}</div>
  <div class="abs" style="left:488px;top:322px;--t1:52px"><div class="tag">Scanne. C'est clair.</div></div>
  <div class="abs" style="left:488px;top:396px;width:600px;--t2:42px;text-align:left"><div class="tag-ar">سكاني، وكلشي باين.</div></div>
  <div class="abs" style="left:490px;top:484px;--t3:26px"><span class="chip">bayen.ma</span></div>
  <img class="abs" src="{nn('salut')}" style="left:1100px;top:96px;width:280px" alt="">''')

li = cover(1128, 191, '62%', '170%', f'''
  <div class="abs" style="left:300px;top:22px;width:250px">{riso_mark('#W', W_VB, C['menthe'], C['encre'], C['framboise'])}</div>
  <div class="abs" style="left:565px;top:16px;width:150px">{riso_mark('#A', AR_VB, C['menthe'], C['encre'], C['framboise'])}</div>
  <div class="abs" style="left:742px;top:52px;--t1:34px"><div class="tag">Scanne.<br>C'est clair.</div></div>
  <img class="abs" src="{nn('scan')}" style="left:990px;top:14px;width:120px" alt="">''')

pages = {
    'profil-citron': profil(C['citron'], C['menthe'], C['encre']),
    'profil-menthe': profil(C['menthe'], C['creme'], C['encre']),
    'profil-aubergine': profil(C['aubergine'], C['menthe'], C['lait'], C['framboise']),
    'couverture-facebook': fb,
    'couverture-linkedin': li,
}
html = ('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800'
        '&family=Readex+Pro:wght@400;600;700&display=swap"><style>' + CSS + '</style>' + DEFS
        + ''.join(f'<div id="{k}" style="display:inline-block;margin:10px">{v}</div>' for k, v in pages.items()))
(D / 'profil.html').write_text(html)
js = f"""const {{ chromium }} = require(process.env.PW || '/Users/amine/Code/karakeep/node_modules/playwright')
;(async () => {{ const b = await chromium.launch(); const p = await b.newPage({{ viewport: {{ width: 1800, height: 1200 }} }})
  await p.goto('file://{D}/profil.html', {{ waitUntil: 'networkidle' }}); await p.waitForTimeout(1500)
  for (const id of {list(pages)}) await (await p.$('#' + id + ' > div')).screenshot({{ path: '{D}/' + id + '.png' }})
  await b.close() }})()"""
(D / 'rendu.cjs').write_text(js)
subprocess.run(['node', str(D / 'rendu.cjs')], check=True)
print('ok', list(pages))
