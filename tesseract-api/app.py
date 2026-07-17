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


def call_ai_vision(system_prompt, user_text, image_b64, timeout=60, max_tokens=700):
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
    return _ai_chat(messages, max_tokens=max_tokens, timeout=timeout)


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

# Lecture VISION directe de l'étiquette (C8d) — remplace Tesseract en voie
# principale : bien plus fiable sur l'arabe photographié, ingrédients bilingues.
NUTRITION_VISION_SYSTEM = (
    "Tu es un expert en étiquetage alimentaire marocain (français + arabe). Tu LIS directement "
    "la photo d'une étiquette (tableau nutritionnel et/ou liste d'ingrédients) et tu retournes "
    "UNIQUEMENT du JSON valide. Ne JAMAIS inventer une valeur illisible : mets null."
)

NUTRITION_VISION_PROMPT = """Lis cette étiquette (texte français et/ou arabe) et retourne ce JSON exact :
{
  "product_name": null,
  "brand": null,
  "energy_kcal_100g": null,
  "fat_total_100g": null,
  "fat_saturated_100g": null,
  "carbs_total_100g": null,
  "sugars_100g": null,
  "fiber_100g": null,
  "proteins_100g": null,
  "salt_100g": null,
  "ingredients": [{"name_fr": "", "name_ar": "", "category": "autre", "is_allergen": false, "percent": null}],
  "traces_fr": [],
  "ingredients_text": "",
  "additives_found": ["E322"],
  "nova_group": null,
  "lisibilite": "bonne",
  "parsing_confidence": 0.0
}
Valeurs nutritionnelles pour 100 g uniquement. Ingrédients BILINGUES (traduis le sens manquant FR<->AR),
sans le poids net ni les mentions légales ; les mentions "peut contenir" vont dans traces_fr.
category parmi cereale|sucre|graisse|laitier|proteine|fruit_legume|sel|eau|arome|additif|autre.
is_allergen true pour gluten/blé, lait, œufs, arachide, fruits à coque, soja, poisson, crustacés, sésame, moutarde, céleri, lupin, sulfites.
ingredients_text : la liste française en une phrase. lisibilite : bonne|moyenne|faible."""

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
    "- nova_group, en distinguant PRÉCISÉMENT le brut du raffiné :\n"
    "  • 1 = brut / minimalement transformé ET COMPLET : fruits et légumes frais, "
    "légumineuses, œufs, lait nature, céréales COMPLÈTES (blé complet, riz complet), "
    "champignons, herbes, épices, thé/café en feuilles.\n"
    "  • 2 = ingrédient culinaire : huiles, beurre, sucre, sel, miel.\n"
    "  • 3 = RAFFINÉ ou transformé : farine blanche, semoule/couscous blancs, riz "
    "blanc, pâtes blanches, pain, fromages, conserves.\n"
    "  • 4 = ultra-transformé.\n"
    "  Règle stricte : un féculent RAFFINÉ / BLANC (semoule fine, farine blanche, "
    "riz blanc, pâtes blanches) est TOUJOURS au moins NOVA 3, jamais 1 ni 2. "
    "N'attribue 1 qu'aux aliments réellement bruts/complets.\n"
    "- confiance : \"elevee\" pour un aliment de base très standard, sinon "
    "\"moyenne\"/\"faible\".\n"
    "- Dans le doute sur un produit de marque : estimable=false. N'invente jamais. "
    "Pas d'avis médical."
)


CATEGORIZE_SYSTEM = (
    "Tu es un assistant qui classe des produits alimentaires vendus au Maroc "
    "dans des catégories. On te fournit une LISTE DE CATÉGORIES (id: nom) et une "
    "LISTE DE PRODUITS (index: nom [marque]). Pour CHAQUE produit, choisis l'id "
    "de la catégorie la plus adaptée. Tu retournes UNIQUEMENT du JSON valide :\n"
    '{"resultats":[{"index":0,"category_id":3}]}\n\n'
    "RÈGLES :\n"
    "- Utilise EXCLUSIVEMENT les id fournis dans la liste des catégories.\n"
    "- Si le produit n'est PAS un aliment ou une boisson (médicament, cosmétique, "
    "produit ménager, objet…) OU si la catégorie est indéterminable → "
    "category_id = null.\n"
    "- EXACTEMENT un résultat par produit, avec son index d'origine.\n"
    "- Aucun texte hors du JSON."
)


