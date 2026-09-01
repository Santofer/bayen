#!/usr/bin/env python3
"""
Lecture VISION des photos d'ingrédients rapatriées (cron nightly + one-shot).
Tourne DANS bayen-tesseract.

Cible : produits published pas encore lus (`ingredients_ocr_at` null) qui ont
une photo `image_ingredients` locale OU, à défaut d'ingrédients en base, dont
OFF possède une photo d'étiquette (image_ingredients_url / image_nutrition_url,
lues à la volée sans être stockées). La photo est la source la plus riche :
OFF n'a souvent qu'un texte pauvre (« PEACH JAM », nutriments erronés) alors
que l'étiquette liste tout.

En plus des ingrédients/traces/additifs, la lecture vision COMPLÈTE les champs
nutritionnels encore null (jamais d'écrasement d'une valeur existante).

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

    NUTRI_FIELDS = ["energy_kcal", "fat_total", "fat_saturated", "carbs_total",
                    "sugars", "fiber", "proteins", "salt"]
    base_fields = ("id,barcode,name_fr,image_ingredients,image_nutrition,"
                   "ingredients_text,nova_group,additives,traces," + ",".join(NUTRI_FIELDS))
    ocr_filter = "" if FORCE else "&filter[ingredients_ocr_at][_null]=true"

    # 1. Photos locales pas encore lues
    url = (DIRECTUS + "/items/products?filter[status][_eq]=published"
           "&filter[image_ingredients][_nnull]=true" + ocr_filter
           + "&fields=" + base_fields
           + "&limit=" + str(MAX_PRODUCTS) + "&sort=-date_updated")
    if ONLY_BARCODE:
        url += "&filter[barcode][_eq]=" + ONLY_BARCODE
    prods = req(url, token=token)["data"]

    # 2. Complément : produits SANS ingrédients en base → OFF a peut-être la photo
    if len(prods) < MAX_PRODUCTS:
        url2 = (DIRECTUS + "/items/products?filter[status][_eq]=published"
                "&filter[image_ingredients][_null]=true"
                "&filter[ingredients_text][_null]=true" + ocr_filter
                + "&fields=" + base_fields
                + "&limit=" + str(MAX_PRODUCTS - len(prods)) + "&sort=-scan_count")
        if ONLY_BARCODE:
            url2 += "&filter[barcode][_eq]=" + ONLY_BARCODE
        prods += req(url2, token=token)["data"]

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

    # Le pipeline renvoie les mêmes clés que la base (energy_kcal, proteins…),
    # avec une borne haute par champ : les g/100g ne peuvent pas dépasser 100.
    VISION_MAX = {"energy_kcal": 950, "fat_total": 100, "fat_saturated": 100,
                  "carbs_total": 100, "sugars": 100, "fiber": 100,
                  "proteins": 100, "salt": 40}

    def nutrition_fill(prod, parsed_data):
        """Champs nutrition null du produit complétés par la vision (jamais d'écrasement)."""
        out = {}
        for key, vmax in VISION_MAX.items():
            if prod.get(key) is None:
                v = parsed_data.get(key)
                if isinstance(v, (int, float)) and 0 <= v <= vmax:
                    out[key] = v

        # Cohérence calorique : les kcal doivent approcher 9×lipides +
        # 4×(glucides + protéines). La vision confond parfois un pourcentage
        # des ingrédients avec une valeur du tableau (« Beurre 82% » lu comme
        # 82 g de lipides) : en cas d'écart franc, on jette les macros lues
        # plutôt que d'écrire du faux.
        merged = {k: (out.get(k) if out.get(k) is not None else prod.get(k))
                  for k in ("energy_kcal", "fat_total", "carbs_total", "proteins")}
        if all(isinstance(v, (int, float)) for v in merged.values()) and merged["energy_kcal"] >= 30:
            theo = 9 * merged["fat_total"] + 4 * (merged["carbs_total"] + merged["proteins"])
            if abs(theo - merged["energy_kcal"]) > 0.45 * merged["energy_kcal"]:
                for key in ("fat_total", "fat_saturated", "carbs_total", "sugars", "proteins"):
                    out.pop(key, None)

        nova = parsed_data.get("nova_group")
        if prod.get("nova_group") is None and isinstance(nova, int) and 1 <= nova <= 4:
            out["nova_group"] = nova
        return out

    def read_nutrition_photo(prod, current_fill):
        """Lecture COMPLÉMENTAIRE de la photo du tableau nutritionnel.

        Le script ne lisait que la photo d'ingrédients : quand une fiche a
        aussi une photo `image_nutrition` et qu'il reste des champs null
        (dont sel et NOVA — ceux qui allument « Score incomplet »), une
        deuxième lecture les comble.
        """
        remaining = [k for k in [*VISION_MAX, "nova_group"]
                     if prod.get(k) is None and k not in current_fill]
        if not remaining or not prod.get("image_nutrition"):
            return {}
        try:
            url = (DIRECTUS + "/assets/" + str(prod["image_nutrition"])
                   + "?width=768&quality=85&access_token=" + urllib.parse.quote(token))
            with urllib.request.urlopen(url, timeout=60) as resp:
                blob = resp.read()
            r2 = post_multipart(TESSERACT + "/pipeline", "image_nutrition",
                                str(prod.get("barcode") or "nut") + "-nut.jpg", blob)
            if r2.get("job_status") != "done":
                return {}
            merged = dict(prod)
            merged.update(current_fill)
            return nutrition_fill(merged, r2.get("parsed_data") or {})
        except Exception:  # noqa: BLE001
            return {}
    for p in prods:
        try:
            # 1. Photo : locale (asset Directus) ou, à défaut, directement OFF
            if p.get("image_ingredients"):
                img_url = (DIRECTUS + "/assets/" + str(p["image_ingredients"])
                           + "?width=768&quality=85&access_token=" + urllib.parse.quote(token))
            else:
                off = req("https://world.openfoodfacts.org/api/v2/product/"
                          + str(p["barcode"]) + ".json?fields=image_ingredients_url,image_nutrition_url",
                          timeout=30)
                offp = off.get("product") or {}
                img_url = offp.get("image_ingredients_url") or offp.get("image_nutrition_url")
                # OFF renvoie la miniature 400 px, illisible pour la vision —
                # demander l'originale (le serveur vision redimensionne à 768 px)
                if img_url:
                    img_url = img_url.replace(".400.jpg", ".full.jpg")
                if not img_url:
                    if APPLY:
                        req(DIRECTUS + "/items/products/" + str(p["id"]), "PATCH",
                            {"ingredients_ocr_at": now}, token=token, timeout=30)
                    skipped += 1
                    continue
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

            # Seuil : mieux que l'existant, et au moins 2 ingrédients — sauf
            # pour une fiche totalement vide, où un produit MONO-ingrédient
            # (riz, huile, miel…) est légitime avec une seule lecture.
            min_items = max(2, len(links)) if (links or (p.get("ingredients_text") or "").strip()) else 1
            if r.get("job_status") != "done" or len(items) < min_items:
                # Pas mieux côté ingrédients — mais la photo (souvent un tableau
                # nutritionnel) peut quand même combler la nutrition manquante.
                nutri = nutrition_fill(p, parsed) if r.get("job_status") == "done" else {}
                nutri.update(read_nutrition_photo(p, nutri))
                skipped += 1
                if APPLY:
                    req(DIRECTUS + "/items/products/" + str(p["id"]), "PATCH",
                        {"ingredients_ocr_at": now, **nutri}, token=token, timeout=30)
                print("  [skip] " + (p.get("name_fr") or "?")[:35] + " (vision="
                      + str(len(items)) + ", existant=" + str(len(links))
                      + (", +" + str(len(nutri)) + " nutrition" if nutri else "") + ")", flush=True)
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

            # 5. Champs produit : texte FR, traces, additifs (fusion), nutrition
            #    manquante (jamais d'écrasement), marquage
            patch = {
                "ingredients_text": ", ".join(n for n in fr_names if n)[:1000],
                "ingredients_ocr_at": now,
            }
            nutri = nutrition_fill(p, parsed)
            nutri.update(read_nutrition_photo(p, nutri))
            if nutri:
                patch.update(nutri)
                print("    (+" + str(len(nutri)) + " champs nutrition completes)", flush=True)
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
