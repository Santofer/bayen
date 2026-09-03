#!/usr/bin/env python3
"""
C23 — Amorçage de l'univers beauté depuis Open Beauty Facts (Maroc).

Parcourt les produits OBF tagués Maroc et ne retient que ceux qui ont une
liste d'ingrédients exploitable ET une photo de face. Chaque fiche passe par
POST /bayen-api/scan (track=false) : c'est l'endpoint qui importe (photo → R2,
mapping catégorie) et calcule le score cosmétique déterministe. Idempotent :
un produit déjà en base est simplement relu.

Dry-run APPLY=0 (compte seulement) · MAX (défaut 800) · PAGE_SIZE 100.
Usage : docker exec -i bayen-tesseract python3 - < scripts/import-obf-morocco.py
"""
import json, os, sys, time, urllib.request, urllib.error

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
OBF = "https://world.openbeautyfacts.org/api/v2/search"
APPLY = os.environ.get("APPLY", "1") == "1"
MAX = int(os.environ.get("MAX", "800"))
UA = {"User-Agent": "Bayen/1.0 (contact@n0.ma)"}
FIELDS = "code,product_name,product_name_fr,brands,ingredients_text,ingredients_text_fr,image_front_url"


def get(url, timeout=60):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return json.loads(r.read().decode())


def scan(barcode):
    body = json.dumps({"barcode": barcode, "session_id": "import-obf", "track": False}).encode()
    r = urllib.request.Request(f"{DIRECTUS}/bayen-api/scan", data=body, headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read().decode())


def usable(p):
    inci = p.get("ingredients_text_fr") or p.get("ingredients_text") or ""
    name = p.get("product_name_fr") or p.get("product_name") or ""
    code = str(p.get("code") or "")
    return (len(inci) > 20 and "," in inci and p.get("image_front_url") and name.strip()
            and (len(code) == 13 or len(code) == 8) and code.isdigit())


def backfill_inci(token):
    """MODE=backfill : fiches OBF importées sans liste — la liste existait dans une
    autre langue (ingredients_text_es/en/…). On la récupère et on rescore."""
    h = {"Authorization": "Bearer " + token, "Content-Type": "application/json"}
    r = urllib.request.Request(f"{DIRECTUS}/items/products?filter[product_type][_eq]=cosmetic&filter[inci_text][_null]=true&filter[data_source][_eq]=obf&fields=id,barcode&limit=500", headers=h)
    with urllib.request.urlopen(r, timeout=60) as resp:
        rows = json.loads(resp.read().decode())["data"]
    print(f"[backfill] {len(rows)} fiches sans liste", flush=True)
    done = 0
    for p in rows:
        try:
            d = get(f"https://world.openbeautyfacts.org/api/v2/product/{p['barcode']}.json")
            prod = d.get("product") or {}
            keys = ["ingredients_text_fr", "ingredients_text"] + [k for k in prod if k.startswith("ingredients_text_") and len(k) == 19]
            inci = next((prod[k] for k in keys if isinstance(prod.get(k), str) and len(prod[k].strip()) > 5), None)
            if not inci:
                continue
            body = json.dumps({"inci_text": inci[:5000]}).encode()
            urllib.request.urlopen(urllib.request.Request(f"{DIRECTUS}/items/products/{p['id']}", data=body, headers=h, method="PATCH"), timeout=30).read()
            urllib.request.urlopen(urllib.request.Request(f"{DIRECTUS}/bayen-api/cosmetic-score", data=json.dumps({"barcode": p["barcode"]}).encode(), headers=h, method="POST"), timeout=60).read()
            done += 1
        except Exception as e:  # noqa: BLE001
            print(f"  {p['barcode']} KO : {str(e)[:80]}", flush=True)
        time.sleep(0.3)
    print(f"[backfill] listes récupérées : {done}", flush=True)
    return 0


def main():
    if os.environ.get("MODE") == "backfill":
        return backfill_inci(os.environ.get("DTOKEN", "").strip())
    # OBF refuse les pages > 10 aux anonymes : on balaie le même filtre sous
    # plusieurs tris pour couvrir des sous-ensembles différents (dédoublonnés).
    seen, candidates = set(), []
    for sort in ("unique_scans_n", "created_t", "last_modified_t", "product_name", "completeness"):
        for page in range(1, 11):
            try:
                d = get(f"{OBF}?countries_tags=en:morocco&fields={FIELDS}&sort_by={sort}&page_size=100&page={page}")
            except Exception as e:  # noqa: BLE001
                print(f"[obf] {sort} page {page} KO : {e}", flush=True); break
            prods = d.get("products") or []
            if not prods:
                break
            new = [p for p in prods if usable(p) and p["code"] not in seen]
            for p in new:
                seen.add(p["code"])
            candidates += new
            if page * 100 >= int(d.get("count") or 0) or len(candidates) >= MAX:
                break
            time.sleep(0.4)
        print(f"[obf] tri {sort} : {len(candidates)} retenus cumulés", flush=True)
        if len(candidates) >= MAX:
            break
    candidates = candidates[:MAX]
    print(f"[plan] {len(candidates)} fiches à importer (apply={APPLY})", flush=True)
    if not APPLY:
        for p in candidates[:15]:
            print("  ", p["code"], "|", (p.get("product_name_fr") or p.get("product_name"))[:40], "|", (p.get("brands") or "")[:20])
        return 0
    ok = existed = ko = 0
    for i, p in enumerate(candidates, 1):
        try:
            r = scan(p["code"])
            if not r.get("found"):
                ko += 1
            elif r.get("source") == "database":
                existed += 1
            else:
                ok += 1
                sc = (r.get("score") or {}).get("total")
                print(f"  [{i}/{len(candidates)}] {p['code']} {(r.get('product') or {}).get('name_fr', '')[:36]!r} → {sc}", flush=True)
        except Exception as e:  # noqa: BLE001
            ko += 1; print(f"  {p['code']} KO : {str(e)[:80]}", flush=True)
        time.sleep(0.3)
    print(f"[done] importés {ok} · déjà en base {existed} · échecs {ko}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
