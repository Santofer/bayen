#!/usr/bin/env python3
"""
Jeu de photos de plats sous licence libre (Wikimedia Commons) — étalon de l'IA repas.

Pourquoi Commons et pas Google Images : les photos y sont sous CC0 / CC-BY /
CC-BY-SA, réutilisables avec attribution ; une image glanée sur Google appartient
à son auteur et ne peut pas servir à entraîner un modèle commercial.

Chaque photo est réduite à 768 px (la taille que voit le modèle) et consignée
dans manifest.jsonl avec son plat attendu, sa famille, l'auteur, la licence et
l'URL source (attribution). Les catégories Commons étant grossières (« Moroccan
tajines »), le titre du fichier affine le plat quand il le précise.

Usage (dans bayen-tesseract) : OUT=/tmp/meal-dataset python3 - < scripts/build-meal-dataset.py
"""
import io, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
from PIL import Image

OUT = os.environ.get("OUT", "/tmp/meal-dataset")
UA = {"User-Agent": "BayenDatasetBot/1.0 (https://bayen.ma; contact@n0.ma)"}
API = "https://commons.wikimedia.org/w/api.php"
FREE = re.compile(r"^(cc0|cc[- ]by(-sa)?[- ]?[\d.]*|public domain|pd\b|attribution)", re.I)

# (catégorie Commons, plat du référentiel, famille, plafond)
SOURCES = [
    ("Harira", "Harira", "harira", 60), ("Pastilla", "Pastilla au poulet", "pastilla", 60),
    ("Baghrir", "Baghrir", "baghrir", 60), ("Msemmen", "Msemen", "msemen", 60),
    ("Rfissa", "Rfissa", "rfissa", 60), ("Chebakia", "Chebakia", "chebakia", 60),
    ("Sfenj", "Sfenj", "sfenj", 60), ("Zaalouk", "Zaalouk", "zaalouk", 60),
    ("Bissara", "Bissara", "bissara", 60), ("Mrouzia", "Mrouzia", "mrouzia", 60),
    ("Seffa of Morocco", "Seffa medfouna", "seffa", 60), ("Harcha", "Harcha", "harcha", 60),
    ("Briwats", "Briouates à la viande", "briouates", 60), ("Ma'quda", "Maakouda", "maakouda", 60),
    ("Mhancha", "Mhancha", "mhancha", 60), ("Tangia", "Tanjia", "tanjia", 60),
    ("Méchoui", "Méchoui", "mechoui", 60), ("Moroccan Kefta", "Kefta grillée", "kefta", 60),
    ("Sellou", "Sellou", "sellou", 60), ("Amlou", "Amlou", "amlou", 60),
    ("Salads of Morocco", "Salade marocaine", "salade", 40), ("Mint tea", "Thé à la menthe sucré", "the", 40),
    ("Moroccan tajines", "Tajine", "tajine", 160), ("Chicken tajine", "Tajine de poulet aux olives", "tajine", 40),
    ("Tajines in an unknown location", "Tajine", "tajine", 40), ("Couscous", "Couscous", "couscous", 90),
    ("Lentil soups", "Adas (lentilles)", "lentilles", 20),
    ("Pizzas in Morocco", "Pizza", "pizza", 25), ("Shawarma", "Shawarma", "shawarma", 25),
    ("French tacos", "Tacos (french tacos)", "tacos", 25), ("Hamburgers", "Hamburger", "burger", 25),
    ("French fries", "Frites", "frites", 25), ("Sushi", "Sushis", "sushi", 25),
    ("Lasagna", "Lasagnes", "lasagne", 25), ("Spaghetti alla carbonara", "Pâtes carbonara", "pates", 25),
    ("Caesar salad", "Salade César", "salade", 25), ("Omelettes", "Omelette", "omelette", 25),
    ("Croissants", "Croissant", "croissant", 25), ("Pains au chocolat", "Pain au chocolat", "pain au chocolat", 25),
    ("Fried chicken", "Poulet frit (fast-food)", "poulet frit", 25), ("Chicken nuggets", "Nuggets de poulet", "nuggets", 25),
    ("Crêpes", "Crêpe sucrée", "crepe", 25), ("Ice cream cones", "Glace", "glace", 25),
    ("Steak frites", "Steak frites", "steak", 25), ("Panini", "Panini", "panini", 25),
    ("Grilled fish", "Poisson grillé et légumes", "poisson", 25), ("Fruit salads", "Assiette de fruits frais", "fruits", 25),
    ("Breakfast cereals", "Bol de céréales au lait", "cereales", 25),
]
# Le titre précise le plat dans les grandes familles
TITLE_RULES = {
    "tajine": [(r"kefta|kofta|meatball", "Tajine de kefta aux œufs"), (r"prune|pruneau|apricot|abricot|mrouzia", "Tajine d'agneau aux pruneaux"),
               (r"fish|poisson|sardin", "Tajine de poisson chermoula"), (r"vegetable|legume|veggie", "Tajine de légumes"),
               (r"chicken|poulet|djaj", "Tajine de poulet aux olives"), (r"beef|boeuf|lamb|agneau|mutton|meat|viande", "Tajine de bœuf aux légumes")],
    "couscous": [(r"tfaya", "Couscous tfaya"), (r"fish|poisson", "Couscous au poisson"), (r"chicken|poulet", "Couscous au poulet"),
                 (r"vegetable|legume|seven|sept|7", "Couscous aux sept légumes"), (r"lamb|agneau|beef|boeuf|meat|viande", "Couscous à la viande")],
}
SKIP_TITLE = re.compile(r"\b(maker|pot|ceramic|market|shop|store|restaurant sign|menu|logo|map|drawing|painting|souk|poster|box|packag)", re.I)


