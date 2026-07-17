#!/usr/bin/env python3
"""
Traduction bilingue FR/AR du référentiel `ingredients` (cron nightly + one-shot).
Tourne DANS bayen-tesseract. Les fiches produit assemblent leurs ingrédients
depuis la M2M products_ingredients -> ingredients : corriger le référentiel
corrige TOUS les produits d'un coup.

Cible : les ingrédients dont name_fr contient de l'arabe, ou dont name_ar est
vide. Appelle /translate-terms-batch (Qwen, 1 résultat par id) puis PATCH
{name_fr, name_ar, category, is_allergen}. Les entrées non-alimentaires
détectées (poids net, mentions légales…) sont loggées pour nettoyage manuel.

Idempotent (un ingrédient bilingue propre n'est plus re-traité).
Dry-run : APPLY=0. Token admin en env (DTOKEN).
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TESSERACT = os.environ.get("TESSERACT_URL", "http://localhost:5000")
APPLY = os.environ.get("APPLY", "1") == "1"
CHUNK = int(os.environ.get("CHUNK", "20"))
MAX_TERMS = int(os.environ.get("MAX_TERMS", "600"))

ARABIC_RE = re.compile(r"[؀-ۿ]")
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


def needs_fix(ing):
    fr = (ing.get("name_fr") or "").strip()
    ar = (ing.get("name_ar") or "").strip()
    if not fr:
        return True
    if ARABIC_RE.search(fr):          # de l'arabe rangé côté français
        return True
    if not ar:                        # pas encore bilingue
        return True
    return False


def merge_duplicate(dup_id, canonical_fr, name_ar, token):
    """La traduction fait apparaître un doublon (name_fr unique) : fusionne.
    Repointe les liens products_ingredients du doublon vers l'entrée canonique,
    complète son name_ar si vide, puis supprime le doublon."""
    can = req(
        DIRECTUS + "/items/ingredients?filter[name_fr][_eq]=" + urllib.parse.quote(canonical_fr)
        + "&filter[id][_neq]=" + str(dup_id) + "&fields=id,name_ar&limit=1",
        token=token,
    )["data"]
    if not can:
        return False
    can_id = can[0]["id"]

    links = req(
        DIRECTUS + "/items/products_ingredients?filter[ingredients_id][_eq]=" + str(dup_id)
        + "&fields=id,products_id&limit=-1",
        token=token,
    )["data"]
    existing = req(
        DIRECTUS + "/items/products_ingredients?filter[ingredients_id][_eq]=" + str(can_id)
        + "&fields=products_id&limit=-1",
        token=token,
    )["data"]
    already = {str(link.get("products_id")) for link in existing}

    for link in links:
        if str(link.get("products_id")) in already:
            req(DIRECTUS + "/items/products_ingredients/" + str(link["id"]), "DELETE", token=token, timeout=30)
        else:
            req(DIRECTUS + "/items/products_ingredients/" + str(link["id"]), "PATCH",
                {"ingredients_id": can_id}, token=token, timeout=30)

    if name_ar and not (can[0].get("name_ar") or "").strip():
        req(DIRECTUS + "/items/ingredients/" + str(can_id), "PATCH",
            {"name_ar": name_ar}, token=token, timeout=30)

    req(DIRECTUS + "/items/ingredients/" + str(dup_id), "DELETE", token=token, timeout=30)
    return True


def main():
    token = os.environ.get("DTOKEN", "").strip()
    if not token:
        print("[err] DTOKEN manquant", flush=True)
        return 1

    ings = req(
        DIRECTUS + "/items/ingredients?fields=id,name_fr,name_ar,category,is_allergen"
        "&limit=-1&sort=id",
        token=token,
    )["data"]

    todo = [i for i in ings if needs_fix(i)][:MAX_TERMS]
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print("[" + ts + "] " + str(len(todo)) + "/" + str(len(ings))
          + " ingredients a traduire (apply=" + str(APPLY) + ")", flush=True)
    if not todo:
        return 0

    done = fail = merged = 0
    nonfood = []
    for i in range(0, len(todo), CHUNK):
        chunk = todo[i:i + CHUNK]
        payload = {"terms": [{"id": t["id"], "name": (t.get("name_fr") or t.get("name_ar") or "")}
                             for t in chunk]}
        try:
            r = req(TESSERACT + "/translate-terms-batch", "POST", payload, timeout=180)
            by_id = {str(res.get("id")): res for res in (r.get("results") or [])}
            for t in chunk:
                res = by_id.get(str(t["id"]))
                if not res:
                    fail += 1
                    continue
                fr = (res.get("name_fr") or "").strip()
                ar = (res.get("name_ar") or "").strip()
                if not fr:
                    fail += 1
                    continue
                patch = {
                    "name_fr": fr[:120],
                    "name_ar": ar[:120] or None,
                    "is_allergen": bool(res.get("is_allergen")),
                }
                cat = res.get("category")
                if cat in CATEGORIES:
                    patch["category"] = cat
                if res.get("is_food") is False:
                    nonfood.append(str(t["id"]) + " :: " + fr[:60])
                if APPLY:
                    try:
                        req(DIRECTUS + "/items/ingredients/" + str(t["id"]), "PATCH",
                            patch, token=token, timeout=30)
                        done += 1
                    except urllib.error.HTTPError as e:
                        # name_fr unique → la traduction révèle un doublon : fusion
                        try:
                            if e.code == 400 and merge_duplicate(
                                t["id"], patch["name_fr"], patch.get("name_ar"), token
                            ):
                                merged += 1
                            else:
                                fail += 1
                        except Exception:  # noqa: BLE001
                            fail += 1
                    except Exception:  # noqa: BLE001
                        fail += 1
                else:
                    print("  [dry] #" + str(t["id"]) + " '" + (t.get("name_fr") or "")[:40]
                          + "' -> fr='" + fr[:40] + "' ar='" + ar[:30] + "'", flush=True)
                    done += 1
        except urllib.error.HTTPError as e:
            fail += len(chunk)
            if e.code == 429:
                time.sleep(15)
        except Exception:  # noqa: BLE001
            fail += len(chunk)
        if (i // CHUNK) % 5 == 0:
            print("  ... " + str(min(i + CHUNK, len(todo))) + "/" + str(len(todo))
                  + " (traduits=" + str(done) + ")", flush=True)
        time.sleep(0.8)

    if nonfood:
        print("[warn] entrees non-alimentaires detectees (a nettoyer) :", flush=True)
        for n in nonfood:
            print("  - " + n, flush=True)
    print("[done] traduits=" + str(done) + " fusions=" + str(merged) + " echecs=" + str(fail), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
