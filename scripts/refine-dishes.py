#!/usr/bin/env python3
"""
C21 — Revue hebdomadaire des corrections d'estimations repas.

Les utilisateurs peuvent corriger une estimation (plat, portion, calories).
Ces retours n'entraînent PAS le modèle : ils servent à repérer les fiches du
référentiel `moroccan_dishes` dont la fourchette calorique est manifestement
à côté de ce que les gens observent.

Un plat n'est signalé qu'à partir de MIN_CORRECTIONS retours dont la MÉDIANE
sort de la fourchette actuelle — une correction isolée ne prouve rien, et la
médiane résiste aux saisies fantaisistes.

Par défaut le script ne fait que RAPPORTER (APPLY=0) : élargir une fourchette
de référence est une décision éditoriale, pas une opération automatique.
Avec APPLY=1, la fourchette est étendue pour englober la médiane observée.

Usage : docker exec -e DTOKEN=... -i bayen-tesseract python3 - < scripts/refine-dishes.py
"""

import json
import os
import statistics
import sys
import urllib.parse
import urllib.request

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
APPLY = os.environ.get("APPLY", "0") == "1"
MIN_CORRECTIONS = int(os.environ.get("MIN_CORRECTIONS", "5"))
DAYS = int(os.environ.get("DAYS", "90"))


def req(url, method="GET", data=None, token=None, timeout=60):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode() or "{}")


def norm(text):
    import unicodedata
    t = unicodedata.normalize("NFD", str(text or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return " ".join("".join(c if c.isalnum() else " " for c in t).split())


def main():
    token = os.environ.get("DTOKEN", "").strip()
    if not token:
        print("[err] DTOKEN manquant", flush=True)
        return 1

    dishes = req(DIRECTUS + "/items/moroccan_dishes"
                 "?fields=id,name_fr,aliases,portion_typique_g,kcal_min,kcal_max"
                 "&limit=-1", token=token)["data"]
    by_norm = {}
    for d in dishes:
        by_norm[norm(d.get("name_fr"))] = d
        for a in (d.get("aliases") or []):
            if isinstance(a, str):
                by_norm.setdefault(norm(a), d)

    feedback = req(DIRECTUS + "/items/meal_feedback"
                   "?fields=plat_detecte,correction,rating"
                   "&filter[correction][_nnull]=true"
                   "&limit=-1&sort=-date_created", token=token)["data"]

    print("[info] " + str(len(dishes)) + " plats de reference, "
          + str(len(feedback)) + " corrections a examiner (apply="
          + str(APPLY) + ")", flush=True)

    # Regrouper les calories corrigées par plat de référence.
    per_dish = {}
    for f in feedback:
        corr = f.get("correction") or {}
        kcal = corr.get("calories_kcal")
        if not isinstance(kcal, (int, float)):
            continue
        dish = by_norm.get(norm(f.get("plat_detecte")))
        if not dish:
            continue
        # Ramener à la portion de référence pour comparer ce qui est comparable.
        portion = corr.get("portion_g") or dish.get("portion_typique_g")
        ref_portion = dish.get("portion_typique_g") or portion
        if not portion or not ref_portion:
            continue
        per_dish.setdefault(dish["id"], {"dish": dish, "values": []})
        per_dish[dish["id"]]["values"].append(kcal * ref_portion / portion)

    flagged = adjusted = 0
    for entry in per_dish.values():
        dish, values = entry["dish"], entry["values"]
        if len(values) < MIN_CORRECTIONS:
            continue
        median = statistics.median(values)
        lo, hi = dish.get("kcal_min"), dish.get("kcal_max")
        if lo is None or hi is None or lo <= median <= hi:
            continue

        flagged += 1
        print("  [ecart] " + str(dish["name_fr"])[:40]
              + " : fourchette " + str(lo) + "-" + str(hi)
              + " vs mediane observee " + str(round(median))
              + " (" + str(len(values)) + " corrections)", flush=True)

        if APPLY:
            new_lo = min(lo, int(median * 0.9))
            new_hi = max(hi, int(median * 1.1))
            req(DIRECTUS + "/items/moroccan_dishes/" + str(dish["id"]), "PATCH",
                {"kcal_min": new_lo, "kcal_max": new_hi,
                 "notes": "Fourchette élargie d'après " + str(len(values))
                          + " corrections utilisateurs."},
                token=token, timeout=30)
            adjusted += 1

    print("[done] plats_signales=" + str(flagged)
          + " ajustes=" + str(adjusted)
          + (" (revue manuelle : relancer avec APPLY=1)" if flagged and not APPLY else ""),
          flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
