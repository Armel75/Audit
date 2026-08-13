#!/usr/bin/env bash
# =============================================================================
# Sauvegarde SQL Server (backup natif + vérification + rétention)
# -----------------------------------------------------------------------------
# Identifiants dérivés de DATABASE_URL (ex: sqlserver://host:port;database=X;
# user=Y;password=Z;...) pour ne dupliquer AUCUN secret. Surchargeable via les
# variables DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME.
#
# Sortie : $BACKUP_DIR/<DB>_<horodatage>.bak  +  RESTORE VERIFYONLY
# Rétention : suppression des backups de plus de $RETENTION_DAYS jours.
# =============================================================================
set -euo pipefail

: "${BACKUP_DIR:=/backups}"
: "${RETENTION_DAYS:=14}"
: "${DB_NAME:=AuditDB}"

# ── Détection de sqlcmd (mssql-tools18 ou legacy) ───────────────────────────
SQLCMD=""
for c in /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd sqlcmd; do
  if command -v "$c" >/dev/null 2>&1; then SQLCMD="$c"; break; fi
done
if [ -z "$SQLCMD" ]; then
  echo "[BACKUP] ❌ sqlcmd introuvable" >&2
  exit 1
fi

# ── Dérivation des identifiants depuis DATABASE_URL (si non fournis) ────────
if [ -z "${DB_HOST:-}" ] || [ -z "${DB_PASSWORD:-}" ]; then
  DB_HOST="${DB_HOST:-$(printf '%s' "$DATABASE_URL" | sed -n 's|^sqlserver://\([^:;@]*\).*|\1|p')}"
  DB_PORT="${DB_PORT:-$(printf '%s' "$DATABASE_URL" | sed -n 's|^sqlserver://[^:;@]*:\([0-9]*\).*|\1|p')}"
  DB_USER="${DB_USER:-$(printf '%s' "$DATABASE_URL" | sed -n 's/.*;user=\([^;]*\).*/\1/p')}"
  DB_PASSWORD="${DB_PASSWORD:-$(printf '%s' "$DATABASE_URL" | sed -n 's/.*;password=\([^;]*\).*/\1/p')}"
  DB_NAME="${DB_NAME:-$(printf '%s' "$DATABASE_URL" | sed -n 's/.*;database=\([^;]*\).*/\1/p')}"
fi
: "${DB_HOST:?DB_HOST requis (ou DATABASE_URL)}"
: "${DB_PORT:=1433}"
: "${DB_USER:=sa}"
: "${DB_PASSWORD:?DB_PASSWORD requis (ou DATABASE_URL)}"

SERVER="${DB_HOST},${DB_PORT}"
mkdir -p "$BACKUP_DIR"

TS="$(date +%Y%m%d_%H%M%S)"
FILE="${BACKUP_DIR}/${DB_NAME}_${TS}.bak"

run_sqlcmd() { "$SQLCMD" -S "$SERVER" -U "$DB_USER" -P "$DB_PASSWORD" -C -b "$@"; }

echo "[BACKUP] Démarrage : ${DB_NAME} @ ${SERVER} → ${FILE}"
run_sqlcmd -Q "BACKUP DATABASE [${DB_NAME}] TO DISK = N'${FILE}' WITH COMPRESSION, CHECKSUM, INIT, STATS=5"

SIZE="$(du -h "$FILE" | cut -f1)"
echo "[BACKUP] ✅ Backup créé : ${FILE} (${SIZE})"

echo "[BACKUP] RESTORE VERIFYONLY (intégrité)..."
run_sqlcmd -Q "RESTORE VERIFYONLY FROM DISK = N'${FILE}'"
echo "[BACKUP] ✅ Intégrité vérifiée"

# ── Rétention ────────────────────────────────────────────────────────────────
DELETED="$(find "$BACKUP_DIR" -name "${DB_NAME}_*.bak" -mtime "+${RETENTION_DAYS}" -delete -print | wc -l)"
echo "[BACKUP] Nettoyage : ${DELETED} backup(s) de plus de ${RETENTION_DAYS} jour(s) supprimé(s)."

echo "[BACKUP] Terminé à $(date -Is)."
