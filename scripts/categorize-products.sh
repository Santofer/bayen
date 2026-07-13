#!/bin/bash
# Auto-catégorisation des produits (cron nightly 05:30).
LOG=/mnt/user/appdata/bayen/backups/categorize-products.log
TOKEN_FILE=/mnt/user/appdata/bayen/scripts/.directus-token
SCRIPT=/mnt/user/appdata/bayen/scripts/categorize-products.py

docker ps --filter name=bayen-tesseract --filter status=running --format '{{.Names}}' | grep -q bayen-tesseract || exit 0
[ -f "$TOKEN_FILE" ] || { echo "[$(date -Iseconds)] token absent" >> "$LOG"; exit 1; }

docker exec -e DTOKEN="$(cat "$TOKEN_FILE")" -i bayen-tesseract python3 - < "$SCRIPT" >> "$LOG" 2>&1
