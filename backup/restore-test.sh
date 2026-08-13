#!/usr/bin/env bash
# =============================================================================
# Drill de restauration (DR) — prouve la récupérabilité des backups
# -----------------------------------------------------------------------------
# Restaure le DERNIER backup sur une instance SQL Server de TEST
# (RESTORE_HOST / RESTORE_USER / RESTORE_PASSWORD, défaut host.docker.internal),
# vérifie que la base existe, puis supprime la base de test.
#
# ⚠️  Ne JAMAIS pointer RESTORE_HOST vers la base de PRODUCTION : le drill
#     restaure dans une base jetable "AuditDB_DR_Test".
# =============================================================================
set -euo pipefail

: "${BACKUP_DIR:=/backups}"
: "${DB_NAME:=AuditDB}"
: "${RESTORE_DB:=AuditDB_DR_Test}"
: "${RESTORE_HOST:=host.docker.internal,1433}"
: "${RESTORE_USER:=sa}"

# ── Détection de sqlcmd ──────────────────────────────────────────────────────
SQLCMD=""
for c in /opt/mssql-tools18/bin/sqlcmd /opt/mssql-tools/bin/sqlcmd sqlcmd; do
  if command -v "$c" >/dev/null 2>&1; then SQLCMD="$c"; break; fi
done
[ -n "$SQLCMD" ] || { echo "[RESTORE-TEST] ❌ sqlcmd introuvable" >&2; exit 1; }

# ── Dériver le mot de passe source (DATABASE_URL) pour le défaut cible ───────
if [ -z "${RESTORE_PASSWORD:-}" ]; then
  RESTORE_PASSWORD="$(printf '%s' "$DATABASE_URL" | sed -n 's/.*;password=\([^;]*\).*/\1/p')"
fi
: "${RESTORE_PASSWORD:?RESTORE_PASSWORD requis (ou DATABASE_URL)}"

# Dernier backup disponible
LATEST="$(ls -1t "${BACKUP_DIR}"/"${DB_NAME}"_*.bak 2>/dev/null | head -1)"
if [ -z "$LATEST" ]; then
  echo "[RESTORE-TEST] ❌ Aucun backup trouvé dans ${BACKUP_DIR}"
  exit 1
fi
echo "[RESTORE-TEST] Dernier backup : ${LATEST}"

rs() { "$SQLCMD" -S "$RESTORE_HOST" -U "$RESTORE_USER" -P "$RESTORE_PASSWORD" -C -b "$@"; }

echo "[RESTORE-TEST] Nettoyage de la base de test précédente (${RESTORE_DB})..."
rs -Q "IF DB_ID('${RESTORE_DB}') IS NOT NULL BEGIN ALTER DATABASE [${RESTORE_DB}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${RESTORE_DB}]; END"

echo "[RESTORE-TEST] Restauration de ${RESTORE_DB} depuis le backup..."
rs -Q "RESTORE DATABASE [${RESTORE_DB}] FROM DISK = N'${LATEST}' WITH REPLACE, RECOVERY"

# Vérification : la base existe
FOUND="$(rs -h -Q "SET NOCOUNT ON; SELECT 'RESTORE-OK' FROM sys.databases WHERE name='${RESTORE_DB}'")"
echo "[RESTORE-TEST] Résultat : ${FOUND}"

if [ "${FOUND}" != "RESTORE-OK" ]; then
  echo "[RESTORE-TEST] ❌ La base restaurée est introuvable"
  exit 1
fi

# Nettoyage de la base de test
echo "[RESTORE-TEST] Suppression de la base de test..."
rs -Q "ALTER DATABASE [${RESTORE_DB}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${RESTORE_DB}];"
echo "[RESTORE-TEST] ✅ DR vérifié avec succès (backup restaurable)."