NONFOOD_SYSTEM = (
    "Tu détermines si des produits sont des ALIMENTS ou BOISSONS destinés à être "
    "mangés ou bus. Pour CHAQUE produit (index + nom [marque]), réponds is_food "
    "(true/false) et type. Tu retournes UNIQUEMENT du JSON valide :\n"
    '{"resultats":[{"index":0,"is_food":true,"type":"aliment"}]}\n\n'
    "type ∈ aliment | boisson | complement | medicament | cosmetique | autre\n"
    "RÈGLES :\n"
    "- is_food=true pour tout ce qui se mange ou se boit : y compris fruits secs, "
    "noix, graines, miel, chocolat, café, thé, épices, huiles, eau, lait, sodas, "
    "ET AUSSI les chewing-gums, bonbons, confiseries (Trident, Mentos, Clorets, "
    "Chiclets… = aliment).\n"
    "- is_food=false UNIQUEMENT pour : médicaments, compléments alimentaires en "
    "gélules/comprimés/poudre (créatine, collagène, vitamines, protéines en poudre, "
    "magnésium…), cosmétiques, produits d'hygiène/ménagers, objets, accessoires.\n"
    "- DANS LE DOUTE, ou si le nom est un simple mot/marque sans indice CLAIR de "
    "non-aliment (ex : TITAN, Or Blanc, Perly…) → is_food=true. On ne retire "
    "JAMAIS un vrai aliment par erreur ; mieux vaut garder un doute que supprimer.\n"
    "- EXACTEMENT un résultat par produit, avec son index."
)


@app.route('/detect-nonfood-batch', methods=['POST'])
def detect_nonfood_batch():
    """Détecte les non-aliments d'un lot (Qwen). Conservateur (doute → aliment).

    Input  : JSON {items:[{index,name,brand}]}
    Output : {resultats:[{index, is_food, type}]}
    """
    data = request.get_json(silent=True) or {}
    items = data.get('items') or []
    if not items:
        return jsonify({'error': 'items requis', 'resultats': []}), 400

    prod_lines = []
    for it in items[:40]:
        idx = it.get('index')
        name = str(it.get('name', '')).strip()[:80]
        brand = str(it.get('brand', '')).strip()[:40]
        prod_lines.append(f"{idx}: {name}" + (f" [{brand}]" if brand else ""))
    user = "PRODUITS:\n" + '\n'.join(prod_lines)
    start = time.time()

    try:
        parsed = call_ai_text(NONFOOD_SYSTEM, user, max_tokens=1000)
        dur = int((time.time() - start) * 1000)
        if parsed is None:
            return jsonify({'error': 'IA indisponible', 'resultats': [], 'duration_ms': dur}), 502

        valid_types = {'aliment', 'boisson', 'complement', 'medicament', 'cosmetique', 'autre'}
        out = []
        for r in (parsed.get('resultats') or []):
            try:
                idx = int(r.get('index'))
            except (TypeError, ValueError):
                continue
            is_food = bool(r.get('is_food', True))
            typ = str(r.get('type', 'aliment')).lower().strip()
            if typ not in valid_types:
                typ = 'aliment' if is_food else 'autre'
            out.append({'index': idx, 'is_food': is_food, 'type': typ})

        return jsonify({'resultats': out, 'duration_ms': dur, 'model': AI_MODEL})
    except Exception as e:
        app.logger.error(f'detect-nonfood-batch error: {e}')
        return jsonify({'error': str(e), 'resultats': []}), 500


