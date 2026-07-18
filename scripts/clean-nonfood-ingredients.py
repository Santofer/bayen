#!/usr/bin/env python3
"""
C10 — Nettoyage du référentiel `ingredients` : supprime les entrées qui ne
sont PAS des ingrédients (instructions de conservation, adresses, téléphones,
poids net, dates de péremption, phrases marketing, valeurs nutritionnelles)
créées par erreur lors de l'OCR/structuration.

Détection 100% DÉTERMINISTE (regex) — aucune IA : on ne supprime QUE ce qui
matche un motif de poubelle certain. Un ingrédient légitime (même composé,
même « Arôme » ou « Vitamine D ») ne matche jamais → jamais supprimé.

Pour chaque entrée poubelle : supprime d'abord ses liens products_ingredients
(elles apparaissaient comme faux ingrédients sur les fiches), puis l'entrée.

Idempotent. Dry-run : APPLY=0. Token admin : DTOKEN.
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
APPLY = os.environ.get("APPLY", "1") == "1"

# ── Motifs de poubelle CERTAINE (insensible à la casse) ────────────────
GARBAGE_PATTERNS = [
    r"\bwww\.", r"https?://", r"\.eu\b", r"\.com\b", r"@",           # URL / email
    r"\+?\d[\d ]{6,}\d",                                              # numéro de téléphone
    r"^\s*conserver\b",                                              # instruction de conservation
    r"\bà l'abri\b", r"\bendroit sec\b", r"\bdans le froid\b",
    r"date de p[ée]remption", r"\bà consommer\b.*\bavant\b",
    r"poids net", r"\bcode postal\b", r"r[ée]publique tch[èe]que",
    r"\bprague\b", r"\btonneaux\b", r"\bsoci[ée]t[ée]\s+\w",
    r"mode de vie sain", r"^\s*ceci est atteint", r"^\s*les menus\b",
    r"^\s*dans le contexte\b",
    r"valeur en sucres", r"valeur nutri", r"\bpour 100\s*g\b",
    r"^\s*lad tel\b",
]
GARBAGE_RE = re.compile("|".join(GARBAGE_PATTERNS), re.IGNORECASE)

# Garde-fou : ne jamais toucher une entrée courte qui ressemble à un vrai
# ingrédient (mono-mot ou deux mots sans chiffre) même si un motif matchait.
SAFE_SHORT_RE = re.compile(r"^[A-Za-zÀ-ÿ' -]{1,24}$")


def req(url, method="GET", data=None, token=None, timeout=90):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(r, timeout=timeout) as resp:
        return json.loads(resp.read().decode() or "{}")


def is_garbage(name):
    n = (name or "").strip()
    if not n:
        return True
    if SAFE_SHORT_RE.match(n):   # « Arôme », « Vitamine D », « Sel » → protégés
        return False
    return bool(GARBAGE_RE.search(n))


def main():
    token = os.environ.get("DTOKEN", "").strip()
    if not token:
        print("[err] DTOKEN manquant", flush=True)
        return 1

    ings = req(DIRECTUS + "/items/ingredients?fields=id,name_fr&limit=-1&sort=id", token=token)["data"]
    garbage = [i for i in ings if is_garbage(i.get("name_fr"))]
    ts = time.strftime("%Y-%m-%dT%H:%M:%S")
    print("[" + ts + "] " + str(len(garbage)) + "/" + str(len(ings))
          + " entrees poubelle a supprimer (apply=" + str(APPLY) + ")", flush=True)

    done = fail = links_removed = 0
    for g in garbage:
        name = (g.get("name_fr") or "")[:60]
        try:
            links = req(
                DIRECTUS + "/items/products_ingredients?filter[ingredients_id][_eq]=" + str(g["id"])
                + "&fields=id&limit=-1", token=token,
            )["data"]
            if not APPLY:
                print("  [dry] #" + str(g["id"]) + " (" + str(len(links)) + " liens) :: " + name, flush=True)
                done += 1
                continue
            for link in links:
                req(DIRECTUS + "/items/products_ingredients/" + str(link["id"]), "DELETE",
                    token=token, timeout=30)
                links_removed += 1
            req(DIRECTUS + "/items/ingredients/" + str(g["id"]), "DELETE", token=token, timeout=30)
            done += 1
            print("  [del] #" + str(g["id"]) + " (" + str(len(links)) + " liens) :: " + name, flush=True)
        except Exception as e:  # noqa: BLE001
            fail += 1
            print("  [err] #" + str(g["id"]) + " :: " + str(e)[:60], flush=True)
        time.sleep(0.2)

    print("[done] supprimes=" + str(done) + " liens_retires=" + str(links_removed)
          + " echecs=" + str(fail), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
