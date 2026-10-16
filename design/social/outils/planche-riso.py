"""Planche « Bayen riso » : logo, icône, pied de page, textures, stickers et familles de visuels.
   python3 planche-riso.py [sortie.html]   (par défaut design/social/planche-riso.html)"""
import sys
from riso import *

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'social/planche-riso.html'
tex_html = ''.join(f'<figure class="pat"><div class="tilebox" style="background-image:url({u});background-size:auto"></div><figcaption>{lab}</figcaption></figure>'
                   for lab, u in T.values())
tex_html += f'<figure class="pat"><div class="tilebox" style="background-image:url({RAYONS});background-size:cover;background-position:70% 80%"></div><figcaption>Rayons (fond de post)</figcaption></figure>'
nn_html = ''.join(f'<figure><img class="nn-st" src="{nn(n)}" alt=""></figure>' for n in ('salut-sticker', 'scan-sticker', 'bravo-sticker', 'salut-riso', 'astuce-riso', 'courses-riso'))
PE = ROOT / 'social/photos-ecran'
# Photos Codex, écran = capture réelle posée dans l'écran magenta (ecran-dans-photo.py)
PHOTOS = [(photo_crop(PE / f'{k}.jpg', 768, 512, 1024), None, C[band], kick, title) for k, band, kick, title in [
    ('F1-scan', 'tomate', 'Bayen en action · scan', "Scanne. C'est clair."),
    ('F2-beaute', 'framboise', 'Univers beauté', 'Ta crème, décodée ingrédient par ingrédient.'),
    ('F3-proteines', 'myrtille', 'Univers protéines', 'Le top protéines, au gramme près.'),
    ('F4-comparer', 'citron', 'Comparateur', 'Deux yaourts. Un seul gagnant.'),
    ('F5-repas', 'figue', 'Mon repas · IA', 'La photo de ton assiette, estimée.'),
    ('F6-courses', 'menthe', 'Accueil', 'Tes courses, enfin claires.'),
    ('F7-tablette', 'citron', 'Fiche produit', 'Le pourquoi du score, en clair.'),
    ('F8-ordinateur', 'myrtille', 'Bayen partout', 'Sur tous tes écrans.')]]
photo_html = ''
for i, (u, dev, band, kick, title) in enumerate(PHOTOS):
    phone = tel(dev, 'right:6%;top:6%;width:29%;transform:rotate(6deg)') if dev else ''
    photo_html += (f'<figure class="post photo"><img class="ph" src="{u}" alt="">{phone}'
                   f'<div class="stk-abs" style="left:3%;top:3%;width:30%">{st_plu("cut" if i % 2 == 0 else "riso")}</div>'
                   f'<div class="band" style="background:{band}"><span class="kick">{kick}</span><b>{title}</b></div></figure>')

ecrans_html = ''.join(f'<figure class="scene16" style="aspect-ratio:3/2"><img src="{img_uri(PE / f"{k}.jpg", (1200, 800), "RGB")}" alt="" style="width:100%;height:100%;object-fit:cover;display:block"></figure>'
                      for k in ('F7-tablette', 'F8-ordinateur'))