@app.route('/categorize-batch', methods=['POST'])
def categorize_batch():
    """Classe un lot de produits dans des catégories (Qwen, 1 appel pour N).

    Input  : JSON {items:[{index,name,brand}], categories:[{id,name}]}
    Output : {resultats:[{index, category_id}]}  (category_id null si non-aliment)
    """
    data = request.get_json(silent=True) or {}
    items = data.get('items') or []
    categories = data.get('categories') or []
    if not items or not categories:
        return jsonify({'error': 'items et categories requis', 'resultats': []}), 400

    valid_ids = {int(c['id']) for c in categories if str(c.get('id', '')).strip().isdigit()}
    cat_lines = '\n'.join(f"{int(c['id'])}: {c['name']}" for c in categories if str(c.get('id', '')).strip().isdigit())
    prod_lines = []
    for it in items[:40]:
        idx = it.get('index')
        name = str(it.get('name', '')).strip()[:80]
        brand = str(it.get('brand', '')).strip()[:40]
        prod_lines.append(f"{idx}: {name}" + (f" [{brand}]" if brand else ""))

    user = f"CATÉGORIES:\n{cat_lines}\n\nPRODUITS:\n" + '\n'.join(prod_lines)
    start = time.time()

    try:
        parsed = call_ai_text(CATEGORIZE_SYSTEM, user, max_tokens=1200)
        dur = int((time.time() - start) * 1000)
        if parsed is None:
            return jsonify({'error': "IA indisponible", 'resultats': [], 'duration_ms': dur}), 502

        out = []
        for r in (parsed.get('resultats') or []):
            try:
                idx = int(r.get('index'))
            except (TypeError, ValueError):
                continue
            cid = r.get('category_id')
            cid = int(cid) if (cid is not None and str(cid).strip().lstrip('-').isdigit() and int(cid) in valid_ids) else None
            out.append({'index': idx, 'category_id': cid})

        return jsonify({'resultats': out, 'duration_ms': dur, 'model': AI_MODEL})
    except Exception as e:
        app.logger.error(f'categorize-batch error: {e}')
        return jsonify({'error': str(e), 'resultats': []}), 500


# ─── Traduction + nettoyage bilingue des ingrédients (C8a) ─────────────
TRANSLATE_SYSTEM = (
    "Tu es un expert en étiquetage alimentaire marocain, parfaitement bilingue arabe/français. "
    "On te donne les ingrédients de produits alimentaires (en arabe, en français, ou mélangés, "
    "parfois avec des erreurs d'OCR). Pour CHAQUE produit tu retournes sa liste d'ingrédients "
    "NETTOYÉE et BILINGUE.\n"
    "Règles STRICTES :\n"
    "- name_fr : nom français (traduis si la source est en arabe). name_ar : nom arabe (traduis si la source est en français).\n"
    "- SUPPRIME tout ce qui n'est PAS un ingrédient : poids net, contenance, mentions légales, adresses, "
    "codes, 'valeur nutritionnelle', instructions de conservation…\n"
    "- Les mentions 'peut contenir (des traces de) X' vont dans traces_fr (noms français), PAS dans ingredients.\n"
    "- percent : conserve la valeur fournie telle quelle (nombre) ou null. N'invente JAMAIS de pourcentage.\n"
    "- category parmi : cereale, sucre, graisse, laitier, proteine, fruit_legume, sel, eau, arome, additif, autre.\n"
    "- is_allergen true pour : gluten/blé, lait, œufs, arachide, fruits à coque, soja, poisson, crustacés, "
    "sésame, moutarde, céleri, lupin, sulfites.\n"
    "- Additifs E-xxx : name_fr au format 'E322 (lécithines)' si le nom est connu, category='additif'.\n"
    "Retourne UNIQUEMENT du JSON valide : "
    '{"results":[{"id":"…","ingredients":[{"name_fr":"","name_ar":"","category":"autre",'
    '"is_allergen":false,"percent":null}],"traces_fr":[]}]}'
)


@app.route('/translate-ingredients-batch', methods=['POST'])
def translate_ingredients_batch():
    """Traduction + nettoyage bilingue FR/AR des ingrédients (lots de 1 à 5 produits)."""
    data = request.get_json(silent=True) or {}
    products = data.get('products', [])
    if not products or len(products) > 5:
        return jsonify({'error': '1 à 5 produits par lot'}), 400

    lines = []
    for p in products:
        ings = p.get('ingredients') or []
        if ings:
            parts = []
            for i in ings:
                nm = (i.get('name_fr') or i.get('name') or '').strip()
                if not nm:
                    continue
                pc = i.get('percent')
                parts.append(nm + (f' ({pc}%)' if pc is not None else ''))
            src = ' | '.join(parts)
        else:
            src = (p.get('ingredients_text') or '').strip()[:800]
        lines.append(f"- id={p.get('id')} :: {src}")

    prompt = 'Produits à traiter :\n' + '\n'.join(lines)
    parsed = call_ai_text(TRANSLATE_SYSTEM, prompt, max_tokens=2600, timeout=150)
    if parsed is None or 'results' not in parsed:
        return jsonify({'error': 'IA indisponible'}), 502
    return jsonify(parsed)


