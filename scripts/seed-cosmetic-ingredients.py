#!/usr/bin/env python3
"""
C23 — Référentiel `cosmetic_ingredients` : CosIng + annexes + couche éditoriale.

Trois couches, dans cet ordre (la suivante surcharge la précédente) :
  1. Inventaire CosIng (~24 000 INCI) : nom, CAS, fonctions, risque 'none'.
  2. Annexes CosIng : II (interdits → 'banned'), III (restreints → 'low' +
     condition d'usage : une limite de concentration n'est pas un danger en soi,
     la couche 3 relève ceux qui le méritent — résorcinol, PPD, IPBC…).
  3. /tmp/cosmetic-risks.json : entrées relues à la main, chacune avec sa source
     (liste PE CE 2019, SCCS, annexes, interdictions marocaines).

Les CSV sont téléchargés depuis le dépôt Open Beauty Facts (exports CosIng).
Idempotent : upsert par inci_name, écriture par lots de 500. Dry-run APPLY=0.
Usage : docker cp data/cosmetic-risks.json bayen-tesseract:/tmp/ puis
        docker exec -e DTOKEN=... -e APPLY=1 -i bayen-tesseract python3 - < scripts/seed-cosmetic-ingredients.py
"""
import csv, io, json, os, sys, time, urllib.request, urllib.error

DIRECTUS = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
APPLY = os.environ.get("APPLY", "0") == "1"
RAW = "https://raw.githubusercontent.com/openfoodfacts/openbeautyfacts/develop/cosing/"
EDITORIAL = os.environ.get("EDITORIAL", "/tmp/cosmetic-risks.json")
csv.field_size_limit(10**7)


