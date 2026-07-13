#!/usr/bin/env python3
"""
Détection des non-aliments parmi les produits sans catégorie (one-shot).
Tourne DANS bayen-tesseract. Conservateur : dans le doute → aliment.
Les non-aliments confirmés (médicament/complément/cosmétique/objet) passent en
status='archived' (RÉVERSIBLE). Chaque produit archivé est logué (nom + type).
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
    apply_changes = os.environ.get("APPLY", "1") == "1"

    prods = req(
        DIRECTUS + "/items/products?filter[category_id][_null]=true"
        "&filter[status][_eq]=published&fields=id,name_fr,brand,barcode"
        "&limit=2000&sort=-date_created",
        token=token,
    )["data"]
    usable = [p for p in prods if (p.get("name_fr") or "").strip().lower() not in SKIP_NAMES
              and len((p.get("name_fr") or "").strip()) >= 4
              and not (p.get("name_fr") or "").strip().isdigit()]
    print("[nonfood] " + str(len(usable)) + " produits a examiner", flush=True)

    archived = 0
    for i in range(0, len(usable), CHUNK):
        chunk = usable[i:i + CHUNK]
        items = [{"index": j, "name": p.get("name_fr") or "", "brand": p.get("brand") or ""}
                 for j, p in enumerate(chunk)]
        try:
            r = req(TESSERACT + "/detect-nonfood-batch", "POST", {"items": items}, timeout=120)
            for res in (r.get("resultats") or []):
                j = res.get("index")
                if not isinstance(j, int) or j < 0 or j >= len(chunk):
                    continue
                if res.get("is_food") is False:
                    p = chunk[j]
                    print("  ARCHIVE [" + str(res.get("type")) + "] " + (p.get("name_fr") or "")
                          + " (" + str(p.get("barcode")) + ")", flush=True)
                    if apply_changes:
                        try:
                            req(DIRECTUS + "/items/products/" + str(p["id"]), "PATCH",
                                {"status": "archived"}, token=token, timeout=30)
                            archived += 1
                        except Exception as e:  # noqa: BLE001
                            print("    echec PATCH: " + str(e), flush=True)
        except Exception as e:  # noqa: BLE001
            print("  chunk error: " + str(e), flush=True)
        time.sleep(0.6)

    print("[done] archives=" + str(archived) + (" (dry-run)" if not apply_changes else ""), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
