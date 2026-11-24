#!/usr/bin/env python3
"""
Audit des fiches alimentaires : marque « null », ingrédients qui ne vont pas avec
le produit, NOVA 1 contredit. Règles 100 % déterministes — aucune IA, rien n'est
deviné : une valeur fausse est remplacée par celle d'Open Food Facts quand OFF en a
une, sinon effacée (fiche incomplète plutôt que fausse).

  1. marque « null » / « none » / « undefined »               → vide (le champ est obligatoire dans Directus)
  2. ingrédients poubelle (« Produit non identifié », « Prix », « jjhh »,
     tableau nutritionnel, chiffres…) ou incohérents (lait sur un produit non
     laitier, « Eau » seule sur un produit qui n'est pas une eau)
                                                              → ingrédients OFF (fr), sinon NULL ;
                                                                liens products_ingredients supprimés
                                                                (link-ingredients les recrée à 06:30)
  3. boisson chocolatée en poudre rangée dans « Boissons sucrées » (5)
                                                              → « Céréales & petit-déjeuner » (2)
  4. NOVA 1 avec additifs, sucre ajouté, sur un ultra-transformé évident, ou dont
     les ingrédients viennent d'être effacés                      → NOVA d'OFF, sinon NULL

Le score stocké est ensuite recalculé par POST /bayen-api/food-score {"all":true,"apply":true}.

Dry-run par défaut (APPLY=0). Token admin : DTOKEN.
  docker exec -e DTOKEN=… -e APPLY=1 -i bayen-tesseract python3 - < scripts/audit-fiches.py
"""

import json
import os
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TOKEN = os.environ.get("DTOKEN", "")
APPLY = os.environ.get("APPLY", "0") == "1"
OFF = "https://world.openfoodfacts.org/api/v2/product"
UA = os.environ.get("OFF_USER_AGENT", "Bayen/1.0 (contact@n0.ma)")

NULL_BRANDS = {"null", "none", "undefined", "nan", ""}

# Ce qui n'est PAS une liste d'ingrédients (motif certain)
JUNK = [
    r"^produit\b", r"^prix\b", r"^halal\b", r"^حلال$", r"^[\d\s,.]+$",
    r"^(informaci[oó]n nutricional|information nutritionnelle|valeurs? nutritionnelles?)\b",
    r"valeurs? nut", r"\benergia\s*,", r"\bgrassi\b", r"القيمة الغذائ",
    r"(\d+[,.]?\d*\s*(g|mg|kj|kcal)\b.*){3}",                      # au moins 3 valeurs chiffrées : un tableau
    r"\bfat\b.*\b(sodium|fib(er|re)|protein|carbohydrate)\b",          # tableau en anglais
    r"\d{3}[\s.]\d{2,}[\s.]\d{2,}",                               # numéro de téléphone
    r"^(sin|sem|sans)(/\w+)? gluten\b",
]
# Tableau nutritionnel recopié à la place des ingrédients : chaque élément est un nutriment
NUTRIENTS = {
    "proteines", "proteine", "glucides", "lipides", "sucres", "sucre", "graisses", "matiere grasse", "sel", "fibres", "fibres alimentaires", "calcium",
    "phosphore", "energie", "acides gras satures", "acides gras", "acides gras monoinsatures",
    "acides gras polyinsatures", "matieres grasses", "dont sucres", "sodium", "fer", "magnesium", "potassium",
}
# Produit laitier ou dont les ingrédients commencent légitimement par du lait
DAIRY = re.compile(
    r"lait|yaourt|yogh|fromage|leben|lben|raib|creme|beurre|kefir|ricotta|danone|jaouda|centrale|jibal|"
    r"safilait|perly|linea|uht|milk|cheese|labne|mascarpone|candia|chergui|cafe|chocolat|cacao|biscuit|"
    r"gateau|glace|dessert|flan|puree|petit frais|caprice|president|comte|buche|edelblu|delicimo|finess|mood|wafer|protein"
)
WATER = re.compile(r"\beau\b|water|agua|source|minerale|sidi|bahia|aquafina|oulmes|ain |evian|vitalya|aqua|harazem|tonic")
# Poudres chocolatées : pas des boissons prêtes à boire (elles polluaient les alternatives des sodas)
COCOA_POWDER = re.compile(r"cola ?cao|nesquik|cacao|cocoa|chocolat en poudre|poudre")

# Ultra-transformés évidents (NOVA 4) — jamais NOVA 1
ULTRA = re.compile(
    r"nouille|noodle|indomie|chips|pringles|soda|\bcola\b|pepsi|fanta|sprite|7up|red ?bull|biscuit|wafer|gaufrette|"
    r"bonbon|kinder|twix|snickers|oreo|vache qui rit|fondu|margarine|penotti|cooky|nugget"
)


def norm(s):
    return unicodedata.normalize("NFKD", (s or "").lower()).encode("ascii", "ignore").decode()


