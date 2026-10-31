"""Soumet les URL de bayen.ma à IndexNow (Bing, Yandex, Seznam…) : l'index Bing alimente la recherche de
ChatGPT et de Copilot. La clé est le fichier frontend/public/<clé>.txt, servi à la racine du site.
   python3 scripts/indexnow.py            → toutes les URL du sitemap
   python3 scripts/indexnow.py URL…       → seulement ces URL (après une modification de page)"""
import json, re, sys, urllib.request
from pathlib import Path

HOST = 'bayen.ma'
cle = next(p.stem for p in (Path(__file__).resolve().parents[1] / 'frontend/public').glob('*.txt') if re.fullmatch(r'[0-9a-f]{32}', p.stem))
UA = {'User-Agent': 'Bayen-IndexNow/1.0 (contact@n0.ma)'}  # sans User-Agent, Cloudflare refuse

def sitemap():
    xml = urllib.request.urlopen(urllib.request.Request(f'https://{HOST}/sitemap.xml', headers=UA), timeout=60).read().decode()
    return re.findall(r'<loc>([^<]+)</loc>', xml)

urls = sys.argv[1:] or sitemap()
for i in range(0, len(urls), 10_000):  # 10 000 URL au plus par envoi
    corps = json.dumps({'host': HOST, 'key': cle, 'keyLocation': f'https://{HOST}/{cle}.txt', 'urlList': urls[i:i + 10_000]}).encode()
    req = urllib.request.Request('https://api.indexnow.org/indexnow', data=corps, method='POST', headers={**UA, 'Content-Type': 'application/json; charset=utf-8'})
    with urllib.request.urlopen(req, timeout=60) as r:
        print(f'{len(urls[i:i + 10_000])} URL envoyées → HTTP {r.status}')
