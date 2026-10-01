#!/usr/bin/env python3
"""
Évaluation de l'IA repas sur les corrections des utilisateurs.

Rejoue /meal-analyze sur chaque photo jointe à une correction (meal_feedback.photo,
correction.plat) et mesure : plat reconnu (même nom que la correction, à la casse
et aux accents près) et calories dans ±25 % de la valeur corrigée quand elle existe.
À lancer avant et après toute modification (consigne, référentiel, modèle, LoRA)
pour savoir si elle améliore vraiment les résultats.

Usage : docker exec -e DTOKEN=… -i bayen-tesseract python3 - < scripts/eval-meal.py
"""
import json, os, sys, unicodedata, urllib.request

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
VISION = os.environ.get("TESSERACT_URL", "http://localhost:5000")


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFD", (s or "").lower()) if unicodedata.category(c) != "Mn").strip()


def main():
    token = os.environ.get("DTOKEN", "").strip()
    h = {"Authorization": "Bearer " + token}
    url = DIRECTUS + "/items/meal_feedback?filter[photo][_nnull]=true&filter[correction][_nnull]=true&fields=photo,correction&limit=-1"
    rows = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=60).read())["data"]
    print(f"{len(rows)} photos corrigées", flush=True)
    dish_ok = dish_n = kcal_ok = kcal_n = 0
    for r in rows:
        corr = r["correction"] if isinstance(r["correction"], dict) else json.loads(r["correction"])
        raw = urllib.request.urlopen(urllib.request.Request(f"{DIRECTUS}/assets/{r['photo']}", headers=h), timeout=60).read()
        b = "----eval"
        body = b"--" + b.encode() + b'\r\nContent-Disposition: form-data; name="image"; filename="m.jpg"\r\nContent-Type: image/jpeg\r\n\r\n' + raw + b"\r\n--" + b.encode() + b"--\r\n"
        try:
            res = json.loads(urllib.request.urlopen(urllib.request.Request(VISION + "/meal-analyze", data=body,
                  headers={"Content-Type": "multipart/form-data; boundary=" + b}, method="POST"), timeout=180).read())
        except Exception as e:  # noqa: BLE001
            print("  échec :", e, flush=True); continue
        a = res.get("analysis") or {}
        line = f"  attendu « {corr.get('plat', '—')} » → IA « {a.get('plat', res.get('job_status'))} »"
        if corr.get("plat"):
            dish_n += 1
            dish_ok += fold(corr["plat"]) == fold(a.get("plat"))
        if corr.get("calories_kcal") and a.get("calories_kcal"):
            kcal_n += 1
            mid = (a["calories_kcal"]["min"] + a["calories_kcal"]["max"]) / 2
            kcal_ok += abs(mid - corr["calories_kcal"]) <= 0.25 * corr["calories_kcal"]
            line += f" · kcal attendu {corr['calories_kcal']} / IA {int(mid)}"
        print(line, flush=True)
    pct = lambda ok, n: f"{ok}/{n} ({round(100 * ok / n)} %)" if n else "—"
    print(f"[résultat] plat reconnu {pct(dish_ok, dish_n)} · calories à ±25 % {pct(kcal_ok, kcal_n)}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
