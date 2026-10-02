#!/usr/bin/env python3
"""
Étalon de l'IA repas sur le jeu de photos libres (scripts/build-meal-dataset.py).

Pour chaque photo : /meal-analyze, puis comparaison avec le plat attendu à deux
niveaux — plat exact (nom du référentiel) et bonne famille (« un tajine », « une
harira », même si la variante est fausse). Sortie : tableau par famille, principales
confusions, et rapport JSON réutilisable pour comparer avant/après un changement.

Usage (dans bayen-tesseract) : DATA=/tmp/meal-dataset PER_FAMILY=10 python3 - < scripts/eval-meal-dataset.py
"""
import collections, json, os, random, sys, time, unicodedata, urllib.request

DATA = os.environ.get("DATA", "/tmp/meal-dataset")
PER = int(os.environ.get("PER_FAMILY", "10"))
# ONLY=tacos,chebakia : rejoue ces familles sur les MÊMES photos que l'étalon complet
ONLY = set(filter(None, os.environ.get("ONLY", "").split(",")))
VISION = os.environ.get("TESSERACT_URL", "http://localhost:5000")
# Mots qui signalent la bonne famille dans la réponse du modèle
FAMILY_WORDS = {
    "harira": ["harira", "hrira"], "pastilla": ["pastilla", "bastilla", "bstilla"], "tajine": ["tajine", "tagine", "tajin"],
    "couscous": ["couscous", "seksu"], "the": ["the", "tea", "atay"], "salade": ["salade", "salad", "zaalouk", "taktouka"],
    "msemen": ["msemen", "msemmen", "meloui", "rghaif"], "baghrir": ["baghrir", "crepe mille trous"], "lentilles": ["lentille", "adas"],
    "kefta": ["kefta", "kofta"], "seffa": ["seffa"], "briouates": ["briouat", "briwat"], "frites": ["frite"], "burger": ["burger"],
    "poulet frit": ["poulet frit", "poulet pane", "fried chicken"], "pates": ["pate", "carbonara", "spaghetti"], "crepe": ["crepe"],
    "cereales": ["cereale"], "fruits": ["fruit"], "poisson": ["poisson", "fish"], "steak": ["steak"], "glace": ["glace"],
}


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFD", (s or "").lower()) if unicodedata.category(c) != "Mn")


def analyze(path):
    raw = open(path, "rb").read()
    b = "----etalon"
    body = (b"--" + b.encode() + b'\r\nContent-Disposition: form-data; name="image"; filename="p.jpg"\r\nContent-Type: image/jpeg\r\n\r\n'
            + raw + b"\r\n--" + b.encode() + b"--\r\n")
    r = urllib.request.Request(VISION + "/meal-analyze", data=body, headers={"Content-Type": "multipart/form-data; boundary=" + b}, method="POST")
    return json.loads(urllib.request.urlopen(r, timeout=240).read())


def main():
    rows = [json.loads(l) for l in open(os.path.join(DATA, "manifest.jsonl"))]
    by_fam = collections.defaultdict(list)
    for r in rows:
        by_fam[r["family"]].append(r)
    random.seed(7)
    sample = [x for fam in by_fam.values() for x in random.sample(fam, min(PER, len(fam)))]
    if ONLY:
        sample = [x for x in sample if x["family"] in ONLY]
    print(f"{len(sample)} photos évaluées sur {len(rows)} ({len(by_fam)} familles)", flush=True)
    stats = collections.defaultdict(lambda: {"n": 0, "exact": 0, "family": 0})
    confusions = collections.Counter()
    details = []
    for x in sample:
        try:
            res = analyze(os.path.join(DATA, x["file"]))
        except Exception as e:  # noqa: BLE001
            print("  échec", x["file"], e, flush=True); continue
        got = (res.get("analysis") or {}).get("plat") or res.get("job_status")
        g = fold(got)
        words = FAMILY_WORDS.get(x["family"], [fold(x["family"])])
        exact = g == fold(x["dish"]) or (fold(x["dish"]) in ("tajine", "couscous") and any(w in g for w in words))
        fam_ok = any(w in g for w in words)
        s = stats[x["family"]]; s["n"] += 1; s["exact"] += exact; s["family"] += fam_ok or exact
        if not (fam_ok or exact):
            confusions[(x["dish"], got)] += 1
        details.append({**x, "predicted": got, "exact": exact, "family_ok": fam_ok or exact})
    print(f"\n{'famille':18} {'n':>3} {'plat exact':>11} {'bonne famille':>14}")
    tot = {"n": 0, "exact": 0, "family": 0}
    for fam, s in sorted(stats.items(), key=lambda kv: kv[1]["family"] / max(kv[1]["n"], 1)):
        for k in tot: tot[k] += s[k]
        print(f"{fam:18} {s['n']:>3} {100 * s['exact'] // max(s['n'], 1):>10}% {100 * s['family'] // max(s['n'], 1):>13}%")
    print(f"{'TOTAL':18} {tot['n']:>3} {100 * tot['exact'] // max(tot['n'], 1):>10}% {100 * tot['family'] // max(tot['n'], 1):>13}%")
    print("\nConfusions les plus fréquentes :")
    for (want, got), n in confusions.most_common(15):
        print(f"  {n}× attendu « {want} » → « {got} »")
    out = os.path.join(DATA, f"etalon-{time.strftime('%Y%m%d-%H%M')}.json")
    json.dump({"stats": stats, "total": tot, "details": details}, open(out, "w"), ensure_ascii=False, indent=1)
    print("\nrapport :", out, flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
