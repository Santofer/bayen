#!/usr/bin/env python3
"""
C11 — Nomme les produits « sans nom » depuis leur photo de face (cron nightly).
Tourne DANS bayen-tesseract.

Problème résolu : 239 produits published s'affichent « Produit sans nom » ou avec
un code-barres comme nom (le produit le PLUS scanné du mois en faisait partie),
et 350 ont une marque inconnue. 193 d'entre eux ont pourtant une photo.

Pour chaque produit ciblé : télécharge image_front → /identify-product (vision
Qwen) → PATCH name_fr / brand / quantity. Ne remplit QUE les champs vides ou
invalides : un nom correct existant n'est jamais écrasé. Les résultats de
confiance « faible » sont ignorés (pas d'invention).

Idempotent (un produit nommé sort du filtre). Dry-run : APPLY=0.
Ciblage : ONLY_BARCODE. Volume : MAX_PRODUCTS. Token admin : DTOKEN.
"""

import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TESSERACT = os.environ.get("TESSERACT_URL", "http://localhost:5000")
APPLY = os.environ.get("APPLY", "1") == "1"
MAX_PRODUCTS = int(os.environ.get("MAX_PRODUCTS", "60"))
# Sous-quota : produits d'un groupe (même nom+marque) sans contenance — les
# variantes EAN légitimes (5 « Nutella / Ferrero ») sont indistinguables sans elle.
MAX_AMBIGUOUS = int(os.environ.get("MAX_AMBIGUOUS", "20"))
ONLY_BARCODE = os.environ.get("ONLY_BARCODE", "").strip()

# Nom invalide : « produit sans nom », code-barres nu, vide, trop court
BAD_NAME_RE = re.compile(r"^\s*$|^produit sans nom|^[0-9]{8,14}$|^inconnu", re.IGNORECASE)
BAD_BRAND_RE = re.compile(r"^\s*$|^inconnu|^marque inconnue|^unknown", re.IGNORECASE)


def req(url, method="GET", data=None, token=None, timeout=90):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode() or "{}")


def post_multipart(url, field, filename, blob, timeout=180):
    """POST multipart/form-data (stdlib uniquement)."""
    boundary = "----bayen" + uuid.uuid4().hex
    body = io.BytesIO()
    body.write(("--" + boundary + "\r\n").encode())
    body.write((f'Content-Disposition: form-data; name="{field}"; filename="{filename}"\r\n').encode())
    body.write(b"Content-Type: image/jpeg\r\n\r\n")
    body.write(blob)
    body.write(("\r\n--" + boundary + "--\r\n").encode())
    r = urllib.request.Request(url, data=body.getvalue(), headers={
        "Content-Type": "multipart/form-data; boundary=" + boundary,
    }, method="POST")
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode() or "{}")


def bad_name(n):
    return bool(BAD_NAME_RE.match((n or "").strip())) or len((n or "").strip()) < 3


def bad_brand(b):
    return bool(BAD_BRAND_RE.match((b or "").strip()))


def fetch_image(image_front, token):
    """image_front = UUID Directus ou URL externe (héritage OFF)."""
    if str(image_front).startswith("http"):
        url = str(image_front)
    else:
        url = (DIRECTUS + "/assets/" + str(image_front)
               + "?width=768&quality=85&access_token=" + urllib.parse.quote(token))
    with urllib.request.urlopen(url, timeout=60) as resp:
        return resp.read()


def main():
    token = os.environ.get("DTOKEN", "").strip()
    if not token:
        print("[err] DTOKEN manquant", flush=True)
        return 1

    url = (DIRECTUS + "/items/products?filter[status][_eq]=published"
           "&filter[image_front][_nnull]=true"
           "&fields=id,barcode,name_fr,brand,quantity,image_front"
           "&limit=-1&sort=-scan_count")
    if ONLY_BARCODE:
        url += "&filter[barcode][_eq]=" + ONLY_BARCODE
    prods = req(url, token=token)["data"]

    # 1. Candidats principaux : nom ou marque manquants
    todo = [p for p in prods
            if bad_name(p.get("name_fr")) or bad_brand(p.get("brand"))][:MAX_PRODUCTS]

    # 2. Variantes ambiguës : même (nom, marque) en plusieurs exemplaires et
    #    contenance vide → la contenance est ce qui les distingue à l'écran.
    if not ONLY_BARCODE:
        already = {p["id"] for p in todo}
        groups = {}
        for p in prods:
            if bad_name(p.get("name_fr")) or bad_brand(p.get("brand")):
                continue
            key = ((p.get("name_fr") or "").strip().lower(),
                   (p.get("brand") or "").strip().lower())
            groups.setdefault(key, []).append(p)
        ambiguous = [p for members in groups.values() if len(members) > 1
                     for p in members
                     if not (p.get("quantity") or "").strip() and p["id"] not in already]
        if ambiguous:
            print("  (+" + str(min(len(ambiguous), MAX_AMBIGUOUS))
                  + " variantes ambigues sans contenance)", flush=True)
        todo += ambiguous[:MAX_AMBIGUOUS]

    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print("[" + ts + "] " + str(len(todo)) + " produits a identifier (apply="
          + str(APPLY) + ")", flush=True)
    if not todo:
        return 0

    named = branded = sized = skipped = fail = 0
    for p in todo:
        old_name = (p.get("name_fr") or "").strip()
        old_brand = (p.get("brand") or "").strip()
        try:
            blob = fetch_image(p["image_front"], token)
            r = post_multipart(TESSERACT + "/identify-product", "image",
                               str(p.get("barcode") or "produit") + ".jpg", blob)

            if r.get("confiance") == "faible":
                skipped += 1
                print("  [skip] " + (old_name or p.get("barcode") or "?")[:38]
                      + " (photo illisible)", flush=True)
                continue

            patch = {}
            if bad_name(old_name) and r.get("name_fr"):
                patch["name_fr"] = r["name_fr"]
            if bad_brand(old_brand) and r.get("brand"):
                patch["brand"] = r["brand"]
            if not (p.get("quantity") or "").strip() and r.get("quantity"):
                patch["quantity"] = r["quantity"]

            if not patch:
                skipped += 1
                continue

            label = ("  [dry] " if not APPLY else "  [ok]  ") + (old_name or "?")[:26] \
                + " -> " + (patch.get("name_fr") or old_name or "?")[:30] \
                + " | " + (patch.get("brand") or old_brand or "?")[:18] \
                + (" | " + patch["quantity"][:14] if "quantity" in patch else "")
            if APPLY:
                req(DIRECTUS + "/items/products/" + str(p["id"]), "PATCH",
                    patch, token=token, timeout=30)
            print(label, flush=True)
            if "name_fr" in patch:
                named += 1
            if "brand" in patch:
                branded += 1
            if "quantity" in patch:
                sized += 1
        except Exception as e:  # noqa: BLE001
            fail += 1
            print("  [err] " + (old_name or p.get("barcode") or "?")[:38]
                  + " : " + str(e)[:70], flush=True)
        time.sleep(0.4)

    print("[done] noms=" + str(named) + " marques=" + str(branded)
          + " contenances=" + str(sized)
          + " ignores=" + str(skipped) + " echecs=" + str(fail), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
