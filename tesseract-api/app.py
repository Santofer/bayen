"""
Bayen OCR Pipeline API
- /health — health check
- /ocr — OCR brut (Tesseract)
- /pipeline — Pipeline complet : OCR → Mistral parsing → JSON structuré
"""

from flask import Flask, request, jsonify
import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
import io
import json
import os
import time
import requests

app = Flask(__name__)

# URL Ollama (réseau Docker interne)
OLLAMA_URL = os.environ.get('OLLAMA_URL', 'http://bayen-ollama:11434')

# Prompt système pour Mistral
SYSTEM_PROMPT = """Tu es un expert en nutrition et en réglementation alimentaire européenne et marocaine.
Tu analyses des listes d'ingrédients et des données nutritionnelles extraites d'étiquettes de produits alimentaires.
Tu retournes UNIQUEMENT du JSON valide. Aucun texte avant ou après le JSON. Aucun markdown."""

# Prompt parsing nutritionnel
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


def preprocess_image(image):
    """Prétraitement image pour améliorer l'OCR"""
    image = image.convert('L')
    image = ImageEnhance.Contrast(image).enhance(2.0)
    image = image.filter(ImageFilter.SHARPEN)
    return image


# Modèle LLM — override via env var LLM_MODEL
# gemma3:4b-it-qat : ~14s/warm, ~3.5 GB VRAM, meilleur ratio vitesse/qualité
# alternatives testées : mistral:7b (20s), gemma4:e4b (94s, trop lent), qwen3:4b (288s, thinking mode)
LLM_MODEL = os.environ.get('LLM_MODEL', 'gemma3:4b-it-qat')


def call_llm(prompt, retries=2):
    """Appelle le LLM via Ollama avec retry"""
    for attempt in range(retries + 1):
        try:
            response = requests.post(
                f'{OLLAMA_URL}/api/generate',
                json={
                    'model': LLM_MODEL,
                    'prompt': f'{SYSTEM_PROMPT}\n\n{prompt}',
                    'stream': False,
                    'options': {'temperature': 0.1}
                },
                timeout=60
            )
            if response.status_code == 200:
                data = response.json()
                raw = data.get('response', '').strip()
                # Extraire le JSON du texte (le LLM peut entourer de markdown)
                if '```json' in raw:
                    raw = raw.split('```json')[1].split('```')[0].strip()
                elif '```' in raw:
                    raw = raw.split('```')[1].split('```')[0].strip()
                return json.loads(raw)
            else:
                app.logger.warning(f'LLM attempt {attempt+1} failed: HTTP {response.status_code}')
        except (requests.exceptions.RequestException, json.JSONDecodeError, IndexError) as e:
            app.logger.warning(f'LLM attempt {attempt+1} error: {e}')
            if attempt < retries:
                time.sleep(2)
    return None


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'tesseract_version': str(pytesseract.get_tesseract_version()),
        'ollama_url': OLLAMA_URL
    })


@app.route('/ocr', methods=['POST'])
def ocr():
    """OCR brut — retourne le texte extrait"""
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
            'word_count': len([w for w in text.split() if len(w) > 1])
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pipeline', methods=['POST'])
def pipeline():
    """
    Pipeline complet : OCR → Mistral → JSON structuré

    Input: multipart/form-data avec image_nutrition (requis)
    Output: JSON avec données nutritionnelles parsées + score de confiance
    """
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

        # Vérifier la qualité OCR
        if ocr_confidence < 50:
            return jsonify({
                'job_status': 'low_confidence',
                'ocr_confidence': round(ocr_confidence, 1),
                'ocr_text': ocr_text,
                'message': 'Photo trop floue ou illisible. Essayez avec une meilleure photo.',
                'duration_ms': ocr_duration
            })

        # Étape 2 : Parsing via LLM
        llm_start = time.time()
        prompt = NUTRITION_PROMPT.format(ocr_text=ocr_text)
        parsed = call_llm(prompt)
        llm_duration = int((time.time() - llm_start) * 1000)

        if parsed is None:
            # Le LLM a échoué — retourner le texte brut pour saisie manuelle
            return jsonify({
                'job_status': 'manual_required',
                'ocr_confidence': round(ocr_confidence, 1),
                'ocr_text': ocr_text,
                'message': "L'IA n'a pas pu analyser le texte. Saisissez les données manuellement.",
                'duration_ms': ocr_duration + llm_duration
            })

        total_duration = int((time.time() - start_time) * 1000)

        # Construire la réponse
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
            'timing': {
                'ocr_ms': ocr_duration,
                'llm_ms': llm_duration,
                # alias rétro-compat (à retirer une fois frontend/logs migrés)
                'mistral_ms': llm_duration
            }
        })

    except Exception as e:
        app.logger.error(f'Pipeline error: {e}')
        return jsonify({
            'job_status': 'error',
            'error': str(e),
            'duration_ms': int((time.time() - start_time) * 1000)
        }), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
