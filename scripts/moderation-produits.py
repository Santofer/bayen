"""Modération ponctuelle des fiches (16/10/2026) : retire les non-alimentaires et non-cosmétiques, reclasse les
cosmétiques rangés en alimentaire, range les photos de face qui sont un code-barres ou une étiquette, masque les
fiches fantômes (sans nom ni photo exploitable). Liste d'actions explicite dans ACTIONS ; fantômes calculés.
  docker exec -e DTOKEN=… [-e APPLY=1] -i bayen-tesseract python3 - < moderation-produits.py
Sans APPLY=1 : essai à blanc. Rien n'est supprimé (statuts archived / draft, réversibles)."""
import json, os, re, sys, urllib.request

API = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TOKEN = os.environ.get("DTOKEN", "").strip()
APPLY = os.environ.get("APPLY") == "1"
if not TOKEN:
    sys.exit("[err] DTOKEN manquant")


def req(method, path, body=None):
    r = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read() or b"{}")


# Ni alimentaire ni cosmétique (ou fiche poubelle) → archived
ARCHIVER = {
    "6111250863056": "eau de Javel", "6111250478847": "eau de Javel", "6111259733787": "liquide vaisselle (image React)",
    "6118000041252": "médicament (Doliprane)", "6118000170075": "médicament (Baycutène)",
    "6939000518281": "tableau blanc", "6118000081937": "saisie poubelle",
}
# Cosmétiques rangés en alimentaire → product_type cosmetic + catégorie beauté (score recalculé ensuite)
COSMETIQUES = {"6221048407833": "dents", "4005808781812": "visage", "4015000280372": "hygiene",
               "6111024009680": "hygiene", "8006540956212": "cheveux"}
# Photo de face = étiquette (composition) → photo d'ingrédients ; = code-barres seul → retirée
FACE_ETIQUETTE = ["6111128000477", "6111242872387", "6111069003032", "20430733"]
FACE_CODE = ["6111062000175", "6111250475815", "8410376078275", "6118252522264", "6111258242013"]
FANTOME = re.compile(r"^\s*$|^produit sans nom|^[0-9]{8,14}$|^inconnu", re.I)

produits = req("GET", "/items/products?filter[status][_eq]=published&limit=-1&fields=id,barcode,name_fr,image_front,image_ingredients")["data"]
par_code = {p["barcode"]: p for p in produits}
plan = []
for b, why in ARCHIVER.items():
    if b in par_code: plan.append((b, {"status": "archived"}, "archivé : " + why))
for b, cat in COSMETIQUES.items():
    if b in par_code:
        plan.append((b, {"product_type": "cosmetic", "cosmetic_category": cat, "category_id": None, "nutriscore_grade": None,
                         "nova_group": None, "scan_score": None, "score_label": None}, "reclassé en cosmétique (" + cat + ")"))
for b in FACE_ETIQUETTE:
    p = par_code.get(b)
    if p and p["image_front"]:
        patch = {"image_front": None}
        if not p.get("image_ingredients"): patch["image_ingredients"] = p["image_front"]
        plan.append((b, patch, "photo d'étiquette rangée en photo d'ingrédients"))
for b in FACE_CODE:
    if par_code.get(b, {}).get("image_front"): plan.append((b, {"image_front": None}, "photo de code-barres retirée"))
archives = set(ARCHIVER)
for p in produits:
    if p["barcode"] not in archives and FANTOME.search((p["name_fr"] or "").strip()):
        plan.append((p["barcode"], {"status": "draft"}, "fiche fantôme masquée (sans nom)"))

for b, patch, why in plan:
    print(("[fait] " if APPLY else "[à faire] ") + b + " · " + why, flush=True)
    if APPLY: req("PATCH", "/items/products/" + par_code[b]["id"], patch)
print(f"{len(plan)} action(s)" + ("" if APPLY else " — essai à blanc : relancer avec APPLY=1"))
print("COSMETIQUES=" + ",".join(b for b in COSMETIQUES if b in par_code))
