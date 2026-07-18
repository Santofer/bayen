#!/usr/bin/env python3
"""
Lecture VISION des photos d'ingrédients rapatriées (cron nightly + one-shot).
Tourne DANS bayen-tesseract.

Cible : produits published avec une photo `image_ingredients` (souvent
rapatriée depuis Open Food Facts par le bouton « Enrichir ») pas encore lue
(`ingredients_ocr_at` null). La photo est la source la plus riche : OFF n'a
souvent qu'un texte pauvre (« PEACH JAM ») alors que l'étiquette liste tout.

Pour chaque produit : télécharge l'image depuis Directus → /pipeline local
(vision Qwen) → si la lecture donne au moins autant d'ingrédients que
l'existant, REMPLACE les liens products_ingredients (référentiel : match
name_fr, création sinon), réécrit ingredients_text en FR propre, fusionne
traces et additifs. Marque ingredients_ocr_at dans tous les cas (pas de
boucle infinie sur les photos illisibles — relancer en forçant : FORCE=1).

Dry-run : APPLY=0. Token admin : DTOKEN.
"""

import io
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TESSERACT = os.environ.get("TESSERACT_URL", "http://localhost:5000")
APPLY = os.environ.get("APPLY", "1") == "1"
FORCE = os.environ.get("FORCE", "0") == "1"
MAX_PRODUCTS = int(os.environ.get("MAX_PRODUCTS", "30"))
ONLY_BARCODE = os.environ.get("ONLY_BARCODE", "").strip()

CATEGORIES = {"cereale", "sucre", "graisse", "laitier", "proteine",
              "fruit_legume", "sel", "eau", "arome", "additif", "autre"}


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


def get_or_create_ingredient(res_ing, ref_by_name, token):
    fr = (res_ing.get("name_fr") or "").strip()
    if not fr:
        return None
    key = fr.lower()
    if key in ref_by_name:
        return ref_by_name[key]
    payload = {
        "name_fr": fr[:120],
        "name_ar": ((res_ing.get("name_ar") or "").strip() or None),
        "category": res_ing.get("category") if res_ing.get("category") in CATEGORIES else "autre",
        "is_allergen": bool(res_ing.get("is_allergen")),
        "icon": "",
    }
    try:
        created = req(DIRECTUS + "/items/ingredients", "POST", payload, token=token, timeout=30)
        iid = created.get("data", {}).get("id")
    except urllib.error.HTTPError:
        found = req(
            DIRECTUS + "/items/ingredients?filter[name_fr][_eq]=" + urllib.parse.quote(fr)
            + "&fields=id&limit=1", token=token,
        )["data"]
        iid = found[0]["id"] if found else None
    if iid is not None:
        ref_by_name[key] = iid
    return iid


