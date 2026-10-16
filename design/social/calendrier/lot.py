"""Calendrier réseaux Bayen : rendu d'un lot (lot-N.json) en page de revue HTML + légendes par réseau.
   python3 lot.py 1 [sortie.html]   → page de revue (défaut : out/lot-1.html), out/lot-1-plan.md, out/lot-1-legendes.json
Les gabarits (scene, photo, xxl, bulle, fete) sont dimensionnés en unités de conteneur (cqw) : le même
HTML sert l'aperçu et l'export 1080×1350 ; ils servent aussi de spécification aux templates Suwar."""
import html, json, sys
from datetime import date
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'outils'))
from riso import C, T, RAYONS, ROOT, FILTERS, tex, star, mix, img_uri, riso, st_score, st_pill, st_plu, st_e171, st_wordmark, st_barcode  # noqa: E402

N = sys.argv[1] if len(sys.argv) > 1 else '1'
D = Path(__file__).parent
LOT = json.loads((D / f'lot-{N}.json').read_text())
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else D / 'out' / f'lot-{N}.html'
SOC = ROOT / 'social'
import re
# Typographie française : espace fine insécable avant ? ! ; et insécable avant : et dans les guillemets
esc = lambda t: html.escape(re.sub(r'(\d) %', '\\1\u00a0%', re.sub(r' ([?!;])', '\u202f\\1', re.sub(r' :', '\u00a0:', t.replace('« ', '«\u00a0').replace(' »', '\u00a0»')))))

# ---------- Ressources ----------
ZELLIGE_TOMATE = tex(C['tomate'], mix(C['tomate'], C['encre'], .12),
                     star(40, 40, 22) + ''.join(star(x, y, 22) for x in (0, 80) for y in (0, 80)), 80)
FONDS = {  # nom → (fond CSS, couleur du texte)
    'trame': (f'url({T["trame"][1]}) 0 0/6cqw', C['encre']), 'damier': (f'url({T["damier"][1]}) 0 0/10cqw', C['encre']),
    'vagues': (f'url({T["vagues"][1]}) 0 0/16cqw 6.4cqw', C['encre']), 'graines': (f'url({T["graines"][1]}) 0 0/24cqw', C['encre']),
    'zellige': (f'url({T["zellige"][1]}) 0 0/18cqw', C['lait']), 'rayons': (f'url({RAYONS}) 70% 80%/cover', C['encre']),
    'fete': (f'url({ZELLIGE_TOMATE}) 0 0/18cqw', C['encre']),
}
_cache = {}
def uri(key, fn):
    if key not in _cache: _cache[key] = fn()
    return _cache[key]
reel = lambda n: uri(f'reel-{n}', lambda: img_uri(SOC / 'stickers/reels' / f'{n}.png', (520, 520)))
naanaa = lambda pose, style: uri(f'nn-{pose}-{style}', lambda: img_uri(SOC / 'stickers/reels' / f'naanaa-{pose}.png', (520, 700)) if style == 'sticker' else riso(pose))
scene = lambda k: uri(f'sc-{k}', lambda: img_uri(SOC / 'scenes' / f'{k}.png', (720, 900), 'RGB'))
photo = lambda k: uri(f'ph-{k}', lambda: img_uri(SOC / 'photos-ecran' / f'{k}.jpg', (1100, 1100), 'RGB'))
WORDMARK = (ROOT / 'logo/bayen-wordmark-cuillere.svg').read_text().replace('<svg ', '<svg class="sig" aria-hidden="true" ', 1)
WORDMARK_AR = (ROOT / 'logo/bayen-wordmark-arabe.svg').read_text().replace('<svg ', '<svg class="sig" aria-hidden="true" ', 1)
plein = lambda k: uri(f'pl-{k}', lambda: img_uri(SOC / 'plein' / f'{k}.png', (1000, 1250), 'RGB')) if (SOC / 'plein' / f'{k}.png').exists() else None
# Code d'additif sur l'étiquette ovale
code = lambda c, ligne, ring, fill: (lambda m: st_plu(m, ring=ring, fill=fill, line=ligne, center=f'<text x="330" y="250" text-anchor="middle" font-family="Unbounded" font-weight="800" font-size="120" letter-spacing="-4" fill="#1B1B1B">{c}</text>'))