# ─── Traduction 1:1 du référentiel ingredients (C8a) ───────────────────
TERMS_SYSTEM = (
    "Tu es un expert en étiquetage alimentaire marocain, parfaitement bilingue arabe/français. "
    "On te donne une liste de noms d'ingrédients alimentaires (arabe, français, ou mélangés, parfois mal OCRisés). "
    "Pour CHAQUE entrée tu retournes EXACTEMENT un résultat avec le MÊME id — jamais de fusion ni d'omission.\n"
    "Règles :\n"
    "- name_fr : nom français propre et court (traduis depuis l'arabe si besoin, corrige l'OCR).\n"
    "- name_ar : nom arabe standard (traduis depuis le français si besoin).\n"
    "- category parmi : cereale, sucre, graisse, laitier, proteine, fruit_legume, sel, eau, arome, additif, autre.\n"
    "- is_allergen true pour : gluten/blé, lait, œufs, arachide, fruits à coque, soja, poisson, crustacés, "
    "sésame, moutarde, céleri, lupin, sulfites.\n"
    "- is_food false si l'entrée n'est PAS un ingrédient (poids net, contenance, mention légale, phrase "
    "'peut contenir…', valeur nutritionnelle) — traduis quand même name_fr au mieux.\n"
    "Retourne UNIQUEMENT du JSON valide : "
    '{"results":[{"id":0,"name_fr":"","name_ar":"","category":"autre","is_allergen":false,"is_food":true}]}'
)


@app.route('/translate-terms-batch', methods=['POST'])
def translate_terms_batch():
    """Traduction bilingue 1:1 de termes d'ingrédients (référentiel, lots ≤ 20)."""
    data = request.get_json(silent=True) or {}
    terms = data.get('terms', [])
    if not terms or len(terms) > 20:
        return jsonify({'error': '1 à 20 termes par lot'}), 400

    lines = [f"- id={t.get('id')} :: {(t.get('name') or '').strip()[:160]}" for t in terms]
    prompt = 'Termes à traiter (un résultat par id, sans exception) :\n' + '\n'.join(lines)
    parsed = call_ai_text(TERMS_SYSTEM, prompt, max_tokens=2400, timeout=150)
    if parsed is None or 'results' not in parsed:
        return jsonify({'error': 'IA indisponible'}), 502
    return jsonify(parsed)


COMPARE_SYSTEM = (
    "Tu compares DEUX produits alimentaires pour aider un consommateur marocain "
    "à choisir. On te donne leurs données (A et B) et le GAGNANT déjà déterminé "
    "par le score Bayen. Tu retournes UNIQUEMENT du JSON :\n"
    '{"raison":"", "conseil":""}\n\n'
    "RÈGLES :\n"
    "- raison : 1 à 2 phrases concrètes qui expliquent POURQUOI le gagnant est un "
    "meilleur choix, en citant les vraies différences (sucre, sel, additifs, "
    "transformation NOVA, graisses…). Ne contredis JAMAIS le gagnant fourni.\n"
    "- conseil : 1 phrase pratique et bienveillante (ex. quand l'un peut convenir "
    "quand même). PAS de conseil médical, aucune mention de maladie.\n"
    "- Si égalité, explique qu'ils se valent et sur quoi départager.\n"
    "- Désigne TOUJOURS les produits par leur NOM (fourni), JAMAIS par "
    "\"produit A\" / \"produit B\".\n"
    "- Français simple et bienveillant. N'invente aucun chiffre non fourni."
)


def _prod_line(p):
    parts = [f"score {p.get('score', '?')}/100"]
    if p.get('nutriscore'):
        parts.append(f"Nutri-Score {p['nutriscore']}")
    if p.get('nova') is not None:
        parts.append(f"NOVA {p['nova']}")
    for label, key in (('sucre', 'sugars'), ('sel', 'salt'),
                       ('graisses saturees', 'fat_saturated')):
        if p.get(key) is not None:
            parts.append(f"{label} {p[key]}g")
    n_add = p.get('additives_count')
    if n_add is not None:
        parts.append(f"{n_add} additif(s)")
    return ", ".join(parts)


