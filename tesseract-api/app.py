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
    "Tu es un coach nutrition bienveillant. Tu analyses UNE photo de repas et tu "
    "retournes UNIQUEMENT du JSON valide respectant exactement ce schéma :\n"
    '{"plat":"", "ingredients":[], "portion_estimee_g":0, '
    '"calories_kcal":{"min":0,"max":0}, '
    '"macros_g":{"proteines":0,"glucides":0,"lipides":0}, '
    '"verdict":"sain|equilibre|a_limiter|occasionnel", '
    '"caracteristiques":[], "conseil":"", "alternatives":[], '
    '"confiance":"faible|moyenne|elevee", "remarques":""}\n\n'
    "RÈGLES IMPÉRATIVES :\n"
    "- calories_kcal : TOUJOURS une fourchette (min/max), estimée pour TOUT ce "
    "qui est visible (plusieurs items = somme). macros_g = grammes pour la "
    "portion visible totale.\n"
    "- verdict : juge l'ensemble du repas de façon HOLISTIQUE et honnête.\n"
    "  • \"sain\" = repas à base de légumes/légumineuses/protéines maigres, peu "
    "transformé, peu gras/sucré.\n"
    "  • \"equilibre\" = repas correct et raisonnable.\n"
    "  • \"a_limiter\" = gras, sucré, salé ou calorique, à modérer.\n"
    "  • \"occasionnel\" = fast-food, friture, très gras/calorique/sucré, à "
    "réserver aux occasions (ex : burger + frites + soda = occasionnel).\n"
    "- caracteristiques : 2 à 4 tags COURTS et factuels parmi ce style : "
    "\"calorique\", \"gras\", \"frit\", \"sucré\", \"salé\", \"ultra-transformé\", "
    "\"riche en protéines\", \"riche en fibres\", \"riche en légumes\", \"léger\".\n"
    "- conseil : UNE phrase pratique et bienveillante, PERTINENTE par rapport au "
    "repas RÉELLEMENT montré (ne propose pas de retirer un aliment absent). Si le "
    "repas est déjà sain, valorise-le simplement. PAS de conseil médical/clinique, "
    "pas de mention de maladie.\n"
    "- alternatives : 2 à 3 alternatives concrètes plus saines au repas montré "
    "(courtes, ex : \"Burger maison pain complet + légumes grillés\").\n"
    "- confiance : \"elevee\" si plat clair, \"moyenne\" si partiel, \"faible\" "
    "si flou/ambigu. N'invente pas de chiffres précis.\n"
    "- remarques : note descriptive factuelle (1 phrase max).\n"
    "- Décris uniquement ce qui est réellement visible.\n"
    "- Si l'image n'est PAS un repas (objet, personne, paysage, produit emballé), "
    'retourne exactement {"plat":null,"remarques":"image non reconnue comme un plat"}.'
)


# Estimation nutritionnelle d'un aliment générique (via /estimate-nutrition)
# L'IA ESTIME des valeurs de référence ; le SCORE reste calculé par l'algo
# déterministe côté app (règle CLAUDE.md : l'IA ne calcule jamais le score).
ESTIMATE_SYSTEM = (
    "Tu es un expert en composition nutritionnelle des aliments (tables CIQUAL / "
    "USDA). À partir du NOM d'un produit, tu estimes ses valeurs nutritionnelles "
    "de référence pour 100 g. Tu retournes UNIQUEMENT du JSON valide :\n"
    '{"estimable":true, "aliment":"", '
    '"nutrition_100g":{"energy_kcal":0,"fat_total":0,"fat_saturated":0,'
    '"carbs_total":0,"sugars":0,"fiber":0,"proteins":0,"salt":0}, '
    '"nova_group":1, "confiance":"faible|moyenne|elevee"}\n\n'
    "RÈGLES IMPÉRATIVES :\n"
    "- N'estime QUE les aliments GÉNÉRIQUES / de base dont les valeurs de "
    "référence sont bien connues et peu variables : semoule, farine, riz, pâtes "
    "sèches, couscous, légumineuses (lentilles, pois chiches), huiles, sucre, "
    "sel, épices, fruits et légumes bruts, lait nature, œufs, miel, thé, café…\n"
    "- Si le produit est une PRÉPARATION de marque ou un produit transformé "
    "complexe dont les valeurs varient beaucoup (biscuits, chocolats, plats "
    "préparés, sauces, sodas, yaourts aromatisés de marque…), OU un nom vague / "
    "non identifiable → estimable=false et toutes les valeurs à null.\n"
    "- Valeurs pour 100 g, réalistes et cohérentes entre elles.\n"
    "- nova_group : 1=brut/minimalement transformé, 2=ingrédient culinaire, "
    "3=transformé, 4=ultra-transformé.\n"
    "- confiance : \"elevee\" pour un aliment de base très standard, sinon "
    "\"moyenne\"/\"faible\".\n"
    "- Dans le doute sur un produit de marque : estimable=false. N'invente jamais. "
    "Pas d'avis médical."
)


