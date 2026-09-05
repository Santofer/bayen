#!/bin/bash
# Garde-fous nutritionnels : audit + correction des valeurs impossibles (cron nightly 09:15).
LOG=/mnt/user/appdata/bayen/backups/audit-nutrition.log
TOKEN_FILE=/mnt/user/appdata/bayen/scripts/.directus-token
[ -f "$TOKEN_FILE" ] || { echo "[$(date -Iseconds)] token absent" >> "$LOG"; exit 1; }
docker ps --filter name=bayen-directus --filter status=running --format "{{.Names}}" | grep -q bayen-directus || exit 0
{
  echo "[$(date -Iseconds)] audit-nutrition"
  curl -s -m 900 -X POST http://localhost:8055/bayen-api/audit-nutrition \
    -H "Authorization: Bearer $(tr -d '\n\r' < "$TOKEN_FILE")" -H "Content-Type: application/json" \
    -d '{"apply":true}' | head -c 4000
  echo
} >> "$LOG" 2>&1
