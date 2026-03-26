#!/usr/bin/env python3
"""
Import massif des produits marocains depuis Open Food Facts
Lance depuis le serveur Unraid (accès OFF + réseau Docker interne)
"""

import json
import time
import urllib.request
import sys

# Config — utiliser l'URL interne Docker si dans le réseau, sinon l'externe
import os
API = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
OFF_API = "https://world.openfoodfacts.org/api/v2/search"
OFF_FIELDS = "code,product_name_fr,product_name,brands,nutriscore_grade,nova_group,nutriments,ingredients_text_fr,ingredients_text,additives_tags,image_front_url,image_nutrition_url,image_ingredients_url,categories_tags,traces_tags"
PAGE_SIZE = 100
MAX_PAGES = 50  # 5000 produits max
DELAY = 0.5  # secondes entre chaque import
RETRY_DELAY = 60  # secondes entre retentatives si OFF est down
MAX_RETRIES = 30  # max 30 min d'attente

# Catégorie mapping
CAT_RULES = [
    (1, ['biscuit', 'cookie', 'prince', 'oreo', 'gâteau', 'gateau', 'wafer']),
    (2, ['céréale', 'cereal', 'granola', 'muesli', 'nesquik', 'cacao', 'chocapic', 'nescafe', 'cappuccino', 'café', 'coffee', 'thé']),
    (3, ['lait', 'yaourt', 'yogurt', 'fromage', 'cheese', 'beurre', 'cream', 'crème', 'danone', 'jben']),
    (4, ['viande', 'meat', 'poulet', 'chicken', 'boeuf', 'beef', 'saucisse', 'jambon', 'thon', 'tuna', 'sardine']),
    (5, ['coca', 'pepsi', 'fanta', 'sprite', 'soda', 'cola', 'orangina', 'schweppes', 'energy drink', 'red bull', 'limonade']),
    (6, ['eau', 'water', 'jus', 'juice', 'nectar', 'sidi ali', 'ain saiss']),
    (7, ['conserve', 'tomate', 'sardine', 'harissa', 'olive', 'canned', 'confiture', 'miel']),
    (8, ['ketchup', 'moutarde', 'mustard', 'pesto', 'sauce', 'vinaigre', 'épice', 'spice', 'mayonnaise', 'condiment']),
    (9, ['huile', 'oil', 'margarine', 'graisse']),
    (10, ['chips', 'snack', 'pringles', 'lays', 'doritos', 'nutella', 'twix', 'snickers', 'bounty', 'mars', 'chocolat', 'chocolate', 'bonbon', 'candy']),
    (11, ['pain', 'bread', 'mie', 'croissant', 'brioche', 'baguette', 'viennoiserie']),
    (12, ['plat', 'pizza', 'tajine', 'couscous', 'soup', 'soupe', 'prepared']),
]

def find_cat(name, brand, cats_tags):
    text = f"{name} {brand} {' '.join(cats_tags)}".lower()
    for cid, kws in CAT_RULES:
        for kw in kws:
            if kw in text:
                return cid
    return None

def login():
    """Login et récupérer le token"""
    data = json.dumps({"email": "amine@n0.ma", "password": "Bayen2024!"}).encode()
    req = urllib.request.Request(f"{API}/auth/login", data=data, headers={"Content-Type": "application/json"})
    resp = urllib.request.urlopen(req)
    return json.loads(resp.read())["data"]["access_token"]

def product_exists(barcode, token):
    """Vérifier si un produit existe déjà dans Directus"""
    req = urllib.request.Request(
        f"{API}/items/products?filter[barcode][_eq]={barcode}&limit=1&fields=id",
        headers={"Authorization": f"Bearer {token}"}
    )
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    return len(data.get("data", [])) > 0