# Stickers dessinés (SVG) pour la finition riso ; la finition « vrai sticker » utilise les PNG de Codex
SVG_STK = {'vrai': lambda m: st_pill('VRAI', C['menthe'], m, w=420, h=170, rot=-8, size=88, font='Unbounded', weight=800),
           'faux': lambda m: st_pill('FAUX', C['tomate'], m, w=420, h=170, rot=7, size=88, font='Unbounded', weight=800),
           'sahih': lambda m: st_pill('صحيح', C['menthe'], m, w=420, h=170, rot=-8, size=96, rtl=True),
           'ghalet': lambda m: st_pill('غالط', C['tomate'], m, w=420, h=170, rot=7, size=96, rtl=True),
           'e171': st_e171, 'e300': code('E300', 'ADDITIF · VITAMINE C', C['menthe'], C['citron']),
           'wordmark': st_wordmark, 'scanne': st_barcode}
# Emplacement des stickers par type (gabarit XXL)
STK = {'wordmark': 'left:3cqw;bottom:5cqw;width:46cqw', 'vrai': 'left:2cqw;top:57%;width:40cqw', 'faux': 'left:15cqw;top:69%;width:40cqw',
       'sahih': 'left:2cqw;top:57%;width:40cqw', 'ghalet': 'left:15cqw;top:69%;width:40cqw',
       'scanne': 'left:3cqw;bottom:5cqw;width:40cqw', 'e171': 'left:2cqw;top:50%;width:46cqw', 'e300': 'left:2cqw;top:52%;width:46cqw'}

def visuel(p):
    v, L = p['visuel'], p['visuel']['layout']
    ar = p.get('lang') == 'ar'
    attrs = ' dir="rtl" lang="ar"' if ar else ''
    sig = WORDMARK_AR if ar else WORDMARK
    kick = f'<span class="kick">{esc(p["kicker"])}</span>'
    titre = f'<b class="t">{esc(p["titre"])}</b>'
    texte = f'<p class="x">{esc(p["texte"])}</p>' if p.get('texte') else ''
    cta = f'<span class="cta">{esc(p["cta"])}</span>' if p.get('cta') else ''
    titre_ar = f'<b class="tar" dir="rtl" lang="ar">{esc(p["titreAr"])}</b>' if p.get('titreAr') else ''
    signe = f'<span class="sign">{esc(p["signature"])}</span>' if p.get('signature') else ''
    cls = 'post ar' if ar else 'post'
    # Fête : illustration plein écran si elle existe, sinon l'aplat zellige d'attente
    if L == 'fete' and v.get('image') and plein(v['image']):
        L = 'plein'
    if L == 'plein':
        img = plein(v['image'])
        fond = f'<img class="bg" src="{img}" alt="">' if img else f'<div class="bg attente">Illustration en cours</div>'
        return (f'<figure class="{cls} plein"{attrs}>{fond}<div class="scrim"></div>'
                f'<div class="txt">{kick}{titre}{titre_ar}{texte}{signe}</div>{sig}</figure>')
    if L == 'scene':
        return (f'<figure class="{cls} scene"{attrs}><img class="bg" src="{scene(v["scene"])}" alt="">'
                f'<div class="txt">{kick}{titre}</div>{sig}</figure>')
    if L == 'photo':
        # Pastille de score : « cut » (vrai sticker) ou « riso » (2e encre décalée, grain)
        score = f'<div class="stk" style="right:3cqw;top:3cqw;width:27cqw">{st_score(v.get("scoreStyle", "riso"), v["score"])}</div>' if v.get('score') else ''
        # Signature : le logo en bas, côté fin de lecture (pas d'étiquette posée sur la photo)
        return (f'<figure class="{cls} photo"{attrs}><img class="ph" src="{photo(v["photo"])}" alt="">{score}'
                f'<div class="band" style="background:{C[v["bande"]]}">{kick}{titre}{texte}</div>{sig}</figure>')
    if L == 'fete':
        fond, coul = FONDS['fete']
        return (f'<figure class="{cls} fete" style="background:{fond};color:{coul}"><div class="txt">{kick}{titre}{titre_ar}{signe}</div>'
                f'<img class="nn" src="{naanaa("salut", "riso")}" alt=""></figure>')
    fond, coul = FONDS[v['fond']]
    style = v.get('style', 'riso')  # 16/10 : stickers riso uniquement (Naânaa comprise)
    nn = f'<img class="nn" src="{naanaa(v["naanaa"], style)}" alt="">'
    stk = ''.join(f'<div class="stk" style="{STK[s]}">{SVG_STK[s]("riso")}</div>' if v.get('stickerStyle', 'riso') == 'riso'
                  else f'<img class="stk" src="{reel(s)}" alt="" style="{STK[s]}">' for s in v.get('stickers', []))
    if L == 'bulle':
        return (f'<figure class="{cls} xxl bulle" style="background:{fond};color:{coul}"{attrs}><div class="in">{kick}<div class="bubble">{titre}</div></div>'
                f'{nn}{stk.replace(STK["wordmark"], "right:2cqw;bottom:6cqw;width:48cqw")}</figure>')
    # Marge sur un bloc intérieur : les unités cqw se calculent sur la boîte de contenu du post
    return f'<figure class="{cls} xxl" style="background:{fond};color:{coul}"{attrs}><div class="in">{kick}{titre}{texte}</div>{nn}{stk}{cta}</figure>'

