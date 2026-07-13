#!/usr/bin/env python3
"""
Auto-backfill des images produits Bayen depuis Open Food Facts.
Tourne sur le serveur (cron nightly). Idempotent : ne traite que les
produits published sans image_front mais avec un barcode.

Token statique admin lu depuis /mnt/user/appdata/bayen/scripts/.directus-token
(fichier root-600). Rythme 1,3 s/produit (rate limit OFF 100 req/min).
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

# Tourne DANS le container bayen-tesseract → atteint directus par le réseau
# Docker interne. Token passé en env (DTOKEN) depuis un fichier hôte root-600.
API = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
OFF_API = "https://world.openfoodfacts.org/api/v2/product"
UA = "Bayen/1.0 (auto-backfill; contact@bayen.ma)"
BATCH_MAX = 300  # plafond par run (les nouveaux produits s'accumulent lentement)


def req(url, method="GET", data=None, token=None, timeout=30):
    headers = {"User-Agent": UA, "Content-Type": "application/json"}
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

    prods = req(
        API + "/items/products?filter[image_front][_null]=true"
        "&filter[barcode][_nnull]=true&filter[status][_eq]=published"
        "&fields=id,barcode,name_fr&limit=" + str(BATCH_MAX) + "&sort=-date_created",
        token=token,
    )["data"]
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print("[" + ts + "] " + str(len(prods)) + " produits sans image", flush=True)
    if not prods:
        return 0

    ok = skip = err = 0
    for p in prods:
        bc = p["barcode"]
        name = (p.get("name_fr") or "?")[:40]
        try:
            off = req(OFF_API + "/" + bc + ".json?fields=image_front_url,image_front_small_url", timeout=15)
            img = None
            if off.get("status") == 1:
                pr = off.get("product") or {}
                img = pr.get("image_front_url") or pr.get("image_front_small_url")
            if not img:
                skip += 1
            else:
                f = req(API + "/files/import", "POST",
                        {"url": img, "data": {"title": name + " (OFF)"}}, token=token, timeout=60)
                req(API + "/items/products/" + str(p["id"]), "PATCH",
                    {"image_front": f["data"]["id"]}, token=token)
                ok += 1
        except urllib.error.HTTPError as e:
            err += 1
            if e.code == 429:
                time.sleep(30)
        except Exception:  # noqa: BLE001
            err += 1
        time.sleep(1.3)

    print("[done] importees=" + str(ok) + " sans-image-OFF=" + str(skip) + " erreurs=" + str(err), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