def req(url, method="GET", data=None, token=None, timeout=120):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as resp:
            return json.loads(resp.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        print("[http", e.code, "]", e.read().decode(errors="replace")[:600], flush=True)
        raise


def fetch_csv(name):
    with urllib.request.urlopen(RAW + name, timeout=120) as resp:
        text = resp.read().decode("utf-8-sig", errors="replace")
    lines = text.splitlines()
    # L'inventaire commence par « sep= » et une date : l'en-tête est la première ligne contenant INCI
    start = next((i for i, l in enumerate(lines[:12]) if "INCI" in l.upper() or "Reference" in l), 0)
    return list(csv.DictReader(lines[start:]))


def norm(name):
    return " ".join(str(name or "").strip().upper().split())


def main():
    token = os.environ.get("DTOKEN", "").strip()
    if not token:
        print("[err] DTOKEN manquant", flush=True); return 1

    rows = {}

    # ── 1. Inventaire ─────────────────────────────────────────────────
    inv = fetch_csv("COSING_Ingredients-Fragrance.Inventory_v2.csv")
    for r in inv:
        n = norm(r.get("INCI name"))
        if not n or len(n) > 200:
            continue
        funcs = [f.strip().lower() for f in (r.get("Function") or "").split(",") if f.strip()]
        rows[n] = {"inci_name": n, "cas_number": (r.get("CAS No") or "").strip()[:40] or None,
                   "functions": funcs[:8], "risk_level": "none", "risk_types": [],
                   "restriction_fr": (r.get("Restriction") or "").strip()[:300] or None,
                   "status": "published"}
    print("[1] inventaire CosIng :", len(rows), "INCI", flush=True)

    # ── 2. Annexes ────────────────────────────────────────────────────
    def targets(r):
        ids = (r.get("Identified INGREDIENTS or substances e.g.") or r.get("Name of Common Ingredients Glossary") or "")
        return [norm(x.strip("(*) ")) for x in ids.replace("(*)", "").split(";") if norm(x) and len(norm(x)) <= 200]

    ann2 = fetch_csv("COSING_Annex.II_v2.csv"); hit2 = 0
    for r in ann2:
        for n in targets(r):
            row = rows.setdefault(n, {"inci_name": n, "functions": [], "risk_types": [], "status": "published"})
            row.update({"risk_level": "banned", "risk_status": "confirmed",
                        "risk_types": sorted(set(row.get("risk_types", []) + (["cmr"] if (r.get("CMR") or "").strip() else []))),
                        "source_label": "CosIng Annexe II (Règl. CE 1223/2009)",
                        "source_url": "https://ec.europa.eu/growth/tools-databases/cosing/reference/annexes",
                        "restriction_fr": "Substance interdite dans les produits cosmétiques (Annexe II, réf. " + (r.get("Reference Number") or "?").strip() + ")"})
            hit2 += 1
    print("[2] Annexe II :", hit2, "INCI interdits", flush=True)

    ann3 = fetch_csv("COSING_Annex.III_v2.csv"); hit3 = 0
    ALLERGEN_REFS = set(str(i) for i in range(67, 93))  # entrées 67-92 = allergènes parfumants
    for r in ann3:
        ref = (r.get("Reference number") or "").strip().rstrip("ab")
        conc = (r.get("Maximum concentration in ready for use preparation") or "").strip()
        cond = (r.get("Wording of conditions of use and warnings") or "").strip()
        for n in targets(r):
            row = rows.setdefault(n, {"inci_name": n, "functions": [], "risk_types": [], "status": "published"})
            if row.get("risk_level") == "banned":
                continue
            is_allergen = ref in ALLERGEN_REFS
            row.update({"risk_level": "low",
                        "risk_types": sorted(set(row.get("risk_types", []) + (["allergen"] if is_allergen else ["restricted"]))),
                        "risk_status": "confirmed",
                        "source_label": "CosIng Annexe III (substances restreintes)",
                        "source_url": "https://ec.europa.eu/growth/tools-databases/cosing/reference/annexes",
                        "restriction_fr": (("Max " + conc + ". ") if conc else "") + cond[:220] or None})
            hit3 += 1
    print("[2] Annexe III :", hit3, "INCI restreints", flush=True)

    # ── 3. Couche éditoriale ──────────────────────────────────────────
    edit = json.load(open(EDITORIAL, encoding="utf-8"))
    for e in edit:
        n = norm(e["inci_name"])
        row = rows.setdefault(n, {"inci_name": n, "functions": [], "status": "published"})
        row.update({k: v for k, v in e.items() if k != "inci_name" and v not in (None, [], "")})
        row["synonyms"] = [norm(s) for s in (e.get("synonyms") or [])]
    print("[3] éditorial :", len(edit), "entrées appliquées", flush=True)

    # ── 4. Synonymes usuels (noms FR/EN, colorants US, vitamines) ───────
    syn_path = os.environ.get("SYNONYMS", "/tmp/inci-synonyms.json")
    if os.path.exists(syn_path):
        syn = json.load(open(syn_path, encoding="utf-8"))
        n = 0
        for inci, aliases in syn.items():
            row = rows.get(norm(inci))
            if not row:
                print("  [syn] INCI inconnu du référentiel :", inci, flush=True); continue
            row["synonyms"] = sorted(set((row.get("synonyms") or []) + [norm(a) for a in aliases]))
            n += len(aliases)
        print("[4] synonymes :", n, "alias sur", len(syn), "INCI", flush=True)

    # ── Écriture ──────────────────────────────────────────────────────
    existing = req(DIRECTUS + "/items/cosmetic_ingredients?fields=id,inci_name&limit=-1", token=token)["data"]
    by_name = {norm(x["inci_name"]): x["id"] for x in existing}
    to_create = [v for k, v in rows.items() if k not in by_name]
    to_update = [(by_name[k], v) for k, v in rows.items() if k in by_name]
    print("[plan] total", len(rows), "| à créer", len(to_create), "| à mettre à jour", len(to_update),
          "| apply=" + str(APPLY), flush=True)
    if not APPLY:
        return 0

    for i in range(0, len(to_create), 500):
        req(DIRECTUS + "/items/cosmetic_ingredients", "POST", to_create[i:i + 500], token=token)
        print("  créés", min(i + 500, len(to_create)), "/", len(to_create), flush=True)
    # Mises à jour : uniquement les lignes surchargées (annexes + éditorial), pas les 24k inchangées
    changed = [(i, v) for i, v in to_update if v.get("risk_level") != "none" or v.get("note_fr") or v.get("synonyms")]
    for i, v in changed:
        req(DIRECTUS + "/items/cosmetic_ingredients/" + str(i), "PATCH", v, token=token, timeout=30)
    print("[done] créés", len(to_create), "| mis à jour", len(changed), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