# ---------- Famille 3 : typo XXL, fonds texturés, Naânaa en grand, stickers ----------
XXL = [
    f'''<figure class="post xxl" style="background-image:url({RAYONS});color:{C['encre']}">
      <span class="kick">Vrai ou faux ?</span><b class="long">« Sans sucres ajoutés » veut dire sans sucre.</b>
      <img class="nn" src="{riso('oups')}" alt="" style="width:56%;right:-8%;bottom:-11%">
      <div class="stk-abs" style="left:2%;top:58%;width:40%">{st_pill('VRAI', C['menthe'], 'cut', w=420, h=170, rot=-8, size=88, font='Unbounded', weight=800)}</div>
      <div class="stk-abs" style="left:16%;top:70%;width:40%">{st_pill('FAUX', C['tomate'], 'cut', w=420, h=170, rot=7, size=88, font='Unbounded', weight=800)}</div>
      <span class="cta">Réponse dans la légende</span></figure>''',
    f'''<figure class="post xxl" style="background-image:url({T['trame'][1]});color:{C['encre']}">
      <span class="kick">L'astuce de Naânaa</span>
      <div class="bubble-xl"><b>Lis l'étiquette avant le prix.</b></div>
      <img class="nn" src="{nn('astuce-sticker')}" alt="" style="width:50%;left:-2%;right:auto;bottom:-4%">
      <div class="stk-abs" style="right:2%;bottom:6%;width:50%">{st_wordmark('cut')}</div></figure>''',
    f'''<figure class="post xxl" style="background-image:url({T['zellige'][1]});color:{C['lait']}">
      <span class="kick">Le saviez-vous ?</span><b>Le E171 est interdit dans l'UE depuis 2022.</b>
      <img class="nn" src="{riso('loupe')}" alt="" style="width:62%;right:-6%;bottom:-8%">
      <div class="stk-abs" style="left:2%;top:50%;width:46%">{st_e171('cut')}</div>
      <span class="cta">Fiche additif sur bayen.ma</span></figure>''',
    f'''<figure class="post xxl" style="background-image:url({T['graines'][1]});color:{C['encre']}">
      <span class="kick">Le mot du jour</span><b class="huge">INCI</b>
      <p class="sub">La liste des ingrédients d'un cosmétique, du plus présent au moins présent (au-delà de 1&#8239;%).</p>
      <img class="nn" src="{riso('salut')}" alt="" style="width:50%;right:-6%;bottom:-9%">
      <div class="stk-abs" style="left:0;bottom:8%;width:52%">{st_pill('واضح وباين', C['citron'], 'cut', rtl=True, rot=-6)}</div></figure>''',
]
xxl_html = ''.join(XXL)

# ---------- Famille 1 : scènes riso (Codex) ----------
scenes = [('s1-marche-scan', 'Scanner au marché', 'Fonctionnalité · scan'), ('s2-frigo-sucre', 'Le sucre caché du frigo', 'Conseil de Naânaa'),
          ('s3-salle-de-bain', "Lire l'INCI à la loupe", 'Univers beauté'), ('s4-ftour', 'Un ftour équilibré', 'Saison · Ramadan'),
          ('s5-comparer', 'Comparer deux produits', 'Fonctionnalité · comparateur'), ('s6-cercle-vertueux', 'Le cercle vertueux', 'Mission · bons produits'),
          ('s7-partenariat', 'Ouvert aux partenaires', 'Partenariats'), ('s8-repas-photo', 'La photo de ton assiette', 'Fonctionnalité · IA repas')]
sc_html = ''.join(f'<figure class="post"><img src="{img_uri(ROOT / "social/scenes" / f"{k}.png", (540, 675), "RGB")}" alt=""><div class="txt"><span class="kick">{kick}</span><b>{title}</b>'
                  f'<span class="cta">bayen.ma</span></div></figure>' for k, title, kick in scenes)

# ---------- Pied de page ----------
pats = [('p2-carte-creme', 'Fond de carte · crème'), ('p3-menthe', "Aplat d'accent · menthe"), ('p1-footer-aubergine', "Motif d'origine · réservé aux posts")]
pat_html = ''.join(f'<figure class="pat"><div class="tilebox" style="background-image:url({img_uri(ROOT / "riso-ui" / f"{k}.png", (512, 512), "RGB")})"></div><figcaption>{lab}</figcaption></figure>' for k, lab in pats)
foot = {k: img_uri(ROOT / 'riso-ui' / f'p1-ton-sur-ton-{k}.png', (640, 640), 'RGB') for k in ('doux', 'marque')}
NAV = '<nav><span>Méthodologie</span><span>Contribuer</span><span>Classement</span><span>Partenaires</span><span>À propos</span><span>العربية</span></nav>'
footer_html = ''.join(f'<figure class="pat"><div class="footer-mock" style="background-image:url({foot[k]})"><span class="logo">{wordmark(C["menthe"], C["lait"], shadow=C["framboise"])}</span>{NAV}</div><figcaption>{lab}</figcaption></figure>'
                      for k, lab in (('doux', 'Ton sur ton doux · recommandé'), ('marque', 'Ton sur ton marqué')))

