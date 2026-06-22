"""
Bayen OCR + IA Pipeline API
- /health        — health check (config IA incluse)
- /ocr           — OCR brut (Tesseract)
- /pipeline      — OCR étiquette → parsing nutritionnel via IA → JSON (produits)
- /meal-analyze  — Analyse photo de plat via vision IA → estimation calories/macros

IA : serveur vLLM partagé (OpenAI-compatible), modèle multimodal Qwen3.5-9B.
Configuré par env AI_BASE_URL / AI_MODEL / AI_API_KEY.
"""

from flask import Flask, request, jsonify
import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
import base64
import io
import json
import os
import time
import requests

app = Flask(__name__)

# ─── Configuration IA (vLLM OpenAI-compatible) ─────────────────────────
# AI_BASE_URL inclut le /v1 ; on append /chat/completions et /models.
AI_BASE_URL = os.environ.get('AI_BASE_URL', 'http://192.168.1.123:8000/v1').rstrip('/')
AI_MODEL = os.environ.get('AI_MODEL', 'qwen3.5-9b')
AI_API_KEY = os.environ.get('AI_API_KEY', 'sk-local')

# Côté grand côté max pour les images envoyées au modèle vision.
# Le serveur cappe à ~768×768 → envoyer plus gros = gaspillage/latence.
AI_IMAGE_MAX_SIDE = int(os.environ.get('AI_IMAGE_MAX_SIDE', '768'))


def _ai_chat(messages, max_tokens=800, timeout=60, temperature=0.2):
    """Appel chat/completions vLLM (OpenAI-compatible).

    Force la sortie JSON stricte (response_format) et désactive le mode
    "thinking" (réponse directe). Retourne le dict JSON parsé, ou None.
    """
    payload = {
        'model': AI_MODEL,
        'messages': messages,
        'response_format': {'type': 'json_object'},
        'chat_template_kwargs': {'enable_thinking': False},
        'temperature': temperature,
        'max_tokens': max_tokens,
    }
    try:
        resp = requests.post(
            f'{AI_BASE_URL}/chat/completions',
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {AI_API_KEY}',
            },
            timeout=timeout,
        )
        if resp.status_code != 200:
            app.logger.warning(f'AI HTTP {resp.status_code}: {resp.text[:300]}')
            return None
        data = resp.json()
        content = data['choices'][0]['message']['content'].strip()
        # response_format=json_object garantit du JSON, mais on déballe un
        # éventuel fence markdown par sécurité.
        if '```json' in content:
            content = content.split('```json')[1].split('```')[0].strip()
        elif '```' in content:
            content = content.split('```')[1].split('```')[0].strip()
        return json.loads(content)
    except (requests.exceptions.RequestException, json.JSONDecodeError, KeyError, IndexError) as e:
        app.logger.warning(f'AI error: {e}')
        return None


def call_ai_text(system_prompt, user_prompt, retries=2, **kw):
    """Parsing texte (étiquette nutritionnelle OCR → JSON structuré)."""
    messages = [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_prompt},
    ]
    for attempt in range(retries + 1):
        result = _ai_chat(messages, **kw)
        if result is not None:
            return result
        if attempt < retries:
            time.sleep(1.5)
    return None


def call_ai_vision(system_prompt, user_text, image_b64, timeout=60):
    """Analyse vision : 1 image (data URL base64) + consigne texte."""
    messages = [
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': [
            {'type': 'text', 'text': user_text},
            {'type': 'image_url', 'image_url': {
                'url': f'data:image/jpeg;base64,{image_b64}'
            }},
        ]},
    ]
    return _ai_chat(messages, max_tokens=700, timeout=timeout)