# ---------- Légendes par réseau (5 hashtags au plus sur Instagram) ----------
TAGS = {'annonce': '#NouveauLook #ConsommerMieux', 'action': '#AppMaroc #ConsommerMieux', 'jeu': '#VraiOuFaux #ConsommerMieux',
        'communaute': '#Communaute #ConsommerMieux', 'astuce': '#Etiquette #ConsommerMieux', 'mission': '#ConsommerMieux #ProduitsMarocains',
        'cercle': '#ProduitsMarocains #ConsommerMieux', 'sante': '#JourneeMondialeDuDiabete #ConsommerMieux',
        'partenariat': '#Partenariat #MarquesMarocaines', 'app': '#AppMaroc #ConsommerMieux', 'saison': '#Hiver #ConsommerMieux', 'fete': ''}
TAGS_AR = {'astuce': '#نصائح #استهلاك_واعي', 'action': '#تطبيق #استهلاك_واعي', 'jeu': '#صحيح_ولا_غالط #استهلاك_واعي',
           'communaute': '#مساهمة #المجتمع', 'mission': '#استهلاك_واعي #منتوجات_مغربية', 'journee': '#اليوم_العالمي_للغة_العربية #الدارجة',
           'partenariat': '#شراكة #منتوجات_مغربية'}
FETES = {'fete-unite': '#FeteDeLUnite', 'marche-verte': '#MarcheVerte', 'independance': '#FeteDeLIndependance',
         'nouvel-an': '#BonneAnnee2027', 'manifeste': '#11Janvier', 'yennayer': '#Yennayer #Asggas2977'}
def legendes(p):
    slug, ar, fete = p['id'][11:], p.get('lang') == 'ar', p['rubrique'] == 'fete'
    base = '#باين #المغرب #Bayen ' if ar else '#Bayen #Maroc '
    tags = (base + (FETES.get(slug, '') if fete else (TAGS_AR if ar else TAGS)[p['rubrique']])).split()
    bio, lien = ('👈 الرابط فالبيو', '👈 ') if ar else ('👉 Lien en bio', '👉 ')
    return {'instagram': p['legende'] + ('' if fete else f'\n\n{bio}') + '\n\n' + ' '.join(tags[:5]),
            'facebook': p['legende'] + ('' if fete else f'\n\n{lien}{p.get("lien", "https://bayen.ma")}') + '\n\n' + ' '.join(tags[:4]),
            'alt': '. '.join(s.rstrip('. ') for s in (p['kicker'], p['titre'], p.get('texte', '')) if s) + '.',
            'langue': 'ary' if ar else 'fr'}