def import_product(p, token):
    """Importer un produit OFF dans Directus"""
    barcode = p.get("code", "")
    name = p.get("product_name_fr") or p.get("product_name", "")
    brand = p.get("brands", "")
    nuts = p.get("nutriments", {})
    cats_tags = p.get("categories_tags", [])

    # Extraire les additifs
    additives = []
    for tag in (p.get("additives_tags") or []):
        m = tag.lower()
        if "e" in m:
            code = m.split(":")[-1] if ":" in m else m
            import re
            match = re.match(r'e(\d{3,4}[a-z]?)', code)
            if match:
                additives.append(f"E{match.group(1).upper()}")

    # Mapper la catégorie
    category_id = find_cat(name, brand, cats_tags)

    product_data = {
        "barcode": barcode,
        "name_fr": name[:255] if name else "Inconnu",
        "brand": brand.split(",")[0].strip()[:255] if brand else "Inconnu",
        "category_id": category_id,
        "nutriscore_grade": (p.get("nutriscore_grade") or "").upper() or None,
        "nova_group": p.get("nova_group"),
        "energy_kcal": nuts.get("energy-kcal_100g"),
        "fat_total": nuts.get("fat_100g"),
        "fat_saturated": nuts.get("saturated-fat_100g"),
        "carbs_total": nuts.get("carbohydrates_100g"),
        "sugars": nuts.get("sugars_100g"),
        "fiber": nuts.get("fiber_100g"),
        "proteins": nuts.get("proteins_100g"),
        "salt": nuts.get("salt_100g"),
        "ingredients_text": p.get("ingredients_text_fr") or p.get("ingredients_text", ""),
        "additives": additives if additives else None,
        "off_id": barcode,
        "data_source": "off",
        "status": "published",
        "confidence_score": 0.8,
        "image_front": p.get("image_front_url"),
        "scan_count": 0,
    }

    # Nettoyer les None
    product_data = {k: v for k, v in product_data.items() if v is not None}

    data = json.dumps(product_data).encode()
    req = urllib.request.Request(
        f"{API}/items/products",
        data=data,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST"
    )
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    return result.get("data", {}).get("id")

def main():
    print("=== Import massif OFF → Bayen ===")
    print(f"Config: {PAGE_SIZE} produits/page, max {MAX_PAGES} pages")

    token = login()
    print(f"Token obtenu\n")

    stats = {"found": 0, "filtered": 0, "exists": 0, "imported": 0, "errors": 0}

    for page in range(1, MAX_PAGES + 1):
        print(f"\n--- Page {page} ---")

        url = f"{OFF_API}?countries_tags_en=morocco&page_size={PAGE_SIZE}&page={page}&fields={OFF_FIELDS}"
        req = urllib.request.Request(url, headers={"User-Agent": "Bayen/1.0 (contact@n0.ma)"})

        data = None
        for retry in range(MAX_RETRIES):
            try:
                resp = urllib.request.urlopen(req, timeout=30)
                data = json.loads(resp.read())
                break
            except Exception as e:
                if retry < MAX_RETRIES - 1:
                    print(f"  OFF indisponible ({e}), retry dans {RETRY_DELAY}s... ({retry+1}/{MAX_RETRIES})")
                    time.sleep(RETRY_DELAY)
                else:
                    print(f"  OFF toujours down après {MAX_RETRIES} tentatives. Arrêt.")

        if data is None:
            break

        products = data.get("products", [])
        total_pages = data.get("page_count", 0)
        total_count = data.get("count", 0)

        if page == 1:
            print(f"Total produits marocains sur OFF: {total_count}")
            print(f"Pages: {total_pages}")

        if not products:
            print("Plus de produits.")
            break

        stats["found"] += len(products)

        for p in products:
            code = p.get("code", "")
            name = p.get("product_name_fr") or p.get("product_name", "?")
            brand = p.get("brands", "?")
            nuts = p.get("nutriments", {})

            # Filtrer : données complètes requises
            if not p.get("image_front_url"):
                continue
            if not nuts.get("energy-kcal_100g"):
                continue
            if not (p.get("ingredients_text_fr") or p.get("ingredients_text")):
                continue
            if not (p.get("product_name_fr") or p.get("product_name")):
                continue
            if not p.get("brands"):
                continue

            stats["filtered"] += 1

            # Vérifier doublon
            try:
                if product_exists(code, token):
                    stats["exists"] += 1
                    continue
            except:
                pass

            # Importer
            try:
                pid = import_product(p, token)
                stats["imported"] += 1
                sys.stdout.write(f"  + {name[:50]:50s} ({code})\n")
                sys.stdout.flush()
            except Exception as e:
                stats["errors"] += 1
                sys.stdout.write(f"  ! {name[:50]:50s} ({code}) ERREUR: {e}\n")
                sys.stdout.flush()

            time.sleep(DELAY)

        print(f"  Page {page}: trouvés={len(products)}, importés={stats['imported']}")

        if page >= total_pages:
            break

    print(f"\n=== RÉSUMÉ ===")
    print(f"Trouvés sur OFF:     {stats['found']}")
    print(f"Données complètes:   {stats['filtered']}")
    print(f"Déjà dans Bayen:     {stats['exists']}")
    print(f"Importés:            {stats['imported']}")
    print(f"Erreurs:             {stats['errors']}")

if __name__ == "__main__":
    main()