def resize_for_ai(image, max_side=AI_IMAGE_MAX_SIDE):
    """Redimensionne ≤ max_side sur le grand côté + convertit en RGB."""
    if image.mode != 'RGB':
        image = image.convert('RGB')
    w, h = image.size
    if max(w, h) <= max_side:
        return image
    if w >= h:
        new = (max_side, int(h * max_side / w))
    else:
        new = (int(w * max_side / h), max_side)
    return image.resize(new, Image.LANCZOS)


# ─── Prompts ───────────────────────────────────────────────────────────

# Parsing nutritionnel (étiquette produit, via /pipeline)
NUTRITION_SYSTEM = (
    "Tu es un expert en nutrition et réglementation alimentaire marocaine et "
    "européenne. Tu analyses des données nutritionnelles extraites par OCR "
    "d'étiquettes de produits. Tu retournes UNIQUEMENT du JSON valide."
)

NUTRITION_PROMPT = """Voici le texte brut extrait par OCR d'un tableau nutritionnel marocain (peut contenir des erreurs OCR) :

{ocr_text}

Extrait les valeurs nutritionnelles pour 100g. Retourne ce JSON exact :
{{
  "product_name": "...",
  "brand": "...",
  "energy_kcal_100g": null,
  "fat_total_100g": null,
  "fat_saturated_100g": null,
  "carbs_total_100g": null,
  "sugars_100g": null,
  "fiber_100g": null,
  "proteins_100g": null,
  "salt_100g": null,
  "ingredients_text": "...",
  "additives_found": [],
  "nova_group": null,
  "parsing_confidence": 0.0
}}

Si une valeur est illisible ou absente, mets null. Ne jamais inventer de valeurs."""


# Analyse photo de plat (via /meal-analyze)
MEAL_SYSTEM = (
    "Tu es un nutritionniste. Tu analyses UNE photo de plat et tu retournes "
    "UNIQUEMENT du JSON valide respectant exactement ce schéma :\n"
    '{"plat":"", "ingredients":[], "portion_estimee_g":0, '
    '"calories_kcal":{"min":0,"max":0}, '
    '"macros_g":{"proteines":0,"glucides":0,"lipides":0}, '
    '"confiance":"faible|moyenne|elevee", "remarques":""}\n\n'
    "RÈGLES IMPÉRATIVES :\n"
    "- Les valeurs nutritionnelles sont des ESTIMATIONS d'après la portion "
    "VISIBLE sur la photo. Donne TOUJOURS des fourchettes (min/max) pour "
    "calories_kcal, jamais un chiffre précis unique.\n"
    "- macros_g (protéines, glucides, lipides) sont en grammes pour la portion "
    "visible, estimés au mieux.\n"
    "- confiance reflète ta certitude : \"elevee\" si plat clair et identifiable, "
    "\"moyenne\" si partiellement, \"faible\" si flou/ambigu.\n"
    "- N'INVENTE pas de chiffres précis. Ne donne AUCUN conseil médical ou "
    "diététique. remarques = courte note factuelle (1 phrase max).\n"
    "- Décris uniquement ce qui est réellement visible ; n'ajoute aucun aliment "
    "non présent.\n"
    "- Si l'image n'est PAS un plat (objet, personne, paysage, produit emballé), "
    'retourne exactement {"plat":null,"remarques":"image non reconnue comme un plat"}.'
)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'tesseract_version': str(pytesseract.get_tesseract_version()),
        'ai_base_url': AI_BASE_URL,
        'ai_model': AI_MODEL,
    })


def preprocess_image(image):
    """Prétraitement image pour améliorer l'OCR Tesseract."""
    image = image.convert('L')
    image = ImageEnhance.Contrast(image).enhance(2.0)
    image = image.filter(ImageFilter.SHARPEN)
    return image