def main():
    token = os.environ.get("DTOKEN", "").strip()
    if not token:
        print("[err] DTOKEN manquant", flush=True)
        return 1

    url = (DIRECTUS + "/items/products?filter[status][_eq]=published"
           "&filter[image_ingredients][_nnull]=true"
           + ("" if FORCE else "&filter[ingredients_ocr_at][_null]=true")
           + "&fields=id,barcode,name_fr,image_ingredients,additives,traces"
           "&limit=" + str(MAX_PRODUCTS) + "&sort=-date_updated")
    if ONLY_BARCODE:
        url += "&filter[barcode][_eq]=" + ONLY_BARCODE
    prods = req(url, token=token)["data"]

    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print("[" + ts + "] " + str(len(prods)) + " photos d'ingredients a lire (apply="
          + str(APPLY) + ")", flush=True)
    if not prods:
        return 0

    ref = req(DIRECTUS + "/items/ingredients?fields=id,name_fr&limit=-1", token=token)["data"]
    ref_by_name = {(i.get("name_fr") or "").strip().lower(): i["id"] for i in ref
                   if (i.get("name_fr") or "").strip()}

    done = skipped = fail = 0
    now = time.strftime("%Y-%m-%dT%H:%M:%S")
    for p in prods:
        try:
            # 1. Télécharger la photo depuis Directus (redimensionnée serveur)
            img_url = (DIRECTUS + "/assets/" + str(p["image_ingredients"])
                       + "?width=768&quality=85&access_token=" + urllib.parse.quote(token))
            with urllib.request.urlopen(img_url, timeout=60) as resp:
                blob = resp.read()

            # 2. Lecture vision
            r = post_multipart(TESSERACT + "/pipeline", "image_nutrition",
                               str(p["barcode"]) + ".jpg", blob)
            parsed = r.get("parsed_data") or {}
            items = [x for x in (parsed.get("ingredients") or []) if isinstance(x, dict)][:40]

            # 3. Liens existants — la vision ne remplace que si elle fait mieux
            links = req(
                DIRECTUS + "/items/products_ingredients?filter[products_id][_eq]=" + str(p["id"])
                + "&fields=id&limit=-1", token=token,
            )["data"]

            if r.get("job_status") != "done" or len(items) < max(2, len(links)):
                skipped += 1
                if APPLY:
                    req(DIRECTUS + "/items/products/" + str(p["id"]), "PATCH",
                        {"ingredients_ocr_at": now}, token=token, timeout=30)
                print("  [skip] " + (p.get("name_fr") or "?")[:35] + " (vision="
                      + str(len(items)) + ", existant=" + str(len(links)) + ")", flush=True)
                continue

            if not APPLY:
                names = ", ".join((x.get("name_fr") or "?") for x in items[:8])
                print("  [dry] " + (p.get("name_fr") or "?")[:35] + " -> " + names, flush=True)
                done += 1
                continue

            # 4. Remplacer les liens
            for link in links:
                req(DIRECTUS + "/items/products_ingredients/" + str(link["id"]),
                    "DELETE", token=token, timeout=30)
            fr_names = []
            for rank, ing in enumerate(items, start=1):
                iid = get_or_create_ingredient(ing, ref_by_name, token)
                if iid is None:
                    continue
                pc = ing.get("percent")
                if not isinstance(pc, (int, float)) or pc < 0 or pc > 100:
                    pc = None
                req(DIRECTUS + "/items/products_ingredients", "POST", {
                    "products_id": p["id"], "ingredients_id": iid,
                    "percent": pc, "rank": rank,
                }, token=token, timeout=30)
                fr_names.append((ing.get("name_fr") or "").strip())

            # 5. Champs produit : texte FR, traces, additifs (fusion), marquage
            patch = {
                "ingredients_text": ", ".join(n for n in fr_names if n)[:1000],
                "ingredients_ocr_at": now,
            }
            traces = [t.strip() for t in (parsed.get("traces_fr") or [])
                      if isinstance(t, str) and t.strip()]
            if traces:
                existing_tr = p.get("traces") if isinstance(p.get("traces"), list) else []
                patch["traces"] = list(dict.fromkeys([*existing_tr, *traces]))
            new_adds = [a for a in (parsed.get("additives") or []) if isinstance(a, str)]
            if new_adds:
                existing_adds = p.get("additives") if isinstance(p.get("additives"), list) else []
                patch["additives"] = list(dict.fromkeys([*existing_adds, *new_adds]))
            req(DIRECTUS + "/items/products/" + str(p["id"]), "PATCH",
                patch, token=token, timeout=30)
            done += 1
            print("  [ok] " + (p.get("name_fr") or "?")[:35] + " : "
                  + str(len(fr_names)) + " ingredients (avant: " + str(len(links)) + ")", flush=True)
        except Exception as e:  # noqa: BLE001
            fail += 1
            print("  [err] " + (p.get("name_fr") or "?")[:35] + " : " + str(e)[:80], flush=True)
        time.sleep(0.5)

    print("[done] lus=" + str(done) + " ignores=" + str(skipped) + " echecs=" + str(fail), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
