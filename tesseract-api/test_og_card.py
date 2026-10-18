"""Vérif rapide de /og-card (sans réseau) : python3 tesseract-api/test_og_card.py"""
import io

from PIL import Image, ImageDraw

import app

# Format WhatsApp : JPEG 1200×630 < 300 Ko, avec ou sans score, photo absente ou injoignable
for payload in (
    {'name': 'Flocons d’avoine', 'brand': 'Javana', 'quantity': '500 g', 'kind': 'food',
     'score': 100, 'label': 'excellent', 'nutriscore': 'A', 'nova': 1},
    {'name': 'Crème ' * 40, 'kind': 'cosmetic', 'score': None, 'insufficient': True,
     'image_url': 'http://127.0.0.1:9/absente.jpg'},
    {'name': 'حليب كامل الدسم', 'brand': 'جودة', 'barcode': '6111252420000', 'score': 45, 'label': 'mediocre'},
):
    jpeg = app.render_og_card(payload)
    im = Image.open(io.BytesIO(jpeg))
    assert (im.format, im.size) == ('JPEG', (1200, 630)) and len(jpeg) < app.OG_MAX_BYTES, payload

# Coupe : 3 lignes max, ellipse finale, aucun débordement (même un mot plus long que la ligne)
dr = ImageDraw.Draw(Image.new('RGB', (10, 10)))
font = app._og_font('Unbounded.ttf', 50, 800)
lines = app._og_wrap(dr, 'Supercalifragilisticexpialidocious ' + 'biscuits fourrés ' * 10, font, 1000, 3)
assert len(lines) == 3 and lines[-1].endswith('…'), lines
assert all(dr.textlength(line, font=font) <= 1000 for line in lines), lines
print('og-card ok — raqm (arabe) :', app.OG_RAQM)