# ---------- Page de revue ----------
JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']
MOIS = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
RUB = {'annonce': 'Annonce', 'action': 'Bayen en action', 'jeu': 'Vrai ou faux', 'fete': 'Fête nationale', 'communaute': 'La communauté',
       'astuce': "L'astuce de Naânaa", 'mission': 'Mission', 'cercle': 'Le cercle vertueux', 'sante': 'Journée mondiale', 'partenariat': 'Partenariats',
       'app': 'Application', 'saison': 'Saison', 'journee': 'Journée mondiale'}
def jour(d):
    x = date.fromisoformat(d); return f'{JOURS[x.weekday()]} {x.day}{"er" if x.day == 1 else ""} {MOIS[x.month]}'

semaines, cartes = {}, []
for p in LOT['posts']:
    x = date.fromisoformat(p['date']); lundi = date.fromordinal(x.toordinal() - x.weekday())
    lg = legendes(p)
    extra = ''.join([f'<p class="rep">Réponse : <b>{esc(p["reponse"])}</b></p>' if p.get('reponse') else '',
                     f'<p class="note">{esc(p["note"])}</p>' if p.get('note') else ''])
    semaines.setdefault(lundi, []).append(
        f'<article class="entry"><header><b>{jour(p["date"]).capitalize()}</b><span>{p["heure"].replace(":00", " h")}</span>'
        f'{"<span class=lang>darija</span>" if p.get("lang") == "ar" else ""}<span class="rub r-{p["rubrique"]}">{RUB[p["rubrique"]]}</span></header>{visuel(p)}'
        f'<div class="cap"{" dir=rtl lang=ar" if p.get("lang") == "ar" else ""}>{esc(lg["instagram"])}</div>{extra}</article>')
    cartes.append(lg | {'id': p['id'], 'date': p['date'], 'heure': p['heure']})

corps = ''.join(f'<section class="week"><h2>Semaine du {jour(l.isoformat())}</h2><div class="entries">{"".join(es)}</div></section>'
                for l, es in sorted(semaines.items()))
nb = len(LOT['posts'])
debut, fin = jour(LOT['du']), jour(LOT['au'])

