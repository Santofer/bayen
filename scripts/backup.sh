#!/bin/bash
# Bayen — backup nocturne : schéma Directus + dump Postgres
#
# Usage : ./backup.sh
# Cron recommandé (serveur) :
#   0 3 * * * /mnt/user/appdata/bayen/scripts/backup.sh >> /mnt/user/appdata/bayen/backups/backup.log 2>&1
#
# Rotation : garde les 7 derniers snapshots schéma + 30 derniers dumps DB.
# Les backups sont stockés dans /mnt/user/appdata/bayen/backups/.

set -eo pipefail

BACKUP_DIR="${BAYEN_BACKUP_DIR:-/mnt/user/appdata/bayen/backups}"
SCHEMA_DIR="$BACKUP_DIR/schema"
DB_DIR="$BACKUP_DIR/db"
mkdir -p "$SCHEMA_DIR" "$DB_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
ISO="$(date -Iseconds)"

log() { echo "[$ISO] $*"; }

# ── 1. Snapshot schéma Directus ─────────────────────────────────
if docker ps --format '{{.Names}}' | grep -q '^bayen-directus$'; then
  if docker exec bayen-directus sh -c "cd /tmp && npx directus schema snapshot --yes /tmp/snap-$TS.yaml" >/dev/null 2>&1; then
    docker cp "bayen-directus:/tmp/snap-$TS.yaml" "$SCHEMA_DIR/schema-$TS.yaml"
    docker exec bayen-directus rm -f "/tmp/snap-$TS.yaml"
    log "schema OK → $SCHEMA_DIR/schema-$TS.yaml"
  else
    log "schema FAIL (directus CLI error)"
  fi
else
  log "schema SKIPPED (bayen-directus not running)"
fi

# ── 2. Dump Postgres ────────────────────────────────────────────
if docker ps --format '{{.Names}}' | grep -q '^bayen-postgres$'; then
  if docker exec bayen-postgres pg_dump -U bayen_user -d bayen 2>/dev/null | gzip > "$DB_DIR/db-$TS.sql.gz"; then
    SIZE="$(du -h "$DB_DIR/db-$TS.sql.gz" | cut -f1)"
    log "db OK → $DB_DIR/db-$TS.sql.gz ($SIZE)"
  else
    log "db FAIL (pg_dump error)"
    rm -f "$DB_DIR/db-$TS.sql.gz"
  fi
else
  log "db SKIPPED (bayen-postgres not running)"
fi

# ── 3. Rotation ─────────────────────────────────────────────────
# Garde les 7 derniers snapshots schéma (1 semaine si daily)
ls -1t "$SCHEMA_DIR"/schema-*.yaml 2>/dev/null | tail -n +8 | xargs -r rm -f
# Garde les 30 derniers dumps DB (1 mois si daily)
ls -1t "$DB_DIR"/db-*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm -f

SCHEMA_CNT="$(ls -1 "$SCHEMA_DIR"/schema-*.yaml 2>/dev/null | wc -l)"
DB_CNT="$(ls -1 "$DB_DIR"/db-*.sql.gz 2>/dev/null | wc -l)"
log "rotation OK — schemas=$SCHEMA_CNT, dbs=$DB_CNT"