CSS = '''
  /* Planche de spécimens : la page suit le thème, les visuels gardent la palette Marché Pop fixe. */
  :root { --creme:#FFF8EC; --encre:#1B1B1B; --menthe:#19C08B; --citron:#FFD43B; --aubergine:#3B1F5C;
    --bg:#FFF8EC; --fg:#1B1B1B; --muted:#5E5A52; --sheet:#FFFFFF; --sheet-alt:#F3EADB; --rule:#E4D6BF;
    --f-disp:'Unbounded','Arial Black',sans-serif; --f-ui:'Readex Pro',system-ui,sans-serif; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#1D1430; --fg:#FFF3DF; --muted:#CBBFDD; --sheet:#2A1F40; --sheet-alt:#352851; --rule:#45385F; color-scheme:dark; } }
  :root[data-theme="dark"] { --bg:#1D1430; --fg:#FFF3DF; --muted:#CBBFDD; --sheet:#2A1F40; --sheet-alt:#352851; --rule:#45385F; color-scheme:dark; }
  body { background:var(--bg); color:var(--fg); font:400 15px/1.5 var(--f-ui); -webkit-font-smoothing:antialiased; margin:0; }
  .wrap { max-width:1180px; margin:0 auto; padding-block:40px 64px; padding-inline:16px; display:grid; gap:48px; }
  h1 { margin:0; font:800 clamp(26px,4vw,38px)/1.1 var(--f-disp); letter-spacing:-.02em; }
  h2 { margin:0; font:800 20px/1.2 var(--f-disp); letter-spacing:-.02em; }
  h3 { margin:6px 0 0; font:600 13px/1.3 var(--f-ui); letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
  p { margin:0; color:var(--muted); max-width:72ch; }
  section { display:grid; gap:14px; min-width:0; }
  .row { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,330px),1fr)); gap:16px; }
  .board { border:2px solid var(--encre); border-radius:22px; box-shadow:4px 4px 0 var(--encre); padding:28px 22px; display:grid; place-items:center; }
  .board svg { width:100%; height:auto; overflow:visible; }
  .icons { display:flex; flex-wrap:wrap; gap:22px; align-items:start; }
  .icons figure { margin:0; display:grid; justify-items:center; gap:4px; font-size:12px; color:var(--muted); text-align:center; max-width:150px; }
  .icons figure b { color:var(--fg); font-size:13px; }
  .icons svg { width:120px; height:120px; }
  .icons .s svg { width:40px; height:40px; }
  .pat { margin:0; display:grid; gap:8px; font-size:13px; color:var(--muted); min-width:0; }
  .tilebox { height:200px; border:2px solid var(--encre); border-radius:18px; background-size:220px; box-shadow:3px 3px 0 var(--encre); }
  .tex { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,200px),1fr)); gap:16px; }
  .tex .tilebox { height:160px; }
  .footer-mock { border:2px solid var(--encre); border-radius:22px; overflow:hidden; box-shadow:4px 4px 0 var(--encre); background:#3B1F5C 0 0/300px; color:#FFF3DF; padding:30px 26px; display:flex; flex-wrap:wrap; gap:18px 28px; justify-content:space-between; align-items:center; }
  .footer-mock .logo svg { width:190px; height:auto; overflow:visible; }
  .footer-mock nav { display:grid; grid-template-columns:repeat(2,auto); gap:6px 28px; font-size:14px; }
  .stickers { display:flex; flex-wrap:wrap; gap:10px 18px; align-items:center; padding:22px; border:2px solid var(--encre); border-radius:22px; box-shadow:4px 4px 0 var(--encre); }
  .stickers figure { margin:0; }
  .stickers .stk { width:170px; height:auto; overflow:visible; display:block; }
  .stickers .nn-st { width:120px; height:auto; display:block; }
  .posts { display:grid; grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr)); gap:18px; }
  .posts.big { grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr)); }
  .post { margin:0; position:relative; aspect-ratio:4/5; border:2px solid var(--encre); border-radius:18px; overflow:hidden; box-shadow:4px 4px 0 var(--encre); background:#F3EADB 0 0/auto; min-width:0; }
  .post > img:not(.nn) { width:100%; height:100%; object-fit:cover; display:block; }
  .post .txt.top { inset:0 32% auto 0; padding-top:18px; }
  .post .txt { position:absolute; inset:auto 0 0 0; padding:14px 16px 16px; display:grid; gap:6px; z-index:3; }
  .kick { justify-self:start; align-self:start; font-size:10.5px; font-weight:600; background:var(--creme); color:var(--encre); border:1.5px solid var(--encre); border-radius:999px; padding:2px 9px; position:relative; z-index:3; }
  .post b { font:800 19px/1.08 var(--f-disp); letter-spacing:-.02em; color:var(--encre); text-wrap:balance; }
  .post .cta { font-size:11px; font-weight:600; }
  .post.photo > img.ph { height:66%; }
  .post.photo .band { position:absolute; inset:auto 0 0 0; height:34%; border-top:2px solid var(--encre); padding:12px 16px; display:grid; align-content:start; gap:7px; z-index:1; }
  .post.photo .band b { font:800 18px/1.1 var(--f-disp); letter-spacing:-.02em; text-wrap:balance; max-width:62%; }
  .post.photo .band .kick { position:static; }
  .stk-abs { position:absolute; z-index:2; }
  .stk-abs svg { width:100%; height:auto; display:block; overflow:visible; }
  .dev { position:absolute; z-index:2; background:#1B1B1B; box-shadow:5px 6px 0 rgba(27,27,27,.85); }
  .dev img { display:block; width:100%; height:auto; }
  .dev.tel { padding:3.4%; border-radius:16% / 7.4%; }
  .dev.tel img { border-radius:13% / 6%; }
  .dev.tab { padding:3%; border-radius:7% / 5.2%; }
  .dev.tab img { border-radius:3.5% / 2.6%; }
  .dev.pc { padding:1.6% 1.6% 2.4%; border-radius:2.6% / 4.2%; }
  .dev.pc img { border-radius:.6%; }
  .dev.pc::after { content:''; position:absolute; left:-9%; right:-9%; top:100%; height:6%; background:linear-gradient(#D9D1C4,#A9A094); border:2px solid #1B1B1B; border-radius:0 0 46% 46% / 0 0 100% 100%; }
  .scene16 { margin:0; position:relative; aspect-ratio:16/9; border:2px solid var(--encre); border-radius:18px; overflow:hidden; box-shadow:4px 4px 0 var(--encre); background:0 0/auto; }
  .scene16 .sc-title { position:absolute; left:5%; top:7%; display:grid; gap:8px; z-index:3; }
  .scene16 .sc-title b { font:800 clamp(18px,2.6vw,30px)/1.05 var(--f-disp); letter-spacing:-.02em; }
  .ecrans { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:18px; align-items:start; }
  @media (max-width:760px) { .ecrans { grid-template-columns:minmax(0,1fr); } }
  .post.xxl { padding:6.5% 6%; display:flex; flex-direction:column; align-items:flex-start; gap:10px; background-size:cover; }
  .post.xxl > * { position:relative; z-index:3; }
  .post.xxl > b { font:800 clamp(22px,2.4vw,29px)/1.03 var(--f-disp); letter-spacing:-.03em; text-wrap:balance; color:inherit; max-width:96%; }
  .post.xxl > b.long { font-size:clamp(20px,2.1vw,25px); max-width:88%; }
  .post.xxl > b.huge { font-size:clamp(54px,6vw,76px); line-height:.9; }
  .post.xxl .sub { color:inherit; font-size:13px; font-weight:600; max-width:64%; }
  .post.xxl img.nn { position:absolute; z-index:1; height:auto; }
  .post.xxl .stk-abs { position:absolute; z-index:2; }
  .post.xxl .cta { margin-top:auto; background:var(--creme); color:var(--encre); border:1.5px solid var(--encre); border-radius:999px; padding:3px 10px; }
  .bubble-xl { background:var(--creme); border:2px solid var(--encre); border-radius:20px; box-shadow:3px 3px 0 var(--encre); padding:14px 16px; max-width:88%; }
  .bubble-xl::after { content:''; position:absolute; left:22%; bottom:-13px; width:22px; height:22px; background:var(--creme); border-right:2px solid var(--encre); border-bottom:2px solid var(--encre); transform:rotate(45deg) skew(8deg,8deg); }
  .bubble-xl b { font:800 clamp(22px,2.4vw,28px)/1.04 var(--f-disp); letter-spacing:-.03em; }
  table { border-collapse:collapse; width:100%; background:var(--sheet); color:var(--fg); border:2px solid var(--encre); border-radius:18px; overflow:hidden; box-shadow:4px 4px 0 var(--encre); font-size:14px; }
  th, td { text-align:left; padding:10px 14px; border-bottom:1.5px solid var(--rule); vertical-align:top; }
  th { font:800 13px var(--f-disp); background:var(--sheet-alt); }
  .tablewrap { overflow-x:auto; }
  ul.rules { margin:0; padding-left:18px; color:var(--muted); display:grid; gap:4px; }
  .note { font-size:13px; }
'''

