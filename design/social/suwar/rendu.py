"""Rend un ou plusieurs lots du calendrier avec les templates Suwar : un jeu de données par gabarit et par
format (post 4:5, story 9:16), rempli depuis lot-N.json, puis rendu en lot. Les images arrivent dans
design/social/calendrier/out/rendus/<id>-post.png et <id>-story.png.
   python3 rendu.py 1 2        (jeux de données « Bayen · lot 1-2 · <gabarit> · <format> », remplacés à chaque fois)"""
import json, re, sys
from pathlib import Path
import numpy as np
from PIL import Image
from suwar import call, telecharge, PROJET

D = Path(__file__).resolve().parent
CAL = D.parent / 'calendrier'
OUT = CAL / 'out' / 'rendus'; OUT.mkdir(parents=True, exist_ok=True)
U = json.loads((D / 'uploads.json').read_text())
T = json.loads((D / 'templates.json').read_text())
CACHE = D / 'datasets.json'
ds_ids = json.loads(CACHE.read_text()) if CACHE.exists() else {}
COUL = {'menthe': '#19C08B', 'citron': '#FFD43B', 'tomate': '#FF5A3C', 'myrtille': '#6B7BFF', 'figue': '#B98CFF', 'framboise': '#FF8FB1'}
GAB = {'scene': 'Scène', 'photo': 'Photo', 'xxl': 'XXL', 'bulle': 'Bulle', 'plein': 'Plein écran', 'fete': 'Plein écran'}
SLOT = {'vrai': 'Sticker1', 'sahih': 'Sticker1', 'e171': 'Sticker1', 'e300': 'Sticker1', 'faux': 'Sticker2', 'ghalet': 'Sticker2',
        'wordmark': 'Sticker2', 'scanne': 'Sticker2'}
# Un titre est « long » au-delà de deux lignes (mesuré sur les gabarits : ~34 signes en Unbounded XXL, ~40 sur la bande photo)
LONG = {'XXL': 34, 'Photo': 40, 'Plein écran': 34}


def fond_scene(k, haut=False):
    """Couleur du bas (ou du haut) de la scène riso : prolonge l'image dans la story."""
    im = np.asarray(Image.open(D.parents[0] / 'scenes' / f'{k}.png').convert('RGB'))
    bande = im[:int(im.shape[0] * .02)] if haut else im[int(im.shape[0] * .93):]
    return '#%02X%02X%02X' % tuple(int(v) for v in np.median(bande.reshape(-1, 3), 0))


def ligne(p, fmt):
    """Variables Suwar d'un post (fmt = 1350 post, 1920 story) et nom du gabarit + variante."""
    v, L = p['visuel'], p['visuel']['layout']
    if L == 'fete': L = 'plein'
    g, ar = GAB[L], p.get('lang') == 'ar'
    r = {'Rubrique': p['kicker'], 'Titre': p['titre']}
    if L in ('photo', 'xxl', 'plein'): r['Texte'] = p.get('texte', '')
    if L == 'scene':
        r |= {'Image': U[f'scene-{v["scene"]}'], 'Fond': fond_scene(v['scene'])}
        if fmt == 1920: r['FondHaut'] = fond_scene(v['scene'], haut=True)
    elif L == 'photo':
        r |= {'Image': U[f'photo-{v["photo"]}'], 'Bande': COUL[v['bande']], 'Pastille': U[f'sticker-score-{v["score"]}'] if v.get('score') else ''}
    elif L == 'plein':
        r |= {'Image': U[f'plein-{v["image"]}'], 'TitreAr': p.get('titreAr', ''), 'Signature': p.get('signature', '')}
    else:  # xxl, bulle : fond texturé au format, Naânaa riso, stickers riso
        r |= {'Fond': U[f'fond-{v["fond"]}-{fmt}'], 'Naanaa': U[f'naanaa-{v["naanaa"]}']}
        stk = v.get('stickers', [])
        if L == 'xxl':
            r |= {'Appel': p.get('cta', ''), 'Encre': '#FFF3DF' if v['fond'] == 'zellige' else '#1B1B1B', 'Sticker1': '', 'Sticker2': ''}
            for s in stk: r[SLOT[s]] = U[f'sticker-{s}']
    long = g in LONG and len(p['titre']) > LONG[g] * (1.25 if ar else 1)
    variante = ('Darija long' if long else 'Darija') if ar else ('Long' if long else '')
    if ar:  # texte arabe isolé en sens droite-à-gauche (RLE…PDF) : chiffres et ponctuation restent à leur place
        for k in ('Rubrique', 'Titre', 'Texte', 'Appel', 'TitreAr'):
            if r.get(k): r[k] = '\u202b' + r[k] + '\u202c'
    elif r.get('TitreAr'):
        r['TitreAr'] = '\u202b' + r['TitreAr'] + '\u202c'
    if not ar:  # typographie française : espace insécable avant ? ! ; : et dans les guillemets
        for k in ('Rubrique', 'Titre', 'Texte', 'Appel'):
            if r.get(k): r[k] = re.sub(r'(\d) %', '\\1\u00a0%', re.sub(r' ([?!;:])', '\u00a0\\1', r[k].replace('« ', '«\u00a0').replace(' »', '\u00a0»')))
    return (g, variante), r


if __name__ == '__main__':  # importable (retouches.py réutilise ligne())
    lots = [a for a in sys.argv[1:] if not a.startswith('--')] or ['1']
    posts = [p for n in lots for p in json.loads((CAL / f'lot-{n}.json').read_text())['posts']]
    nom_lots = '-'.join(lots)
    for fmt, suffixe in ((1350, 'Post'), (1920, 'Story')):
        groupes = {}
        for p in posts:
            (g, variante), r = ligne(p, fmt)
            groupes.setdefault(g, []).append((p['id'], variante, r))
        for g, rangs in groupes.items():
            tid = T[f'{g} · {suffixe}']['id']
            # Jeu de données Suwar (réutilisable depuis l'interface) : une ligne par post ; la variante se choisit au rendu
            cle = f'Bayen · lot {nom_lots} · {g} · {suffixe}'
            if cle not in ds_ids:
                ds_ids[cle] = call('create_dataset', {'name': cle, 'templateId': tid, 'projectId': PROJET})['id']
                CACHE.write_text(json.dumps(ds_ids, indent=1, ensure_ascii=False))
            call('add_dataset_rows', {'id': ds_ids[cle], 'rows': [r for _, _, r in rangs], 'mode': 'replace'})
            # Rendu post par post : la réponse d'un rendu par lot n'arrive pas toujours (rendus faits côté Suwar, réponse perdue)
            for pid, variante, r in rangs:
                dest = OUT / f'{pid}-{suffixe.lower()}.png'
                if '--reprise' in sys.argv and dest.exists(): continue
                args = {'id': tid, 'format': 'png', 'variables': r}
                if variante: args['variant'] = variante
                telecharge(call('render_template', args)['outputUrl'], dest)
            print('ok', cle, len(rangs), 'rendus', flush=True)
