#!/usr/bin/env python3
"""
C23 — Lecture vision nightly des listes INCI manquantes (cron 08:30).

Cible : produits `product_type = cosmetic` publiés, sans `inci_text` et jamais
examinés (`inci_read_at` null). Source d'image, dans l'ordre :
  1. photo « ingrédients » déposée par la communauté (products.image_ingredients)
  2. photo ingrédients Open Beauty Facts (image_ingredients_url, pleine taille)
Sans image → marqué examiné (inci_read_at) pour ne pas y revenir chaque nuit.

Lecture par /inci-read (Qwen3.5-9B vision), puis recalcul du score déterministe
via POST /bayen-api/cosmetic-score. Le modèle recopie, il ne note jamais.
Dry-run APPLY=0 · limite VISION_MAX (défaut 60) · ONLY_BARCODE pour un seul.
"""
import json, os, sys, time, urllib.request, urllib.error

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TESSERACT = os.environ.get("TESSERACT_URL", "http://localhost:5000")
OBF = "https://world.openbeautyfacts.org/api/v2/product/"
APPLY = os.environ.get("APPLY", "1") == "1"
VISION_MAX = int(os.environ.get("VISION_MAX", "60"))
ONLY = os.environ.get("ONLY_BARCODE", "").strip()
UA = {"User-Agent": "Bayen/1.0 (contact@n0.ma)"}


def req(url, method="GET", data=None, token=None, timeout=90, headers=None):
    h = {"Content-Type": "application/json", **UA, **(headers or {})}
    if token:
        h["Authorization"] = "Bearer " + token
    r = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers=h, method=method)
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode() or "{}")


def fetch_bytes(url, token=None):
    h = dict(UA)
    if token:
        h["Authorization"] = "Bearer " + token
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60) as resp:
        return resp.read()


def inci_read(raw):
    boundary = "----bayen-inci"
    body = (b"--" + boundary.encode() + b'\r\nContent-Disposition: form-data; name="image"; filename="i.jpg"\r\n'
            b"Content-Type: image/jpeg\r\n\r\n" + raw + b"\r\n--" + boundary.encode() + b"--\r\n")
    r = urllib.request.Request(TESSERACT + "/inci-read", data=body,
                               headers={"Content-Type": "multipart/form-data; boundary=" + boundary}, method="POST")
    with urllib.request.urlopen(r, timeout=240) as resp:
        return json.loads(resp.read().decode())


def main():
    token = os.environ.get("DTOKEN", "").strip()
    if not token:
        print("[err] DTOKEN manquant", flush=True); return 1
    # Sans liste, OU avec un texte inexploitable (marketing OBF → aucun ingrédient reconnu, score null)
    flt = ("filter[product_type][_eq]=cosmetic&filter[status][_eq]=published&filter[inci_read_at][_null]=true"
           "&filter[_or][0][inci_text][_null]=true&filter[_or][1][scan_score][_null]=true")
    if ONLY:
        flt = f"filter[barcode][_eq]={ONLY}"
    items = req(f"{DIRECTUS}/items/products?{flt}&fields=id,barcode,name_fr,image_ingredients,data_source&limit={VISION_MAX}&sort=-scan_count", token=token)["data"]
    print(f"[{time.strftime('%Y-%m-%d %H:%M')}] candidats : {len(items)} (apply={APPLY})", flush=True)
    read = skipped = failed = 0
    for p in items:
        bc, pid = p["barcode"], p["id"]
        raw = None
        try:
            if p.get("image_ingredients"):
                raw = fetch_bytes(f"{DIRECTUS}/assets/{p['image_ingredients']}?width=1600&quality=88", token=token)
            else:
                obf = req(f"{OBF}{bc}.json?fields=image_ingredients_url", timeout=20)
                url = (obf.get("product") or {}).get("image_ingredients_url")
                if url:
                    raw = fetch_bytes(url.replace(".400.jpg", ".full.jpg"))
        except Exception as e:  # noqa: BLE001
            print(f"  {bc} image KO : {e}", flush=True)
        if not raw:
            skipped += 1
            if APPLY:
                req(f"{DIRECTUS}/items/products/{pid}", "PATCH", {"inci_read_at": time.strftime("%Y-%m-%dT%H:%M:%S")}, token=token)
            continue
        try:
            res = inci_read(raw)
        except Exception as e:  # noqa: BLE001
            failed += 1; print(f"  {bc} vision KO : {e}", flush=True); continue
        inci = res.get("inci_text")
        print(f"  {bc} {p['name_fr'][:40]!r} → {res.get('confiance')} | {(inci or '')[:80]}", flush=True)
        if not APPLY:
            continue
        patch = {"inci_read_at": time.strftime("%Y-%m-%dT%H:%M:%S")}
        if inci and res.get("confiance") in ("moyenne", "elevee"):
            patch["inci_text"] = inci
            if res.get("period_after_opening"):
                patch["period_after_opening"] = res["period_after_opening"]
            read += 1
        req(f"{DIRECTUS}/items/products/{pid}", "PATCH", patch, token=token)
        if "inci_text" in patch:
            req(f"{DIRECTUS}/bayen-api/cosmetic-score", "POST", {"barcode": bc}, token=token, timeout=60)
    print(f"[done] lues {read} · sans image {skipped} · échecs {failed}", flush=True)

    # ── Phase 2 : catégorie beauté manquante → identification vision (face avant)
    cat_max = int(os.environ.get("CATEGORY_MAX", "60"))
    items = req(f"{DIRECTUS}/items/products?filter[product_type][_eq]=cosmetic&filter[status][_eq]=published"
                f"&filter[cosmetic_category][_null]=true&filter[image_front][_nnull]=true"
                f"&fields=id,barcode,name_fr,image_front&limit={cat_max}&sort=-scan_count", token=token)["data"]
    print(f"[cat] {len(items)} fiches sans catégorie", flush=True)
    done = 0
    for p in items:
        try:
            raw = fetch_bytes(f"{DIRECTUS}/assets/{p['image_front']}?width=1024&quality=85", token=token)
            boundary = "----bayen-id"
            body = (b"--" + boundary.encode() + b'\r\nContent-Disposition: form-data; name="image"; filename="f.jpg"\r\n'
                    b"Content-Type: image/jpeg\r\n\r\n" + raw + b"\r\n--" + boundary.encode() + b"--\r\n")
            r = urllib.request.Request(TESSERACT + "/identify-product", data=body,
                                       headers={"Content-Type": "multipart/form-data; boundary=" + boundary}, method="POST")
            with urllib.request.urlopen(r, timeout=120) as resp:
                d = json.loads(resp.read().decode())
            cat = d.get("cosmetic_category") if d.get("kind") == "cosmetic" else None
            print(f"  {p['barcode']} {p['name_fr'][:36]!r} → {d.get('kind')} / {cat}", flush=True)
            if cat and APPLY:
                req(f"{DIRECTUS}/items/products/{p['id']}", "PATCH", {"cosmetic_category": cat}, token=token)
                # la catégorie change le statut « rincé » → score à recalculer
                req(f"{DIRECTUS}/bayen-api/cosmetic-score", "POST", {"barcode": p["barcode"]}, token=token, timeout=60)
                done += 1
        except Exception as e:  # noqa: BLE001
            print(f"  {p['barcode']} identification KO : {str(e)[:80]}", flush=True)
    print(f"[cat] catégorisées : {done}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