def api(**params):
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json"})
    for attempt in range(4):
        try:
            return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40).read())
        except Exception:  # noqa: BLE001
            time.sleep(2 * (attempt + 1))
    return {}


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn")


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = open(os.path.join(OUT, "manifest.jsonl"), "w")
    seen, total = set(), 0
    for cat, dish, family, cap in SOURCES:
        files, cont = [], {}
        while len(files) < cap * 2:
            r = api(action="query", list="categorymembers", cmtitle="Category:" + cat, cmtype="file", cmlimit=200, **cont)
            files += [m["title"] for m in r.get("query", {}).get("categorymembers", [])]
            if "continue" not in r:
                break
            cont = r["continue"]
        kept = 0
        for i in range(0, len(files), 40):
            if kept >= cap:
                break
            batch = [f for f in files[i:i + 40] if f not in seen and re.search(r"\.(jpe?g|png|webp)$", f, re.I)]
            if not batch:
                continue
            r = api(action="query", titles="|".join(batch), prop="imageinfo", iiprop="url|extmetadata|mime", iiurlwidth=768)
            for page in r.get("query", {}).get("pages", {}).values():
                if kept >= cap:
                    break
                title = page.get("title", "")
                info = (page.get("imageinfo") or [{}])[0]
                meta = info.get("extmetadata", {})
                lic = meta.get("LicenseShortName", {}).get("value", "")
                if not FREE.search(lic) or SKIP_TITLE.search(title) or not info.get("thumburl"):
                    continue
                expected = dish
                for pat, d in TITLE_RULES.get(family, []):
                    if re.search(pat, fold(title)):
                        expected = d
                        break
                try:
                    raw = urllib.request.urlopen(urllib.request.Request(info["thumburl"], headers=UA), timeout=40).read()
                    im = Image.open(io.BytesIO(raw)).convert("RGB")
                except Exception:  # noqa: BLE001
                    continue
                if min(im.size) < 300:
                    continue
                name = f"{family.replace(' ', '-')}-{len(seen):05d}.jpg"
                sub = os.path.join(OUT, family.replace(" ", "-"))
                os.makedirs(sub, exist_ok=True)
                im.save(os.path.join(sub, name), quality=88)
                artist = re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "")).strip()[:200]
                manifest.write(json.dumps({"file": f"{family.replace(' ', '-')}/{name}", "dish": expected, "family": family,
                                           "license": lic, "author": artist, "source": info.get("descriptionurl"), "title": title},
                                          ensure_ascii=False) + "\n")
                seen.add(title); kept += 1; total += 1
            time.sleep(0.5)
        print(f"{cat:32} → {kept:3} photos ({dish})", flush=True)
    manifest.close()
    print(f"[done] {total} photos dans {OUT}", flush=True)


if __name__ == "__main__":
    sys.exit(main())
