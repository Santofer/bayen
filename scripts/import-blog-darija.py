"""Importe les traductions darija des articles du journal (design/blog-darija/ary/*.json) dans Directus :
title_ar, excerpt_ar, content_ar. Ne remplit que les champs arabes VIDES (jamais d'écrasement).
  docker cp articles-ary.json bayen-tesseract:/tmp/
  docker exec -e DTOKEN=… [-e APPLY=1] -i bayen-tesseract python3 - < import-blog-darija.py
Sans APPLY=1 : essai à blanc (liste ce qui serait écrit)."""
import json, os, sys, urllib.request

API = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TOKEN = os.environ.get("DTOKEN", "").strip()
APPLY = os.environ.get("APPLY") == "1"
SRC = os.environ.get("SRC", "/tmp/articles-ary.json")
if not TOKEN:
    sys.exit("[err] DTOKEN manquant")


def req(method, path, body=None):
    r = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read() or b"{}")


traductions = json.load(open(SRC))
articles = {a["slug"]: a for a in req("GET", "/items/articles?limit=-1&fields=id,slug,title_ar,excerpt_ar,content_ar")["data"]}
ecrits = 0
for t in traductions:
    a = articles.get(t["slug"])
    if not a:
        print("[absent]", t["slug"]); continue
    patch = {k: t[k] for k in ("title_ar", "excerpt_ar", "content_ar") if t.get(k) and not a.get(k)}
    if not patch:
        print("[déjà traduit]", t["slug"]); continue
    print(("[écrit]" if APPLY else "[à écrire]"), t["slug"], sorted(patch))
    if APPLY:
        req("PATCH", "/items/articles/" + a["id"], patch); ecrits += 1
print(f"{ecrits} article(s) mis à jour" if APPLY else "essai à blanc : relancer avec APPLY=1")
