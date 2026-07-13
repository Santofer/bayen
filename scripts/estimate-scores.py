#!/usr/bin/env python3
"""
Auto-estimation IA des scores pour les produits sans données (cron nightly).
Tourne DANS bayen-tesseract. Pour chaque produit non évalué avec un vrai nom,
appelle /bayen-api/estimate-and-score (admin → pas de rate limit) : l'IA estime,
l'algo déterministe score, le résultat est persisté (data_source=ai_estimate).

Idempotent (l'endpoint ignore les produits déjà scorés). Plafonné par run.
Token admin en env (DTOKEN). Directus atteint par le réseau Docker interne.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error

API = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
BATCH_MAX = 120  # plafond par run (appels IA ~3s chacun)
# Noms génériques inexploitables → on saute (l'IA refuserait de toute façon)
SKIP_NAMES = {"produit sans nom", "inconnu", "", "?"}


def req(url, method="GET", data=None, token=None, timeout=60):
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

    prods = req(
        API + "/items/products?filter[scan_score][_null]=true"
        "&filter[energy_kcal][_null]=true&filter[barcode][_nnull]=true"
        "&filter[status][_eq]=published&fields=barcode,name_fr"
        "&limit=" + str(BATCH_MAX) + "&sort=-date_created",
        token=token,
    )["data"]
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print("[" + ts + "] " + str(len(prods)) + " produits non evalues", flush=True)
    if not prods:
        return 0

    ok = skip = no = err = 0
    for p in prods:
        name = (p.get("name_fr") or "").strip()
        if name.lower() in SKIP_NAMES or len(name) < 4:
            skip += 1
            continue
        try:
            r = req(API + "/bayen-api/estimate-and-score", "POST",
                    {"barcode": p["barcode"]}, token=token, timeout=60)
            if r.get("estimated"):
                ok += 1
            else:
                no += 1  # not_estimable / already_scored / not_scorable
        except urllib.error.HTTPError as e:
            err += 1
            if e.code == 429:
                time.sleep(20)
        except Exception:  # noqa: BLE001
            err += 1
        time.sleep(1.0)  # respiration entre appels IA

    print("[done] estimes=" + str(ok) + " non-estimables=" + str(no)
          + " sautes=" + str(skip) + " erreurs=" + str(err), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
