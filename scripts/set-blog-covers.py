#!/usr/bin/env python3
"""Associe à chaque article du journal sa couverture « Marché Pop ».

Les couvertures sont des WebP nommés par slug (frontend/public/blog/covers/<slug>.webp),
copiés dans le conteneur sous COVERS_DIR. Pour chaque article dont le slug a un fichier :
upload dans Directus (dossier racine), puis articles.cover_image = id du fichier.
Idempotent : un article dont la couverture porte déjà le titre « cover:<slug> » est sauté.

Usage (dans bayen-tesseract) :
  docker exec -e DTOKEN=… -e APPLY=1 -e COVERS_DIR=/tmp/covers -i bayen-tesseract python3 - < set-blog-covers.py
"""
import json, os, sys, uuid, urllib.request

API = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TOKEN = os.environ.get("DTOKEN", "").strip()
DIR = os.environ.get("COVERS_DIR", "/tmp/covers")
APPLY = os.environ.get("APPLY") == "1"
if not TOKEN:
    sys.exit("[err] DTOKEN manquant")


def call(path, method="GET", data=None, headers=None):
    h = {"Authorization": "Bearer " + TOKEN}
    h.update(headers or {})
    body = data
    if isinstance(data, (dict, list)):
        body = json.dumps(data).encode(); h["Content-Type"] = "application/json"
    r = urllib.request.Request(API + path, data=body, headers=h, method=method)
    with urllib.request.urlopen(r, timeout=60) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else {}


def upload(fpath, title):
    b = uuid.uuid4().hex
    name = os.path.basename(fpath)
    parts = [
        f"--{b}\r\nContent-Disposition: form-data; name=\"title\"\r\n\r\n{title}\r\n".encode(),
        f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{name}\"\r\nContent-Type: image/webp\r\n\r\n".encode()
        + open(fpath, "rb").read() + b"\r\n",
        f"--{b}--\r\n".encode(),
    ]
    res = call("/files", "POST", b"".join(parts), {"Content-Type": f"multipart/form-data; boundary={b}"})
    return res["data"]["id"]


arts = call("/items/articles?fields=id,slug,cover_image.id,cover_image.title&limit=-1")["data"]
done = skipped = missing = 0
for a in arts:
    slug = a["slug"]; f = os.path.join(DIR, slug + ".webp")
    if not os.path.exists(f):
        missing += 1; print("  [—] pas de couverture :", slug); continue
    cur = a.get("cover_image") or {}
    if cur.get("title") == "cover:" + slug:
        skipped += 1; continue
    if not APPLY:
        print("  [dry] ", slug); continue
    fid = upload(f, "cover:" + slug)
    call(f"/items/articles/{a['id']}", "PATCH", {"cover_image": fid})
    done += 1; print("  [ok]", slug)
print(f"[done] {done} posées, {skipped} déjà à jour, {missing} sans fichier (apply={APPLY})")