def api(method, path, body=None):
    req = urllib.request.Request(
        f"{DIRECTUS}{path}", method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        raw = r.read()
        return json.loads(raw) if raw else None


class OffUnavailable(Exception):
    """OFF n'a pas répondu : on ne touche pas à la fiche (rien n'est effacé faute de réponse)."""


def off_product(barcode):
    for attempt in range(4):
        try:
            req = urllib.request.Request(f"{OFF}/{barcode}.json?fields=ingredients_text_fr,nova_group", headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=15) as r:
                d = json.load(r)
            time.sleep(1.5)  # OFF : rester poli
            return d.get("product") if d.get("status") == 1 else None
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
        except (urllib.error.URLError, TimeoutError, ValueError):
            pass
        time.sleep(5 * (attempt + 1))
    raise OffUnavailable(barcode)


def bad_ingredients(p):
    """Raison pour laquelle le texte d'ingrédients est faux, sinon None."""
    it = (p.get("ingredients_text") or "").strip()
    if not it:
        return None
    n = norm(it)
    if any(re.search(rx, it.lower(), re.S) for rx in JUNK) or not re.search(r"[aeiouy]", n) and not re.search(r"[؀-ۿ]", it):
        return "pas des ingrédients"
    items = [i.strip(" .") for i in re.split(r"[,;]", n) if i.strip(" .")]
    if len(items) >= 2 and all(i in NUTRIENTS for i in items):
        return "tableau nutritionnel"
    words = re.findall(r"[a-z]+", n)
    name = norm(p.get("name_fr")) + " " + norm(p.get("brand"))
    if len(n) <= 60 and re.match(r"^(poudre de )?lait", n) and p.get("category_id") != 3 and not DAIRY.search(name):
        return "lait sur un produit non laitier"
    if words == ["eau"] and p.get("category_id") != 6 and not WATER.search(name):
        return "« Eau » sur un produit qui n'est pas une eau"
    return None


def plan(p):
    """Corrections à apporter à une fiche (dict vide si elle est juste)."""
    patch = {}
    if p.get("brand") and p["brand"].strip().lower() in NULL_BRANDS:
        patch["brand"] = ""
    reason = bad_ingredients(p)
    off = None
    if reason:
        off = off_product(p["barcode"])
        fr = (off or {}).get("ingredients_text_fr") or None
        patch["ingredients_text"] = fr.strip() if fr and not bad_ingredients({**p, "ingredients_text": fr}) else None
    name = norm(p.get("name_fr")) + " " + norm(p.get("brand"))
    if p.get("category_id") == 5 and COCOA_POWDER.search(name) and not re.search(r"\d\s*(ml|cl|l)\b", norm(p.get("quantity"))):
        patch["category_id"] = 2
    # L'eau est NOVA 1 même avec ses minéraux listés en « additifs »
    water = p.get("category_id") == 6 and WATER.search(name)
    # NOVA 1 = aliment brut ou peu transformé : jamais de sucre ni de sirop ajouté
    sugar = re.search(r"\bsucre\b|sirop|glucose|dextrose|saccharose", norm(p.get("ingredients_text")))
    if p.get("nova_group") == 1 and not water and (p.get("additives") or ULTRA.search(name) or reason or sugar):
        off = off if off is not None else off_product(p["barcode"])
        nova = (off or {}).get("nova_group")
        patch["nova_group"] = nova if nova in (2, 3, 4) else None
    return patch, reason


def main():
    if not TOKEN:
        sys.exit("DTOKEN manquant")
    fields = "id,barcode,name_fr,brand,quantity,category_id,ingredients_text,additives,nova_group,scan_count"
    rows = api("GET", f"/items/products?filter[status][_eq]=published&filter[product_type][_eq]=food&limit=-1&fields={fields}")["data"]
    report = {"brand": 0, "ingredients": 0, "nova": 0, "category": 0, "off_unavailable": 0}
    for p in sorted(rows, key=lambda r: -(r.get("scan_count") or 0)):
        try:
            patch, reason = plan(p)
        except OffUnavailable:
            report["off_unavailable"] += 1  # fiche laissée telle quelle, repassera au prochain passage
            continue
        if not patch:
            continue
        for key, field in (("brand", "brand"), ("ingredients", "ingredients_text"), ("nova", "nova_group"), ("category", "category_id")):
            report[key] += field in patch
        print(json.dumps({"barcode": p["barcode"], "name": p["name_fr"], "why": reason,
                          "before": {k: p.get(k) for k in patch}, "after": patch}, ensure_ascii=False))
        if APPLY:
            api("PATCH", f"/items/products/{p['id']}", patch)
            if "ingredients_text" in patch:
                links = api("GET", f"/items/products_ingredients?filter[products_id][_eq]={p['id']}&fields=id&limit=-1")["data"]
                if links:
                    api("DELETE", "/items/products_ingredients", [link["id"] for link in links])
    print(json.dumps({"apply": APPLY, "checked": len(rows), **report}), file=sys.stderr)


if __name__ == "__main__":
    main()
