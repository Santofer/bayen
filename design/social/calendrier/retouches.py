"""Calendrier à part des visuels refaits après correction des templates Suwar (18/10/2026) :
- XXL « Vrai ou faux » : pastille d'appel rognée en bas (post + story) ;
- Bulle « L'astuce de Naânaa » : logo normal en clair à la place du sticker riso (post + story) ;
- Scène : en story, la scène descend contre le texte (story seule).
Rend ces visuels dans out/retouches/<id>-<format>.png et garde les réponses de rendu (ids Suwar) dans
out/retouches/rendus.json.   python3 retouches.py [id…] [--reprise]   (sans id : tous ; --reprise saute les déjà rendus)
   python3 retouches.py --page → out/retouches/calendrier.html (calendrier de ces visuels, avec légendes)"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'suwar'))
from rendu import ligne, T  # noqa: E402
from suwar import call, telecharge  # noqa: E402

D = Path(__file__).resolve().parent
OUT = D / 'out' / 'retouches'; OUT.mkdir(parents=True, exist_ok=True)
CACHE = OUT / 'rendus.json'
rendus = json.loads(CACHE.read_text()) if CACHE.exists() else {}


def formats(p):
    """Formats à refaire pour un post (aucun s'il n'est pas touché par les corrections)."""
    L = p['visuel']['layout']
    if L == 'xxl': return ('post', 'story') if p.get('cta') else ()
    return {'bulle': ('post', 'story'), 'scene': ('story',)}.get(L, ())


posts = [p for n in (1, 2, 3) for p in json.loads((D / f'lot-{n}.json').read_text())['posts'] if formats(p)]
choix = [a for a in sys.argv[1:] if not a.startswith('--')]
if __name__ == '__main__' and '--page' not in sys.argv:
    for p in posts:
        if choix and p['id'] not in choix: continue
        for fmt in formats(p):
            if '--reprise' in sys.argv and f"{p['id']}-{fmt}" in rendus: continue
            (g, variante), r = ligne(p, 1350 if fmt == 'post' else 1920)
            args = {'id': T[f'{g} · {fmt.capitalize()}']['id'], 'format': 'png', 'variables': r}
            if variante: args['variant'] = variante
            res = call('render_template', args)
            telecharge(res['outputUrl'], OUT / f"{p['id']}-{fmt}.png")
            rendus[f"{p['id']}-{fmt}"] = res
            CACHE.write_text(json.dumps(rendus, indent=1, ensure_ascii=False))
            print('ok', p['id'], fmt, flush=True)


# ---------- Page « calendrier à part » : python3 retouches.py --page → out/retouches/calendrier.html ----------
if __name__ == '__main__' and '--page' in sys.argv:
    import base64, html, io
    from datetime import datetime, timedelta
    from PIL import Image
    from legendes import legendes
    JOURS = 'lun. mar. mer. jeu. ven. sam. dim.'.split()
    MOIS = 'janv. févr. mars avr. mai juin juil. août sept. oct. nov. déc.'.split()
    POURQUOI = {'xxl': 'Pastille « Réponse en caption » entière', 'bulle': 'Logo normal en clair, à l\'endroit', 'scene': 'Scène descendue contre le texte'}
    e = lambda t: html.escape(t, quote=True)

    def vignette(nom):
        im = Image.open(OUT / f'{nom}.png').convert('RGB'); im.thumbnail((540, 960), Image.LANCZOS)
        b = io.BytesIO(); im.save(b, 'JPEG', quality=80)
        return 'data:image/jpeg;base64,' + base64.b64encode(b.getvalue()).decode()

    def legende(titre, texte):
        return (f'<div class="leg"><div class="leg-h"><span>{titre}</span><button type="button" class="copier">Copier</button></div>'
                f'<p dir="auto">{e(texte)}</p></div>')

    lignes = []
    for p in posts:
        t = datetime.strptime(f"{p['date']} {p['heure']}", '%Y-%m-%d %H:%M'); ts = t + timedelta(hours=2)
        fm, lg, L = formats(p), legendes(p), p['visuel']['layout']
        vis = ''.join(f'<figure class="v {f}"><img src="{vignette(p["id"] + "-" + f)}" alt="{e(p["titre"])}" loading="lazy">'
                      f'<figcaption>{"Post" if f == "post" else "Story"} · {(t if f == "post" else ts):%H:%M}</figcaption></figure>' for f in fm)
        legs = (legende('Instagram', lg['instagram']) + legende('Facebook', lg['facebook']) if 'post' in fm else '') + legende('Story', p['titre'])
        lignes.append(f'''<article class="jour" dir="ltr">
  <div class="date"><span class="j">{JOURS[t.weekday()]}</span><b>{t.day}</b><span class="m">{MOIS[t.month - 1]} {t.year}</span></div>
  <div class="corps">
    <div class="tete"><h2 dir="auto">{e(p['titre'])}</h2>
      <div class="chips"><span class="chip {L}">{POURQUOI[L]}</span><span class="chip">{"Post + story" if 'post' in fm else "Story seule"}</span>{'<span class="chip ar">Darija</span>' if p.get('lang') == 'ar' else ''}</div></div>
    <div class="grille"><div class="visuels">{vis}</div><div class="legs">{legs}</div></div>
  </div>
</article>''')
    n_post = sum('post' in formats(p) for p in posts); n_story = sum('story' in formats(p) for p in posts)
    page = (D / 'retouches-gabarit.html').read_text().replace('{{N_POST}}', str(n_post)).replace('{{N_STORY}}', str(n_story)).replace('{{JOURS}}', '\n'.join(lignes))
    (OUT / 'calendrier.html').write_text(page)
    print('page', OUT / 'calendrier.html', len(page) // 1024, 'Ko')
