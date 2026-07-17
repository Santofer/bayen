#!/usr/bin/env python3
"""
C8b — Lie les produits « texte brut » au référentiel ingredients (cron nightly).
Tourne DANS bayen-tesseract.

Cible : produits published avec ingredients_text non vide mais AUCUN lien
products_ingredients (leur fiche retombe sur le fallback texte, souvent une
soupe OCR multilingue illisible).

Pour chaque produit : /translate-ingredients-batch (Qwen) nettoie/déduplique/
traduit → chaque ingrédient est mappé sur le référentiel `ingredients`
(match name_fr insensible à la casse, création sinon) → liens
products_ingredients créés (rank + percent) → ingredients_text réécrit en
français propre + traces fusionnées.

Idempotent : un produit avec ≥1 lien M2M n'est jamais retraité.
Dry-run : APPLY=0. Token admin : DTOKEN. Volume par run : MAX_PRODUCTS.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TESSERACT = os.environ.get("TESSERACT_URL", "http://localhost:5000")
APPLY = os.environ.get("APPLY", "1") == "1"
CHUNK = int(os.environ.get("CHUNK", "4"))
MAX_PRODUCTS = int(os.environ.get("MAX_PRODUCTS", "150"))
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


def get_or_create_ingredient(res_ing, ref_by_name, token):
    """Retourne l'id du référentiel pour un ingrédient IA (création si absent)."""
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
        # Course/contrainte unique → re-lire
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

    # Produits déjà structurés (≥1 lien M2M) → à ignorer
    links = req(DIRECTUS + "/items/products_ingredients?fields=products_id&limit=-1",
                token=token)["data"]
    linked = {str(l.get("products_id")) for l in links}

    url = (DIRECTUS + "/items/products?filter[status][_eq]=published"
           "&filter[ingredients_text][_nnull]=true"
           "&fields=id,barcode,name_fr,ingredients_text,traces"
           "&limit=-1&sort=-scan_count")
    if ONLY_BARCODE:
        url += "&filter[barcode][_eq]=" + ONLY_BARCODE
    prods = req(url, token=token)["data"]

    todo = [p for p in prods
            if str(p["id"]) not in linked and (p.get("ingredients_text") or "").strip()][:MAX_PRODUCTS]
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print("[" + ts + "] " + str(len(todo)) + " produits texte-brut a structurer (apply="
          + str(APPLY) + ")", flush=True)
    if not todo:
        return 0

    # Référentiel en mémoire (name_fr lowercase → id)
    ref = req(DIRECTUS + "/items/ingredients?fields=id,name_fr&limit=-1", token=token)["data"]
    ref_by_name = {(i.get("name_fr") or "").strip().lower(): i["id"] for i in ref
                   if (i.get("name_fr") or "").strip()}

    done = fail = 0
    for i in range(0, len(todo), CHUNK):
        chunk = todo[i:i + CHUNK]
        payload = {"products": [{
            "id": p["id"],
            "ingredients": [],
            "ingredients_text": (p.get("ingredients_text") or "")[:1500],
        } for p in chunk]}
        try:
            r = req(TESSERACT + "/translate-ingredients-batch", "POST", payload, timeout=240)
            by_id = {str(res.get("id")): res for res in (r.get("results") or [])}
            for p in chunk:
                res = by_id.get(str(p["id"]))
                items = [x for x in (res.get("ingredients") or []) if isinstance(x, dict)] if res else []
                if not items:
                    fail += 1
                    continue
                items = items[:40]
                if not APPLY:
                    names = ", ".join((x.get("name_fr") or "?") for x in items[:8])
                    print("  [dry] " + (p.get("name_fr") or "?")[:35] + " -> " + names, flush=True)
                    done += 1
                    continue
                try:
                    ok_links = 0
                    fr_names = []
                    for rank, ing in enumerate(items, start=1):
                        iid = get_or_create_ingredient(ing, ref_by_name, token)
                        if iid is None:
                            continue
                        pc = ing.get("percent")
                        if not isinstance(pc, (int, float)) or pc < 0 or pc > 100:
                            pc = None
                        req(DIRECTUS + "/items/products_ingredients", "POST", {
                            "products_id": p["id"],
                            "ingredients_id": iid,
                            "percent": pc,
                            "rank": rank,
                        }, token=token, timeout=30)
                        ok_links += 1
                        fr_names.append((ing.get("name_fr") or "").strip())
                    if ok_links == 0:
                        fail += 1
                        continue
                    # ingredients_text : version française propre + traces fusionnées
                    patch = {"ingredients_text": ", ".join(n for n in fr_names if n)[:1000]}
                    traces = [t.strip() for t in (res.get("traces_fr") or [])
                              if isinstance(t, str) and t.strip()]
                    if traces:
                        existing = p.get("traces") if isinstance(p.get("traces"), list) else []
                        patch["traces"] = list(dict.fromkeys([*existing, *traces]))
                    req(DIRECTUS + "/items/products/" + str(p["id"]), "PATCH",
                        patch, token=token, timeout=30)
                    done += 1
                except Exception:  # noqa: BLE001
                    fail += 1
        except urllib.error.HTTPError as e:
            fail += len(chunk)
            if e.code == 429:
                time.sleep(15)
        except Exception:  # noqa: BLE001
            fail += len(chunk)
        if (i // CHUNK) % 5 == 0:
            print("  ... " + str(min(i + CHUNK, len(todo))) + "/" + str(len(todo))
                  + " (structures=" + str(done) + ")", flush=True)
        time.sleep(0.8)

    print("[done] structures=" + str(done) + " echecs=" + str(fail), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