@app.route('/ocr', methods=['POST'])
def ocr():
    """OCR brut — retourne le texte extrait."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    file = request.files['image']
    lang = request.form.get('lang', 'fra+ara')
    preprocess = request.form.get('preprocess', 'true').lower() == 'true'

    try:
        image = Image.open(io.BytesIO(file.read()))
        if preprocess:
            image = preprocess_image(image)

        data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
        confidences = [c for c in data['conf'] if c > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
        text = pytesseract.image_to_string(image, lang=lang)

        return jsonify({
            'text': text.strip(),
            'confidence': round(avg_confidence, 1),
            'lang': lang,
            'word_count': len([w for w in text.split() if len(w) > 1]),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pipeline', methods=['POST'])
def pipeline():
    """OCR étiquette → parsing nutritionnel IA → JSON structuré (produits)."""
    if 'image_nutrition' not in request.files:
        return jsonify({'error': 'image_nutrition requise', 'job_status': 'error'}), 400

    barcode = request.form.get('barcode', '')
    start_time = time.time()

    try:
        # Étape 1 : OCR Tesseract
        file = request.files['image_nutrition']
        image = Image.open(io.BytesIO(file.read()))
        processed = preprocess_image(image)

        ocr_data = pytesseract.image_to_data(processed, lang='fra+ara', output_type=pytesseract.Output.DICT)
        confidences = [c for c in ocr_data['conf'] if c > 0]
        ocr_confidence = sum(confidences) / len(confidences) if confidences else 0
        ocr_text = pytesseract.image_to_string(processed, lang='fra+ara').strip()

        ocr_duration = int((time.time() - start_time) * 1000)

        if ocr_confidence < 50:
            return jsonify({
                'job_status': 'low_confidence',
                'ocr_confidence': round(ocr_confidence, 1),
                'ocr_text': ocr_text,
                'message': 'Photo trop floue ou illisible. Essayez avec une meilleure photo.',
                'duration_ms': ocr_duration,
            })

        # Étape 2 : parsing nutritionnel via IA
        ai_start = time.time()
        prompt = NUTRITION_PROMPT.format(ocr_text=ocr_text)
        parsed = call_ai_text(NUTRITION_SYSTEM, prompt)
        ai_duration = int((time.time() - ai_start) * 1000)

        if parsed is None:
            return jsonify({
                'job_status': 'manual_required',
                'ocr_confidence': round(ocr_confidence, 1),
                'ocr_text': ocr_text,
                'message': "L'IA n'a pas pu analyser le texte. Saisissez les données manuellement.",
                'duration_ms': ocr_duration + ai_duration,
            })

        total_duration = int((time.time() - start_time) * 1000)

        return jsonify({
            'job_status': 'done',
            'barcode': barcode,
            'ocr_confidence': round(ocr_confidence, 1),
            'ocr_text': ocr_text,
            'parsed_data': {
                'product_name': parsed.get('product_name'),
                'brand': parsed.get('brand'),
                'energy_kcal': parsed.get('energy_kcal_100g'),
                'fat_total': parsed.get('fat_total_100g'),
                'fat_saturated': parsed.get('fat_saturated_100g'),
                'carbs_total': parsed.get('carbs_total_100g'),
                'sugars': parsed.get('sugars_100g'),
                'fiber': parsed.get('fiber_100g'),
                'proteins': parsed.get('proteins_100g'),
                'salt': parsed.get('salt_100g'),
                'ingredients_text': parsed.get('ingredients_text', ''),
                'additives': parsed.get('additives_found', []),
                'nova_group': parsed.get('nova_group'),
            },
            'parsing_confidence': parsed.get('parsing_confidence', 0.7),
            'duration_ms': total_duration,
            'timing': {'ocr_ms': ocr_duration, 'ai_ms': ai_duration},
        })

    except Exception as e:
        app.logger.error(f'Pipeline error: {e}')
        return jsonify({
            'job_status': 'error',
            'error': str(e),
            'duration_ms': int((time.time() - start_time) * 1000),
        }), 500


def _num(v, lo, hi):
    """Coerce en nombre borné, ou None."""
    try:
        n = float(v)
    except (TypeError, ValueError):
        return None
    if n != n:  # NaN
        return None
    return max(lo, min(hi, n))


def _int(v, lo, hi):
    n = _num(v, lo, hi)
    return int(round(n)) if n is not None else None


@app.route('/meal-analyze', methods=['POST'])
def meal_analyze():
    """Analyse une photo de plat via vision IA.

    Input  : multipart/form-data avec `image`.
    Output : estimation calories (fourchette) + macros + confiance.
             Les valeurs sont des ESTIMATIONS, jamais des chiffres médicaux.
    """
    if 'image' not in request.files:
        return jsonify({'error': "'image' requise", 'job_status': 'error'}), 400

    start_time = time.time()

    try:
        file = request.files['image']
        raw_bytes = file.read()
        if len(raw_bytes) > 8 * 1024 * 1024:
            return jsonify({'error': 'Image trop grande (>8 MB)', 'job_status': 'error'}), 400

        image = Image.open(io.BytesIO(raw_bytes))
        image = resize_for_ai(image)

        buf = io.BytesIO()
        image.save(buf, format='JPEG', quality=85)
        image_b64 = base64.b64encode(buf.getvalue()).decode('ascii')

        ai_start = time.time()
        parsed = call_ai_vision(MEAL_SYSTEM, 'Analyse ce plat.', image_b64, timeout=60)
        ai_duration = int((time.time() - ai_start) * 1000)

        if parsed is None:
            return jsonify({
                'job_status': 'error',
                'message': "L'IA n'a pas pu analyser l'image. Réessayez avec une meilleure photo.",
                'duration_ms': int((time.time() - start_time) * 1000),
            }), 502

        # Guard : pas un plat (le modèle renvoie plat=null)
        if parsed.get('plat') in (None, '', 'null'):
            return jsonify({
                'job_status': 'not_a_meal',
                'message': parsed.get('remarques') or "Cette photo ne semble pas être un plat. Prends une photo de ton assiette.",
                'duration_ms': int((time.time() - start_time) * 1000),
            })

        # Normalisation défensive de la sortie modèle
        cal = parsed.get('calories_kcal') or {}
        macros = parsed.get('macros_g') or {}
        cal_min = _int(cal.get('min'), 0, 6000)
        cal_max = _int(cal.get('max'), 0, 6000)
        # Garantir min <= max
        if cal_min is not None and cal_max is not None and cal_min > cal_max:
            cal_min, cal_max = cal_max, cal_min

        confiance = str(parsed.get('confiance', 'moyenne')).lower()
        if confiance not in ('faible', 'moyenne', 'elevee'):
            confiance = 'moyenne'

        ingredients = parsed.get('ingredients') or []
        if isinstance(ingredients, list):
            ingredients = [str(x) for x in ingredients if isinstance(x, (str, int, float))][:30]
        else:
            ingredients = []

        total_duration = int((time.time() - start_time) * 1000)

        return jsonify({
            'job_status': 'done',
            'duration_ms': total_duration,
            'timing': {'ai_ms': ai_duration},
            'model': AI_MODEL,
            'analysis': {
                'plat': str(parsed.get('plat'))[:200],
                'ingredients': ingredients,
                'portion_estimee_g': _int(parsed.get('portion_estimee_g'), 0, 5000),
                'calories_kcal': {'min': cal_min, 'max': cal_max},
                'macros_g': {
                    'proteines': _int(macros.get('proteines'), 0, 500),
                    'glucides': _int(macros.get('glucides'), 0, 500),
                    'lipides': _int(macros.get('lipides'), 0, 500),
                },
                'confiance': confiance,
                'remarques': str(parsed.get('remarques', ''))[:500],
            },
        })

    except Exception as e:
        app.logger.error(f'meal-analyze error: {e}')
        return jsonify({
            'job_status': 'error',
            'error': str(e),
            'duration_ms': int((time.time() - start_time) * 1000),
        }), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
