#!/usr/bin/env python3
"""
Auto-catégorisation des produits Bayen (cron nightly + one-shot).
Tourne DANS bayen-tesseract. Classe les produits sans catégorie dans l'une des
catégories existantes via Qwen (batch de ~20 par appel, efficace).

Directus : réseau Docker interne (bayen-directus:8055). Tesseract : localhost:5000.
Token admin en env (DTOKEN). Idempotent (ne touche qu'aux category_id NULL).
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TESSERACT = os.environ.get("TESSERACT_URL", "http://localhost:5000")
CHUNK = 20
MAX_PRODUCTS = 2200
SKIP_NAMES = {"produit sans nom", "inconnu", "", "?"}


def req(url, method="GET", data=None, token=None, timeout=90):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode() or "{}")


def main():
    token = os.environ.get("DTOKEN", "").strip()
    if not token:
        print("[err] DTOKEN manquant", flush=True)
        return 1

    categories = req(DIRECTUS + "/items/categories?fields=id,name_fr&limit=100", token=token)["data"]
    cats = [{"id": c["id"], "name": c["name_fr"]} for c in categories]

    prods = req(
        DIRECTUS + "/items/products?filter[category_id][_null]=true"
        "&filter[status][_eq]=published&fields=id,name_fr,brand"
        "&limit=" + str(MAX_PRODUCTS) + "&sort=-date_created",
        token=token,
    )["data"]
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print("[" + ts + "] " + str(len(prods)) + " produits sans categorie", flush=True)
    if not prods:
        return 0

    # Filtrer les noms inexploitables
    usable = [p for p in prods if (p.get("name_fr") or "").strip().lower() not in SKIP_NAMES
              and len((p.get("name_fr") or "").strip()) >= 3]
    print("  " + str(len(usable)) + " avec un nom exploitable", flush=True)

    done = fail = 0
    for i in range(0, len(usable), CHUNK):
        chunk = usable[i:i + CHUNK]
        items = [{"index": j, "name": p.get("name_fr") or "", "brand": p.get("brand") or ""}
                 for j, p in enumerate(chunk)]
        try:
            r = req(TESSERACT + "/categorize-batch", "POST",
                    {"items": items, "categories": cats}, timeout=120)
            for res in (r.get("resultats") or []):
                j = res.get("index")
                cid = res.get("category_id")
                if cid is None or not isinstance(j, int) or j < 0 or j >= len(chunk):
                    continue
                try:
                    req(DIRECTUS + "/items/products/" + str(chunk[j]["id"]), "PATCH",
                        {"category_id": cid}, token=token, timeout=30)
                    done += 1
                except Exception:  # noqa: BLE001
                    fail += 1
        except urllib.error.HTTPError as e:
            fail += len(chunk)
            if e.code == 429:
                time.sleep(15)
        except Exception:  # noqa: BLE001
            fail += len(chunk)
        if (i // CHUNK) % 10 == 0:
            print("  ... " + str(i + len(chunk)) + "/" + str(len(usable)) + " (categorises=" + str(done) + ")", flush=True)
        time.sleep(0.6)

    print("[done] categorises=" + str(done) + " echecs=" + str(fail), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