@app.route('/compare-verdict', methods=['POST'])
def compare_verdict():
    """Verdict IA entre 2 produits. Le gagnant est fourni (déterministe), Qwen
    rédige seulement raison + conseil.

    Input : JSON {a:{name,score,...}, b:{...}, gagnant:"A|B|egalite"}
    Output: {raison, conseil}
    """
    data = request.get_json(silent=True) or {}
    a = data.get('a') or {}
    b = data.get('b') or {}
    gagnant = str(data.get('gagnant', 'egalite')).upper()
    if gagnant not in ('A', 'B', 'EGALITE'):
        gagnant = 'EGALITE'
    if not a.get('name') or not b.get('name'):
        return jsonify({'error': 'a.name et b.name requis'}), 400

    win_txt = {'A': f"Gagnant : A ({a.get('name')})",
               'B': f"Gagnant : B ({b.get('name')})",
               'EGALITE': "Résultat : égalité"}[gagnant]
    user = (f"PRODUIT A — {a.get('name')} : {_prod_line(a)}\n"
            f"PRODUIT B — {b.get('name')} : {_prod_line(b)}\n\n{win_txt}\n\n"
            "Explique le choix.")
    start = time.time()

    try:
        parsed = call_ai_text(COMPARE_SYSTEM, user, max_tokens=350)
        dur = int((time.time() - start) * 1000)
        if parsed is None:
            return jsonify({'error': 'IA indisponible', 'duration_ms': dur}), 502
        return jsonify({
            'raison': str(parsed.get('raison', ''))[:400],
            'conseil': str(parsed.get('conseil', ''))[:300],
            'duration_ms': dur,
            'model': AI_MODEL,
        })
    except Exception as e:
        app.logger.error(f'compare-verdict error: {e}')
        return jsonify({'error': str(e)}), 500


COACH_SYSTEM = (
    "Tu es un coach nutrition bienveillant et encourageant. On te donne le RÉSUMÉ "
    "des repas de la semaine d'une personne (analyses photo). Tu écris un bilan "
    "court et motivant. Tu retournes UNIQUEMENT du JSON :\n"
    '{"bilan":"", "conseils":[""]}\n\n'
    "RÈGLES :\n"
    "- bilan : 2 à 3 phrases qui résument la semaine de façon POSITIVE et honnête "
    "(ce qui est bien + ce qui peut s'améliorer), en te basant sur les verdicts et "
    "caractéristiques fournis (ex : beaucoup de repas 'occasionnel'/gras, ou au "
    "contraire équilibrés).\n"
    "- conseils : 2 à 3 conseils CONCRETS, pratiques et bienveillants pour la "
    "semaine suivante, adaptés à ce qui a été mangé (ex : 'ajoute une portion de "
    "légumes à tes dîners').\n"
    "- Ton chaleureux, encourageant, tutoiement. Adapté au Maroc.\n"
    "- INTERDIT : diagnostic, maladie, régime médical, chiffres de poids, "
    "vocabulaire clinique. Reste dans le conseil alimentaire général.\n"
    "- Si peu de données, reste général et invite à analyser plus de repas."
)