CSS = '''
  /* Revue d'un lot : la page suit le thème du lecteur, les posts gardent la palette Marché Pop fixe. */
  :root { --creme:#FFF8EC; --encre:#1B1B1B; --lait:#FFF3DF;
    --bg:#FFF8EC; --fg:#1B1B1B; --muted:#5E5A52; --sheet:#FFFFFF; --rule:#E4D6BF;
    --f-disp:'Unbounded','Arial Black',sans-serif; --f-ui:'Readex Pro',system-ui,sans-serif; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#1D1430; --fg:#FFF3DF; --muted:#CBBFDD; --sheet:#2A1F40; --rule:#45385F; color-scheme:dark; } }
  :root[data-theme="dark"] { --bg:#1D1430; --fg:#FFF3DF; --muted:#CBBFDD; --sheet:#2A1F40; --rule:#45385F; color-scheme:dark; }
  body { background:var(--bg); color:var(--fg); font:400 15px/1.5 var(--f-ui); margin:0; -webkit-font-smoothing:antialiased; }
  .wrap { max-width:1240px; margin:0 auto; padding-block:40px 64px; padding-inline:16px; display:grid; gap:40px; }
  h1 { margin:0; font:800 clamp(26px,4vw,40px)/1.1 var(--f-disp); letter-spacing:-.02em; text-wrap:balance; }
  h2 { margin:0; font:800 19px/1.2 var(--f-disp); letter-spacing:-.02em; }
  .intro { display:grid; gap:12px; max-width:76ch; }
  .intro p, .intro li { color:var(--muted); margin:0; }
  .intro ul { margin:0; padding-inline-start:18px; display:grid; gap:4px; }
  .week { display:grid; gap:16px; }
  .entries { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,290px),1fr)); gap:26px 20px; align-items:start; }
  .entry { display:grid; gap:10px; min-width:0; }
  .entry header { display:flex; flex-wrap:wrap; align-items:center; gap:6px 10px; font-size:14px; }
  .entry header span { color:var(--muted); font-variant-numeric:tabular-nums; }
  .lang { font-size:11.5px; font-weight:700; color:var(--fg) !important; background:var(--sheet); border-radius:999px; padding:1px 8px; }
  .rub { margin-inline-start:auto; font-size:11.5px; font-weight:600; color:var(--fg) !important; border:1.5px solid currentColor; border-radius:999px; padding:1px 9px; }
  .cap { white-space:pre-line; font-size:13.5px; line-height:1.5; background:var(--sheet); border:1.5px solid var(--rule); border-radius:14px; padding:12px 14px; }
  .rep { margin:0; font-size:13px; }
  .note { margin:0; font-size:12.5px; color:var(--muted); }

  /* ---- Gabarits de post (unités de conteneur : même rendu à 290 px ou à 1080 px) ---- */
  .post { container-type:inline-size; margin:0; position:relative; aspect-ratio:4/5; max-width:100%; overflow:hidden; border:2px solid var(--encre); border-radius:16px; box-shadow:4px 4px 0 var(--encre); background:#F3EADB; color:var(--encre); }
  .post .kick { justify-self:start; align-self:start; font:600 3.3cqw/1.2 var(--f-ui); background:var(--creme); color:var(--encre); border:.5cqw solid var(--encre); border-radius:999px; padding:.6cqw 2.6cqw; }
  .post .t { font:800 7.4cqw/1.03 var(--f-disp); letter-spacing:-.03em; text-wrap:balance; }
  .post .x { margin:0; font:600 3.9cqw/1.3 var(--f-ui); }
  .post .cta { position:absolute; left:6.5cqw; bottom:5cqw; z-index:3; font:600 3.2cqw/1.2 var(--f-ui); background:var(--creme); color:var(--encre); border:.5cqw solid var(--encre); border-radius:999px; padding:.7cqw 2.8cqw; }
  .post .stk { position:absolute; z-index:2; height:auto; }
  .post .stk svg { position:static; width:100%; height:auto; display:block; overflow:visible; }
  .post .sig { position:absolute; right:6cqw; bottom:5.5cqw; width:22cqw; height:auto; color:var(--encre); }
  .post.scene .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .post.scene .txt { position:absolute; left:6cqw; right:6cqw; top:78cqw; display:grid; gap:2.4cqw; }
  .post.photo .ph { position:absolute; inset:0 0 auto; width:100%; height:66%; object-fit:cover; }
  .post.photo .band { position:absolute; inset:auto 0 0; height:34%; border-top:.5cqw solid var(--encre); padding:4.5cqw 6cqw; display:grid; align-content:start; gap:2.2cqw; }
  .post.photo .band .t { font-size:6.6cqw; max-width:76%; }
  .post.xxl .in { position:relative; z-index:3; padding:6.5cqw; display:flex; flex-direction:column; align-items:flex-start; gap:3cqw; }
  .post.xxl .in > .t { max-width:86%; color:inherit; }
  .post.xxl .in > .x { max-width:62%; color:inherit; }
  .post.xxl .nn { position:absolute; z-index:1; right:-7cqw; bottom:-10cqw; width:58cqw; height:auto; }
  .post.bulle .nn { left:-3cqw; right:auto; bottom:-4cqw; width:50cqw; }
  .post .bubble { position:relative; background:var(--creme); color:var(--encre); border:.5cqw solid var(--encre); border-radius:5cqw; box-shadow:1cqw 1cqw 0 var(--encre); padding:5cqw 5.5cqw; max-width:92%; }
  .post .bubble::after { content:''; position:absolute; left:20%; bottom:-3.4cqw; width:6cqw; height:6cqw; background:var(--creme); border-right:.5cqw solid var(--encre); border-bottom:.5cqw solid var(--encre); transform:rotate(45deg); }
  .post .bubble .t { font-size:9cqw; }
  .post.fete { display:grid; align-content:start; }
  .post.fete .txt { position:relative; z-index:2; padding:7cqw 6.5cqw 0; display:grid; gap:2.6cqw; }
  .post.fete .ar { font:600 7.6cqw/1.3 var(--f-ui); text-align:start; }
  .post.fete .sign { font:600 3.6cqw/1.2 var(--f-ui); }
  .post.fete .nn { position:absolute; left:50%; bottom:-10cqw; width:56cqw; transform:translateX(-50%); }
  /* Plein écran : illustration bord à bord, voile en haut pour lire le texte crème */
  .post.plein { background:#2A1F40; }
  .post.plein .bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
  .post.plein .attente { display:grid; place-items:center; color:#FFF3DF; font:600 4cqw var(--f-ui); background:url(%ATTENTE%) 0 0/18cqw; }
  .post.plein .scrim { position:absolute; inset:0; background:linear-gradient(180deg, rgb(29 20 48 / .78) 0%, rgb(29 20 48 / .5) 32%, rgb(29 20 48 / 0) 58%); }
  .post.plein .txt { position:absolute; inset:0 0 auto; padding:7cqw 6.5cqw; display:grid; gap:2.6cqw; justify-items:start; color:#FFF3DF; text-shadow:0 .4cqw 1.6cqw rgb(0 0 0 / .35); }
  .post.plein .t { color:#FFF3DF; }
  .post.plein .x { max-width:80%; }
  .post.plein .sig { color:#FFF3DF; filter:drop-shadow(0 .3cqw 1cqw rgb(0 0 0 / .4)); }
  .post .tar { font:700 7.6cqw/1.3 var(--f-ui); }
  .post .sign { font:600 3.6cqw/1.2 var(--f-ui); }
  /* Posts en darija : Readex Pro (Unbounded n'a pas d'arabe), lecture de droite à gauche, signature « باين » côté fin */
  .post.ar .t { font:700 8cqw/1.32 var(--f-ui); letter-spacing:0; }
  .post.ar .x, .post.ar .kick, .post.ar .cta { font-family:var(--f-ui); }
  .post.ar .x { font-size:4.3cqw; }
  .post.ar .sig { right:auto; left:6cqw; width:19cqw; }
  .post.ar .cta { left:auto; right:6.5cqw; }
  .post.ar.photo .band .t { font-size:7.2cqw; }
  .post.ar .bubble .t { font-size:9.5cqw; }
'''
CSS = CSS.replace('%ATTENTE%', FONDS['fete'][0].split(')')[0][4:])
page = f'''<title>Bayen · lot {N}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=Readex+Pro:wght@400;600;700&display=swap">
<style>{CSS}</style>
{FILTERS}
<main class="wrap">
  <header class="intro">
    <h1>Calendrier Bayen · lot {N}</h1>
    <p>{nb} posts du {debut} au {fin} 2026 : quatre par semaine (lundi et mercredi 19 h, vendredi 19 h, dimanche 11 h), plus les fêtes nationales et la Journée mondiale du diabète. Chaque post sera aussi décliné en story. Les visuels sont des aperçus : les textes seront posés par les templates Suwar, sur ces gabarits.</p>
    <ul>{''.join(f'<li>{esc(r)}</li>' for r in LOT['regles'])}</ul>
  </header>
  {corps}
</main>'''
OUT.parent.mkdir(parents=True, exist_ok=True); (D / 'out').mkdir(exist_ok=True)
OUT.write_text(page)
(D / 'out' / f'lot-{N}-legendes.json').write_text(json.dumps(cartes, ensure_ascii=False, indent=1))
(D / 'out' / f'lot-{N}-plan.md').write_text('\n'.join(
    f'## {c["date"]} {c["heure"]}\n`{c["id"]}`\n\n{c["instagram"]}\n' for c in cartes))
print('ok', OUT, len(page) // 1024, 'Ko')
