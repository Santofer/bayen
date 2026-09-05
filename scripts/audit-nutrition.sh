#!/bin/bash
# Garde-fous nutritionnels : audit + correction des valeurs impossibles (cron nightly 09:15).
# Passe par le container bayen-tesseract : le port 8055 de l'hôte n'est pas celui de bayen-directus.
LOG=/mnt/user/appdata/bayen/backups/audit-nutrition.log
TOKEN_FILE=/mnt/user/appdata/bayen/scripts/.directus-token
[ -f "$TOKEN_FILE" ] || { echo "[$(date -Iseconds)] token absent" >> "$LOG"; exit 1; }
docker ps --filter name=bayen-tesseract --filter status=running --format "{{.Names}}" | grep -q bayen-tesseract || exit 0
{
  echo "[$(date -Iseconds)] audit-nutrition"
  docker exec -e DTOKEN="$(cat "$TOKEN_FILE")" -e APPLY="${APPLY:-1}" -i bayen-tesseract python3 - <<'PY'
import json, os, urllib.request
body = json.dumps({"apply": os.environ.get("APPLY", "1") == "1"}).encode()
r = urllib.request.Request("http://bayen-directus:8055/bayen-api/audit-nutrition", data=body, method="POST",
    headers={"Content-Type": "application/json", "Authorization": "Bearer " + os.environ["DTOKEN"].strip()})
d = json.loads(urllib.request.urlopen(r, timeout=900).read().decode())
print({k: v for k, v in d.items() if k != "examples"})
for e in d.get("examples", []):
    print(f"- [{e['how']}] {e['barcode']} {e['name']!r} :: {' | '.join(e['issues'])}" + (f" => reste: {' | '.join(e['remaining'])}" if e['remaining'] else ""))
PY
} >> "$LOG" 2>&1
