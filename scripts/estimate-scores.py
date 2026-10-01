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
import urllib.parse
import urllib.request
import urllib.error

API = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
BATCH_MAX = int(os.environ.get("BATCH_MAX", "80"))  # plafond par run (cascade 5 à 60 s par fiche)
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

    # Fiches sans score, sans énergie ou à la nutrition partielle (sucres/sel/AGS),
    # les plus scannées d'abord ; les estimations IA déjà posées sont laissées tranquilles
    # … et pas examinées depuis 30 jours (enriched_at), sinon les fiches sans issue
    # reviendraient chaque nuit en tête de liste et bloqueraient les suivantes
    flt = {"_and": [
        {"status": {"_eq": "published"}}, {"product_type": {"_eq": "food"}},
        {"barcode": {"_nnull": True}}, {"data_source": {"_neq": "ai_estimate"}},
        {"_or": [{"scan_score": {"_null": True}}, {"energy_kcal": {"_null": True}}, {"sugars": {"_null": True}},
                 {"salt": {"_null": True}}, {"fat_saturated": {"_null": True}}]},
        {"_or": [{"enriched_at": {"_null": True}}, {"enriched_at": {"_lt": "$NOW(-30 days)"}}]},
    ]}
    base = ("/items/products?filter=" + urllib.parse.quote(json.dumps(flt))
            + "&fields=barcode,name_fr&sort=-scan_count&limit=" + str(BATCH_MAX))
    prods = req(API + base, token=token)["data"]
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print("[" + ts + "] " + str(len(prods)) + " produits non evalues", flush=True)
    if not prods:
        return 0

    ok = skip = no = err = 0
    methods, reasons = {}, {}
    for p in prods:
        try:
            r = req(API + "/bayen-api/estimate-and-score", "POST",
                    {"barcode": p["barcode"]}, token=token, timeout=300)
            if r.get("estimated"):
                ok += 1
                methods[r.get("method") or "?"] = methods.get(r.get("method") or "?", 0) + 1
            else:
                no += 1
                reasons[r.get("reason") or "?"] = reasons.get(r.get("reason") or "?", 0) + 1
            print("  " + p["barcode"] + " " + (p.get("name_fr") or "")[:34] + " -> " + str(r.get("method") or r.get("reason")) + " " + ",".join(r.get("filled") or []), flush=True)
        except urllib.error.HTTPError as e:
            err += 1
            if e.code == 429:
                time.sleep(20)
        except Exception:  # noqa: BLE001
            err += 1
        time.sleep(1.0)  # respiration entre appels IA

    print("[done] completes=" + str(ok) + " " + json.dumps(methods) + " | non completes=" + str(no) + " "
          + json.dumps(reasons) + " | erreurs=" + str(err), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
