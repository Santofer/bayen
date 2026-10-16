"""Téléverse les visuels réseaux (JPG) dans Directus, dossier « Réseaux sociaux », pour que ContentStudio les
télécharge par URL publique (https://api.bayen.ma/assets/<id>/<fichier>). Idempotent : un fichier déjà présent
dans le dossier (même nom) n'est pas renvoyé. Écrit la correspondance nom → id sur la sortie standard (JSON).
  docker exec -e DTOKEN=… -e SRC=/tmp/reseaux -i bayen-tesseract python3 - < upload-reseaux.py > ids.json"""
import json, os, sys, uuid, urllib.request
from pathlib import Path

API = os.environ.get("DIRECTUS_URL", "http://bayen-directus:8055")
TOKEN = os.environ["DTOKEN"].strip()
SRC = Path(os.environ.get("SRC", "/tmp/reseaux"))
DOSSIER = "Réseaux sociaux"


def req(method, path, body=None, headers=None, raw=None):
    h = {"Authorization": "Bearer " + TOKEN, **(headers or {})}
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    if raw is None and body is not None: h["Content-Type"] = "application/json"
    r = urllib.request.Request(API + path, method=method, data=data, headers=h)
    with urllib.request.urlopen(r, timeout=120) as resp:
        return json.loads(resp.read() or b"{}")


dossiers = req("GET", "/folders?filter[name][_eq]=" + urllib.request.quote(DOSSIER) + "&limit=1")["data"]
dossier = dossiers[0]["id"] if dossiers else req("POST", "/folders", {"name": DOSSIER})["data"]["id"]
deja = {f["filename_download"]: f["id"] for f in req("GET", f"/files?filter[folder][_eq]={dossier}&limit=-1&fields=id,filename_download")["data"]}
ids = {}
for f in sorted(SRC.glob("*.jpg")):
    if f.name in deja:
        ids[f.name] = deja[f.name]; continue
    b = "----bayen" + uuid.uuid4().hex
    corps = (f"--{b}\r\nContent-Disposition: form-data; name=\"folder\"\r\n\r\n{dossier}\r\n"
             f"--{b}\r\nContent-Disposition: form-data; name=\"title\"\r\n\r\n{f.stem}\r\n"
             f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{f.name}\"\r\nContent-Type: image/jpeg\r\n\r\n").encode() \
        + f.read_bytes() + f"\r\n--{b}--\r\n".encode()
    ids[f.name] = req("POST", "/files", raw=corps, headers={"Content-Type": "multipart/form-data; boundary=" + b})["data"]["id"]
    print("envoyé", f.name, file=sys.stderr)
sys.stdout.write(json.dumps(ids))