@app.route('/estimate-nutrition', methods=['POST'])
def estimate_nutrition():
    """Estime la nutrition/100g d'un aliment GÉNÉRIQUE depuis son nom (Qwen).

    Input  : JSON {name, brand?, category?}
    Output : {estimable, aliment, nutrition_100g, nova_group, confiance}
             estimable=false si produit de marque / non identifiable.
             Le score Bayen est calculé ensuite par l'algo déterministe.
    """
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    if not name:
        return jsonify({'estimable': False, 'error': 'name requis'}), 400

    context_bits = str(data.get('category', '') or data.get('brand', '')).strip()
    start = time.time()

    user = f"Produit : {name}"
    if context_bits:
        user += f"\nContexte (marque/catégorie) : {context_bits}"
    user += "\n\nEstime les valeurs nutritionnelles de référence pour 100 g de cet aliment."

    try:
        parsed = call_ai_text(ESTIMATE_SYSTEM, user, max_tokens=400)
        dur = int((time.time() - start) * 1000)

        if parsed is None:
            return jsonify({'estimable': False, 'message': "L'IA n'a pas pu estimer.", 'duration_ms': dur}), 502

        if not parsed.get('estimable'):
            return jsonify({'estimable': False, 'duration_ms': dur})

        n = parsed.get('nutrition_100g') or {}
        nutrition = {
            'energy_kcal': _num(n.get('energy_kcal'), 0, 1000),
            'fat_total': _num(n.get('fat_total'), 0, 100),
            'fat_saturated': _num(n.get('fat_saturated'), 0, 100),
            'carbs_total': _num(n.get('carbs_total'), 0, 100),
            'sugars': _num(n.get('sugars'), 0, 100),
            'fiber': _num(n.get('fiber'), 0, 100),
            'proteins': _num(n.get('proteins'), 0, 100),
            'salt': _num(n.get('salt'), 0, 100),
        }
        # Garde-fou : sans énergie, l'estimation n'est pas exploitable
        if nutrition['energy_kcal'] is None:
            return jsonify({'estimable': False, 'duration_ms': dur})

        confiance = str(parsed.get('confiance', 'moyenne')).lower()
        if confiance not in ('faible', 'moyenne', 'elevee'):
            confiance = 'moyenne'

        return jsonify({
            'estimable': True,
            'aliment': str(parsed.get('aliment') or name)[:120],
            'nutrition_100g': nutrition,
            'nova_group': _int(parsed.get('nova_group'), 1, 4),
            'confiance': confiance,
            'duration_ms': dur,
            'model': AI_MODEL,
        })
    except Exception as e:
        app.logger.error(f'estimate-nutrition error: {e}')
        return jsonify({'estimable': False, 'error': str(e), 'duration_ms': int((time.time() - start) * 1000)}), 500


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

        # Verdict qualitatif holistique (remplace le score Nutri-Score, inadapté
        # aux repas complets).
        verdict = str(parsed.get('verdict', '')).lower().strip()
        if verdict not in ('sain', 'equilibre', 'a_limiter', 'occasionnel'):
            verdict = 'equilibre'

        caracteristiques = parsed.get('caracteristiques') or []
        if isinstance(caracteristiques, list):
            caracteristiques = [str(x)[:30] for x in caracteristiques if isinstance(x, (str, int, float))][:5]
        else:
            caracteristiques = []

        alternatives = parsed.get('alternatives') or []
        if isinstance(alternatives, list):
            alternatives = [str(x)[:160] for x in alternatives if isinstance(x, (str, int, float))][:4]
        else:
            alternatives = []

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
                'verdict': verdict,
                'caracteristiques': caracteristiques,
                'conseil': str(parsed.get('conseil', ''))[:400],
                'alternatives': alternatives,
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
