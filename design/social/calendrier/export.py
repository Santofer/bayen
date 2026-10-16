"""Export des lots du calendrier en CSV d'import en masse ContentStudio (même format que nBot et Risala) :
un fichier par réseau (Instagram, Facebook, LinkedIn) et un pour les stories Instagram + Facebook.
Les visuels sont ceux rendus par Suwar (out/rendus), téléversés dans Directus (scripts/upload-reseaux.py) :
leur correspondance nom → id est dans out/ids-directus.json.
   python3 export.py 1 2 3   → out/csv/bayen-<réseau>.csv"""
import csv, json, sys
from datetime import datetime, timedelta
from pathlib import Path
from legendes import legendes, linkedin

D = Path(__file__).resolve().parent
IDS = json.loads((D / 'out/ids-directus.json').read_text())
OUT = D / 'out/csv'; OUT.mkdir(parents=True, exist_ok=True)
ENTETE = ['Post date and time', 'Post caption', 'Image URL', 'Link', 'First Comment', 'Link in caption', 'Video URL', 'Post Type', 'Post Title']


def url(pid, fmt):
    nom = f'bayen-{pid}-{fmt}.jpg'
    if nom not in IDS: sys.exit(f'[err] visuel absent de Directus : {nom} (relancer rendu.py puis upload-reseaux.py)')
    return f'https://api.bayen.ma/assets/{IDS[nom]}/{nom}'


def quand(p, decalage=0, heure=None):
    t = datetime.strptime(f"{p['date']} {heure or p['heure']}", '%Y-%m-%d %H:%M') + timedelta(hours=decalage)
    return t.strftime('%d/%m/%Y %H:%M')


lots = sys.argv[1:] or ['1']
posts = sorted((p for n in lots for p in json.loads((D / f'lot-{n}.json').read_text())['posts']), key=lambda p: (p['date'], p['heure']))
lignes = {'instagram': [], 'facebook': [], 'linkedin': [], 'stories-instagram-facebook': []}
for p in posts:
    lg, titre = legendes(p), f"Bayen {p['date']} {p['id'][11:]}"
    lignes['instagram'].append([quand(p), lg['instagram'], url(p['id'], 'post'), '', '', 'No', '', 'Feed', titre])
    lignes['facebook'].append([quand(p), lg['facebook'], url(p['id'], 'post'), '', '', 'No', '', 'Feed', titre])
    li = linkedin(p)
    if li:  # LinkedIn : fêtes à l'heure du post, le reste à 12 h 30 (pause déjeuner, public professionnel)
        lignes['linkedin'].append([quand(p, heure=None if p['rubrique'] == 'fete' else '12:30'), li, url(p['id'], 'post'), '', '', 'No', '', 'Feed', titre])
    # Story : deux heures après le post, légende courte (le titre)
    lignes['stories-instagram-facebook'].append([quand(p, 2), p['titre'], url(p['id'], 'story'), '', '', 'No', '', 'Story', titre + ' story'])

for res, rows in lignes.items():
    with open(OUT / f'bayen-{res}.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, quoting=csv.QUOTE_ALL)
        w.writerow(ENTETE); w.writerows(rows)
    print(f'bayen-{res}.csv : {len(rows)} publications')