html = f'''<title>Bayen riso</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=Readex+Pro:wght@400;600&display=swap">
<style>{CSS}</style>
{FILTERS}
<main class="wrap">
  <header style="display:grid;gap:10px">
    <h1>Bayen en riso</h1>
    <p>Version 2 : pied de page ton sur ton, textures riso raccordables, stickers Bayen (riso ou vrai sticker), et visuels réseaux où chaque écran montré est une capture réelle de bayen.ma (fiche Leben Jaouda, 90/100). Les textes des posts seront posés par les templates Suwar.</p>
  </header>

  <section>
    <h2>Le logo incliné en riso</h2>
    <div class="row">
      <div class="board" style="background:var(--creme)">{wordmark(C['menthe'], C['encre'])}</div>
      <div class="board" style="background:var(--creme)">{wordmark(C['menthe'], C['encre'], shadow=C['citron'])}</div>
      <div class="board" style="background:var(--aubergine)">{wordmark(C['menthe'], C['lait'], shadow=C['framboise'])}</div>
    </div>
  </section>

  <section>
    <h2>L'icône en riso : les trois, chacune à sa place</h2>
    <p>Une PWA n'a qu'une icône d'écran d'accueil, mais rien n'oblige à n'en garder qu'une : la menthe pour l'app, le citron pour les profils réseaux (il ressort dans un fil), l'aubergine pour l'onglet du navigateur en mode sombre (le favicon SVG change avec le thème).</p>
    <div class="icons">
      <figure>{icon(C['menthe'], C['creme'], C['encre'])}<b>Menthe</b>Écran d'accueil (icône de l'app)</figure>
      <figure>{icon(C['citron'], C['menthe'], C['encre'])}<b>Citron</b>Photo de profil Instagram, TikTok, Facebook</figure>
      <figure>{icon(C['aubergine'], C['menthe'], C['lait'], shadow=C['framboise'])}<b>Aubergine</b>Favicon en mode sombre</figure>
      <figure>{icon(C['creme'], C['menthe'], C['encre'], shadow=C['citron'])}<b>Crème</b>Favicon en mode clair</figure>
      <figure class="s">{icon(C['menthe'], C['creme'], C['encre'])}40 px</figure>
      <figure class="s">{icon(C['citron'], C['menthe'], C['encre'])}40 px</figure>
    </div>
  </section>

  <section>
    <h2>Pied de page : motif ton sur ton</h2>
    <p>Le motif de Codex est repris en aubergine sur aubergine : le dessin reste lisible de près, mais le logo riso et les liens passent devant.</p>
    <div class="row">{footer_html}</div>
    <h3>Fonds de cartes</h3>
    <div class="row">{pat_html}</div>
  </section>

  <section>
    <h2>Textures riso pour les fonds</h2>
    <p>Dessinées en SVG avec le grain d'impression : elles se raccordent sans couture, pèsent quelques Ko et se recolorent dans n'importe quel aplat. Toujours ton sur ton, pour que le texte des templates Suwar reste lisible.</p>
    <div class="tex">{tex_html}</div>
  </section>

  <section>
    <h2>Stickers Bayen</h2>
    <h3>Vrai sticker · découpe blanche, ombre portée, reflet</h3>
    <div class="stickers" style="background-image:url({T['carnet'][1]})">{stickers_row('cut')}</div>
    <h3>Riso · deuxième encre décalée, grain d'impression</h3>
    <div class="stickers" style="background:var(--creme)">{stickers_row('riso')}</div>
    <h3>Vrai sticker · rendu Codex (PNG transparents, texte au pixel près)</h3>
    <div class="stickers" style="background:#FFD43B">{''.join(f'<figure><img class="nn-st" style="width:150px" src="{img_uri(ROOT / "social/stickers/reels" / f"{n}.png", (300, 300))}" alt=""></figure>' for n in ('wordmark', 'sigle', 'etiquette', 'score-100', 'darija-wadeh-wbayen', 'scanne', 'vrai', 'faux', 'e171', 'naanaa-salut', 'naanaa-bravo', 'naanaa-courses'))}</div>
    <h3>Naânaa en sticker</h3>
    <div class="stickers" style="background-image:url({T['trame'][1]})">{nn_html}</div>
    <p class="note">Les huit poses existent en PNG transparents dans les deux finitions (design/social/stickers), prêtes pour les stories et les templates.</p>
  </section>

  <section>
    <h2>Famille 2 · photos Marché Pop, avec la vraie interface</h2>
    <p>Photos de Codex dont les écrans étaient en magenta : chaque écran reçoit une capture réelle de bayen.ma, posée en perspective dans la forme exacte de l'écran (coins, bords, reflets). Comparateur : deux yaourts de la même marque ; repas : une vraie analyse de l'IA.</p>
    <div class="posts big">{photo_html}</div>
  </section>

  <section>
    <h2>Bayen sur tous les écrans</h2>
    <p>Tablette et ordinateur photographiés, avec les vraies pages de bayen.ma dans l'écran.</p>
    <div class="ecrans">{ecrans_html}</div>
  </section>

  <section>
    <h2>Famille 3 · typo XXL, plus remplie</h2>
    <p>Fonds texturés (rayons, trame, zellige, graines), Naânaa en grand qui déborde du cadre, et des stickers qui portent l'info (vrai ou faux, additif, darija).</p>
    <div class="posts">{xxl_html}</div>
  </section>

  <section>
    <h2>Famille 1 · scènes riso de Naânaa</h2>
    <p>Format 4:5. Le haut porte la scène, le bas reste calme pour le titre ; ici le texte simule le template Suwar.</p>
    <div class="posts">{sc_html}</div>
  </section>

  <section>
    <h2>Lignes éditoriales proposées</h2>
    <p>Quatre posts par semaine, chacun décliné en story, comme pour Risala. Les fêtes prennent la place du post prévu.</p>
    <div class="tablewrap"><table>
      <tr><th>Jour</th><th>Rubrique</th><th>Contenu</th><th>Famille</th></tr>
      <tr><td>Lundi 19 h</td><td>L'astuce de Naânaa</td><td>Un conseil concret pour lire une étiquette : sucres cachés, additifs, portions, « sans » trompeurs.</td><td>Riso · XXL</td></tr>
      <tr><td>Mercredi 19 h</td><td>Bayen en action</td><td>Une fonctionnalité montrée en vrai : scan, prix par enseigne, alternatives, comparateur, beauté INCI, protéines, photo de repas, journal. Une fois par mois : « Ouvert aux partenaires » (enseignes, marques, nutritionnistes).</td><td>Photo · écrans</td></tr>
      <tr><td>Vendredi 19 h</td><td>Le cercle vertueux · Vrai ou faux</td><td>En alternance : un produit bien noté mis en avant (score réel tiré de la base, marques marocaines en priorité) et un jeu (vrai ou faux, le mot du jour).</td><td>Photo · XXL</td></tr>
      <tr><td>Dimanche 11 h</td><td>La communauté</td><td>Contribuer (+20 points par photo, +50 par nouveau produit), le classement, une photo d'étiquette qui complète une fiche ; ou un visuel sans texte.</td><td>Riso</td></tr>
      <tr><td>Temps forts</td><td>Saisons</td><td>Journée mondiale de l'alimentation (16 octobre), rentrée, Ramadan et Aïd, été (crème solaire, univers beauté), Journée de la Terre.</td><td>Riso</td></tr>
    </table></div>
    <ul class="rules">
      <li>Aucun chiffre inventé : les scores et les prix viennent de la base Bayen au moment de la publication.</li>
      <li>On valorise les bons produits ; on ne cite jamais une marque pour la dénigrer.</li>
      <li>Un écran montré est toujours une capture réelle de bayen.ma.</li>
      <li>Pas de conseil médical ; « perturbateur endocrinien » toujours qualifié (suspecté ou avéré) et sourcé.</li>
    </ul>
  </section>
</main>
'''
OUT.write_text(html)
# Stickers à plat, un par bloc, pour l'export PNG transparent (références de Codex)
FLAT = {'wordmark': st_wordmark('flat'), 'sigle': st_sigle('flat'), 'etiquette': st_plu('flat'), 'score-100': st_score('flat'),
        'darija-wadeh-wbayen': st_pill('واضح وباين', C['citron'], 'flat', rtl=True), 'scanne': st_barcode('flat'),
        'vrai': st_pill('VRAI', C['menthe'], 'flat', w=420, h=170, rot=-8, size=88, font='Unbounded', weight=800),
        'faux': st_pill('FAUX', C['tomate'], 'flat', w=420, h=170, rot=7, size=88, font='Unbounded', weight=800), 'e171': st_e171('flat')}
(OUT.parent / 'stickers-flat.html').write_text('<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@800&family=Readex+Pro:wght@400;600&display=swap">'
    '<style>body{margin:0;background:transparent}div{width:1000px;padding:12px}svg{width:100%;height:auto;display:block;overflow:visible}</style>' + FILTERS
    + ''.join(f'<div id="{k}">{v}</div>' for k, v in FLAT.items()))
print('ok', len(html) // 1024, 'Ko')
