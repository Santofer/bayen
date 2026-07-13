#!/bin/bash
# Auto-backfill images produits Bayen (cron nightly).
# Exécute le script Python DANS bayen-tesseract (python 3.11 + réseau Docker
# interne vers bayen-directus). Idempotent, plafonné à 300 produits/run.
LOG=/mnt/user/appdata/bayen/backups/backfill-images.log
TOKEN_FILE=/mnt/user/appdata/bayen/scripts/.directus-token
SCRIPT=/mnt/user/appdata/bayen/scripts/backfill-images.py

# Container up ? sinon on sort (le watchdog s'en occupe)
docker ps --filter name=bayen-tesseract --filter status=running --format '{{.Names}}' | grep -q bayen-tesseract || exit 0
[ -f "$TOKEN_FILE" ] || { echo "[$(date -Iseconds)] token absent" >> "$LOG"; exit 1; }

DTOKEN="$(cat "$TOKEN_FILE")" docker exec -e DTOKEN="$(cat "$TOKEN_FILE")" -i bayen-tesseract python3 - < "$SCRIPT" >> "$LOG" 2>&1