@app.route('/weekly-coach', methods=['POST'])
def weekly_coach():
    """Bilan hebdo bienveillant à partir du résumé des repas (Qwen).

    Input : JSON {resume:"...", nb_repas:N}
    Output: {bilan, conseils:[...]}
    """
    data = request.get_json(silent=True) or {}
    resume = str(data.get('resume', '')).strip()
    nb = data.get('nb_repas', 0)
    if not resume:
        return jsonify({'error': 'resume requis'}), 400

    user = f"Repas de la semaine ({nb} repas analysés) :\n{resume}\n\nÉcris le bilan."
    start = time.time()
    try:
        parsed = call_ai_text(COACH_SYSTEM, user, max_tokens=500)
        dur = int((time.time() - start) * 1000)
        if parsed is None:
            return jsonify({'error': 'IA indisponible', 'duration_ms': dur}), 502
        conseils = parsed.get('conseils') or []
        if isinstance(conseils, list):
            conseils = [str(c)[:200] for c in conseils if isinstance(c, (str, int, float))][:4]
        else:
            conseils = []
        return jsonify({
            'bilan': str(parsed.get('bilan', ''))[:600],
            'conseils': conseils,
            'duration_ms': dur,
            'model': AI_MODEL,
        })
    except Exception as e:
        app.logger.error(f'weekly-coach error: {e}')
        return jsonify({'error': str(e)}), 500


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
        file = request.files['image_nutrition']
        raw = file.read()
        image = Image.open(io.BytesIO(raw))

        # ── Voie principale : lecture VISION Qwen (fiable en arabe, bilingue) ──
        vis = resize_for_ai(image)
        buf = io.BytesIO()
        vis.save(buf, format='JPEG', quality=88)
        image_b64 = base64.b64encode(buf.getvalue()).decode()

        engine = 'qwen_vision'
        parsed = call_ai_vision(
            NUTRITION_VISION_SYSTEM, NUTRITION_VISION_PROMPT, image_b64,
            timeout=120, max_tokens=2200,
        )
        vision_duration = int((time.time() - start_time) * 1000)
        ocr_text = ''
        ocr_confidence = None
        ocr_duration = 0

        # ── Fallback : Tesseract → parsing texte (ancienne voie) ──
        if parsed is None:
            engine = 'tesseract_fallback'
            t0 = time.time()
            processed = preprocess_image(image)
            ocr_data = pytesseract.image_to_data(processed, lang='fra+ara', output_type=pytesseract.Output.DICT)
            confidences = [c for c in ocr_data['conf'] if c > 0]
            ocr_confidence = sum(confidences) / len(confidences) if confidences else 0
            ocr_text = pytesseract.image_to_string(processed, lang='fra+ara').strip()
            ocr_duration = int((time.time() - t0) * 1000)

            if ocr_confidence < 50:
                return jsonify({
                    'job_status': 'low_confidence',
                    'engine': engine,
                    'ocr_confidence': round(ocr_confidence, 1),
                    'ocr_text': ocr_text,
                    'message': 'Photo trop floue ou illisible. Essayez avec une meilleure photo.',
                    'duration_ms': int((time.time() - start_time) * 1000),
                })

            prompt = NUTRITION_PROMPT.format(ocr_text=ocr_text)
            parsed = call_ai_text(NUTRITION_SYSTEM, prompt)

        if parsed is None:
            return jsonify({
                'job_status': 'manual_required',
                'engine': engine,
                'ocr_confidence': round(ocr_confidence, 1) if ocr_confidence is not None else None,
                'ocr_text': ocr_text,
                'message': "L'IA n'a pas pu analyser l'étiquette. Saisissez les données manuellement.",
                'duration_ms': int((time.time() - start_time) * 1000),
            })

        # Étiquette illisible selon la vision → même statut que le seuil Tesseract
        if engine == 'qwen_vision' and parsed.get('lisibilite') == 'faible':
            return jsonify({
                'job_status': 'low_confidence',
                'engine': engine,
                'parsing_confidence': parsed.get('parsing_confidence', 0.2),
                'message': 'Photo trop floue ou illisible. Essayez avec une meilleure photo.',
                'duration_ms': int((time.time() - start_time) * 1000),
            })

        total_duration = int((time.time() - start_time) * 1000)

        # Ingrédients structurés bilingues (vision uniquement — fallback texte sinon)
        ingredients = parsed.get('ingredients') if isinstance(parsed.get('ingredients'), list) else []
        ingredients = [
            i for i in ingredients
            if isinstance(i, dict) and (i.get('name_fr') or i.get('name_ar'))
        ][:40]

        return jsonify({
            'job_status': 'done',
            'engine': engine,
            'barcode': barcode,
            'ocr_confidence': round(ocr_confidence, 1) if ocr_confidence is not None else None,
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
                'ingredients': ingredients,
                'traces_fr': parsed.get('traces_fr', []) if isinstance(parsed.get('traces_fr'), list) else [],
                'additives': parsed.get('additives_found', []),
                'nova_group': parsed.get('nova_group'),
            },
            'parsing_confidence': parsed.get('parsing_confidence', 0.7),
            'duration_ms': total_duration,
            'timing': {'vision_ms': vision_duration, 'ocr_ms': ocr_duration},
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
